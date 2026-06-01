import React from 'react'
import type { UnifiedTodo } from '../../../types'
import { isRoutineDueOnDay } from '../../../utils/sprint'
import styles from './WeekHeader.module.css'

/**
 * WeekHeader
 * ----------
 * Заголовок поточного тижня: назва, діапазон дат, 7 комірок днів
 * з назвою дня, числом і крапкою.
 *
 * Props:
 * @prop {string}       weekStart  — ISO дата понеділка ('YYYY-MM-DD')
 * @prop {() => void}   onExpand   — відкрити розгорнутий вигляд тижня
 * @prop {boolean}      hideTitle  — приховати рядок "Тиждень / діапазон дат"
 */
interface WeekHeaderProps {
  weekStart: string
  onExpand?: () => void
  hideTitle?: boolean
  routineItems?: UnifiedTodo[]
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

const WeekHeader: React.FC<WeekHeaderProps> = ({ weekStart, onExpand, hideTitle, routineItems = [] }) => {
  const days = getWeekDays(weekStart)
  const mon  = days[0]
  const sun  = days[6]

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const fmt = (d: Date) => d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })
  const weekMonth = mon.getMonth()

  return (
    <div className={styles.header}>
      {!hideTitle && (
        <div className={styles.top}>
          <span className={styles.label}>Тиждень</span>
          <div className={styles.topRight}>
            <span className={styles.range}>{fmt(mon)} — {fmt(sun)}</span>
            {onExpand && (
              <button
                type="button"
                className={styles.expandBtn}
                onClick={onExpand}
                aria-label="Розгорнути тиждень"
              >
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <path d="M8 1h4v4M5 12H1V8M1.5 1.5l4 4M11.5 11.5l-4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      <div className={styles.weekRow}>
        {days.map((day, i) => {
          const dayTime = new Date(day)
          dayTime.setHours(0, 0, 0, 0)

          const isToday    = dayTime.getTime() === today.getTime()
          const isPast     = dayTime.getTime() < today.getTime()
          const isOverflow = day.getMonth() !== weekMonth
          const isDim      = (isPast || isOverflow) && !isToday
          const hasRoutines = routineItems.some(t => isRoutineDueOnDay(t, dayTime))

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
              <span className={`${styles.dot} ${isToday ? styles.dotToday : ''} ${!isToday && hasRoutines ? styles.dotRoutine : ''} ${isDim && !hasRoutines ? styles.dotDim : ''}`} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default WeekHeader
