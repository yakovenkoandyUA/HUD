import React, { useState, useRef } from 'react'
import { useModalHistory } from '../../../hooks/useModalHistory'
import type { UnifiedTodo } from '../../../types'
import { isRoutineDueOnDay, isRecurring } from '../../../utils/sprint'
import styles from './WeekExpandedView.module.css'

/**
 * WeekExpandedView
 * ----------------
 * Повноекранний overlay з трьома вкладками:
 * - МІСЯЦЬ: сітка місяця з крапками-індикаторами задач, навігація < >
 * - ТИЖДЕНЬ: timeline рутин поточного тижня
 * - ДЕНЬ: рутини + задачі для вибраного дня
 *
 * Props:
 * @prop {string}               weekStart      — ISO дата понеділка ('YYYY-MM-DD')
 * @prop {UnifiedTodo[]}        routineItems   — задачі з repeat !== 'none'
 * @prop {UnifiedTodo[]}        [allItems]     — всі задачі (для ДЕНЬ-вкладки)
 * @prop {(id: string, date?: string) => void} onToggle — відмітити як виконану
 * @prop {(id: string) => void} [onOpenDetail] — відкрити модальне редагування
 * @prop {() => void}           onClose        — закрити overlay
 * @prop {string}               [initialDay]   — початково вибраний день
 */
interface WeekExpandedViewProps {
  weekStart: string
  routineItems: UnifiedTodo[]
  allItems?: UnifiedTodo[]
  onToggle: (id: string, date?: string) => void
  onOpenDetail?: (id: string) => void
  onClose: () => void
  initialDay?: string
}

interface ConfirmItem {
  id: string
  title: string
  calendarDate: string
}

type Tab = 'month' | 'week' | 'day'

const DAY_LABELS   = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд']
const DAY_SHORT    = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
const MONTHS_SHORT = ['січ.', 'лют.', 'бер.', 'квіт.', 'трав.', 'черв.', 'лип.', 'серп.', 'вер.', 'жовт.', 'лист.', 'груд.']
const MONTHS_FULL  = ['Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень', 'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень']

function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getWeekDays(weekStart: string): Date[] {
  const mon = parseLocalDate(weekStart)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon); d.setDate(mon.getDate() + i); return d
  })
}

function getMonthGrid(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1)
  const lastDay  = new Date(year, month + 1, 0)
  const startOff = (firstDay.getDay() + 6) % 7
  const endOff   = (6 - (lastDay.getDay() + 6) % 7) % 7
  const cells: Date[] = []
  for (let i = -startOff; i < lastDay.getDate() + endOff; i++) {
    cells.push(new Date(year, month, 1 + i))
  }
  return cells
}

type DotStatus = 'none' | 'pending' | 'done' | 'overdue'

function getRoutineDotStatus(date: Date, routines: UnifiedTodo[], today: Date): DotStatus {
  const dateIso = toIso(date)
  const due = routines.filter(t => isRoutineDueOnDay(t, date))
  if (due.length === 0) return 'none'
  const allDone = due.every(t => t.completionLog?.includes(dateIso))
  if (allDone) return 'done'
  const isPast  = date.getTime() < today.getTime()
  const isToday = date.getTime() === today.getTime()
  if (isPast && !isToday) return 'overdue'
  return 'pending'
}

function formatScheduledDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return `${DAY_SHORT[date.getDay()]} ${d} ${MONTHS_SHORT[m - 1]}`
}

