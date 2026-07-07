import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import PillSelector from '../PillSelector'
import styles from './UnitPicker.module.css'

/**
 * UnitPicker
 * ----------
 * Кнопка вибору одиниці виміру. Відкриває bottom sheet з чіпами.
 * Overlay рендериться через portal щоб уникнути кліпінгу від parent overflow.
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

  const overlay = (
    <div className={styles.overlay} onClick={() => setOpen(false)}>
      <div className={styles.sheet} onClick={e => e.stopPropagation()}>
        <div className={styles.handle} />
        <p className={styles.sheetTitle}>Одиниця виміру</p>
        <PillSelector
          options={units.map(u => ({ value: u, label: u }))}
          value={value}
          onChange={handlePick}
        />
      </div>
    </div>
  )

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

      {open && createPortal(overlay, document.body)}
    </>
  )
}

export default UnitPicker
