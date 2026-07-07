import React from 'react'
import PillSelector from '@/shared/components/ui/PillSelector'
import type { PillOption } from '@/shared/components/ui/PillSelector'
import styles from './ReminderFields.module.css'

export type ReminderUnit = 'minutes' | 'hours' | 'days' | 'weeks'

const REMINDER_UNITS: PillOption<ReminderUnit>[] = [
  { value: 'minutes', label: 'Хвилин' },
  { value: 'hours',   label: 'Годин' },
  { value: 'days',    label: 'Днів' },
  { value: 'weeks',   label: 'Тижнів' },
]

interface ReminderFieldsProps {
  amount: number | ''
  unit: ReminderUnit
  onAmountChange: (value: number | '') => void
  onUnitChange: (unit: ReminderUnit) => void
  suffix?: string
}

/**
 * ReminderFields
 * --------------
 * Спільний редактор "за N <одиниця> до" — великий інпут числа + сітка 2×4
 * пілюль одиниць (Хвилин/Годин/Днів/Тижнів). Використовується скрізь, де
 * налаштовується нагадування (DeadlineSheet, TaskDetailModal, звички в
 * AddSprintItemModal), щоб не дублювати верстку вертикального radio-списку.
 *
 * Props:
 * @prop {number|''}  amount         — кількість одиниць
 * @prop {string}     unit           — обрана одиниця
 * @prop {Function}   onAmountChange — зміна кількості
 * @prop {Function}   onUnitChange   — зміна одиниці
 * @prop {string}     suffix         — текст після інпуту (дефолт "до")
 */
const ReminderFields: React.FC<ReminderFieldsProps> = ({ amount, unit, onAmountChange, onUnitChange, suffix = 'до' }) => (
  <div className={styles.wrap}>
    <div className={styles.amountRow}>
      <input
        type="number"
        className={styles.amountInput}
        value={amount}
        onFocus={e => e.target.select()}
        onChange={e => onAmountChange(e.target.value === '' ? '' : Math.min(999, Number(e.target.value)))}
      />
      <span className={styles.amountSuffix}>{suffix}</span>
    </div>
    <PillSelector
      options={REMINDER_UNITS}
      value={unit}
      onChange={onUnitChange}
      columns={4}
    />
  </div>
)

export default ReminderFields