function formatDayHeader(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return `${DAY_SHORT[date.getDay()]}, ${d} ${MONTHS_SHORT[m - 1]} ${y}`
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
    let total = 0, done = 0
    for (let di = 0; di < 7; di++) {
      const day = new Date(mon); day.setDate(mon.getDate() + di); day.setHours(0, 0, 0, 0)
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
  weekStart, routineItems, allItems = [], onToggle, onOpenDetail, onClose, initialDay,
}) => {
  useModalHistory(onClose, true)

  const today    = new Date(); today.setHours(0, 0, 0, 0)
  const todayStr = toIso(today)

  const [tab, setTab]             = useState<Tab>('week')
  const [vmYear, setVmYear]       = useState(today.getFullYear())
  const [vmMonth, setVmMonth]     = useState(today.getMonth())
  const [selectedDay, setSelectedDay] = useState(initialDay ?? todayStr)
  const [closing, setClosing]     = useState(false)
  const [completing, setCompleting] = useState<Map<string, string>>(new Map())
  const [confirmItem, setConfirmItem] = useState<ConfirmItem | null>(null)

  const swipeX = useRef<number | null>(null)
  const swipeY = useRef<number | null>(null)

  const handleClose = () => { setClosing(true); setTimeout(onClose, 210) }

  const pickDay = (iso: string) => { setSelectedDay(iso); setTab('day') }

  const prevMonth = () => {
    if (vmMonth === 0) { setVmMonth(11); setVmYear(y => y - 1) }
    else setVmMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (vmMonth === 11) { setVmMonth(0); setVmYear(y => y + 1) }
    else setVmMonth(m => m + 1)
  }

  const onGridTouchStart = (e: React.TouchEvent) => {
    swipeX.current = e.touches[0].clientX
    swipeY.current = e.touches[0].clientY
  }
  const onGridTouchEnd = (e: React.TouchEvent) => {
    if (swipeX.current === null || swipeY.current === null) return
    const dx = e.changedTouches[0].clientX - swipeX.current
    const dy = e.changedTouches[0].clientY - swipeY.current
    swipeX.current = null; swipeY.current = null
    if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx) * 0.8) return
    if (dx < 0) nextMonth(); else prevMonth()
  }

  // Week view logic
  const handleTap = (id: string, calendarDate: string) => {
    if (completing.has(id)) return
    setCompleting(prev => new Map(prev).set(id, calendarDate))
    setTimeout(() => {
      onToggle(id, calendarDate)
      setCompleting(prev => { const m = new Map(prev); m.delete(id); return m })
    }, 360)
  }

  const handleCheckboxTap = (task: UnifiedTodo, isDoneForDay: boolean, calendarDate: string) => {
    if (isDoneForDay) { onToggle(task.id, calendarDate); return }
    if (calendarDate > todayStr) { setConfirmItem({ id: task.id, title: task.title, calendarDate }); return }
    handleTap(task.id, calendarDate)
  }

  const handleConfirm = () => {
    if (!confirmItem) return
    handleTap(confirmItem.id, confirmItem.calendarDate)
    setConfirmItem(null)
  }

  const fmt = (d: Date) => d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })
  const days = getWeekDays(weekStart)

  // ── Day view ──────────────────────────────────────────────────────────────────

  const renderDay = () => {
    const selDate = parseLocalDate(selectedDay)
    selDate.setHours(0, 0, 0, 0)
    const isToday = selectedDay === todayStr

    const dayRoutines = routineItems.filter(t => isRoutineDueOnDay(t, selDate))
    const dayTasks = allItems.filter(t => {
      if (isRecurring(t)) return false
      if (t.done) return false
      if (t.dueDate === selectedDay) return true
      if (isToday && !t.dueDate) return true
      return false
    })

    const isEmpty = dayRoutines.length === 0 && dayTasks.length === 0

    return (
      <div className={styles.timeline}>
        <div className={styles.dayViewHeader}>
          <span className={styles.dayViewDate}>{formatDayHeader(selectedDay)}</span>
          {isToday && <span className={styles.dayViewTodayBadge}>сьогодні</span>}
        </div>

        {isEmpty && (
          <p className={styles.emptyDay}>Немає задач на цей день</p>
        )}

        {dayRoutines.length > 0 && (
          <>
            <p className={styles.daySectionLabel}>Рутини</p>
            {dayRoutines.map(t => {
              const isDoneForDay = t.completionLog?.includes(selectedDay) ?? false
              const isAnimating  = completing.get(t.id) === selectedDay
              const isDone       = isAnimating || isDoneForDay
              const repeatLabel  = getRepeatLabel(t)
              return (
                <div key={t.id} className={`${styles.taskRow} ${isAnimating ? styles.taskRowDone : ''} ${isDoneForDay && !isAnimating ? styles.taskRowCompleted : ''}`}>
                  <button type="button" className={styles.checkboxWrapper} onClick={() => handleCheckboxTap(t, isDoneForDay, selectedDay)}>
                    <span className={`${styles.circle} ${isDone ? styles.circleChecked : styles.circleGold}`}>
                      {isDone && (
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                          <path d="M1 4l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </span>
                  </button>
                  <button type="button" className={styles.taskName} onClick={() => onOpenDetail?.(t.id)}>
                    {t.title}
                  </button>
                  {repeatLabel && <span className={styles.repeatLabel}>{repeatLabel}</span>}
                </div>
              )
            })}
          </>
        )}

        {dayTasks.length > 0 && (
          <>
            <p className={styles.daySectionLabel}>Квести</p>
            {dayTasks.map(t => (
              <div key={t.id} className={`${styles.taskRow} ${t.done ? styles.taskRowCompleted : ''}`}>
                <button type="button" className={styles.checkboxWrapper} onClick={() => onToggle(t.id)}>
                  <span className={`${styles.circle} ${t.done ? styles.circleChecked : styles.circleGold}`}>
                    {t.done && (
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                        <path d="M1 4l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </span>
                </button>
                <button type="button" className={styles.taskName} onClick={() => onOpenDetail?.(t.id)}>
                  {t.title}
                </button>
              </div>
            ))}
          </>
        )}
      </div>
    )
  }

  // ── Week view (existing timeline) ─────────────────────────────────────────────

  const renderWeek = () => {
    const weekStats = calcWeekStats(routineItems)
    const totalDone = weekStats.reduce((s, w) => s + w.done, 0)

    return (
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
              <div className={`${styles.dayCol} ${isToday ? styles.dayColToday : ''}`}>
                <span className={styles.dayAbbr}>{DAY_LABELS[i]}</span>
                <span className={styles.dayNum}>{day.getDate()}</span>
              </div>

              <div className={styles.taskCol}>
                {!hasRoutines ? (
                  <span className={styles.emptyDash}>—</span>
                ) : (
                  dayRoutines.map(t => {
                    const isDoneForDay = t.completionLog?.includes(toIso(dt)) ?? false
                    const isAnimating  = completing.get(t.id) === toIso(dt)
                    const isDone       = isAnimating || isDoneForDay
                    const repeatLabel  = getRepeatLabel(t)

                    return (
                      <div key={t.id} className={`${styles.taskRow} ${isAnimating ? styles.taskRowDone : ''} ${isDoneForDay && !isAnimating ? styles.taskRowCompleted : ''}`}>
                        <button
                          type="button"
                          className={styles.checkboxWrapper}
                          onClick={() => handleCheckboxTap(t, isDoneForDay, toIso(dt))}
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

                        <button type="button" className={styles.taskName} onClick={() => onOpenDetail?.(t.id)}>
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

        {totalDone > 0 && (
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
    )
  }

  // ── Month view ────────────────────────────────────────────────────────────────

  const renderMonth = () => {
    const grid = getMonthGrid(vmYear, vmMonth)

    return (
      <div className={styles.monthWrap}>
        {/* Month nav */}
        <div className={styles.monthNav}>
          <button type="button" className={styles.monthNavBtn} onClick={prevMonth} aria-label="Попередній місяць">
            <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
              <path d="M6 1.5L3 4.5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <span className={styles.monthNavTitle}>
            {MONTHS_FULL[vmMonth]} {vmYear}
          </span>
          <button type="button" className={styles.monthNavBtn} onClick={nextMonth} aria-label="Наступний місяць">
            <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
              <path d="M3 1.5L6 4.5l-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Day-of-week labels */}
        <div className={styles.monthDowRow}>
          {DAY_LABELS.map(l => (
            <span key={l} className={styles.monthDow}>{l}</span>
          ))}
        </div>

        {/* Grid */}
        <div
          className={styles.monthGrid}
          onTouchStart={onGridTouchStart}
          onTouchEnd={onGridTouchEnd}
        >
          {grid.map((day, i) => {
            day.setHours(0, 0, 0, 0)
            const iso        = toIso(day)
            const isCurMonth = day.getMonth() === vmMonth
            const isToday    = iso === todayStr
            const isSel      = iso === selectedDay
            const dotStatus  = getRoutineDotStatus(day, routineItems, today)
            const hasTask    = allItems.some(t => !isRecurring(t) && t.dueDate === iso)

            return (
              <button
                key={i}
                type="button"
                className={`${styles.gridDay} ${!isCurMonth ? styles.gridDayOther : ''} ${isToday ? styles.gridDayToday : ''} ${isSel ? styles.gridDaySelected : ''}`}
                onClick={() => pickDay(iso)}
              >
                <span className={styles.gridDayNum}>{day.getDate()}</span>
                <div className={styles.gridDots}>
                  {dotStatus !== 'none' && (
                    <span className={`${styles.gridDot} ${
                      dotStatus === 'done'    ? styles.gridDotDone :
                      dotStatus === 'overdue' ? styles.gridDotOverdue :
                      styles.gridDotPending
                    }`} />
                  )}
                  {hasTask && <span className={`${styles.gridDot} ${styles.gridDotTask}`} />}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // ── TopBar title ──────────────────────────────────────────────────────────────

  const topBarTitle = tab === 'month'
    ? 'Календар'
    : tab === 'week'
    ? 'Тиждень'
    : formatDayHeader(selectedDay)

  const topBarSub = tab === 'week'
    ? `${fmt(days[0])} — ${fmt(days[6])}`
    : null

  return (
    <div className={`${styles.overlay} ${closing ? styles.overlayClosing : ''}`}>

      {/* ── Top bar ── */}
      <div className={styles.topBar}>
        <div className={styles.topBarInfo}>
          <span className={styles.topBarTitle}>{topBarTitle}</span>
          {topBarSub && <span className={styles.topBarRange}>{topBarSub}</span>}
        </div>
        <button type="button" className={styles.closeBtn} onClick={handleClose} aria-label="Закрити">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* ── Tabs ── */}
      <div className={styles.tabs}>
        {(['month', 'week', 'day'] as const).map(t => (
          <button
            key={t}
            type="button"
            className={`${styles.tabBtn} ${tab === t ? styles.tabBtnActive : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'month' ? 'МІСЯЦЬ' : t === 'week' ? 'ТИЖДЕНЬ' : 'ДЕНЬ'}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      {tab === 'month' && renderMonth()}
      {tab === 'week'  && renderWeek()}
      {tab === 'day'   && renderDay()}

      {/* ── Early-completion confirmation dialog ── */}
      {confirmItem && (
        <div className={styles.confirmBackdrop} onClick={() => setConfirmItem(null)}>
          <div className={styles.confirmCard} onClick={e => e.stopPropagation()}>
            <p className={styles.confirmTitle}>Виконати достроково?</p>
            <p className={styles.confirmBody}>
              <span className={styles.confirmTaskName}>&ldquo;{confirmItem.title}&rdquo;</span>{' '}
              заплановано на {formatScheduledDate(confirmItem.calendarDate)}
            </p>
            <div className={styles.confirmActions}>
              <button type="button" className={styles.confirmCancel} onClick={() => setConfirmItem(null)}>
                Скасувати
              </button>
              <button type="button" className={styles.confirmDo} onClick={handleConfirm}>
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
