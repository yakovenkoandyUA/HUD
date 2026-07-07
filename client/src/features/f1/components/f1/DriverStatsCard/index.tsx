import React, { useEffect, useState } from 'react'
import { getDriverHeadshot } from '../../../utils/f1'
import styles from './DriverStatsCard.module.css'

/**
 * DriverStatsCard
 * ---------------
 * Розгортна картка статистики пілота в таблиці пілотів.
 * Верхній hero: ім'я, номер, колір команди, speed lines.
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
  wins:            number
  poles:           number
  podiums:         number
  fastestLaps:     number
  dnf:             number
  nationality:     string
  number:          string
  familyName:      string
  givenName:       string
  constructorName: string
}

interface Props {
  driverId:    string
  points:      number
  maxPoints:   number
  cachedStats: DriverStats | undefined
  onStats:     (id: string, stats: DriverStats) => void
}

const DRIVER_TEAM_COLOR: Record<string, string> = {
  antonelli:   '#00D2BE',
  russell:     '#00D2BE',
  leclerc:     '#E8002D',
  hamilton:    '#E8002D',
  norris:      '#FF8000',
  piastri:     '#FF8000',
  verstappen:  '#3671C6',
  hadjar:      '#3671C6',
  gasly:       '#FF87BC',
  colapinto:   '#FF87BC',
  albon:       '#64C4FF',
  sainz:       '#64C4FF',
  alonso:      '#229971',
  stroll:      '#229971',
  bearman:     '#B6BABD',
  hulkenberg:  '#B6BABD',
  lawson:      '#6692FF',
  lindblad:    '#6692FF',
  bortoleto:   '#BB0000',
  bottas:      '#BB0000',
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

function SkeletonStats() {
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const c0      = results[0]?.Constructor ?? {}

        const parsed: DriverStats = {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          wins:            results.filter((r: any) => r.position === '1').length,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          podiums:         results.filter((r: any) => Number(r.position) <= 3).length,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          fastestLaps:     results.filter((r: any) => r.FastestLap?.rank === '1').length,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          dnf:             results.filter((r: any) => ['DNF','DNS','DSQ'].includes(r.status ?? '')).length,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          poles:           quali.filter((r: any) => r.position === '1').length,
          nationality:     d0.nationality ?? '',
          number:          d0.permanentNumber ?? '',
          familyName:      d0.familyName ?? '',
          givenName:       d0.givenName ?? '',
          constructorName: c0.name ?? '',
        }
        setStats(parsed)
        onStats(driverId, parsed)
        setLoading(false)
      })
      .catch(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [driverId]) // eslint-disable-line react-hooks/exhaustive-deps

  const teamColor    = DRIVER_TEAM_COLOR[driverId] ?? 'var(--accent)'
  const driverNum    = stats?.number ?? ''
  const lastName     = stats?.familyName?.toUpperCase() ?? driverId.toUpperCase()
  const firstName    = stats?.givenName ?? ''
  const constrName   = stats?.constructorName ?? ''
  const pct          = maxPoints > 0 ? Math.min(100, Math.round((points / maxPoints) * 100)) : 0
  const nat          = stats ? NATIONALITY_UA[stats.nationality] : undefined
  const headshotUrl  = getDriverHeadshot(driverId)
  const [photoOk, setPhotoOk] = useState(true)

  return (
    <div className={styles.card}>

      {/* ── Hero ── */}
      <div
        className={styles.hero}
        style={{ '--team-color': teamColor } as React.CSSProperties}
      >
        <span className={styles.heroNumber}>{driverNum}</span>

        <svg className={styles.speedLines} viewBox="0 0 60 120" preserveAspectRatio="none">
          <rect x="4"  y="0"  width="5" height="120" rx="2" fill="var(--team-color)" opacity="1"/>
          <rect x="14" y="15" width="5" height="105" rx="2" fill="var(--team-color)" opacity="0.7"/>
          <rect x="24" y="30" width="5" height="90"  rx="2" fill="var(--team-color)" opacity="0.45"/>
          <rect x="34" y="50" width="5" height="70"  rx="2" fill="var(--team-color)" opacity="0.25"/>
        </svg>

        {headshotUrl && photoOk && (
          <img
            className={styles.heroPhoto}
            src={headshotUrl}
            alt={lastName}
            crossOrigin="anonymous"
            referrerPolicy="no-referrer"
            onError={() => setPhotoOk(false)}
          />
        )}

        <div className={styles.heroInfo}>
          <span className={styles.heroFirstName}>{firstName}</span>
          <span className={styles.heroLastName}>{lastName}</span>
          <span className={styles.heroTeam}>{constrName}</span>
        </div>
      </div>

      {/* ── Stats ── */}
      {loading ? <SkeletonStats /> : !stats ? null : (
        <div className={styles.inner}>

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

          <div className={styles.progress}>
            <div className={styles.track}>
              <div className={styles.fill} style={{ width: `${pct}%` }} />
            </div>
            <span className={styles.progressLabel}>{points} / {maxPoints} pts</span>
          </div>

          <div className={styles.meta}>
            {nat && <span className={styles.metaItem}>{nat.flag}&nbsp;{nat.ua}</span>}
            {stats.number && <span className={styles.metaItem}>#{stats.number}</span>}
          </div>

        </div>
      )}

    </div>
  )
}

export default DriverStatsCard
