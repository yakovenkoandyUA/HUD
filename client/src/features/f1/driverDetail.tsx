import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useChampionshipStandings } from './hooks/useChampionshipStandings'
import { useDriverStats } from './hooks/useDriverStats'
import { useDriverRaceResults } from './hooks/useDriverRaceResults'
import { F1_TEAMS } from './data/f1Teams'
import DriverDetailHero from './components/f1/DriverDetailHero'
import DriverSeasonSummary from './components/f1/DriverSeasonSummary'
import DriverTeamCard from './components/f1/DriverTeamCard'
import DriverRecentResults from './components/f1/DriverRecentResults'
import { DRIVER_TEAM_COLOR } from './utils/f1'
import styles from './DriverDetail.module.css'

/**
 * DriverDetailPage
 * -----------------
 * Повна сторінка пілота (/f1/drivers/:driverId): hero зі статистикою,
 * продуктивність сезону, довідка про команду, останні гонки.
 * Дані: standings (backend proxy), сезонна статистика + результати (Jolpica).
 */

const RESULTS_STEP = 5

const DriverDetailPage: React.FC = () => {
  const { driverId } = useParams<{ driverId: string }>()
  const navigate = useNavigate()
  const [resultsLimit, setResultsLimit] = useState(RESULTS_STEP)

  const { drivers, loading: standingsLoading } = useChampionshipStandings()
  const driver = drivers.find(d => d.driverId === driverId)

  const { stats, loading: statsLoading } = useDriverStats(driverId ?? '')
  const { results, loading: resultsLoading } = useDriverRaceResults(driverId ?? '')

  if (standingsLoading) {
    return <div className={styles.screen}><div className={styles.skeleton} /></div>
  }

  if (!driver || !driverId) {
    return (
      <div className={styles.screen}>
        <button className={styles.back} onClick={() => navigate(-1)}>← Назад</button>
        <p className={styles.notFound}>Пілота не знайдено</p>
      </div>
    )
  }

  const maxPoints = drivers[0]?.points ?? 1
  const teamColor = DRIVER_TEAM_COLOR[driverId] ?? 'var(--accent)'
  const team = stats?.constructorId ? F1_TEAMS[stats.constructorId] : undefined
  const finishedCount = results.filter(r => r.status === 'finished').length

  return (
    <div className={styles.screen}>
      <header className={styles.topBar}>
        <button className={styles.back} onClick={() => navigate(-1)}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          F1
        </button>
        <span className={styles.headerLabel}>ПІЛОТ</span>
      </header>

      <div className={styles.content}>
        <div className={styles.heroInline}>
          <DriverDetailHero driver={driver} stats={stats} loading={statsLoading} />
        </div>

        <DriverSeasonSummary
          points={driver.points}
          maxPoints={maxPoints}
          position={driver.position}
          stats={stats}
          results={results}
          racesCompleted={Math.max(finishedCount, 1)}
          teamColor={teamColor}
        />
        {team && <DriverTeamCard team={team} />}

        <div className={styles.section}>
          <div className={styles.sectionTitle}>ОСТАННІ ГОНКИ</div>
          <DriverRecentResults results={results} loading={resultsLoading} limit={resultsLimit} />
          {results.length > resultsLimit && (
            <button className={styles.moreBtn} onClick={() => setResultsLimit(n => n + RESULTS_STEP)}>
              ПЕРЕГЛЯНУТИ ВСІ РЕЗУЛЬТАТИ
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default DriverDetailPage
