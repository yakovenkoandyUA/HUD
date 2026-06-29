import React, { useRef, useEffect, useState } from 'react'
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
 * Під числом дня — одна крапка: зелена (всі звички виконано), золота (pending),
 * червона (прострочено — минулий день без виконання).
 * Свайп ліво/право — навігація між тижнями через onPrevWeek/onNextWeek.
 * Тап по дню — викликає onDaySelect; довгий тап — onLongPress.
 *
 * Props:
 * @prop {string}          weekStart        — ISO дата понеділка ('YYYY-MM-DD')
 * @prop {boolean}         [isCurrentWeek]  — чи це поточний тиждень
 * @prop {() => void}      [onExpand]       — відкрити розгорнутий вигляд тижня
 * @prop {boolean}         [hideTitle]      — приховати рядок "Тиждень / діапазон дат"
 * @prop {UnifiedTodo[]}   [routineItems]   — звички для крапок і WeekExpandedView
 * @prop {string}          [selectedDay]    — ISO вибраного дня ('YYYY-MM-DD')
 * @prop {(iso: string) => void} [onDaySelect]  — callback при тапі на день
 * @prop {(day: Date) => void}   [onLongPress]  — callback при довгому тапі на день
 * @prop {boolean}         [showLongPressHint] — підсвітити "сьогодні" і показати підказку про довгий тап (поки юзер не спробує хоч раз)
 * @prop {() => void}      [onPrevWeek]     — перейти на попередній тиждень
 * @prop {() => void}      [onNextWeek]     — перейти на наступний тиждень
 * @prop {'week'|'month'}  [calendarMode]   — режим відображення: тижнева смужка або місячна сітка
 * @prop {() => void}      [onToggleCalendarMode] — перемкнути режим
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
  showLongPressHint?: boolean
  onPrevWeek?: () => void
  onNextWeek?: () => void
  calendarMode?: 'week' | 'month'
  onToggleCalendarMode?: () => void
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

const DAY_LABELS   = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд']
const MONTHS_SHORT = ['Січ', 'Лют', 'Бер', 'Квіт', 'Трав', 'Черв', 'Лип', 'Серп', 'Вер', 'Жовт', 'Лист', 'Груд']

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

