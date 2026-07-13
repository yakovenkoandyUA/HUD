import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { F1Race } from '@/features/f1/data/f1Season2026'
import { useUiStore } from '@/shared/store/uiStore'
import styles from './RaceCountdownStrip.module.css'

const LIGHT_THEMES = new Set(['pixel', 'japan'])

/**
 * RaceCountdownStrip
 * ------------------
 * Картка F1 на Dashboard з банером: фонове фото гонки + градієнт,
 * F1 логотип, назва гонки + флаг, відлік (д/г/хв), дати уікенду.
 *
 * Props:
 * @prop {F1Race} race — наступна гонка
 */
interface RaceCountdownStripProps {
  race: F1Race
}

interface Cd { d: number; h: number; m: number }

function getCountdown(date: string): Cd | null {
  const diff = new Date(date + 'T14:00:00Z').getTime() - Date.now()
  if (diff <= 0) return null
  const s = Math.floor(diff / 1000)
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60) }
}

function pad(n: number) { return String(n).padStart(2, '0') }

const UA_MONTHS = ['січня','лютого','березня','квітня','травня','червня','липня','серпня','вересня','жовтня','листопада','грудня']

function getWeekendDates(raceDate: string): string {
  const race = new Date(raceDate)
  const fri = new Date(race)
  fri.setDate(race.getDate() - 2)
  if (fri.getMonth() === race.getMonth()) {
    return `${fri.getDate()}–${race.getDate()} ${UA_MONTHS[race.getMonth()]}`
  }
  return `${fri.getDate()} ${UA_MONTHS[fri.getMonth()]} – ${race.getDate()} ${UA_MONTHS[race.getMonth()]}`
}

const RaceCountdownStrip: React.FC<RaceCountdownStripProps> = ({ race }) => {
  const navigate = useNavigate()
  const theme = useUiStore(s => s.theme)
  const bannerUrl = LIGHT_THEMES.has(theme) ? '/banner-f1-light.png' : '/banner-f1-dark.png'
  const [cd, setCd] = useState<Cd | null>(() => getCountdown(race.date))

  useEffect(() => {
    const id = setInterval(() => setCd(getCountdown(race.date)), 30_000)
    return () => clearInterval(id)
  }, [race.date])

  const fullName = race.name.replace(' Grand Prix', ' GP').toUpperCase()
  const weekendDates = getWeekendDates(race.date)

  return (
    <button
      type="button"
      className={`${styles.strip} ${LIGHT_THEMES.has(theme) ? styles.stripLight : ''}`}
      onClick={() => navigate(`/f1/${race.round}`)}
      aria-label={`${fullName}, ${weekendDates}`}
    >
      {/* Banner image */}
      <div className={styles.banner} style={{ backgroundImage: `url('${bannerUrl}')` }} aria-hidden="true" />
      {/* Gradient overlay */}
      {/* <div className={styles.overlay} aria-hidden="true" /> */}

      {/* Content */}
      <div className={styles.inner}>
        {/* F1 logo — vertically centered against the whole text block */}
        <svg className={styles.f1Logo} viewBox="0 0 120 30" xmlns="http://www.w3.org/2000/svg" aria-label="F1" role="img">
          <path d="M101.087,30 L101.712,30 L101.712,27.107 L101.722,27.107 L102.762,30 L103.302,30 L104.342,27.107 L104.352,27.107 L104.352,30 L104.977,30 L104.977,26.251 L104.064,26.251 L103.056,29.186 L103.045,29.186 L102.011,26.251 L101.087,26.251 L101.087,30 Z M97.627,26.818 L98.814,26.818 L98.814,30 L99.470,30 L99.470,26.818 L100.662,26.818 L100.662,26.251 L97.627,26.251 L97.627,26.818 Z M90,30 L120,0 L101.944,0 L71.944,30 L90,30 Z M85.699,13.065 L49.382,13.065 C38.314,13.065 36.377,13.652 31.636,18.393 C27.202,22.826 20,30 20,30 L35.732,30 L39.486,26.247 C41.953,23.779 43.226,23.524 48.407,23.524 L75.241,23.524 L85.699,13.065 Z M31.152,16.253 C27.877,19.343 20.753,26.263 16.913,30 L0,30 C0,30 13.552,16.487 21.085,9.073 C28.846,1.685 32.714,0 46.949,0 L98.764,0 L87.545,11.219 L48.001,11.219 C37.999,11.219 35.752,11.912 31.152,16.253 Z" fill="currentColor"/>
        </svg>

        <div className={styles.left}>
          <div className={styles.nameRow}>
            <span className={styles.name}>{fullName}</span>
            <span className={styles.flag}>{race.flag}</span>
          </div>

          {cd ? (
            <span className={styles.countdown}>
              <span className={styles.unit}>{cd.d}<span className={styles.sub}>д</span></span>
              <span className={styles.dot}>·</span>
              <span className={styles.unit}>{pad(cd.h)}<span className={styles.sub}>г</span></span>
              <span className={styles.dot}>·</span>
              <span className={styles.unit}>{pad(cd.m)}<span className={styles.sub}>хв</span></span>
            </span>
          ) : (
            <span className={styles.raceDay}>RACE DAY</span>
          )}

          <span className={styles.dates}>{weekendDates}</span>
        </div>

        <svg className={styles.arrow} width="14" height="14" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M4.5 2.5L9 6l-4.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </button>
  )
}

export default RaceCountdownStrip
