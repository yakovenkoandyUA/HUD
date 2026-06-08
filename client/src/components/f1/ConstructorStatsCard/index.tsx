import React, { useEffect, useState } from 'react'
import styles from './ConstructorStatsCard.module.css'

const TEAM_CAR_IMAGE: Record<string, string> = {
  mercedes:     '/teams/mercedes.png',
  ferrari:      '/teams/ferrari.png',
  mclaren:      '/teams/mclaren.png',
  red_bull:     '/teams/redbull.png',
  alpine:       '/teams/alpine.png',
  williams:     '/teams/williams.png',
  aston_martin: '/teams/aston_martin.png',
  haas:         '/teams/haas.png',
  racing_bulls: '/teams/racing_bulls.png',
}

const TEAM_COLOR: Record<string, string> = {
  mercedes:     '#00D2BE',
  ferrari:      '#E8002D',
  mclaren:      '#FF8000',
  red_bull:     '#3671C6',
  alpine:       '#FF87BC',
  williams:     '#64C4FF',
  aston_martin: '#229971',
  haas:         '#B6BABD',
  racing_bulls: '#6692FF',
  audi:         '#BB0000',
  cadillac:     '#FFFFFF',
}

/**
 * ConstructorStatsCard
 * --------------------
 * Розгортна картка статистики команди в таблиці команд.
 * Показує болид (анімований), пілотів, статистику сезону, прогрес-бар.
 * Дані з Jolpica (results + qualifying), кешуються у батьківському компоненті.
 *
 * Props:
 * @prop {string}                          constructorId — Jolpica slug (mercedes, red_bull, …)
 * @prop {string}                          teamName      — назва команди (для PixelCar)
 * @prop {number}                          points        — поточні очки команди
 * @prop {number}                          maxPoints     — очки лідера (для прогрес-бару)
 * @prop {DriverEntry[]}                   teamDrivers   — пілоти цієї команди (з standings)
 * @prop {ConstructorStats | undefined}    cachedStats   — вже отримані дані (якщо є)
 * @prop {(id, stats) => void}             onStats       — колбек для збереження в кеш
 */

export interface ConstructorStats {
  wins:        number
  poles:       number
  podiums:     number
  fastestLaps: number
}

export interface DriverEntry {
  name:   string
  points: number
}

interface Props {
  constructorId: string
  teamName:      string
  points:        number
  maxPoints:     number
  teamDrivers:   DriverEntry[]
  cachedStats:   ConstructorStats | undefined
  onStats:       (id: string, stats: ConstructorStats) => void
}

function SkeletonRows() {
  return (
    <div className={styles.inner}>
      {[80, 60, 70, 50].map((w, i) => (
        <div key={i} className={styles.skBar} style={{ width: `${w}%` }} />
      ))}
    </div>
  )
}

const ConstructorStatsCard: React.FC<Props> = ({
  constructorId, teamName, points, maxPoints, teamDrivers, cachedStats, onStats,
}) => {
  const [stats, setStats]     = useState<ConstructorStats | null>(cachedStats ?? null)
  const [loading, setLoading] = useState<boolean>(!cachedStats)

  useEffect(() => {
    if (cachedStats || !constructorId) return
    let cancelled = false
    const base = `https://api.jolpi.ca/ergast/f1/current/constructors/${constructorId}`

    Promise.all([
      fetch(`${base}/results.json?limit=200`).then(r => { if (!r.ok) throw new Error(); return r.json() }),
      fetch(`${base}/qualifying.json?limit=200`).then(r => { if (!r.ok) throw new Error(); return r.json() }),
    ])
      .then(([resJson, quaJson]) => {
        if (cancelled) return
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const results = (resJson?.MRData?.RaceTable?.Races ?? []).flatMap((r: any) => r.Results ?? [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const quali   = (quaJson?.MRData?.RaceTable?.Races ?? []).flatMap((r: any) => r.QualifyingResults ?? [])

        const parsed: ConstructorStats = {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          wins:        results.filter((r: any) => r.position === '1').length,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          podiums:     results.filter((r: any) => Number(r.position) <= 3).length,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          fastestLaps: results.filter((r: any) => r.FastestLap?.rank === '1').length,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          poles:       quali.filter((r: any) => r.position === '1').length,
        }
        setStats(parsed)
        onStats(constructorId, parsed)
        setLoading(false)
      })
      .catch(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [constructorId]) // eslint-disable-line react-hooks/exhaustive-deps

  const carImage  = TEAM_CAR_IMAGE[constructorId] ?? null
  const teamColor = TEAM_COLOR[constructorId] ?? 'var(--accent)'
  const pct = maxPoints > 0 ? Math.min(100, Math.round((points / maxPoints) * 100)) : 0

  return (
    <div className={styles.card}>

      {/* ── Hero ── */}
      <div
        className={styles.hero}
        style={{ '--team-color': teamColor } as React.CSSProperties}
      >
        <svg className={styles.speedLines} viewBox="0 0 60 120" preserveAspectRatio="none">
          <rect x="8"  y="0"  width="6" height="120" rx="3" fill="var(--team-color)" opacity="0.9"/>
          <rect x="20" y="15" width="6" height="105" rx="3" fill="var(--team-color)" opacity="0.7"/>
          <rect x="32" y="30" width="6" height="90"  rx="3" fill="var(--team-color)" opacity="0.5"/>
          <rect x="44" y="50" width="6" height="70"  rx="3" fill="var(--team-color)" opacity="0.3"/>
        </svg>

        {carImage && (
          <img
            src={carImage}
            alt={teamName}
            className={styles.carImage}
          />
        )}

        <div className={styles.heroInfo}>
          <span className={styles.heroName}>{teamName}</span>
          <span className={styles.heroPts}>
            {points} <em>pts</em>
          </span>
        </div>
      </div>

      {/* ── Stats ── */}
      {loading ? <SkeletonRows /> : !stats ? null : (
        <div className={styles.inner}>

          {teamDrivers.length > 0 && (
            <div className={styles.driversList}>
              <span className={styles.driversLabel}>Пілоти:</span>
              {teamDrivers.map(d => (
                <div key={d.name} className={styles.driverRow}>
                  <span className={styles.driverDot} />
                  <span className={styles.driverName}>{d.name}</span>
                  <span className={styles.driverPts}>{d.points} pts</span>
                </div>
              ))}
            </div>
          )}

          <div className={styles.statsGrid}>
            <span className={styles.statLabel}><span className={styles.icon}>🏆</span>Перемоги команди</span>
            <span className={styles.statVal}>{stats.wins}</span>

            <span className={styles.statLabel}><span className={styles.icon}>🥇</span>Поули</span>
            <span className={styles.statVal}>{stats.poles}</span>

            <span className={styles.statLabel}><span className={styles.icon}>🏅</span>Подіуми</span>
            <span className={styles.statVal}>{stats.podiums}</span>

            <span className={styles.statLabel}><span className={styles.icon}>⚡</span>Fastest laps</span>
            <span className={styles.statVal}>{stats.fastestLaps}</span>
          </div>

          <div className={styles.progress}>
            <div className={styles.track}>
              <div className={styles.fill} style={{ width: `${pct}%` }} />
            </div>
            <span className={styles.progressLabel}>{points} / {maxPoints} pts</span>
          </div>

        </div>
      )}

    </div>
  )
}

export default ConstructorStatsCard
