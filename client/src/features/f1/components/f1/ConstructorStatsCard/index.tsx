import { useEffect, useState } from 'react'
import styles from './ConstructorStatsCard.module.css'

interface ConstructorStatsCardProps {
  constructorId: string
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
  wins: number
  podiums: number
  poles: number
  fastestLaps: number
}

/** Loads a team's season totals when its standings row is expanded. */
function ConstructorStatsCard({ constructorId }: ConstructorStatsCardProps) {
  const [stats, setStats] = useState<ConstructorStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()
    const base = `https://api.jolpi.ca/ergast/f1/current/constructors/${constructorId}`
    const load = async () => {
      try {
        const [raceResponse, qualiResponse] = await Promise.all([
          fetch(`${base}/results.json?limit=200`, { signal: controller.signal }),
          fetch(`${base}/qualifying.json?limit=200`, { signal: controller.signal }),
        ])
        if (!raceResponse.ok || !qualiResponse.ok) throw new Error('Constructor stats unavailable')
        const raceData: RaceResults = await raceResponse.json()
        const qualiData: QualifyingResults = await qualiResponse.json()
        const races = raceData.MRData?.RaceTable?.Races
        const qualifying = qualiData.MRData?.RaceTable?.Races
        if (!races || !qualifying) throw new Error('Invalid constructor stats')
        const results = races.flatMap(race => race.Results ?? [])
        const positions = qualifying.flatMap(race => race.QualifyingResults ?? [])
        if (!cancelled) setStats({
          wins: results.filter(result => result.position === '1').length,
          podiums: results.filter(result => Number(result.position) >= 1 && Number(result.position) <= 3).length,
          poles: positions.filter(result => result.position === '1').length,
          fastestLaps: results.filter(result => result.FastestLap?.rank === '1').length,
        })
      } catch {
        if (!cancelled) setStats(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [constructorId])

  if (loading) return <p role="status" className={styles.message}>Завантажуємо статистику…</p>
  if (!stats) return <p role="status" className={styles.message}>Статистика сезону недоступна</p>

  return (
    <dl className={styles.stats} aria-label="Статистика сезону">
      <div><dt>Перемоги</dt><dd>{stats.wins}</dd></div>
      <div><dt>Подіуми</dt><dd>{stats.podiums}</dd></div>
      <div><dt>Поули</dt><dd>{stats.poles}</dd></div>
      <div><dt>Швидкі кола</dt><dd>{stats.fastestLaps}</dd></div>
    </dl>
  )
}

export default ConstructorStatsCard
