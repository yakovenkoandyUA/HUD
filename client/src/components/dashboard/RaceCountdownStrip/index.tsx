import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { F1Race } from '../../../data/f1Season2026'
import styles from './RaceCountdownStrip.module.css'

/**
 * RaceCountdownStrip
 * ------------------
 * Компактний горизонтальний рядок з F1 countdown до наступної гонки.
 * Відображається між календарем і блоком задач на Dashboard.
 *
 * Props:
 * @prop {F1Race} race — наступна гонка
 */
interface RaceCountdownStripProps {
  race: F1Race
}

interface Cd { d: number; h: number; m: number; s: number }

function getCountdown(date: string): Cd | null {
  const diff = new Date(date + 'T14:00:00Z').getTime() - Date.now()
  if (diff <= 0) return null
  const s = Math.floor(diff / 1000)
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 }
}

function pad(n: number) { return String(n).padStart(2, '0') }

const RaceCountdownStrip: React.FC<RaceCountdownStripProps> = ({ race }) => {
  const navigate = useNavigate()
  const [cd, setCd] = useState<Cd | null>(() => getCountdown(race.date))

  useEffect(() => {
    const id = setInterval(() => setCd(getCountdown(race.date)), 1000)
    return () => clearInterval(id)
  }, [race.date])

  return (
    <button
      type="button"
      className={styles.strip}
      onClick={() => navigate(`/f1/${race.round}`)}
    >
      <span className={styles.flag}>{race.flag}</span>
      <span className={styles.name}>{race.name.replace(' GP', '').toUpperCase()}</span>
      <span className={styles.sep} />
      {cd ? (
        <span className={styles.countdown}>
          <span className={styles.unit}>{cd.d}<span className={styles.sub}>д</span></span>
          <span className={styles.dot}>·</span>
          <span className={styles.unit}>{pad(cd.h)}<span className={styles.sub}>г</span></span>
          <span className={styles.dot}>·</span>
          <span className={styles.unit}>{pad(cd.m)}<span className={styles.sub}>хв</span></span>
          <span className={styles.dot}>·</span>
          <span className={styles.unit}>{pad(cd.s)}<span className={styles.sub}>с</span></span>
        </span>
      ) : (
        <span className={styles.raceDay}>RACE DAY 🏁</span>
      )}
      <svg className={styles.arrow} width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M4.5 2.5L9 6l-4.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  )
}

export default RaceCountdownStrip
