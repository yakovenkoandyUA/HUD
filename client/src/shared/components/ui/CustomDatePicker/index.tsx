import React, { useState } from 'react'
import styles from './CustomDatePicker.module.css'

/**
 * CustomDatePicker
 * ----------------
 * Кастомний мобільний date picker — замінює нативний input[type="date"].
 * Bottom sheet поверх модалки, 6 тижнів, починаючи з понеділка.
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

// Returns an array of 42 Date cells (6 weeks) starting from Monday of the
// week that contains the 1st of the given month.
function buildCalendarCells(year: number, month: number): Date[] {
  const firstOfMonth = new Date(year, month, 1)
  // getDay(): 0=Sun,1=Mon,...,6=Sat → convert to Mon-based index (0=Mon)
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

  const today = toLocalMidnight(new Date())

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else                  { setViewMonth(m => m - 1) }
  }

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else                   { setViewMonth(m => m + 1) }
  }

  const handleConfirm = () => {
    if (!selected) return
    onChange(toIso(selected))
    onClose()
  }

  const cells = buildCalendarCells(viewYear, viewMonth)

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.sheet} onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className={styles.header}>
          <button type="button" className={styles.navBtn} onClick={prevMonth} aria-label="Попередній місяць">
            ‹
          </button>
          <span className={styles.monthLabel}>
            {MONTHS_UA[viewMonth]} {viewYear}
          </span>
          <button type="button" className={styles.navBtn} onClick={nextMonth} aria-label="Наступний місяць">
            ›
          </button>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Закрити">
            ×
          </button>
        </div>

        {/* ── Weekday labels ── */}
        <div className={styles.weekdays}>
          {WEEKDAYS.map(d => (
            <span key={d} className={styles.weekday}>{d}</span>
          ))}
        </div>

        {/* ── Calendar grid ── */}
        <div className={styles.grid}>
          {cells.map((cell, i) => {
            const cellDay        = toLocalMidnight(cell)
            const minDay         = minDate ? toLocalMidnight(minDate) : today
            const isCurrentMonth = cell.getMonth() === viewMonth
            const isToday        = cellDay.getTime() === today.getTime()
            const isBlocked      = cellDay.getTime() < minDay.getTime()
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

        {/* ── Confirm button ── */}
        <button
          type="button"
          className={styles.confirmBtn}
          onClick={handleConfirm}
          disabled={!selected}
        >
          Підтвердити
        </button>

      </div>
    </div>
  )
}

export default CustomDatePicker
