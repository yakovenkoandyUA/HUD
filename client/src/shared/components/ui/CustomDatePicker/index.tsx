import React, { useState, useRef, useLayoutEffect } from 'react'
import { WheelColumn } from '@/shared/components/ui/TimeWheelPicker'
import styles from './CustomDatePicker.module.css'

/**
 * CustomDatePicker
 * ----------------
 * Кастомний мобільний date picker — замінює нативний input[type="date"].
 * Bottom sheet поверх модалки, 6 тижнів, починаючи з понеділка.
 * Підтримує: свайп пальцем (3-grid carousel) для зміни місяця,
 * tap на заголовок → wheel picker місяця/року.
 *
 * Props:
 * @prop {string | undefined}        value    — поточна дата ISO string або undefined
 * @prop {(date: string) => void}    onChange — коллбек при виборі дати (ISO YYYY-MM-DD)
 * @prop {() => void}                onClose  — коллбек закриття пікера
 * @prop {Date | undefined}          minDate  — мінімальна допустима дата
 */
interface CustomDatePickerProps {
  value?: string
  onChange: (date: string) => void
  onClose: () => void
  minDate?: Date
}

const MONTHS_UA = [
  'Січень','Лютий','Березень','Квітень','Травень','Червень',
  'Липень','Серпень','Вересень','Жовтень','Листопад','Грудень',
]

const WEEKDAYS = ['ПН','ВТ','СР','ЧТ','ПТ','СБ','НД']

const MIN_YEAR = 2020
const MAX_YEAR = 2040
const YEARS = Array.from({ length: MAX_YEAR - MIN_YEAR + 1 }, (_, i) => String(MIN_YEAR + i))

function toLocalMidnight(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}
function parseIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}
function toIso(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
function buildCalendarCells(year: number, month: number): Date[] {
  const firstOfMonth = new Date(year, month, 1)
  const firstDow = (firstOfMonth.getDay() + 6) % 7
  const startDate = new Date(year, month, 1 - firstDow)
  const cells: Date[] = []
  for (let i = 0; i < 42; i++) {
    cells.push(new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i))
  }
  return cells
}

