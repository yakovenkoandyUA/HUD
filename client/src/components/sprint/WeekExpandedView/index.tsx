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
 * @prop {(iso: string) => void} [onAddForDay] — відкрити форму додавання для конкретної дати
 */
interface WeekExpandedViewProps {
  weekStart: string
  routineItems: UnifiedTodo[]
  allItems?: UnifiedTodo[]
  onToggle: (id: string, date?: string) => void
  onOpenDetail?: (id: string) => void
  onClose: () => void
  initialDay?: string
  onAddForDay?: (iso: string) => void
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

function addWeeks(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + n * 7)
  return toIso(date)
}

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

interface WeekStat { done: number; total: number; mondayIso: string; isCurrent: boolean }

function calcWeekStats(routineItems: UnifiedTodo[]): WeekStat[] {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const currentMonday = new Date(today)
  currentMonday.setDate(today.getDate() - (today.getDay() + 6) % 7)
  currentMonday.setHours(0, 0, 0, 0)

  return Array.from({ length: 4 }, (_, wi) => {
    const mon = new Date(currentMonday)
    mon.setDate(currentMonday.getDate() - (3 - wi) * 7)
    mon.setHours(0, 0, 0, 0)
    const mondayIso = toIso(mon)
    const isCurrent = wi === 3
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
    return { done, total, mondayIso, isCurrent }
  })
}

