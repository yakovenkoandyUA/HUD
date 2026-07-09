import React, { useState } from 'react'
import { WheelColumn } from '@/shared/components/ui/TimeWheelPicker'
import styles from './CustomDatePicker.module.css'

/**
 * CustomDatePicker
 * ----------------
 * Wheel-based date picker — три барабани (день / місяць / рік), iOS-style.
 * Замінює нативний input[type="date"] і старий grid-календар.
 * Тап на центральну цифру (день/рік) відкриває поле ручного вводу.
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

const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'))

const MONTHS_SHORT = ['Січ', 'Лют', 'Бер', 'Кві', 'Тра', 'Чер', 'Лип', 'Сер', 'Вер', 'Жов', 'Лис', 'Гру']

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: CURRENT_YEAR + 5 - 2000 + 1 }, (_, i) => String(2000 + i))

function parseIso(iso: string): { year: number; month: number; day: number } {
  const [y, m, d] = iso.split('-').map(Number)
  return { year: y, month: m - 1, day: d }
}

function toIso(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function clampDay(day: number, month: number, year: number): number {
  return Math.min(day, new Date(year, month + 1, 0).getDate())
}

const CustomDatePicker: React.FC<CustomDatePickerProps> = ({ value, onChange, onClose, minDate }) => {
  const initial = (() => {
    if (value) return parseIso(value)
    const d = minDate ?? new Date()
    return { year: d.getFullYear(), month: d.getMonth(), day: d.getDate() }
  })()

  const initYearIdx = Math.max(0, YEARS.indexOf(String(initial.year)))

  const [dayIndex, setDayIndex]     = useState(initial.day - 1)
  const [monthIndex, setMonthIndex] = useState(initial.month)
  const [yearIndex, setYearIndex]   = useState(initYearIdx >= 0 ? initYearIdx : YEARS.length - 1)

  const handleConfirm = () => {
    const year  = parseInt(YEARS[yearIndex], 10)
    const month = monthIndex
    const day   = clampDay(dayIndex + 1, month, year)

    if (minDate) {
      const selected = new Date(year, month, day)
      const min      = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())
      if (selected < min) {
        onChange(toIso(minDate.getFullYear(), minDate.getMonth(), minDate.getDate()))
        onClose()
        return
      }
    }

    onChange(toIso(year, month, day))
    onClose()
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.sheet} onClick={e => e.stopPropagation()}>
        <div className={styles.handle} />

        <div className={styles.header}>
          <span className={styles.title}>Оберіть дату</span>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Закрити">✕</button>
        </div>

        <div className={styles.wheels}>
          <WheelColumn
            values={DAYS}
            index={dayIndex}
            onChange={setDayIndex}
            width={60}
            enableInput
          />
          <WheelColumn
            values={MONTHS_SHORT}
            index={monthIndex}
            onChange={setMonthIndex}
            width={84}
          />
          <WheelColumn
            values={YEARS}
            index={yearIndex}
            onChange={setYearIndex}
            width={76}
            enableInput
          />
        </div>

        <button
          type="button"
          className={styles.confirmBtn}
          onClick={handleConfirm}
        >
          Підтвердити
        </button>
      </div>
    </div>
  )
}

export default CustomDatePicker
