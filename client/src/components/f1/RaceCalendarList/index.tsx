import React from 'react'
import type { F1Race } from '../../../data/f1Season2026'
import styles from './RaceCalendarList.module.css'

/**
 * RaceCalendarList
 * ----------------
 * Повний список Гран Прі сезону. Пройдені — затемнені, наступна — виділена.
 *
 * Props:
 * @prop {F1Race[]} races       — повний список гонок
 * @prop {number}   nextRound   — номер наступної гонки
 */
interface RaceCalendarListProps {
  races: F1Race[]
  nextRound: number
}

const RaceCalendarList: React.FC<RaceCalendarListProps> = ({ races, nextRound }) => (
  <ul className={styles.list}>
    {races.map((race) => {
      const isPast = race.round < nextRound
      const isNext = race.round === nextRound
      return (
        <li
          key={race.round}
          className={`${styles.item} ${isPast ? styles.past : ''} ${isNext ? styles.next : ''}`}
        >
          <span className={styles.round}>{String(race.round).padStart(2, '0')}</span>
          <span className={styles.flag}>{race.flag}</span>
          <div className={styles.info}>
            <span className={styles.name}>{race.name}</span>
            <span className={styles.circuit}>{race.circuit}</span>
          </div>
          <span className={styles.date}>
            {new Date(race.date).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })}
          </span>
        </li>
      )
    })}
  </ul>
)

export default RaceCalendarList