const WeekExpandedView: React.FC<WeekExpandedViewProps> = ({
  weekStart, routineItems, allItems = [], onToggle, onOpenDetail, onClose, initialDay, onAddForDay,
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
  const [panelDay, setPanelDay]       = useState<string>(initialDay ?? todayStr)
  const [viewWeekStart, setViewWeekStart] = useState(weekStart)

  const swipeX = useRef<number | null>(null)
  const swipeY = useRef<number | null>(null)
  const weekSlideDirRef = useRef<'fromRight' | 'fromLeft'>('fromRight')

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
      return t.dueDate === selectedDay
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

  // ── Week view ─────────────────────────────────────────────────────────────────

  const goToPrevWeek = () => {
    weekSlideDirRef.current = 'fromLeft'
    setViewWeekStart(prev => addWeeks(prev, -1))
  }
  const goToNextWeek = () => {
    weekSlideDirRef.current = 'fromRight'
    setViewWeekStart(prev => addWeeks(prev, 1))
  }
  const goToCurrentWeek = () => {
    weekSlideDirRef.current = viewWeekStart > weekStart ? 'fromLeft' : 'fromRight'
    setViewWeekStart(weekStart)
  }

  const onWeekTouchStart = (e: React.TouchEvent) => {
    swipeX.current = e.touches[0].clientX
    swipeY.current = e.touches[0].clientY
  }
  const onWeekTouchEnd = (e: React.TouchEvent) => {
    if (swipeX.current === null || swipeY.current === null) return
    const dx = e.changedTouches[0].clientX - swipeX.current
    const dy = e.changedTouches[0].clientY - swipeY.current
    swipeX.current = null; swipeY.current = null
    if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx) * 0.8) return
    if (dx < 0) goToNextWeek(); else goToPrevWeek()
  }

  const renderWeek = () => {
    const viewDays   = getWeekDays(viewWeekStart)
    const weekStats  = calcWeekStats(routineItems)
    const isThisWeek = viewWeekStart === weekStart

    return (
      <div
        className={styles.timeline}
        onTouchStart={onWeekTouchStart}
        onTouchEnd={onWeekTouchEnd}
      >
        {/* Week navigation */}
        <div className={styles.weekNav}>
          <button type="button" className={styles.weekNavBtn} onClick={goToPrevWeek} aria-label="Попередній тиждень">
            <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
              <path d="M6 1.5L3 4.5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <span className={styles.weekNavRange}>
            {fmt(viewDays[0])} — {fmt(viewDays[6])}
          </span>
          <button type="button" className={styles.weekNavBtn} onClick={goToNextWeek} aria-label="Наступний тиждень">
            <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
              <path d="M3 1.5L6 4.5l-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <div className={styles.weekDaysWrap}>
          <div key={viewWeekStart} className={`${styles.weekDaysSlide} ${weekSlideDirRef.current === 'fromRight' ? styles.weekSlideFromRight : styles.weekSlideFromLeft}`}>
        {viewDays.map((day, i) => {
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
          </div>
        </div>

        {!isThisWeek && (
          <button type="button" className={styles.weekReturnBtn} onClick={goToCurrentWeek}>
            Повернутись на сьогодні
          </button>
        )}

        {weekStats.some(w => w.total > 0) && (
          <div className={styles.stats}>
            <div className={styles.statsHeader}>
              <span className={styles.statsTitle}>Статистика рутин</span>
            </div>
            <div className={styles.statsRows}>
              {weekStats.map((w, i) => {
                if (w.total === 0) return null
                const pct = w.done / w.total
                const [, wm, wd] = w.mondayIso.split('-').map(Number)
                const dateLabel = `${wd} ${MONTHS_SHORT[wm - 1]}`
                const fillClass = pct >= 0.8
                  ? styles.statsBarFillHigh
                  : pct >= 0.5
                  ? styles.statsBarFillMid
                  : styles.statsBarFillLow
                return (
                  <div key={i} className={`${styles.statsRow} ${w.isCurrent ? styles.statsRowCurrent : ''}`}>
                    <span className={styles.statsWeekLabel}>{dateLabel}</span>
                    <div className={styles.statsBar}>
                      <div className={`${styles.statsBarFill} ${fillClass}`} style={{ width: `${pct * 100}%` }} />
                    </div>
                    <span className={styles.statsCount}>{w.done}/{w.total}</span>
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

    // Inline day detail
    const detailDate = parseLocalDate(panelDay)
    detailDate.setHours(0, 0, 0, 0)
    const isDetailToday = panelDay === todayStr
    const detailRoutines = routineItems.filter(t => isRoutineDueOnDay(t, detailDate))
    const detailTasks = allItems.filter(t => {
      if (isRecurring(t)) return false
      if (t.done) return false
      return t.dueDate === panelDay
    })
    const detailEmpty = detailRoutines.length === 0 && detailTasks.length === 0

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
            const isSel      = iso === panelDay
            const dotStatus  = getRoutineDotStatus(day, routineItems, today)
            const hasTask    = allItems.some(t => !isRecurring(t) && t.dueDate === iso)

            const numClass = !isToday && !isSel ? (
              dotStatus === 'done'    ? styles.gridDayNumDone    :
              dotStatus === 'pending' ? styles.gridDayNumPending :
              dotStatus === 'overdue' ? styles.gridDayNumOverdue : ''
            ) : ''

            return (
              <button
                key={i}
                type="button"
                className={`${styles.gridDay} ${!isCurMonth ? styles.gridDayOther : ''} ${isToday ? styles.gridDayToday : ''} ${isSel ? styles.gridDaySelected : ''}`}
                onClick={() => setPanelDay(iso)}
              >
                <span className={`${styles.gridDayNum} ${numClass}`}>{day.getDate()}</span>
                <div className={styles.gridDots}>
                  {dotStatus !== 'none' && (
                    <span className={`${styles.gridDot} ${
                      dotStatus === 'done'    ? styles.gridDotDone    :
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

        {/* Inline day detail */}
        <div className={styles.monthDayDetail}>
          <div className={styles.monthDayDetailHeader}>
            <span className={styles.monthDayDetailDate}>{formatDayHeader(panelDay)}</span>
            {isDetailToday && <span className={styles.dayViewTodayBadge}>сьогодні</span>}
            {onAddForDay && (
              <button
                type="button"
                className={styles.dayPanelAddBtn}
                onClick={() => onAddForDay(panelDay)}
                aria-label="Додати задачу"
              >
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </button>
            )}
          </div>

          <div className={styles.monthDayDetailBody}>
            {detailEmpty && <p className={styles.dayPanelEmpty}>Нічого на цей день</p>}

            {detailRoutines.length > 0 && (
              <>
                <p className={styles.daySectionLabel}>Рутини</p>
                {detailRoutines.map(t => {
                  const isDoneForDay = t.completionLog?.includes(panelDay) ?? false
                  const isAnimating  = completing.get(t.id) === panelDay
                  const isDone       = isAnimating || isDoneForDay
                  const repeatLabel  = getRepeatLabel(t)
                  return (
                    <div key={t.id} className={`${styles.taskRow} ${isAnimating ? styles.taskRowDone : ''} ${isDoneForDay && !isAnimating ? styles.taskRowCompleted : ''}`}>
                      <button type="button" className={styles.checkboxWrapper} onClick={() => handleCheckboxTap(t, isDoneForDay, panelDay)}>
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

            {detailTasks.length > 0 && (
              <>
                <p className={styles.daySectionLabel}>Квести</p>
                {detailTasks.map(t => (
                  <div key={t.id} className={styles.taskRow}>
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

  const viewDaysForSub = getWeekDays(viewWeekStart)
  const topBarSub = tab === 'week'
    ? `${fmt(viewDaysForSub[0])} — ${fmt(viewDaysForSub[6])}`
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
