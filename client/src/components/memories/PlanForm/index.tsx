import React, { useEffect, useRef, useState } from 'react'
import { useModalHistory } from '../../../hooks/useModalHistory'
import { useSwipeToDismiss } from '../../../hooks/useSwipeToDismiss'
import LocationSearch from '../LocationSearch'
import CustomDatePicker from '../../ui/CustomDatePicker'
import { formatDateUA } from '../../../utils/formatDate'
import { uploadToCloudinary } from '../../../utils/uploadToCloudinary'
import type { PlanInput, PlanLocation } from '../../../store/plansStore'
import styles from './PlanForm.module.css'

/**
 * PlanForm
 * --------
 * Bottom-sheet form for creating a new plan.
 * Fields: title, location, status, planned date, notes, photos.
 * Photos are uploaded to Cloudinary immediately on pick and bundled into photos[] on submit.
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
  { value: 'want',    label: 'Хочу' },
  { value: 'planned', label: 'План' },
  { value: 'visited', label: 'Були' },
]

const CLOSE_MS = 260

const PlanForm: React.FC<PlanFormProps> = ({ onSubmit, onClose }) => {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
  }, [])

  // Backdrop/cancel/back-button close — animates out locally, then unmounts.
  // Swipe close is separate (below): the gesture already animates the sheet
  // itself, so it calls the real onClose directly once it finishes.
  const handleClose = () => {
    setVisible(false)
    setTimeout(onClose, CLOSE_MS)
  }

  useModalHistory(handleClose, visible)
  const sheetRef = useSwipeToDismiss(onClose, { enabled: visible })

  const [title,        setTitle]        = useState('')
  const [location,     setLocation]     = useState<PlanLocation>({ name: null, address: null, lat: null, lng: null })
  const [status,       setStatus]       = useState<PlanStatus>('want')
  const [plannedDate,  setPlannedDate]  = useState<string | null>(null)
  const [notes,        setNotes]        = useState('')
  const [showDatePick, setShowDatePick] = useState(false)
  const [photoUrls,    setPhotoUrls]    = useState<string[]>([])
  const [uploading,    setUploading]    = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)

  const canSubmit = title.trim().length > 0

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadToCloudinary(file, 'mimir/plans')
      setPhotoUrls(prev => [...prev, url])
    } catch { /* silent — user can retry */ }
    finally { setUploading(false); e.target.value = '' }
  }

  const removePhoto = (url: string) => {
    setPhotoUrls(prev => prev.filter(u => u !== url))
  }

  const handleSubmit = () => {
    if (!canSubmit) return
    onSubmit({
      title:        title.trim(),
      location,
      withProfiles: [],
      notes:        notes.trim(),
      photos:       photoUrls.map(url => ({
        _id:       '',
        url,
        caption:   '',
        createdAt: new Date().toISOString(),
      })),
      status,
      plannedDate,
      visitedDate: null,
      memoryId:    null,
    })
    handleClose()
  }

  return (
    <>
    <div className={`${styles.overlay} ${visible ? styles.overlayVisible : styles.overlayHidden}`} onClick={handleClose}>
      <div ref={sheetRef} className={`${styles.sheet} ${visible ? styles.sheetVisible : styles.sheetHidden}`} onClick={e => e.stopPropagation()}>
        <div className={styles.handle} />
        <div className={styles.headingRow}>
          <h2 className={styles.heading}>Новий план</h2>
          <button
            type="button"
            className={`${styles.headerPhotoBtn} ${photoUrls.length > 0 ? styles.headerPhotoBtnActive : ''}`}
            onClick={() => photoInputRef.current?.click()}
            aria-label="Додати фото"
            title="Фото"
          >
            {uploading ? (
              <span className={styles.headerPhotoSpinner} />
            ) : photoUrls.length > 0 ? (
              <>
                <img src={photoUrls[photoUrls.length - 1]} alt="" className={styles.headerPhotoThumb} />
                <span className={styles.headerPhotoBadge}>{photoUrls.length}</span>
              </>
            ) : (
              <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                <rect x="1" y="4" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.4"/>
                <circle cx="9" cy="10" r="3" stroke="currentColor" strokeWidth="1.4"/>
                <path d="M6 4l1.5-2h3L12 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
        </div>

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
            <div className={styles.statusChips}>
              {STATUS_OPTIONS.map(o => (
                <button
                  key={o.value}
                  type="button"
                  className={`${styles.statusChip} ${status === o.value ? styles.statusActive : ''}`}
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

          {/* Photos */}
          <div className={styles.field}>
            <label className={styles.label}>ФОТО</label>
            <div className={styles.photoRow}>
              {photoUrls.map(url => (
                <div key={url} className={styles.photoThumb}>
                  <img src={url} alt="" className={styles.thumbImg} />
                  <button
                    type="button"
                    className={styles.removeThumb}
                    onClick={() => removePhoto(url)}
                    aria-label="Видалити фото"
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
              ))}
              <label className={`${styles.addThumb} ${uploading ? styles.addThumbLoading : ''}`}>
                {uploading ? (
                  <span className={styles.spinner} />
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                      <path d="M2 9h14M9 2v14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                    </svg>
                    <span className={styles.addThumbLabel}>ФОТО</span>
                  </>
                )}
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  className={styles.fileInput}
                  disabled={uploading}
                  onChange={handlePhotoChange}
                />
              </label>
            </div>
          </div>
        </div>

        <button
          type="button"
          className={styles.submitBtn}
          onClick={handleSubmit}
          disabled={!canSubmit || uploading}
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
