import React from 'react'
import { useNavigate } from 'react-router-dom'
import type { F1Race } from '../../../data/f1Season2026'
import TrackSVG from '../TrackSVG'
import styles from './RaceCalendarList.module.css'

/**
 * RaceCalendarList
 * ----------------
 * Повний список Гран Прі сезону. Пройдені — затемнені, наступна — виділена.
 * Натискання на рядок → /f1/:round (деталі гонки).
 *
 * Props:
 * @prop {F1Race[]} races       — повний список гонок
 * @prop {number}   nextRound   — номер наступної гонки
 */
interface RaceCalendarListProps {
  races: F1Race[]
  nextRound: number
}

const RaceCalendarList: React.FC<RaceCalendarListProps> = ({ races, nextRound }) => {
  const navigate = useNavigate()
  return (
    <ul className={styles.list}>
      {races.map((race) => {
        const isPast = race.round < nextRound
        const isNext = race.round === nextRound
        const trackColor = isNext ? 'var(--accent)' : 'var(--text3)'
        return (
          <li
            key={race.round}
            className={`${styles.item} ${isNext ? styles.next : ''}`}
            onClick={() => navigate(`/f1/${race.round}`)}
          >
            <span className={`${styles.round} ${isPast ? styles.roundPast : ''}`}>
              {isPast ? '✓' : String(race.round).padStart(2, '0')}
            </span>
            <span className={`${styles.flag} ${isPast ? styles.dimPast : ''}`}>{race.flag}</span>
            <div className={styles.info}>
              <span className={`${styles.name} ${isPast ? styles.dimPast : ''}`}>{race.name}</span>
              <span className={`${styles.circuit} ${isPast ? styles.dimPast : ''}`}>{race.circuit}</span>
            </div>
            <span className={`${styles.date} ${isPast ? styles.dimPast : ''}`}>
              {new Date(race.date).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })}
            </span>
            <div className={`${styles.trackWrap} ${isPast ? styles.trackPast : ''}`}>
              {race.trackSvg ? (
                <TrackSVG
                  src={race.trackSvg}
                  color={trackColor}
                  strokeWidth={1}
                  animated={false}
                  className={styles.track}
                />
              ) : (
                <div className={styles.trackMissing} />
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export default RaceCalendarList
