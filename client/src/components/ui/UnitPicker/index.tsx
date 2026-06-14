import React, { useState } from 'react'
import styles from './UnitPicker.module.css'

/**
 * UnitPicker
 * ----------
 * Кнопка вибору одиниці виміру. Відкриває bottom sheet з чіпами.
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

  const handlePick = (unit: string) => {
    onChange(unit)
    setOpen(false)
  }

  return (
    <>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen(true)}
        aria-haspopup="listbox"
      >
        {value || '—'}
      </button>

      {open && (
        <div className={styles.overlay} onClick={() => setOpen(false)}>
          <div className={styles.sheet} onClick={e => e.stopPropagation()}>
            <div className={styles.handle} />
            <p className={styles.sheetTitle}>Одиниця виміру</p>
            <div className={styles.chips} role="listbox">
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
          </div>
        </div>
      )}
    </>
  )
}

export default UnitPicker
