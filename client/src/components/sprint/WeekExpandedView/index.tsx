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
 * Внизу — статистика виконання рутин за 4 тижні.
 * Тап на майбутню задачу → підтвердження дострокового виконання.
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

interface ConfirmItem {
  id: string
  title: string
  scheduledDate: string
}

const DAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд']
const DAY_SHORT  = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
const MONTHS_SHORT = ['січ.', 'лют.', 'бер.', 'квіт.', 'трав.', 'черв.', 'лип.', 'серп.', 'вер.', 'жовт.', 'лист.', 'груд.']

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

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatScheduledDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return `${DAY_SHORT[date.getDay()]} ${d} ${MONTHS_SHORT[m - 1]}`
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

interface WeekStat { done: number; total: number }

function calcWeekStats(routineItems: UnifiedTodo[]): WeekStat[] {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const currentMonday = new Date(today)
  currentMonday.setDate(today.getDate() - (today.getDay() + 6) % 7)
  currentMonday.setHours(0, 0, 0, 0)
  const lastMonday = new Date(currentMonday)
  lastMonday.setDate(currentMonday.getDate() - 7)

  return Array.from({ length: 4 }, (_, wi) => {
    const mon = new Date(lastMonday)
    mon.setDate(lastMonday.getDate() - (3 - wi) * 7)
    mon.setHours(0, 0, 0, 0)

    let total = 0
    let done  = 0

    for (let di = 0; di < 7; di++) {
      const day = new Date(mon); day.setDate(mon.getDate() + di)
      day.setHours(0, 0, 0, 0)
      if (day > today) break

      const dayIso = toIso(day)
      routineItems.forEach(t => {
        if (!isRoutineDueOnDay(t, day)) return
        total++
        if (t.completionLog?.includes(dayIso)) done++
      })
    }

    return { done, total }
  })
}

const WeekExpandedView: React.FC<WeekExpandedViewProps> = ({
  weekStart, routineItems, onToggle, onOpenDetail, onClose,
}) => {
  const days    = getWeekDays(weekStart)
  const today   = new Date(); today.setHours(0, 0, 0, 0)
  const todayStr = toIso(today)

  const [completing, setCompleting] = useState<Set<string>>(new Set())
  const [closing, setClosing]       = useState(false)
  const [confirmItem, setConfirmItem] = useState<ConfirmItem | null>(null)

  const handleClose = () => {
    setClosing(true)
    setTimeout(onClose, 210)
  }

  const handleTap = (id: string) => {
    if (completing.has(id)) return
    setCompleting(prev => new Set(prev).add(id))
    setTimeout(() => {
      onToggle(id)
      setCompleting(prev => { const s = new Set(prev); s.delete(id); return s })
    }, 360)
  }

  // Decide whether to complete immediately or ask for confirmation
  const handleCheckboxTap = (task: UnifiedTodo, isDoneForDay: boolean) => {
    if (isDoneForDay) {
      // Undo — always immediate
      onToggle(task.id)
      return
    }
    // Future task: nextDue is strictly after today → ask confirmation
    if (task.nextDue && task.nextDue > todayStr) {
      setConfirmItem({ id: task.id, title: task.title, scheduledDate: task.nextDue })
      return
    }
    // Today or overdue → mark immediately
    handleTap(task.id)
  }

  const handleConfirm = () => {
    if (!confirmItem) return
    handleTap(confirmItem.id)
    setConfirmItem(null)
  }

  const fmt = (d: Date) => d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })

  const weekStats = calcWeekStats(routineItems)
  const totalDone = weekStats.reduce((s, w) => s + w.done, 0)
  const showStats = totalDone > 0

  return (
    <div className={`${styles.overlay} ${closing ? styles.overlayClosing : ''}`}>

      {/* ── Top bar ── */}
      <div className={styles.topBar}>
        <div className={styles.topBarInfo}>
          <span className={styles.topBarTitle}>Тиждень</span>
          <span className={styles.topBarRange}>{fmt(days[0])} — {fmt(days[6])}</span>
        </div>
        <button type="button" className={styles.closeBtn} onClick={handleClose} aria-label="Закрити">
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
                    const isDoneForDay = t.completionLog?.includes(toIso(dt)) ?? false
                    const isAnimating  = completing.has(t.id)
                    const isDone       = isAnimating || isDoneForDay
                    const repeatLabel  = getRepeatLabel(t)

                    return (
                      <div key={t.id} className={`${styles.taskRow} ${isAnimating ? styles.taskRowDone : ''} ${isDoneForDay && !isAnimating ? styles.taskRowCompleted : ''}`}>
                        <button
                          type="button"
                          className={styles.checkboxWrapper}
                          onClick={() => handleCheckboxTap(t, isDoneForDay)}
                          aria-label="Виконати"
                        >
                          <span className={`${styles.circle} ${isDone ? styles.circleChecked : styles.circleGold}`}>
                            {isDone && (
                              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                                <path d="M1 4l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </span>
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

        {/* ── Stats block ── */}
        {showStats && (
          <div className={styles.stats}>
            <span className={styles.statsTitle}>Статистика рутин</span>
            <div className={styles.statsRows}>
              {weekStats.map((w, i) => {
                const pct = w.total > 0 ? w.done / w.total : 0
                return (
                  <div key={i} className={styles.statsRow}>
                    <span className={styles.statsWeekLabel}>тиж {i + 1}</span>
                    <div className={styles.statsBar}>
                      <div className={styles.statsBarFill} style={{ width: `${pct * 100}%` }} />
                    </div>
                    <span className={styles.statsCount}>{w.done} / {w.total}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Early-completion confirmation dialog ── */}
      {confirmItem && (
        <div className={styles.confirmBackdrop} onClick={() => setConfirmItem(null)}>
          <div className={styles.confirmCard} onClick={e => e.stopPropagation()}>
            <p className={styles.confirmTitle}>Виконати достроково?</p>
            <p className={styles.confirmBody}>
              <span className={styles.confirmTaskName}>&ldquo;{confirmItem.title}&rdquo;</span>{' '}
              заплановано на {formatScheduledDate(confirmItem.scheduledDate)}
            </p>
            <div className={styles.confirmActions}>
              <button
                type="button"
                className={styles.confirmCancel}
                onClick={() => setConfirmItem(null)}
              >
                Скасувати
              </button>
              <button
                type="button"
                className={styles.confirmDo}
                onClick={handleConfirm}
              >
                Виконати
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default WeekExpandedView
