import React from 'react'
import styles from './WeekHeader.module.css'

/**
 * WeekHeader
 * ----------
 * Заголовок поточного тижня з датами.
 *
 * Props:
 * @prop {string} weekStart — ISO дата понеділка ('YYYY-MM-DD')
 */
interface WeekHeaderProps {
  weekStart: string
}

const WeekHeader: React.FC<WeekHeaderProps> = ({ weekStart }) => {
  const mon = new Date(weekStart)
  const sun = new Date(weekStart)
  sun.setDate(mon.getDate() + 6)
  const fmt = (d: Date) => d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })

  return (
    <div className={styles.header}>
      <span className={styles.label}>Тиждень</span>
      <span className={styles.range}>{fmt(mon)} — {fmt(sun)}</span>
    </div>
  )
}

export default WeekHeader
