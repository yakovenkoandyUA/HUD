import React, { useState } from 'react'
import type { UnifiedTodo } from '../../../types'
import styles from './WeekExpandedView.module.css'

/**
 * WeekExpandedView
 * ----------------
 * Повноекранний overlay тижневих рутин у вигляді вертикального списку.
 * Показує лише дні, що мають хоча б одну рутину. Тап → відмітити виконаною.
 *
 * Props:
 * @prop {string}               weekStart    — ISO дата понеділка ('YYYY-MM-DD')
 * @prop {UnifiedTodo[]}        routineItems — задачі з repeat !== 'none'
 * @prop {(id: string) => void} onToggle     — перемикання рутини
 * @prop {() => void}           onClose      — закрити overlay
 */
interface WeekExpandedViewProps {
  weekStart: string
  routineItems: UnifiedTodo[]
  onToggle: (id: string) => void
  onClose: () => void
}

const DAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд']

const REPEAT_BADGE: Record<string, string> = {
  daily:   'ЩОДНЯ',
  weekly:  'ЩОТИЖНЯ',
  monthly: 'ЩОМІСЯЦЯ',
}

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

function isRoutineDueOnDay(task: UnifiedTodo, day: Date): boolean {
  if (!task.repeat || task.repeat === 'none') return false
  if (task.repeat === 'daily') return true
  if (task.repeat === 'weekly') {
    if (!task.nextDue) return false
    return day.getDay() === parseLocalDate(task.nextDue).getDay()
  }
  if (task.repeat === 'monthly') {
    const dom = task.repeatDay ?? (task.nextDue ? parseInt(task.nextDue.split('-')[2], 10) : null)
    return dom !== null && day.getDate() === dom
  }
  return false
}

function formatDueLabel(task: UnifiedTodo, today: Date): string {
  if (task.repeat === 'daily') return 'Щодня'
  if (!task.nextDue) return ''
  const target = parseLocalDate(task.nextDue); target.setHours(0, 0, 0, 0)
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000)
  if (diff < 0)  return 'Прострочено'
  if (diff === 0) return 'Сьогодні'
  if (diff === 1) return 'Завтра'
  const DAYS   = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
  const MONTHS = ['січ.', 'лют.', 'бер.', 'квіт.', 'трав.', 'черв.', 'лип.', 'серп.', 'вер.', 'жовт.', 'лист.', 'груд.']
  return `${DAYS[target.getDay()]} ${target.getDate()} ${MONTHS[target.getMonth()]}`
}

const WeekExpandedView: React.FC<WeekExpandedViewProps> = ({
  weekStart, routineItems, onToggle, onClose,
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

  const daysWithRoutines = days
    .map((day, i) => ({ day, i, routines: routineItems.filter(t => isRoutineDueOnDay(t, day)) }))
    .filter(({ routines }) => routines.length > 0)

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

      {/* ── Vertical day list ── */}
      <div className={styles.list}>
        {daysWithRoutines.length === 0 && (
          <div className={styles.empty}>
            <span className={styles.emptyText}>Рутин на цьому тижні немає</span>
          </div>
        )}

        {daysWithRoutines.map(({ day, i, routines }) => {
          const dt      = new Date(day); dt.setHours(0, 0, 0, 0)
          const isToday = dt.getTime() === today.getTime()

          return (
            <div key={i} className={styles.daySection}>

              {/* Day header */}
              <div className={`${styles.dayHeader} ${isToday ? styles.dayHeaderToday : ''}`}>
                <span className={`${styles.dayLabel} ${isToday ? styles.dayLabelToday : ''}`}>
                  {DAY_LABELS[i]}
                </span>
                <span className={`${styles.dayDate} ${isToday ? styles.dayDateToday : ''}`}>
                  {day.getDate()} {day.toLocaleDateString('uk-UA', { month: 'short' })}
                </span>
                {isToday && <span className={styles.todayDot} />}
              </div>

              {/* Routines for this day */}
              <div className={styles.routineList}>
                {routines.map(t => {
                  const dueLabel  = formatDueLabel(t, today)
                  const badgeText = t.repeat ? REPEAT_BADGE[t.repeat] : ''
                  const isDone    = completing.has(t.id)

                  return (
                    <button
                      key={t.id}
                      type="button"
                      className={`${styles.routineRow} ${isDone ? styles.routineRowDone : ''}`}
                      onClick={() => handleTap(t.id)}
                    >
                      <div className={styles.routineCheck}>
                        {isDone && (
                          <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                            <path d="M1.5 4.5l2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>

                      <span className={styles.routineTitle}>{t.title}</span>

                      <div className={styles.routineMeta}>
                        {badgeText && (
                          <span className={styles.repeatBadge}>{badgeText}</span>
                        )}
                        {dueLabel && dueLabel !== 'Щодня' && (
                          <span className={`${styles.dueBadge} ${dueLabel === 'Прострочено' ? styles.dueBadgeOverdue : ''} ${dueLabel === 'Сьогодні' ? styles.dueBadgeToday : ''}`}>
                            {dueLabel}
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

    </div>
  )
}

export default WeekExpandedView
