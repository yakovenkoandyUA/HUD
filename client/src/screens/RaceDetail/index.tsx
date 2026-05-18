import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { F1_SEASON_2026 } from '../../data/f1Season2026'
import { getNextRound } from '../../utils/f1'
import TrackSVG from '../../components/f1/TrackSVG'
import styles from './RaceDetail.module.css'

/**
 * RaceDetailPage
 * --------------
 * Сторінка деталей гонки. Відкривається при натисканні на рядок у календарі.
 * Показує великий SVG треку з анімацією draw-path на mount.
 */
const RaceDetailPage: React.FC = () => {
  const { round } = useParams<{ round: string }>()
  const navigate = useNavigate()

  const roundNum = Number(round)
  const race = F1_SEASON_2026.find((r) => r.round === roundNum)
  const nextRound = getNextRound(F1_SEASON_2026)

  if (!race) {
    return (
      <div className={styles.screen}>
        <button className={styles.back} onClick={() => navigate('/f1')}>← Назад</button>
        <p className={styles.notFound}>Гонку не знайдено</p>
      </div>
    )
  }

  const isPast = race.round < nextRound
  const isNext = race.round === nextRound
  const trackColor = isPast ? 'var(--text2)' : 'var(--accent)'

  return (
    <div className={styles.screen}>
      <header className={styles.topBar}>
        <button className={styles.back} onClick={() => navigate('/f1')}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          F1
        </button>
        <span className={styles.roundLabel}>Раунд {String(race.round).padStart(2, '0')}</span>
      </header>

      <div className={styles.content}>
        {race.trackSvg ? (
          <div className={styles.trackWrap}>
            <TrackSVG
              src={race.trackSvg}
              color={trackColor}
              strokeWidth={1.5}
              animated
            />
          </div>
        ) : (
          <div className={styles.trackPlaceholder}>
            <span>Карта треку недоступна</span>
          </div>
        )}

        <div className={styles.info}>
          <div className={styles.flagRow}>
            <span className={styles.flag}>{race.flag}</span>
            {isNext && <span className={styles.nextBadge}>НАСТУПНА</span>}
            {isPast && <span className={styles.pastBadge}>ПРОЙДЕНО</span>}
            {race.sprint && <span className={styles.sprintBadge}>SPRINT</span>}
          </div>
          <h1 className={styles.name}>{race.name}</h1>
          <div className={styles.circuit}>{race.circuit}</div>
          <div className={styles.date}>
            {new Date(race.date).toLocaleDateString('uk-UA', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default RaceDetailPage
