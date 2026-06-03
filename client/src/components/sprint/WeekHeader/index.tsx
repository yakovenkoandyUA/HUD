import React from 'react'
import type { UnifiedTodo } from '../../../types'
import { isRoutineDueOnDay } from '../../../utils/sprint'
import styles from './WeekHeader.module.css'

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * WeekHeader
 * ----------
 * Заголовок поточного тижня: назва, діапазон дат, 7 комірок днів.
 * Активний день — gold число + підкреслення. Під числом — до 3 точок рутин.
 * Тап по дню — викликає onDaySelect; вибраний день (не сьогодні) — text2 підкреслення.
 *
 * Props:
 * @prop {string}          weekStart        — ISO дата понеділка ('YYYY-MM-DD')
 * @prop {() => void}      [onExpand]       — відкрити розгорнутий вигляд тижня
 * @prop {boolean}         [hideTitle]      — приховати рядок "Тиждень / діапазон дат"
 * @prop {UnifiedTodo[]}   [routineItems]   — рутини для відображення точок
 * @prop {string}          [selectedDay]    — ISO вибраного дня ('YYYY-MM-DD')
 * @prop {(iso: string) => void} [onDaySelect] — callback при тапі на день
 */
interface WeekHeaderProps {
  weekStart: string
  onExpand?: () => void
  hideTitle?: boolean
  routineItems?: UnifiedTodo[]
  selectedDay?: string
  onDaySelect?: (iso: string) => void
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

const WeekHeader: React.FC<WeekHeaderProps> = ({ weekStart, onExpand, hideTitle, routineItems = [], selectedDay, onDaySelect }) => {
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
          const dayIso     = toIso(dayTime)

          const isSelected  = dayIso === selectedDay && !isToday
          const dayRoutines = routineItems.filter(t => isRoutineDueOnDay(t, dayTime)).slice(0, 3)

          return (
            <div
              key={i}
              className={`${styles.dayCell} ${isSelected ? styles.dayCellSelected : ''} ${onDaySelect ? styles.dayCellClickable : ''}`}
              onClick={() => onDaySelect?.(dayIso)}
            >
              <span className={`${styles.dayName} ${isToday ? styles.dayNameToday : isSelected ? styles.dayNameSelected : isDim ? styles.dayNameDim : ''}`}>
                {DAY_LABELS[i]}
              </span>
              <span className={`${styles.dayNumber} ${isToday ? styles.dayNumberToday : isSelected ? styles.dayNumberSelected : isDim ? styles.dayNumberDim : ''}`}>
                {day.getDate()}
              </span>
              <div className={styles.dotsRow}>
                {dayRoutines.map((t, di) => {
                  const done = t.completionLog?.includes(dayIso) ?? false
                  const dotClass = isToday
                    ? styles.dotToday
                    : done ? styles.dotDone : styles.dotPending
                  return <span key={di} className={`${styles.dot} ${dotClass}`} />
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default WeekHeader
