import React from 'react'
import TopBar from '../../components/layout/TopBar'
import NextRaceCard from '../../components/f1/NextRaceCard'
import RaceCalendarList from '../../components/f1/RaceCalendarList'
import { F1_SEASON_2025 } from '../../data/f1Season2025'
import { getNextRace, getNextRound } from '../../utils/f1'
import styles from './F1.module.css'

const F1Screen: React.FC = () => {
  const nextRace = getNextRace(F1_SEASON_2025)
  const nextRound = getNextRound(F1_SEASON_2025)

  return (
    <div className={styles.screen}>
      <TopBar title="F1 2025" />
      <div className={styles.content}>
        {nextRace ? (
          <NextRaceCard race={nextRace} />
        ) : (
          <p className={styles.done}>Сезон 2025 завершено</p>
        )}
        <h3 className={styles.calLabel}>Календар сезону</h3>
        <RaceCalendarList races={F1_SEASON_2025} nextRound={nextRound} />
      </div>
    </div>
  )
}

export default F1Screen
