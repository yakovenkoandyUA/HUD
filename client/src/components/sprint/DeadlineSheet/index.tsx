import React, { useState } from 'react'
import CustomDatePicker from '../../ui/CustomDatePicker'
import { TimeWheelRow } from '../../ui/TimeWheelPicker'
import ReminderFields, { type ReminderUnit } from '../ReminderFields'
import styles from './DeadlineSheet.module.css'

export type { ReminderUnit }
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

function formatReminderPhrase(amount: number, unit: ReminderUnit): string {
  const unitWord =
    unit === 'minutes' ? (amount === 1 ? 'хвилину' : amount < 5 ? 'хвилини' : 'хвилин') :
    unit === 'hours'   ? (amount === 1 ? 'годину'  : amount < 5 ? 'години'  : 'годин') :
    unit === 'days'    ? (amount === 1 ? 'день'     : amount < 5 ? 'дні'     : 'днів') :
                         (amount === 1 ? 'тиждень'  : amount < 5 ? 'тижні'   : 'тижнів')
  return `За ${amount} ${unitWord} до дедлайну`
}

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
 * (необов'язково) в одному bottom sheet. Час і нагадування після підтвердження
 * згортаються у компактний рядок-результат — барабан/форма нагадування не
 * займають місце весь час, тільки під час активного редагування.
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
  const [timeEditing, setTimeEditing] = useState(false)

  const [reminderOn, setReminderOn] = useState(!!reminder)
  const [reminderEditing, setReminderEditing] = useState(false)
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
              {/* ── Time — optional, collapses to a compact row once confirmed ── */}
              <div className={styles.optionRow}>
                <span className={styles.optionLabel}>Час</span>
                {timeOn && !timeEditing ? (
                  <button type="button" className={styles.optionClear} onClick={() => { setTimeOn(false); setTimeEditing(false) }}>Прибрати</button>
                ) : !timeOn ? (
                  <button type="button" className={styles.optionAdd} onClick={() => { setTimeOn(true); setTimeEditing(true) }}>+ Додати</button>
                ) : null}
              </div>

              {timeOn && !timeEditing && (
                <button type="button" className={styles.resultRow} onClick={() => setTimeEditing(true)}>
                  <span className={styles.resultValue}>{draftTime ?? '09:00'}</span>
                  <span className={styles.resultEdit}>Змінити</span>
                </button>
              )}

              {timeOn && timeEditing && (
                <div className={styles.editingBlock}>
                  <TimeWheelRow value={draftTime ?? '09:00'} onChange={setDraftTime} />
                  <button type="button" className={styles.confirmBtn} onClick={() => setTimeEditing(false)}>
                    Підтвердити час
                  </button>
                </div>
              )}

              {/* ── Reminder — optional, same collapse pattern ── */}
              <div className={styles.optionRow}>
                <span className={styles.optionLabel}>Нагадати</span>
                {reminderOn && !reminderEditing ? (
                  <button type="button" className={styles.optionClear} onClick={() => { setReminderOn(false); setReminderEditing(false) }}>Прибрати</button>
                ) : !reminderOn ? (
                  <button type="button" className={styles.optionAdd} onClick={() => { setReminderOn(true); setReminderEditing(true) }}>+ Додати</button>
                ) : null}
              </div>

              {reminderOn && !reminderEditing && (
                <button type="button" className={styles.resultRow} onClick={() => setReminderEditing(true)}>
                  <span className={styles.resultValue}>{formatReminderPhrase(Number(reminderAmount) || 1, reminderUnit)}</span>
                  <span className={styles.resultEdit}>Змінити</span>
                </button>
              )}

              {reminderOn && reminderEditing && (
                <div className={styles.editingBlock}>
                  <ReminderFields
                    amount={reminderAmount}
                    unit={reminderUnit}
                    onAmountChange={setReminderAmount}
                    onUnitChange={setReminderUnit}
                    suffix="до дедлайну"
                  />
                  <button type="button" className={styles.confirmBtn} onClick={() => setReminderEditing(false)}>
                    Підтвердити нагадування
                  </button>
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
