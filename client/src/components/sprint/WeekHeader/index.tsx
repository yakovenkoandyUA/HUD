import React from 'react'
import styles from './WeekHeader.module.css'

/**
 * WeekHeader
 * ----------
 * Заголовок поточного тижня: назва, діапазон дат, 7 комірок днів
 * з назвою дня, числом і крапкою.
 *
 * Props:
 * @prop {string} weekStart — ISO дата понеділка ('YYYY-MM-DD')
 */
interface WeekHeaderProps {
  weekStart: string
}

const DAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд']

function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function getWeekDays(weekStart: string): Date[] {
  const mon = parseLocalDate(weekStart)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon)
    d.setDate(mon.getDate() + i)
    return d
  })
}

const WeekHeader: React.FC<WeekHeaderProps> = ({ weekStart }) => {
  const days = getWeekDays(weekStart)
  const mon  = days[0]
  const sun  = days[6]

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const fmt = (d: Date) => d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })
  const weekMonth = mon.getMonth()

  return (
    <div className={styles.header}>
      <div className={styles.top}>
        <span className={styles.label}>Тиждень</span>
        <span className={styles.range}>{fmt(mon)} — {fmt(sun)}</span>
      </div>

      <div className={styles.weekRow}>
        {days.map((day, i) => {
          const dayTime = new Date(day)
          dayTime.setHours(0, 0, 0, 0)

          const isToday    = dayTime.getTime() === today.getTime()
          const isPast     = dayTime.getTime() < today.getTime()
          const isOverflow = day.getMonth() !== weekMonth
          const isDim      = (isPast || isOverflow) && !isToday

          return (
            <div
              key={i}
              className={`${styles.dayCell} ${isToday ? styles.dayCellToday : ''}`}
            >
              <span className={`${styles.dayName} ${isToday ? styles.dayNameToday : ''}`}>
                {DAY_LABELS[i]}
              </span>
              <span className={`${styles.dayNumber} ${isToday ? styles.dayNumberToday : ''} ${isDim ? styles.dayNumberDim : ''}`}>
                {day.getDate()}
              </span>
              <span className={`${styles.dot} ${isToday ? styles.dotToday : ''} ${isDim ? styles.dotDim : ''}`} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default WeekHeader
