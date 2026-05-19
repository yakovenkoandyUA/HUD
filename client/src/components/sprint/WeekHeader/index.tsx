import React from 'react'
import styles from './WeekHeader.module.css'

/**
 * WeekHeader
 * ----------
 * Заголовок поточного тижня з датами і 7 крапками днів.
 *
 * Props:
 * @prop {string} weekStart — ISO дата понеділка ('YYYY-MM-DD')
 */
interface WeekHeaderProps {
  weekStart: string
}

const DAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд']

const WeekHeader: React.FC<WeekHeaderProps> = ({ weekStart }) => {
  const mon = new Date(weekStart)
  const sun = new Date(weekStart)
  sun.setDate(mon.getDate() + 6)
  const fmt = (d: Date) => d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })

  // Monday=0 ... Sunday=6
  const todayDotIndex = (new Date().getDay() + 6) % 7

  return (
    <div className={styles.header}>
      <div className={styles.top}>
        <span className={styles.label}>Тиждень</span>
        <span className={styles.range}>{fmt(mon)} — {fmt(sun)}</span>
      </div>
      <div className={styles.dots}>
        {DAY_LABELS.map((day, i) => (
          <div key={day} className={styles.dotCol}>
            <span className={`${styles.dot} ${i === todayDotIndex ? styles.dotToday : ''}`} />
            <span className={`${styles.dotLabel} ${i === todayDotIndex ? styles.dotLabelToday : ''}`}>
              {day}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default WeekHeader
