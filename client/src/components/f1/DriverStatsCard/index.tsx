import React, { useEffect, useState } from 'react'
import styles from './DriverStatsCard.module.css'

/**
 * DriverStatsCard
 * ---------------
 * Розгортна картка статистики пілота в таблиці пілотів.
 * Дані з Jolpica (results + qualifying) кешуються у батьківському компоненті.
 *
 * Props:
 * @prop {string}                     driverId    — Jolpica slug (hamilton, leclerc, …)
 * @prop {number}                     points      — поточні очки пілота
 * @prop {number}                     maxPoints   — очки лідера (для прогрес-бару)
 * @prop {DriverStats | undefined}    cachedStats — вже отримані дані (якщо є)
 * @prop {(id, stats) => void}        onStats     — колбек для збереження в кеш
 */

export interface DriverStats {
  wins:        number
  poles:       number
  podiums:     number
  fastestLaps: number
  dnf:         number
  nationality: string
  number:      string
}

interface Props {
  driverId:    string
  points:      number
  maxPoints:   number
  cachedStats: DriverStats | undefined
  onStats:     (id: string, stats: DriverStats) => void
}

const NATIONALITY_UA: Record<string, { flag: string; ua: string }> = {
  'British':       { flag: '🇬🇧', ua: 'Велика Британія' },
  'German':        { flag: '🇩🇪', ua: 'Німеччина' },
  'Dutch':         { flag: '🇳🇱', ua: 'Нідерланди' },
  'Spanish':       { flag: '🇪🇸', ua: 'Іспанія' },
  'Monegasque':    { flag: '🇲🇨', ua: 'Монако' },
  'Finnish':       { flag: '🇫🇮', ua: 'Фінляндія' },
  'Australian':    { flag: '🇦🇺', ua: 'Австралія' },
  'Canadian':      { flag: '🇨🇦', ua: 'Канада' },
  'French':        { flag: '🇫🇷', ua: 'Франція' },
  'Japanese':      { flag: '🇯🇵', ua: 'Японія' },
  'Mexican':       { flag: '🇲🇽', ua: 'Мексика' },
  'Italian':       { flag: '🇮🇹', ua: 'Італія' },
  'Danish':        { flag: '🇩🇰', ua: 'Данія' },
  'American':      { flag: '🇺🇸', ua: 'США' },
  'Thai':          { flag: '🇹🇭', ua: 'Таїланд' },
  'Chinese':       { flag: '🇨🇳', ua: 'Китай' },
  'New Zealander': { flag: '🇳🇿', ua: 'Нова Зеландія' },
  'Brazilian':     { flag: '🇧🇷', ua: 'Бразилія' },
  'Austrian':      { flag: '🇦🇹', ua: 'Австрія' },
  'Argentine':     { flag: '🇦🇷', ua: 'Аргентина' },
}

function SkeletonRows() {
  return (
    <div className={styles.inner}>
      {[80, 60, 70].map((w, i) => (
        <div key={i} className={styles.skBar} style={{ width: `${w}%` }} />
      ))}
    </div>
  )
}

const DriverStatsCard: React.FC<Props> = ({
  driverId, points, maxPoints, cachedStats, onStats,
}) => {
  const [stats, setStats]     = useState<DriverStats | null>(cachedStats ?? null)
  const [loading, setLoading] = useState<boolean>(!cachedStats)

  useEffect(() => {
    if (cachedStats || !driverId) return
    let cancelled = false
    const base = `https://api.jolpi.ca/ergast/f1/current/drivers/${driverId}`

    Promise.all([
      fetch(`${base}/results.json?limit=100`).then(r => { if (!r.ok) throw new Error(); return r.json() }),
      fetch(`${base}/qualifying.json?limit=100`).then(r => { if (!r.ok) throw new Error(); return r.json() }),
    ])
      .then(([resJson, quaJson]) => {
        if (cancelled) return
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const results = (resJson?.MRData?.RaceTable?.Races ?? []).flatMap((r: any) => r.Results ?? [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const quali   = (quaJson?.MRData?.RaceTable?.Races ?? []).flatMap((r: any) => r.QualifyingResults ?? [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const d0      = results[0]?.Driver ?? {}

        const parsed: DriverStats = {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          wins:        results.filter((r: any) => r.position === '1').length,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          podiums:     results.filter((r: any) => Number(r.position) <= 3).length,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          fastestLaps: results.filter((r: any) => r.FastestLap?.rank === '1').length,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          dnf:         results.filter((r: any) => ['DNF','DNS','DSQ'].includes(r.status ?? '')).length,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          poles:       quali.filter((r: any) => r.position === '1').length,
          nationality: d0.nationality ?? '',
          number:      d0.permanentNumber ?? '',
        }
        setStats(parsed)
        onStats(driverId, parsed)
        setLoading(false)
      })
      .catch(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [driverId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <SkeletonRows />
  if (!stats)  return null

  const pct = maxPoints > 0 ? Math.min(100, Math.round((points / maxPoints) * 100)) : 0
  const nat = NATIONALITY_UA[stats.nationality]

  return (
    <div className={styles.inner}>

      {/* Stats */}
      <div className={styles.statsGrid}>
        <span className={styles.statLabel}><span className={styles.icon}>🏆</span>Перемоги</span>
        <span className={styles.statVal}>{stats.wins}</span>

        <span className={styles.statLabel}><span className={styles.icon}>🥇</span>Поули</span>
        <span className={styles.statVal}>{stats.poles}</span>

        <span className={styles.statLabel}><span className={styles.icon}>🏅</span>Подіуми</span>
        <span className={styles.statVal}>{stats.podiums}</span>

        <span className={styles.statLabel}><span className={styles.icon}>⚡</span>Fastest laps</span>
        <span className={styles.statVal}>{stats.fastestLaps}</span>

        <span className={styles.statLabel}><span className={styles.icon}>✕</span>DNF</span>
        <span className={styles.statVal}>{stats.dnf}</span>
      </div>

      {/* Progress bar */}
      <div className={styles.progress}>
        <div className={styles.track}>
          <div className={styles.fill} style={{ width: `${pct}%` }} />
        </div>
        <span className={styles.progressLabel}>{points} / {maxPoints} pts</span>
      </div>

      {/* Meta */}
      <div className={styles.meta}>
        {nat && <span className={styles.metaItem}>{nat.flag}&nbsp;{nat.ua}</span>}
        {stats.number && <span className={styles.metaItem}>#{stats.number}</span>}
      </div>

    </div>
  )
}

export default DriverStatsCard
