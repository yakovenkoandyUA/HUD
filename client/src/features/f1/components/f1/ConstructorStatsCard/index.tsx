import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { F1TeamInfo } from '../../../data/f1Teams'
import type { DriverStanding } from '../../../hooks/useChampionshipStandings'
import styles from './ConstructorStatsCard.module.css'

interface ConstructorStatsCardProps {
  constructorId: string
  assetId?: string
  teamInfo?: F1TeamInfo
  drivers: DriverStanding[]
}

interface RaceResults {
  MRData?: {
    RaceTable?: {
      Races?: { Results?: { position: string; FastestLap?: { rank: string } }[] }[]
    }
  }
}

interface QualifyingResults {
  MRData?: {
    RaceTable?: {
      Races?: { QualifyingResults?: { position: string }[] }[]
    }
  }
}

interface ConstructorStats {
  wins: number | null
  podiums: number | null
  poles: number | null
  fastestLaps: number | null
}

async function fetchTeamResults<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error('Constructor stats unavailable')
  return response.json() as Promise<T>
}

/** Displays the constructor's car, season totals, and links to its drivers. */
function ConstructorStatsCard({ constructorId, assetId, teamInfo, drivers }: ConstructorStatsCardProps) {
  const [stats, setStats] = useState<ConstructorStats | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()
    const base = `https://api.jolpi.ca/ergast/f1/current/constructors/${encodeURIComponent(constructorId)}`
    const load = async () => {
      const [raceResponse, qualiResponse] = await Promise.allSettled([
        fetchTeamResults<RaceResults>(`${base}/results/?limit=100`, controller.signal),
        fetchTeamResults<QualifyingResults>(`${base}/qualifying/?limit=100`, controller.signal),
      ])
      if (cancelled) return
      const races = raceResponse.status === 'fulfilled' ? raceResponse.value.MRData?.RaceTable?.Races : undefined
      const qualifying = qualiResponse.status === 'fulfilled' ? qualiResponse.value.MRData?.RaceTable?.Races : undefined
      const results = races?.flatMap(race => race.Results ?? [])
      const positions = qualifying?.flatMap(race => race.QualifyingResults ?? [])
      setStats({
        wins: results?.filter(result => result.position === '1').length ?? null,
        podiums: results?.filter(result => ['1', '2', '3'].includes(result.position)).length ?? null,
        poles: positions?.filter(result => result.position === '1').length ?? null,
        fastestLaps: results?.filter(result => result.FastestLap?.rank === '1').length ?? null,
      })
      setLoading(false)
    }
    void load()
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [attempt, constructorId])

  const imageName = assetId === 'red_bull' ? 'redbull' : assetId
  const unavailable = stats && (stats.wins == null || stats.poles == null)

  return (
    <div className={styles.details}>
      {teamInfo && imageName && (
        <div className={styles.car}>
          <span className={styles.hq}>{teamInfo.hq}</span>
          <img src={`/teams/${imageName}_mini.avif`} alt={`Болід ${teamInfo.name}`} loading="lazy" />
        </div>
      )}
      <section className={styles.section} aria-label="Статистика сезону">
        <h3 className={styles.title}>Статистика сезону</h3>
        <dl className={styles.stats} aria-busy={loading}>
          <div><dt>Перемоги</dt><dd>{stats?.wins ?? '—'}</dd></div>
          <div><dt>Подіуми</dt><dd>{stats?.podiums ?? '—'}</dd></div>
          <div><dt>Поули</dt><dd>{stats?.poles ?? '—'}</dd></div>
          <div><dt>Швидкі кола</dt><dd>{stats?.fastestLaps ?? '—'}</dd></div>
        </dl>
        {loading && <p role="status" className={styles.message}>Завантажуємо статистику…</p>}
        {!loading && unavailable && (
          <div className={styles.retry}>
            <p role="status" className={styles.message}>
              {stats.wins == null && stats.poles == null ? 'Статистика тимчасово недоступна' : 'Частина статистики недоступна'}
            </p>
            <button type="button" onClick={() => {
              setLoading(true)
              setAttempt(current => current + 1)
            }}>Повторити</button>
          </div>
        )}
      </section>
      {drivers.length > 0 && (
        <section className={styles.section} aria-label="Пілоти команди">
          <h3 className={styles.title}>Пілоти команди</h3>
          <ul className={styles.drivers}>
            {drivers.map(driver => {
              const content = (
                <>
                  <span className={styles.driverNumber}>#{driver.driver_number}</span>
                  <span>{driver.full_name}</span>
                </>
              )
              return (
                <li key={driver.driverId ?? driver.driver_number}>
                  {driver.driverId
                    ? <Link className={styles.driver} to={`/f1/drivers/${driver.driverId}`}>{content}</Link>
                    : <span className={styles.driver}>{content}</span>}
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}

export default ConstructorStatsCard
