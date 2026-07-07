import React, { useState } from 'react'
import CustomDatePicker from '@/shared/components/ui/CustomDatePicker'
import { TimeWheelRow } from '@/shared/components/ui/TimeWheelPicker'
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
  return `За ${amount} ${unitWord}`
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
 * (необов'язково). Час і нагадування — повнорядкові тапабельні блоки з accordion-
 * розкриттям (max-height transition) для зручного тапу на мобілі.
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
  const [draftTime, setDraftTime]   = useState(time ?? '09:00')
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

  const handleTimeRowTap = () => {
    if (!timeOn) {
      setTimeOn(true)
      setTimeEditing(true)
    } else {
      setTimeEditing(v => !v)
    }
  }

  const handleTimeRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    setTimeOn(false)
    setTimeEditing(false)
  }

  const handleReminderRowTap = () => {
    if (!reminderOn) {
      setReminderOn(true)
      setReminderEditing(true)
    } else {
      setReminderEditing(v => !v)
    }
  }

  const handleReminderRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    setReminderOn(false)
    setReminderEditing(false)
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.sheet} onClick={e => e.stopPropagation()}>
        <div className={styles.handle} />
        <div className={styles.header}>
          <span className={styles.title}>Дедлайн</span>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Закрити">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className={styles.body}>
          {/* Date */}
          <button type="button" className={styles.dateRow} onClick={() => setShowDatePicker(true)}>
            <svg width="14" height="14" viewBox="0 0 11 11" fill="none" aria-hidden="true">
              <rect x="1" y="2" width="9" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
              <path d="M1 5h9M3.5 1v2M7.5 1v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            <span className={draftDate ? styles.dateRowValue : styles.dateRowPlaceholder}>
              {draftDate ? formatDate(draftDate) : 'Обрати дату'}
            </span>
            {draftDate && (
              <span
                className={styles.rowClear}
                role="button"
                onClick={e => { e.stopPropagation(); setDraftDate(null); setTimeOn(false); setReminderOn(false) }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </span>
            )}
          </button>

          {draftDate && (
            <>
              {/* ── Time row (full-width tappable) ── */}
              <button
                type="button"
                className={`${styles.toggleRow} ${timeOn ? styles.toggleRowActive : ''}`}
                onClick={handleTimeRowTap}
              >
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true" className={styles.toggleIcon}>
                  <circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.3" />
                  <path d="M7.5 4.5v3.25l2 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className={styles.toggleRowLabel}>
                  {timeOn ? draftTime : 'Час'}
                </span>
                {timeOn ? (
                  <span className={styles.toggleClear} onClick={handleTimeRemove} role="button" aria-label="Прибрати час">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </span>
                ) : (
                  <svg width="8" height="12" viewBox="0 0 6 10" fill="none" className={styles.chevron} aria-hidden="true">
                    <path d="M1 1.5l4 3.5-4 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>

              <div className={`${styles.accordionWrap} ${timeOn && timeEditing ? styles.accordionOpen : ''}`}>
                <div className={styles.accordionInner}>
                  <TimeWheelRow value={draftTime} onChange={setDraftTime} />
                  <button type="button" className={styles.confirmBtn} onClick={() => setTimeEditing(false)}>
                    Підтвердити
                  </button>
                </div>
              </div>

              {/* ── Reminder row (full-width tappable) ── */}
              <button
                type="button"
                className={`${styles.toggleRow} ${reminderOn ? styles.toggleRowActive : ''}`}
                onClick={handleReminderRowTap}
              >
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true" className={styles.toggleIcon}>
                  <path d="M7.5 2a5 5 0 015 5v2.5l1 1.5H1.5l1-1.5V7a5 5 0 015-5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                  <path d="M6 12.5a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
                <span className={styles.toggleRowLabel}>
                  {reminderOn ? formatReminderPhrase(Number(reminderAmount) || 1, reminderUnit) : 'Нагадати'}
                </span>
                {reminderOn ? (
                  <span className={styles.toggleClear} onClick={handleReminderRemove} role="button" aria-label="Прибрати нагадування">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </span>
                ) : (
                  <svg width="8" height="12" viewBox="0 0 6 10" fill="none" className={styles.chevron} aria-hidden="true">
                    <path d="M1 1.5l4 3.5-4 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>

              <div className={`${styles.accordionWrap} ${reminderOn && reminderEditing ? styles.accordionOpen : ''}`}>
                <div className={styles.accordionInner}>
                  <ReminderFields
                    amount={reminderAmount}
                    unit={reminderUnit}
                    onAmountChange={setReminderAmount}
                    onUnitChange={setReminderUnit}
                    suffix="до дедлайну"
                  />
                  <button type="button" className={styles.confirmBtn} onClick={() => setReminderEditing(false)}>
                    Підтвердити
                  </button>
                </div>
              </div>
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
