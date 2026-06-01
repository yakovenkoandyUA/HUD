import React, { useState } from 'react'
import type { UnifiedTodo } from '../../../types'
import { isRoutineDueOnDay } from '../../../utils/sprint'
import styles from './WeekExpandedView.module.css'

/**
 * WeekExpandedView
 * ----------------
 * Повноекранний overlay тижневих рутин у вигляді timeline.
 * Зліва — день (аббревіатура + число), справа — задачі.
 * Сьогодні виділено золотим; дні без задач — 35% opacity.
 *
 * Props:
 * @prop {string}               weekStart      — ISO дата понеділка ('YYYY-MM-DD')
 * @prop {UnifiedTodo[]}        routineItems   — задачі з repeat !== 'none'
 * @prop {(id: string) => void} onToggle       — відмітити як виконану
 * @prop {(id: string) => void} onOpenDetail   — відкрити модальне редагування
 * @prop {() => void}           onClose        — закрити overlay
 */
interface WeekExpandedViewProps {
  weekStart: string
  routineItems: UnifiedTodo[]
  onToggle: (id: string) => void
  onOpenDetail?: (id: string) => void
  onClose: () => void
}

const DAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд']

function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function getWeekDays(weekStart: string): Date[] {
  const mon = parseLocalDate(weekStart)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon); d.setDate(mon.getDate() + i); return d
  })
}

function getRepeatLabel(task: UnifiedTodo): string {
  if (task.repeat === 'daily')   return 'щодня'
  if (task.repeat === 'weekly')  return 'щотижня'
  if (task.repeat === 'monthly') return 'щомісяця'
  if (task.repeat === 'yearly')  return 'щороку'
  if (task.repeat === 'custom' && task.repeatConfig) {
    const { interval, unit } = task.repeatConfig
    if (unit === 'day')   return interval === 1 ? 'щодня'     : `кожні ${interval} дн.`
    if (unit === 'week')  return interval === 1 ? 'щотижня'   : `кожні ${interval} тиж.`
    if (unit === 'month') return interval === 1 ? 'щомісяця'  : `кожні ${interval} міс.`
    if (unit === 'year')  return interval === 1 ? 'щороку'    : `кожні ${interval} р.`
  }
  return ''
}

const WeekExpandedView: React.FC<WeekExpandedViewProps> = ({
  weekStart, routineItems, onToggle, onOpenDetail, onClose,
}) => {
  const days  = getWeekDays(weekStart)
  const today = new Date(); today.setHours(0, 0, 0, 0)

  const [completing, setCompleting] = useState<Set<string>>(new Set())

  const handleTap = (id: string) => {
    if (completing.has(id)) return
    setCompleting(prev => new Set(prev).add(id))
    setTimeout(() => {
      onToggle(id)
      setCompleting(prev => { const s = new Set(prev); s.delete(id); return s })
    }, 360)
  }

  const fmt = (d: Date) => d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })

  return (
    <div className={styles.overlay}>

      {/* ── Top bar ── */}
      <div className={styles.topBar}>
        <div className={styles.topBarInfo}>
          <span className={styles.topBarTitle}>Тиждень</span>
          <span className={styles.topBarRange}>{fmt(days[0])} — {fmt(days[6])}</span>
        </div>
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Закрити">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* ── Timeline ── */}
      <div className={styles.timeline}>
        {days.map((day, i) => {
          const dt          = new Date(day); dt.setHours(0, 0, 0, 0)
          const isToday     = dt.getTime() === today.getTime()
          const dayRoutines = routineItems.filter(t => isRoutineDueOnDay(t, dt))
          const hasRoutines = dayRoutines.length > 0

          return (
            <div
              key={i}
              className={`${styles.timelineRow} ${!hasRoutines ? styles.timelineRowEmpty : ''}`}
            >
              {/* Left: day label + date number */}
              <div className={`${styles.dayCol} ${isToday ? styles.dayColToday : ''}`}>
                <span className={styles.dayAbbr}>{DAY_LABELS[i]}</span>
                <span className={styles.dayNum}>{day.getDate()}</span>
              </div>

              {/* Right: tasks or dash */}
              <div className={styles.taskCol}>
                {!hasRoutines ? (
                  <span className={styles.emptyDash}>—</span>
                ) : (
                  dayRoutines.map(t => {
                    const isDone      = completing.has(t.id)
                    const repeatLabel = getRepeatLabel(t)
                    const circleClass = t.type === 'shopping' ? styles.circleGold : styles.circlePurple

                    return (
                      <div key={t.id} className={`${styles.taskRow} ${isDone ? styles.taskRowDone : ''}`}>
                        <button
                          type="button"
                          className={`${styles.circle} ${circleClass}`}
                          onClick={() => handleTap(t.id)}
                          aria-label="Виконати"
                        >
                          {isDone && (
                            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                              <path d="M1 4l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </button>

                        <button
                          type="button"
                          className={styles.taskName}
                          onClick={() => onOpenDetail?.(t.id)}
                        >
                          {t.title}
                        </button>

                        {repeatLabel && (
                          <span className={styles.repeatLabel}>{repeatLabel}</span>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>

    </div>
  )
}

export default WeekExpandedView
