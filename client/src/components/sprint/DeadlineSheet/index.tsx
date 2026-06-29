import React, { useState } from 'react'
import CustomDatePicker from '../../ui/CustomDatePicker'
import { TimeWheelRow } from '../../ui/TimeWheelPicker'
import styles from './DeadlineSheet.module.css'

export type ReminderUnit = 'minutes' | 'hours' | 'days' | 'weeks'
export interface DeadlineDraft {
  date: string | null
  time: string | null
  reminder: { amount: number; unit: ReminderUnit } | null
}

const MONTHS = ['січ.', 'лют.', 'бер.', 'квіт.', 'трав.', 'черв.', 'лип.', 'серп.', 'вер.', 'жовт.', 'лист.', 'груд.']

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return `${String(d).padStart(2, '0')} ${MONTHS[m - 1]} ${y}`
}

const REMINDER_UNITS: { key: ReminderUnit; label: string }[] = [
  { key: 'minutes', label: 'хв' },
  { key: 'hours',   label: 'год' },
  { key: 'days',    label: 'дн' },
  { key: 'weeks',   label: 'тиж' },
]

interface DeadlineSheetProps {
  date: string | null
  time: string | null
  reminder: { amount: number; unit: ReminderUnit } | null
  minDate?: Date
  onSave: (draft: DeadlineDraft) => void
  onClose: () => void
}

/**
 * DeadlineSheet
 * -------------
 * Об'єднаний редактор дедлайну квесту: дата, час (необов'язково) і нагадування
 * (необов'язково) в одному bottom sheet — замість трьох окремих чіпів/шітів.
 *
 * Props:
 * @prop {string|null} date     — поточна дата дедлайну "YYYY-MM-DD"
 * @prop {string|null} time     — поточний час "HH:MM"
 * @prop {object|null} reminder — { amount, unit }
 * @prop {Date}         minDate  — мінімально обрана дата (зазвичай сьогодні)
 * @prop {Function}     onSave   — викликається з повним draft при "Готово"
 * @prop {Function}     onClose  — закриття без збереження
 */
const DeadlineSheet: React.FC<DeadlineSheetProps> = ({ date, time, reminder, minDate, onSave, onClose }) => {
  const [draftDate, setDraftDate]   = useState(date)
  const [draftTime, setDraftTime]   = useState(time)
  const [timeOn, setTimeOn]         = useState(!!time)
  const [reminderOn, setReminderOn] = useState(!!reminder)
  const [reminderAmount, setReminderAmount] = useState<number | ''>(reminder?.amount ?? 1)
  const [reminderUnit, setReminderUnit]     = useState<ReminderUnit>(reminder?.unit ?? 'days')
  const [showDatePicker, setShowDatePicker] = useState(false)

  const handleSave = () => {
    onSave({
      date: draftDate,
      time: timeOn ? draftTime : null,
      reminder: reminderOn ? { amount: Math.max(1, Math.min(999, Number(reminderAmount) || 1)), unit: reminderUnit } : null,
    })
    onClose()
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.sheet} onClick={e => e.stopPropagation()}>
        <div className={styles.handle} />
        <div className={styles.header}>
          <span className={styles.title}>Дедлайн</span>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Закрити">✕</button>
        </div>

        <div className={styles.body}>
          {/* Date */}
          <button type="button" className={styles.dateRow} onClick={() => setShowDatePicker(true)}>
            <svg width="13" height="13" viewBox="0 0 11 11" fill="none" aria-hidden="true">
              <rect x="1" y="2" width="9" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
              <path d="M1 5h9M3.5 1v2M7.5 1v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            <span className={draftDate ? styles.dateRowValue : styles.dateRowPlaceholder}>
              {draftDate ? formatDate(draftDate) : 'Обрати дату'}
            </span>
            {draftDate && (
              <span
                className={styles.rowClear}
                onClick={e => { e.stopPropagation(); setDraftDate(null); setTimeOn(false); setReminderOn(false) }}
              >✕</span>
            )}
          </button>

          {draftDate && (
            <>
              {/* Time — optional */}
              <div className={styles.optionRow}>
                <span className={styles.optionLabel}>Час</span>
                {timeOn ? (
                  <button type="button" className={styles.optionClear} onClick={() => setTimeOn(false)}>Прибрати</button>
                ) : (
                  <button type="button" className={styles.optionAdd} onClick={() => setTimeOn(true)}>+ Додати</button>
                )}
              </div>
              {timeOn && <TimeWheelRow value={draftTime ?? '09:00'} onChange={setDraftTime} />}

              {/* Reminder — optional */}
              <div className={styles.optionRow}>
                <span className={styles.optionLabel}>Нагадати</span>
                {reminderOn ? (
                  <button type="button" className={styles.optionClear} onClick={() => setReminderOn(false)}>Прибрати</button>
                ) : (
                  <button type="button" className={styles.optionAdd} onClick={() => setReminderOn(true)}>+ Додати</button>
                )}
              </div>
              {reminderOn && (
                <div className={styles.reminderRow}>
                  <input
                    type="number"
                    className={styles.reminderInput}
                    value={reminderAmount}
                    onFocus={e => e.target.select()}
                    onChange={e => setReminderAmount(e.target.value === '' ? '' : Math.min(999, Number(e.target.value)))}
                  />
                  <div className={styles.unitSegment}>
                    {REMINDER_UNITS.map(u => (
                      <button
                        key={u.key}
                        type="button"
                        className={`${styles.unitBtn} ${reminderUnit === u.key ? styles.unitBtnActive : ''}`}
                        onClick={() => setReminderUnit(u.key)}
                      >
                        {u.label}
                      </button>
                    ))}
                  </div>
                  <span className={styles.reminderSuffix}>до</span>
                </div>
              )}
            </>
          )}
        </div>

        <button type="button" className={styles.doneBtn} onClick={handleSave}>
          Готово
        </button>
      </div>

      {showDatePicker && (
        <CustomDatePicker
          value={draftDate ?? undefined}
          onChange={d => { setDraftDate(d); setShowDatePicker(false) }}
          onClose={() => setShowDatePicker(false)}
          minDate={minDate}
        />
      )}
    </div>
  )
}

export default DeadlineSheet
