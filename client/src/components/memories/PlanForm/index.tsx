import React, { useEffect, useRef, useState } from 'react'
import { useModalHistory } from '../../../hooks/useModalHistory'
import { useSwipeToDismiss } from '../../../hooks/useSwipeToDismiss'
import LocationSearch from '../LocationSearch'
import CustomDatePicker from '../../ui/CustomDatePicker'
import { formatDateUA } from '../../../utils/formatDate'
import { uploadToCloudinary } from '../../../utils/uploadToCloudinary'
import { useFamilyStore } from '../../../store/familyStore'
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
  const [plannedDate,  setPlannedDate]  = useState<string | null>(null)
  const [notes,        setNotes]        = useState('')
  const [showDatePick, setShowDatePick] = useState(false)
  const [photoUrls,     setPhotoUrls]    = useState<string[]>([])
  const [uploading,     setUploading]    = useState(false)
  const [withProfiles,  setWithProfiles] = useState<string[]>([])
  const photoInputRef = useRef<HTMLInputElement>(null)

  const { accepted, fetchFamily } = useFamilyStore()
  useEffect(() => { if (accepted.length === 0) fetchFamily() }, [accepted.length, fetchFamily])

  const toggleCompanion = (id: string) =>
    setWithProfiles(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

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
      withProfiles,
      notes:        notes.trim(),
      photos:       photoUrls.map(url => ({
        _id:       '',
        url,
        caption:   '',
        createdAt: new Date().toISOString(),
      })),
      status:       'want' as const,
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
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            disabled={uploading}
            onChange={handlePhotoChange}
          />
        </div>

        {/* Compact photo strip when photos uploaded */}
        {photoUrls.length > 0 && (
          <div className={styles.photoStrip}>
            {photoUrls.map(url => (
              <div key={url} className={styles.photoThumb}>
                <img src={url} alt="" className={styles.thumbImg} />
                <button
                  type="button"
                  className={styles.removeThumb}
                  onClick={() => removePhoto(url)}
                  aria-label="Видалити фото"
                >
                  <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                    <path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

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

          {/* Planned date */}
          <div className={styles.field}>
            <label className={styles.label}>ДАТА <span className={styles.labelOptional}>(необов'язково)</span></label>
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

          {/* Companions — only if family members exist */}
          {accepted.length > 0 && (
            <div className={styles.field}>
              <label className={styles.label}>З КИМ</label>
              <div className={styles.companions}>
                {accepted.map(m => {
                  const active = withProfiles.includes(m.id)
                  return (
                    <button
                      key={m.id}
                      type="button"
                      className={`${styles.companion} ${active ? styles.companionActive : ''}`}
                      onClick={() => toggleCompanion(m.id)}
                    >
                      {m.avatarUrl ? (
                        <img src={m.avatarUrl} alt="" className={styles.companionAvatar} />
                      ) : (
                        <span className={styles.companionInitial}>{m.name[0]?.toUpperCase()}</span>
                      )}
                      <span className={styles.companionName}>{m.name.split(' ')[0]}</span>
                      {active && (
                        <svg className={styles.companionCheck} width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

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
