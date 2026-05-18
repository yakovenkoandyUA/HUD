import React from 'react'
import TopBar from '../../components/layout/TopBar'
import NextRaceCard from '../../components/f1/NextRaceCard'
import RaceCalendarList from '../../components/f1/RaceCalendarList'
import { F1_SEASON_2026 } from '../../data/f1Season2026'
import { getNextRace, getNextRound } from '../../utils/f1'
import styles from './F1.module.css'

const F1Screen: React.FC = () => {
  const nextRace = getNextRace(F1_SEASON_2026)
  const nextRound = getNextRound(F1_SEASON_2026)

  return (
    <div className={styles.screen}>
      <TopBar title="F1 2026" />
      <div className={styles.content}>
        {nextRace ? (
          <NextRaceCard race={nextRace} />
        ) : (
          <p className={styles.done}>Сезон 2026 завершено</p>
        )}
        <h3 className={styles.calLabel}>Календар сезону</h3>
        <RaceCalendarList races={F1_SEASON_2026} nextRound={nextRound} />
      </div>
    </div>
  )
}

export default F1Screen
