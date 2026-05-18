import React from 'react'
import type { F1Race } from '../../../data/f1Season2026'
import RaceCountdown from '../RaceCountdown'
import styles from './NextRaceCard.module.css'

/**
 * NextRaceCard
 * ------------
 * Hero-картка наступного Гран Прі на екрані F1.
 *
 * Props:
 * @prop {F1Race} race — дані наступної гонки
 */
interface NextRaceCardProps {
  race: F1Race
}

const NextRaceCard: React.FC<NextRaceCardProps> = ({ race }) => (
  <div className={styles.card}>
    <div className={styles.meta}>
      <span className={styles.round}>Раунд {race.round}</span>
      <span className={styles.country}>{race.country}</span>
    </div>
    <div className={styles.titleRow}>
      <span className={styles.flag}>{race.flag}</span>
      <h2 className={styles.name}>{race.name}</h2>
    </div>
    <div className={styles.circuit}>{race.circuit}</div>
    <RaceCountdown raceDate={race.date} />
    <div className={styles.date}>{new Date(race.date).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
  </div>
)

export default NextRaceCard
