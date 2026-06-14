import React, { useState, useRef, useEffect } from 'react'
import styles from './UnitPicker.module.css'

/**
 * UnitPicker
 * ----------
 * Компактна кнопка вибору одиниці виміру.
 * Натискання відкриває мінімальний поповер з чіпами над полем.
 *
 * Props:
 * @prop {string}   value    — поточна одиниця
 * @prop {string[]} units    — список доступних одиниць
 * @prop {Function} onChange — callback зміни одиниці
 */
interface UnitPickerProps {
  value: string
  units: string[]
  onChange: (unit: string) => void
}

const UnitPicker: React.FC<UnitPickerProps> = ({ value, units, onChange }) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handlePick = (unit: string) => {
    onChange(unit)
    setOpen(false)
  }

  return (
    <div className={styles.wrap} ref={ref}>
      <button
        type="button"
        className={`${styles.trigger} ${open ? styles.triggerOpen : ''}`}
        onClick={() => setOpen(v => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {value || '—'}
      </button>

      {open && (
        <div className={styles.popover} role="listbox">
          {units.map(u => (
            <button
              key={u}
              type="button"
              role="option"
              aria-selected={u === value}
              className={`${styles.chip} ${u === value ? styles.chipActive : ''}`}
              onClick={() => handlePick(u)}
            >
              {u}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default UnitPicker
