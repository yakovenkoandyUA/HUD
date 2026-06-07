import React, { useState } from 'react'
import LocationSearch from '../LocationSearch'
import CustomDatePicker from '../../ui/CustomDatePicker'
import { formatDateUA } from '../../../utils/formatDate'
import type { PlanInput, PlanLocation } from '../../../store/plansStore'
import styles from './PlanForm.module.css'

/**
 * PlanForm
 * --------
 * Bottom-sheet form for creating a new plan.
 * Fields: title, location (Nominatim autocomplete), status, planned date, notes.
 *
 * Props:
 * @prop {(data: PlanInput) => void} onSubmit — called with completed plan data
 * @prop {() => void}                onClose
 */
interface PlanFormProps {
  onSubmit: (data: PlanInput) => void
  onClose:  () => void
}

type PlanStatus = 'want' | 'planned' | 'visited'

const STATUS_OPTIONS: { value: PlanStatus; label: string }[] = [
  { value: 'want',    label: 'Хочу відвідати' },
  { value: 'planned', label: 'Заплановано' },
  { value: 'visited', label: 'Вже відвідали' },
]

const PlanForm: React.FC<PlanFormProps> = ({ onSubmit, onClose }) => {
  const [title,        setTitle]        = useState('')
  const [location,     setLocation]     = useState<PlanLocation>({ name: null, address: null, lat: null, lng: null })
  const [status,       setStatus]       = useState<PlanStatus>('want')
  const [plannedDate,  setPlannedDate]  = useState<string | null>(null)
  const [notes,        setNotes]        = useState('')
  const [showDatePick, setShowDatePick] = useState(false)

  const canSubmit = title.trim().length > 0

  const handleSubmit = () => {
    if (!canSubmit) return
    onSubmit({
      title:        title.trim(),
      location,
      withProfiles: [],
      notes:        notes.trim(),
      photos:       [],
      status,
      plannedDate:  plannedDate,
      visitedDate:  null,
      memoryId:     null,
    })
    onClose()
  }

  return (
    <>
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.sheet} onClick={e => e.stopPropagation()}>
        <div className={styles.handle} />
        <h2 className={styles.heading}>Новий план</h2>

        <div className={styles.fields}>
          {/* Title */}
          <div className={styles.field}>
            <label className={styles.label}>НАЗВА</label>
            <input
              className={styles.input}
              placeholder="Куди плануєш?"
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
              autoFocus
            />
          </div>

          {/* Location */}
          <div className={styles.field}>
            <label className={styles.label}>МІСЦЕ</label>
            <LocationSearch onSelect={setLocation} />
          </div>

          {/* Status */}
          <div className={styles.field}>
            <label className={styles.label}>СТАТУС</label>
            <div className={styles.statusRow}>
              {STATUS_OPTIONS.map(o => (
                <button
                  key={o.value}
                  type="button"
                  className={`${styles.statusBtn} ${status === o.value ? styles.statusActive : ''}`}
                  data-s={o.value}
                  onClick={() => setStatus(o.value)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Planned date — only for planned/visited */}
          {(status === 'planned' || status === 'visited') && (
            <div className={styles.field}>
              <label className={styles.label}>ДАТА</label>
              <button
                type="button"
                className={styles.dateTrigger}
                onClick={() => setShowDatePick(true)}
              >
                {plannedDate
                  ? formatDateUA(plannedDate)
                  : <span className={styles.datePlaceholder}>Обрати дату</span>
                }
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <rect x="2" y="3" width="10" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                  <path d="M5 1v3M9 1v3M2 6h10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          )}

          {/* Notes */}
          <div className={styles.field}>
            <label className={styles.label}>НОТАТКИ</label>
            <textarea
              className={styles.textarea}
              placeholder="Деталі, посилання, ідеї..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <button
          type="button"
          className={styles.submitBtn}
          onClick={handleSubmit}
          disabled={!canSubmit}
        >
          ДОДАТИ ПЛАН
        </button>
      </div>
    </div>

    {showDatePick && (
      <CustomDatePicker
        value={plannedDate ?? undefined}
        onChange={(d) => { setPlannedDate(d); setShowDatePick(false) }}
        onClose={() => setShowDatePick(false)}
      />
    )}
    </>
  )
}

export default PlanForm
