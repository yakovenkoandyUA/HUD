import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { DriverStanding } from '../../../hooks/useChampionshipStandings'
import { getDriverPortraitSources } from '../../../utils/f1'
import styles from './ConstructorStatsCard.module.css'

interface ConstructorStatsCardProps {
  constructorId: string
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

/** Shows season totals and links to the constructor's drivers. */
function ConstructorStatsCard({ constructorId, drivers }: ConstructorStatsCardProps) {
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

  const unavailable = stats && (stats.wins == null || stats.poles == null)

  return (
    <div className={styles.details}>
      <section className={styles.section} aria-label="Статистика сезону">
        <h2 className={styles.title}>Статистика сезону</h2>
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
          <h2 className={styles.title}>Пілоти команди</h2>
          <ul className={styles.drivers}>
            {drivers.map(driver => {
              const portrait = getDriverPortraitSources(driver.headshot_url)[0]
              const content = (
                <>
                  <span className={styles.driverVisual} aria-hidden="true">
                    {driver.driver_number > 0 && <span className={styles.driverNumber}>{driver.driver_number}</span>}
                    <span className={styles.driverPortrait}>
                      {driver.broadcast_name || driver.full_name.slice(0, 2).toUpperCase()}
                      {portrait && (
                        <img src={portrait} loading="lazy" alt="" onError={event => {
                          if (driver.headshot_url && event.currentTarget.getAttribute('src') !== driver.headshot_url) {
                            event.currentTarget.src = driver.headshot_url
                          } else {
                            event.currentTarget.hidden = true
                          }
                        }} />
                      )}
                    </span>
                  </span>
                  <span className={styles.driverName}>{driver.full_name}</span>
                  <span className={styles.driverStanding}><strong>P{driver.position}</strong><span>{driver.points} очок</span></span>
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