const CustomDatePicker: React.FC<CustomDatePickerProps> = ({ value, onChange, onClose, minDate }) => {
  const initial = value ? parseIso(value) : new Date()

  const [viewYear, setViewYear]   = useState(initial.getFullYear())
  const [viewMonth, setViewMonth] = useState(initial.getMonth())
  const [selected, setSelected]   = useState<Date | null>(value ? parseIso(value) : null)

  // Month/Year wheel picker
  const [showMonthPicker, setShowMonthPicker] = useState(false)
  const [pickerMonth, setPickerMonth] = useState(viewMonth)
  const [pickerYear, setPickerYear]   = useState(
    Math.max(0, Math.min(YEARS.length - 1, initial.getFullYear() - MIN_YEAR))
  )

  // 3-grid carousel refs
  const gridContainerRef = useRef<HTMLDivElement>(null)
  const gridWidthRef     = useRef(0)
  const touchStartX      = useRef(0)
  const isDragging       = useRef(false)
  const isResettingRef   = useRef(false)

  const today = toLocalMidnight(new Date())

  // Set initial position and reset after month/year change
  useLayoutEffect(() => {
    const el = gridContainerRef.current
    if (!el) return
    el.style.transition = 'none'
    el.style.transform = 'translateX(-33.3333%)'
    isResettingRef.current = false
  }, [viewMonth, viewYear])

  // Adjacent months
  const prevY = viewMonth === 0 ? viewYear - 1 : viewYear
  const prevM = viewMonth === 0 ? 11 : viewMonth - 1
  const nextY = viewMonth === 11 ? viewYear + 1 : viewYear
  const nextM = viewMonth === 11 ? 0 : viewMonth + 1

  const goToPrev = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }

  const goToNext = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  const animateNav = (dir: 'prev' | 'next') => {
    const el = gridContainerRef.current
    if (!el) return
    const gw = el.offsetWidth / 3
    const target = dir === 'next' ? -(gw * 2) : 0
    el.style.transition = 'transform 0.22s ease-out'
    el.style.transform = `translateX(${target}px)`
    isResettingRef.current = true
    setTimeout(() => {
      if (dir === 'next') goToNext()
      else goToPrev()
    }, 220)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    const el = gridContainerRef.current
    if (!el) return
    touchStartX.current = e.touches[0].clientX
    isDragging.current = true
    gridWidthRef.current = el.offsetWidth / 3
    el.style.transition = 'none'
    el.style.transform = `translateX(${-gridWidthRef.current}px)`
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current || !gridContainerRef.current) return
    const dx = e.touches[0].clientX - touchStartX.current
    gridContainerRef.current.style.transform = `translateX(${-gridWidthRef.current + dx}px)`
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isDragging.current) return
    isDragging.current = false
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const el = gridContainerRef.current
    if (!el) return
    const gw = gridWidthRef.current

    if (Math.abs(dx) > 55) {
      const dir = dx < 0 ? 'next' : 'prev'
      const target = dir === 'next' ? -(gw * 2) : 0
      el.style.transition = 'transform 0.22s ease-out'
      el.style.transform = `translateX(${target}px)`
      isResettingRef.current = true
      setTimeout(() => {
        if (dir === 'next') goToNext()
        else goToPrev()
      }, 220)
    } else {
      el.style.transition = 'transform 0.28s cubic-bezier(0.34, 1.3, 0.64, 1)'
      el.style.transform = `translateX(${-gw}px)`
    }
  }

  const handleConfirm = () => {
    if (!selected) return
    onChange(toIso(selected))
    onClose()
  }

  const openMonthPicker = () => {
    setPickerMonth(viewMonth)
    setPickerYear(Math.max(0, Math.min(YEARS.length - 1, viewYear - MIN_YEAR)))
    setShowMonthPicker(true)
  }

  const applyMonthPicker = () => {
    setViewMonth(pickerMonth)
    setViewYear(MIN_YEAR + pickerYear)
    setShowMonthPicker(false)
  }

  const renderGrid = (year: number, month: number, key: string) => {
    const cells = buildCalendarCells(year, month)
    return (
      <div key={key} className={styles.grid}>
        {cells.map((cell, i) => {
          const cellDay        = toLocalMidnight(cell)
          const minDay         = minDate ? toLocalMidnight(minDate) : null
          const isCurrentMonth = cell.getMonth() === month
          const isToday        = cellDay.getTime() === today.getTime()
          const isBlocked      = minDay !== null && cellDay.getTime() < minDay.getTime()
          const isSelected     = selected !== null && cellDay.getTime() === toLocalMidnight(selected).getTime()

          return (
            <button
              key={i}
              type="button"
              disabled={isBlocked}
              className={[
                styles.cell,
                !isCurrentMonth ? styles.cellOtherMonth : '',
                isBlocked && !isSelected ? styles.cellPast : '',
                isToday && !isSelected ? styles.cellToday : '',
                isSelected ? styles.cellSelected : '',
              ].filter(Boolean).join(' ')}
              onClick={() => !isBlocked && setSelected(cellDay)}
            >
              {cell.getDate()}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.sheet} onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className={styles.header}>
          {!showMonthPicker && (
            <button type="button" className={styles.navBtn} onClick={() => animateNav('prev')} aria-label="Попередній місяць">
              <svg width="10" height="16" viewBox="0 0 10 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 1L2 8l6 7"/></svg>
            </button>
          )}
          <button
            type="button"
            className={styles.monthLabelBtn}
            onClick={showMonthPicker ? applyMonthPicker : openMonthPicker}
            aria-label="Обрати місяць та рік"
          >
            {MONTHS_UA[showMonthPicker ? pickerMonth : viewMonth]}{' '}
            {showMonthPicker ? MIN_YEAR + pickerYear : viewYear}
            <svg
              className={`${styles.monthLabelChevron} ${showMonthPicker ? styles.monthLabelChevronUp : ''}`}
              width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M2 4l4 4 4-4"/>
            </svg>
          </button>
          {!showMonthPicker && (
            <button type="button" className={styles.navBtn} onClick={() => animateNav('next')} aria-label="Наступний місяць">
              <svg width="10" height="16" viewBox="0 0 10 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 1l6 7-6 7"/></svg>
            </button>
          )}
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Закрити">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 1l12 12M13 1L1 13"/></svg>
          </button>
        </div>

        {/* ── Month/Year wheel picker ── */}
        {showMonthPicker ? (
          <div className={styles.monthPickerWrap}>
            <div className={styles.monthPickerBody}>
              <WheelColumn values={MONTHS_UA} index={pickerMonth} onChange={setPickerMonth} width={160} />
              <WheelColumn values={YEARS}     index={pickerYear}  onChange={setPickerYear}  width={90}  />
            </div>
            <button type="button" className={styles.confirmBtn} onClick={applyMonthPicker}>
              Готово
            </button>
          </div>
        ) : (
          <>
            {/* ── Weekday labels ── */}
            <div className={styles.weekdays}>
              {WEEKDAYS.map(d => (
                <span key={d} className={styles.weekday}>{d}</span>
              ))}
            </div>

            {/* ── 3-grid carousel ── */}
            <div
              className={styles.gridWrap}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <div ref={gridContainerRef} className={styles.gridContainer}>
                {renderGrid(prevY, prevM, 'prev')}
                {renderGrid(viewYear, viewMonth, 'curr')}
                {renderGrid(nextY, nextM, 'next')}
              </div>
            </div>

            {/* ── Confirm button ── */}
            <button
              type="button"
              className={styles.confirmBtn}
              onClick={handleConfirm}
              disabled={!selected}
            >
              Підтвердити
            </button>
          </>
        )}

      </div>
    </div>
  )
}

export default CustomDatePicker