const WeekHeader: React.FC<WeekHeaderProps> = ({ weekStart, isCurrentWeek, onExpand, hideTitle, routineItems = [], selectedDay, onDaySelect, onLongPress, showLongPressHint, onPrevWeek, onNextWeek, calendarMode = 'week', onToggleCalendarMode }) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [vmYear,  setVmYear]  = useState(today.getFullYear())
  const [vmMonth, setVmMonth] = useState(today.getMonth())

  useEffect(() => {
    let cancelled = false
    const sync = async () => {
      if (cancelled || calendarMode !== 'month') return
      const d = selectedDay ? new Date(selectedDay.replace(/-/g, '/')) : today
      if (!cancelled) { setVmYear(d.getFullYear()); setVmMonth(d.getMonth()) }
    }
    sync()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calendarMode])

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const headerRef      = useRef<HTMLDivElement>(null)
  const weekRowRef     = useRef<HTMLDivElement>(null)
  const prevWeekStart  = useRef<string>(weekStart)
  const slideDirRef    = useRef<string>('')
  const drag           = useRef({ x: 0, y: 0, active: false, decided: false })
  const onPrevRef      = useRef(onPrevWeek)
  const onNextRef      = useRef(onNextWeek)
  useEffect(() => { onPrevRef.current = onPrevWeek }, [onPrevWeek])
  useEffect(() => { onNextRef.current = onNextWeek }, [onNextWeek])

  if (prevWeekStart.current !== weekStart) {
    slideDirRef.current = weekStart > prevWeekStart.current ? styles.slideFromRight : styles.slideFromLeft
    prevWeekStart.current = weekStart
  }

  useEffect(() => {
    const el = headerRef.current
    if (!el) return
    const onMove = (e: TouchEvent) => {
      const d = drag.current
      if (!d.active) return
      const dx = e.touches[0].clientX - d.x
      const dy = e.touches[0].clientY - d.y
      if (!d.decided) {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return
        if (Math.abs(dy) > Math.abs(dx)) { d.active = false; return }
        d.decided = true
      }
      e.preventDefault()
      clearTimeout(longPressTimer.current)
      const canNext = !!onNextRef.current
      const offset  = !canNext && dx < 0 ? dx * 0.25 : dx
      if (weekRowRef.current) {
        weekRowRef.current.style.transition = 'none'
        weekRowRef.current.style.transform  = `translateX(${offset}px)`
      }
    }
    el.addEventListener('touchmove', onMove, { passive: false })
    return () => el.removeEventListener('touchmove', onMove)
  }, [])

  const onTouchStart = (e: React.TouchEvent) => {
    drag.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, active: true, decided: false }
  }

  const exitAndGo = (goRight: boolean, cb: () => void) => {
    const el = weekRowRef.current
    if (el) {
      el.style.transition = 'transform 0.18s ease-in, opacity 0.14s ease'
      el.style.transform  = `translateX(${goRight ? '110%' : '-110%'})`
      el.style.opacity    = '0'
    }
    setTimeout(cb, 140)
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    const d = drag.current
    if (!d.active || !d.decided) { drag.current.active = false; return }
    drag.current.active = false
    const dx = e.changedTouches[0].clientX - d.x
    const THRESHOLD = 50
    if (dx > THRESHOLD && onPrevRef.current) {
      exitAndGo(true, onPrevRef.current)
    } else if (dx < -THRESHOLD && onNextRef.current) {
      exitAndGo(false, onNextRef.current)
    } else {
      if (weekRowRef.current) {
        weekRowRef.current.style.transition = 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)'
        weekRowRef.current.style.transform  = 'translateX(0)'
      }
    }
  }

  const days = getWeekDays(weekStart)
  const mon  = days[0]
  const sun  = days[6]

  const fmt = (d: Date) => d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })
  const weekMonth = mon.getMonth()

  const todayIso = toIso(today)
  const todayRoutines = routineItems.filter(t => isRoutineDueOnDay(t, today))
  const todayDone = todayRoutines.filter(t => t.completionLog?.includes(todayIso)).length
  const todayTotal = todayRoutines.length

  return (
		<div ref={headerRef} className={`${styles.header} ${hideTitle ? styles.headerCompact : ''}`} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
			{!hideTitle && (
				<div className={styles.top}>
					<div className={styles.topLeft}>
						<span className={styles.label}>Тиждень</span>
						{isCurrentWeek === false && weekStart < new Date().toISOString().slice(0, 10) && <span className={styles.pastBadge}>архів</span>}
					</div>
					<div className={styles.topRight}>
						<span className={styles.range}>
							{fmt(mon)} — {fmt(sun)}
						</span>

						{onToggleCalendarMode && (
							<button
								type="button"
								className={`${styles.calModeBtn} ${calendarMode === 'month' ? styles.calModeBtnActive : ''}`}
								onClick={onToggleCalendarMode}
								aria-label={calendarMode === 'month' ? 'Вигляд тижня' : 'Вигляд місяця'}
							>
								{calendarMode === 'month' ? (
									<svg width="13" height="11" viewBox="0 0 13 11" fill="none">
										<line x1="1" y1="1.5" x2="12" y2="1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
										<line x1="1" y1="5.5" x2="12" y2="5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
										<line x1="1" y1="9.5" x2="12" y2="9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
									</svg>
								) : (
									<svg width="13" height="13" viewBox="0 0 13 13" fill="none">
										<rect x="1" y="3" width="11" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
										<line x1="1" y1="6" x2="12" y2="6" stroke="currentColor" strokeWidth="1.1" />
										<line x1="4.5" y1="6" x2="4.5" y2="12" stroke="currentColor" strokeWidth="1.1" />
										<line x1="8.5" y1="6" x2="8.5" y2="12" stroke="currentColor" strokeWidth="1.1" />
										<line x1="4" y1="1.5" x2="4" y2="4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
										<line x1="9" y1="1.5" x2="9" y2="4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
									</svg>
								)}
							</button>
						)}
						{onExpand && (
							<button type="button" className={styles.expandBtn} onClick={onExpand} aria-label="Розгорнути тиждень">
								<svg width="13" height="13" viewBox="0 0 13 13" fill="none">
									<path d="M8 1h4v4M5 12H1V8M1.5 1.5l4 4M11.5 11.5l-4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
								</svg>
							</button>
						)}
					</div>
				</div>
			)}

			<div className={`${styles.calendarArea} ${calendarMode === 'month' ? styles.calAreaMonth : styles.calAreaWeek}`}>
				<div key={calendarMode} className={styles.calSlideContent}>
					{calendarMode === 'month' &&
						(() => {
							const grid = getMonthGrid(vmYear, vmMonth)
							const prevMonth = () => {
								if (vmMonth === 0) {
									setVmYear(y => y - 1)
									setVmMonth(11)
								} else setVmMonth(m => m - 1)
							}
							const nextMonthF = () => {
								if (vmMonth === 11) {
									setVmYear(y => y + 1)
									setVmMonth(0)
								} else setVmMonth(m => m + 1)
							}
							return (
								<div className={styles.monthCompact}>
									<div className={styles.monthCompactNav}>
										<button type="button" className={styles.monthCompactNavBtn} onClick={prevMonth} aria-label="Попередній місяць">
											<svg width="8" height="8" viewBox="0 0 8 8" fill="none">
												<path d="M5 1.5L2.5 4 5 6.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
											</svg>
										</button>
										<span className={styles.monthCompactNavLabel}>
											{MONTHS_SHORT[vmMonth]} {vmYear}
										</span>
										<button type="button" className={styles.monthCompactNavBtn} onClick={nextMonthF} aria-label="Наступний місяць">
											<svg width="8" height="8" viewBox="0 0 8 8" fill="none">
												<path d="M3 1.5L5.5 4 3 6.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
											</svg>
										</button>
									</div>
									<div className={styles.monthCompactGrid}>
										{DAY_LABELS.map(l => (
											<span key={l} className={styles.monthCompactDayLabel}>
												{l}
											</span>
										))}
										{grid.map((day, i) => {
											const dt = new Date(day)
											dt.setHours(0, 0, 0, 0)
											const iso = toIso(dt)
											const isCurMonth = day.getMonth() === vmMonth
											const isToday = toIso(dt) === toIso(today)
											const isSel = iso === selectedDay && !isToday
											const dotStatus = getRoutineDotStatus(dt, routineItems, today)
											const numClass =
												!isToday && !isSel
													? dotStatus === 'done'
														? styles.monthCompactNumDone
														: dotStatus === 'pending'
															? styles.monthCompactNumPending
															: dotStatus === 'overdue'
																? styles.monthCompactNumOverdue
																: ''
													: ''
											return (
												<button
													key={i}
													type="button"
													className={`${styles.monthCompactCell} ${!isCurMonth ? styles.monthCompactOther : ''} ${isToday ? styles.monthCompactToday : ''} ${isSel ? styles.monthCompactSel : ''}`}
													onClick={() => onDaySelect?.(iso)}
												>
													<span className={`${styles.monthCompactNum} ${numClass}`}>{day.getDate()}</span>
													{dotStatus !== 'none' && (
														<span className={`${styles.monthCompactDot} ${dotStatus === 'done' ? styles.dotDone : dotStatus === 'overdue' ? styles.dotOverdue : styles.dotPending}`} />
													)}
												</button>
											)
										})}
									</div>
								</div>
							)
						})()}

					{calendarMode === 'week' && (
						<div className={styles.weekRowWrap}>
							<div ref={weekRowRef} key={weekStart} className={`${styles.weekRow} ${slideDirRef.current}`}>
								{days.map((day, i) => {
									const dayTime = new Date(day)
									dayTime.setHours(0, 0, 0, 0)

									const isToday = dayTime.getTime() === today.getTime()
									const isPast = dayTime.getTime() < today.getTime()
									const isOverflow = day.getMonth() !== weekMonth
									const isDim = (isPast || isOverflow) && !isToday
									const dayIso = toIso(dayTime)

									const isSelected = dayIso === selectedDay && !isToday
									const dotStatus = getRoutineDotStatus(dayTime, routineItems, today)

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
											className={`${styles.dayCell} ${isSelected ? styles.dayCellSelected : ''} ${onDaySelect || onLongPress ? styles.dayCellClickable : ''}`}
											onClick={() => onDaySelect?.(dayIso)}
											onMouseDown={() => lpStart()}
											onMouseUp={lpStop}
											onMouseLeave={lpStop}
											onTouchStart={lpStart}
											onTouchEnd={lpStop}
										>
											<span className={`${styles.dayName} ${isToday ? styles.dayNameToday : isSelected ? styles.dayNameSelected : isDim ? styles.dayNameDim : ''}`}>{DAY_LABELS[i]}</span>
											<span className={`${styles.dayNumber} ${isToday ? styles.dayNumberToday : isSelected ? styles.dayNumberSelected : isDim ? styles.dayNumberDim : ''} ${showLongPressHint && isToday ? styles.dayNumberHint : ''}`}>{day.getDate()}</span>
											{routineItems.length > 0 && (
												<div className={styles.dotWrap}>
													{dotStatus !== 'none' && <span className={`${styles.dot} ${dotStatus === 'done' ? styles.dotDone : dotStatus === 'overdue' ? styles.dotOverdue : styles.dotPending}`} />}
												</div>
											)}
										</div>
									)
								})}
							</div>
						</div>
					)}

					{showLongPressHint && onLongPress && calendarMode === 'week' && (
						<p className={styles.longPressHint}>Затримай палець на дні щоб додати задачу саме на нього</p>
					)}
        <div className={styles.routinesBadgeWrap}>

					{onExpand && todayTotal > 0 && (
            <button type="button" className={`${styles.routinesBadge} ${todayDone === todayTotal ? styles.routinesBadgeDone : ''}`} onClick={onExpand} aria-label="Звички">
							<svg width="9" height="9" viewBox="0 0 10 10" fill="none">
								<circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.3" />
								<path d="M5 3v2.5l1.5 1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
							</svg>
							{todayDone}/{todayTotal}
						</button>
					)}
          </div>
				</div>
				{/* calSlideContent */}
			</div>
			{/* calendarArea */}
		</div>
	)
}

export default WeekHeader
