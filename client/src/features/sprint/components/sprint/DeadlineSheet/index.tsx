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
          {/* ── Pill chips ── */}
          <div className={styles.pillsRow}>
            {/* Date pill */}
            <button type="button" className={`${styles.pill} ${draftDate ? styles.pillActive : ''}`} onClick={() => setShowDatePicker(true)}>
              <svg className={styles.pillIcon} width="13" height="13" viewBox="0 0 11 11" fill="none" aria-hidden="true">
                <rect x="1" y="2" width="9" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                <path d="M1 5h9M3.5 1v2M7.5 1v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              {draftDate
                ? <span className={styles.pillLabel}>{formatDate(draftDate)}</span>
                : <span className={styles.pillPlaceholder}>Дата</span>
              }
              {draftDate && (
                <span
                  className={styles.pillClear}
                  role="button"
                  onClick={e => { e.stopPropagation(); setDraftDate(null); setTimeOn(false); setReminderOn(false) }}
                >
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </span>
              )}
            </button>

            {draftDate && (
              <>
                {/* Time pill */}
                <button type="button" className={`${styles.pill} ${timeOn ? styles.pillActive : ''}`} onClick={handleTimeRowTap}>
                  <svg className={styles.pillIcon} width="13" height="13" viewBox="0 0 15 15" fill="none" aria-hidden="true">
                    <circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.3" />
                    <path d="M7.5 4.5v3.25l2 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {timeOn
                    ? <span className={styles.pillLabel}>{draftTime}</span>
                    : <span className={styles.pillPlaceholder}>Час</span>
                  }
                  {timeOn && (
                    <span className={styles.pillClear} role="button" onClick={handleTimeRemove} aria-label="Прибрати час">
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                        <path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </span>
                  )}
                </button>

                {/* Reminder pill */}
                <button type="button" className={`${styles.pill} ${reminderOn ? styles.pillActive : ''}`} onClick={handleReminderRowTap}>
                  <svg className={styles.pillIcon} width="13" height="13" viewBox="0 0 15 15" fill="none" aria-hidden="true">
                    <path d="M7.5 2a5 5 0 015 5v2.5l1 1.5H1.5l1-1.5V7a5 5 0 015-5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                    <path d="M6 12.5a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                  {reminderOn
                    ? <span className={styles.pillLabel}>{formatReminderPhrase(Number(reminderAmount) || 1, reminderUnit)}</span>
                    : <span className={styles.pillPlaceholder}>Нагадати</span>
                  }
                  {reminderOn && (
                    <span className={styles.pillClear} role="button" onClick={handleReminderRemove} aria-label="Прибрати нагадування">
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                        <path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </span>
                  )}
                </button>
              </>
            )}
          </div>

          {/* ── Accordions ── */}
          {draftDate && (
            <>
              <div className={`${styles.accordionWrap} ${timeOn && timeEditing ? styles.accordionOpen : ''}`}>
                <div className={styles.accordionInner}>
                  <TimeWheelRow value={draftTime} onChange={setDraftTime} />
                  <button type="button" className={styles.confirmBtn} onClick={() => setTimeEditing(false)}>
                    Підтвердити
                  </button>
                </div>
              </div>

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
