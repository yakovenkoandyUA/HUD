import React, { useRef } from 'react'
import type { UnifiedTodo } from '../../../types'
import { isRoutineDueOnDay } from '../../../utils/sprint'
import styles from './WeekHeader.module.css'

function toIsoLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function addWeeks(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + n * 7)
  return toIsoLocal(date)
}


function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * WeekHeader
 * ----------
 * Заголовок тижня: назва, діапазон дат, 7 комірок днів.
 * Під числом дня — одна крапка: зелена (всі рутини виконано), золота (pending),
 * червона (прострочено — минулий день без виконання).
 * Свайп ліво/право — навігація між тижнями через onPrevWeek/onNextWeek.
 * Тап по дню — викликає onDaySelect; довгий тап — onLongPress.
 *
 * Props:
 * @prop {string}          weekStart        — ISO дата понеділка ('YYYY-MM-DD')
 * @prop {boolean}         [isCurrentWeek]  — чи це поточний тиждень
 * @prop {() => void}      [onExpand]       — відкрити розгорнутий вигляд тижня
 * @prop {boolean}         [hideTitle]      — приховати рядок "Тиждень / діапазон дат"
 * @prop {UnifiedTodo[]}   [routineItems]   — рутини для крапок і WeekExpandedView
 * @prop {string}          [selectedDay]    — ISO вибраного дня ('YYYY-MM-DD')
 * @prop {(iso: string) => void} [onDaySelect]  — callback при тапі на день
 * @prop {(day: Date) => void}   [onLongPress]  — callback при довгому тапі на день
 * @prop {() => void}      [onPrevWeek]     — перейти на попередній тиждень
 * @prop {() => void}      [onNextWeek]     — перейти на наступний тиждень
 */
interface WeekHeaderProps {
  weekStart: string
  isCurrentWeek?: boolean
  onExpand?: () => void
  hideTitle?: boolean
  routineItems?: UnifiedTodo[]
  selectedDay?: string
  onDaySelect?: (iso: string) => void
  onLongPress?: (day: Date) => void
  onPrevWeek?: () => void
  onNextWeek?: () => void
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

const WeekHeader: React.FC<WeekHeaderProps> = ({ weekStart, isCurrentWeek, onExpand, hideTitle, routineItems = [], selectedDay, onDaySelect, onLongPress, onPrevWeek, onNextWeek }) => {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const swipeStartX    = useRef<number | null>(null)
  const swipeStartY    = useRef<number | null>(null)
  const prevWeekStart = useRef<string>(weekStart)
  const slideDirRef   = useRef<string>('')

  if (prevWeekStart.current !== weekStart) {
    slideDirRef.current = weekStart > prevWeekStart.current ? styles.slideFromRight : styles.slideFromLeft
    prevWeekStart.current = weekStart
  }

  const days = getWeekDays(weekStart)
  const mon  = days[0]
  const sun  = days[6]

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const fmt = (d: Date) => d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })
  const weekMonth = mon.getMonth()

  const onSwipeTouchStart = (e: React.TouchEvent) => {
    swipeStartX.current = e.touches[0].clientX
    swipeStartY.current = e.touches[0].clientY
  }

  const onSwipeTouchEnd = (e: React.TouchEvent) => {
    if (swipeStartX.current === null || swipeStartY.current === null) return
    const dx = e.changedTouches[0].clientX - swipeStartX.current
    const dy = e.changedTouches[0].clientY - swipeStartY.current
    swipeStartX.current = null
    swipeStartY.current = null
    if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx) * 0.8) return
    if (dx < 0) onNextWeek?.()
    else onPrevWeek?.()
  }

  const todayIso = toIso(today)
  const todayRoutines = routineItems.filter(t => isRoutineDueOnDay(t, today))
  const todayDone = todayRoutines.filter(t => t.completionLog?.includes(todayIso)).length
  const todayTotal = todayRoutines.length

  return (
    <div
      className={styles.header}
      onTouchStart={onSwipeTouchStart}
      onTouchEnd={onSwipeTouchEnd}
    >
      {!hideTitle && (
        <div className={styles.top}>
          <div className={styles.topLeft}>
            <span className={styles.label}>Тиждень</span>
            {isCurrentWeek === false && (
              <span className={styles.pastBadge}>архів</span>
            )}
          </div>
          <div className={styles.topRight}>
            <span className={styles.range}>{fmt(mon)} — {fmt(sun)}</span>
            {onExpand && todayTotal > 0 && (
              <button
                type="button"
                className={`${styles.routinesBadge} ${todayDone === todayTotal ? styles.routinesBadgeDone : ''}`}
                onClick={onExpand}
                aria-label="Рутини"
              >
                <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                  <circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.3"/>
                  <path d="M5 3v2.5l1.5 1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
                {todayDone}/{todayTotal}
              </button>
            )}
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

      <div key={weekStart} className={`${styles.weekRow} ${slideDirRef.current}`}>
        {days.map((day, i) => {
          const dayTime = new Date(day)
          dayTime.setHours(0, 0, 0, 0)

          const isToday    = dayTime.getTime() === today.getTime()
          const isPast     = dayTime.getTime() < today.getTime()
          const isOverflow = day.getMonth() !== weekMonth
          const isDim      = (isPast || isOverflow) && !isToday
          const dayIso     = toIso(dayTime)

          const isSelected = dayIso === selectedDay && !isToday
          const dotStatus  = getRoutineDotStatus(dayTime, routineItems, today)

          const captured = dayTime
          const lpStart = (e?: React.TouchEvent) => {
            if (!onLongPress) return
            if (e) e.preventDefault()
            clearTimeout(longPressTimer.current)
            longPressTimer.current = setTimeout(() => onLongPress(captured), 500)
          }
          const lpStop = () => clearTimeout(longPressTimer.current)

          return (
            <div
              key={i}
              className={`${styles.dayCell} ${isSelected ? styles.dayCellSelected : ''} ${(onDaySelect || onLongPress) ? styles.dayCellClickable : ''}`}
              onClick={() => onDaySelect?.(dayIso)}
              onMouseDown={() => lpStart()}
              onMouseUp={lpStop}
              onMouseLeave={lpStop}
              onTouchStart={lpStart}
              onTouchEnd={lpStop}
            >
              <span className={`${styles.dayName} ${isToday ? styles.dayNameToday : isSelected ? styles.dayNameSelected : isDim ? styles.dayNameDim : ''}`}>
                {DAY_LABELS[i]}
              </span>
              <span className={`${styles.dayNumber} ${isToday ? styles.dayNumberToday : isSelected ? styles.dayNumberSelected : isDim ? styles.dayNumberDim : ''}`}>
                {day.getDate()}
              </span>
              <div className={styles.dotWrap}>
                {dotStatus !== 'none' && (
                  <span className={`${styles.dot} ${
                    dotStatus === 'done'    ? styles.dotDone    :
                    dotStatus === 'overdue' ? styles.dotOverdue :
                    styles.dotPending
                  }`} />
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default WeekHeader
