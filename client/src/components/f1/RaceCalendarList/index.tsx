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
  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className={styles.list}>
      {races.map((race) => {
        const isPast = race.date < today
        const isNext = race.round === nextRound
        return (
          <div
            key={race.round}
            className={`${styles.row} ${isPast ? styles.rowPast : ''} ${isNext ? styles.rowNext : ''}`}
            onClick={() => navigate(`/f1/${race.round}`)}
          >
            <span className={styles.round}>
              {String(race.round).padStart(2, '0')}
            </span>

            <span className={styles.flag}>{race.flag}</span>

            <div className={styles.info}>
              <span className={styles.name}>{race.name}</span>
              <span className={styles.circuit}>{race.circuit}</span>
            </div>

            <span className={styles.date}>
              {new Date(race.date).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })}
            </span>

            {race.trackSvg && (
              <div className={styles.trackWrap}>
                <TrackSVG
                  src={race.trackSvg}
                  color={isNext ? 'var(--accent)' : 'var(--text2)'}
                  strokeWidth={1}
                  animated={false}
                  preserveAspectRatio="xMidYMid meet"
                  className={styles.trackSvg}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default RaceCalendarList
