import React, { useEffect, useRef, useState } from 'react'
import { useModalHistory } from '../../../hooks/useModalHistory'
import { useSwipeToDismiss } from '../../../hooks/useSwipeToDismiss'
import { useImageUpload } from '../../../hooks/useImageUpload'
import { useUiStore } from '../../../store/uiStore'
import CustomDatePicker from '../../ui/CustomDatePicker'
import LocationSearch from '../LocationSearch'
import Button from '../../ui/Button'
import type { PlanLocation } from '../../../store/plansStore'
import styles from './AddMemoryModal.module.css'

/**
 * AddMemoryModal
 * --------------
 * Модалка створення нової події-спогаду.
 *
 * Props:
 * @prop {boolean}                                        isOpen   — чи відкрита модалка
 * @prop {() => void}                                     onClose  — закриття
 * @prop {(data: AddMemoryData) => void}                  onCreate — підтвердження зі даними
 */
export interface AddMemoryData {
  title: string
  location?: string
  lat?: number | null
  lng?: number | null
  date: string
  coverUrl: string
  notes?: string
  tags?: string[]
}

interface AddMemoryModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (data: AddMemoryData) => void
}

const today = () => {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const formatDisplayDate = (iso: string) => {
  const [y, m, d] = iso.split('-')
  return y && m && d ? `${d}.${m}.${y}` : iso
}

const AddMemoryModal: React.FC<AddMemoryModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)

  useModalHistory(onClose, isOpen)
  const sheetRef = useSwipeToDismiss(onClose, { enabled: mounted })

  useEffect(() => {
    if (isOpen) {
      setMounted(true)
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    } else {
      setVisible(false)
      const t = setTimeout(() => setMounted(false), 340)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  const [title, setTitle]       = useState('')
  const [location, setLocation] = useState<PlanLocation>({ name: null, address: null, lat: null, lng: null })
  const [date, setDate]         = useState(today())
  const [coverUrl, setCoverUrl] = useState('')
  const [notes, setNotes]       = useState('')
  const [tags, setTags]         = useState<string[]>([])
  const [showPicker, setShowPicker] = useState(false)

  const { showToast } = useUiStore()
  const { trigger: triggerCover, uploading: coverUploading, inputElement: coverInput } =
    useImageUpload('mimir/memories/covers', (url) => {
      setCoverUrl(url)
      showToast('Обкладинку завантажено', 'success')
    })

  const reset = () => {
    setTitle('')
    setLocation({ name: null, address: null, lat: null, lng: null })
    setDate(today())
    setCoverUrl('')
    setNotes('')
    setTags([])
    setShowPicker(false)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const val = e.currentTarget.value.trim().toLowerCase().replace(/\s+/g, '')
      if (val && !tags.includes(val)) setTags(prev => [...prev, val])
      e.currentTarget.value = ''
    }
  }

  const removeTag = (tag: string) => setTags(prev => prev.filter(t => t !== tag))

  const handleCreate = () => {
    if (!title.trim() || !date) return
    onCreate({
      title:    title.trim(),
      location: location.address || location.name || undefined,
      lat:      location.lat,
      lng:      location.lng,
      date,
      coverUrl,
      notes:    notes.trim() || undefined,
      tags:     tags.length ? tags : undefined,
    })
    reset()
  }

  if (!mounted) return null

  return (
    <div
      className={`${styles.overlay} ${visible ? styles.overlayVisible : styles.overlayHidden}`}
      onClick={handleClose}
    >
      {coverInput}
      <div
        ref={sheetRef}
        className={`${styles.sheet} ${visible ? styles.sheetVisible : styles.sheetHidden}`}
        onClick={e => e.stopPropagation()}
      >
        <div className={styles.handle} />

        <div className={styles.header}>
          <span className={styles.headerTitle}>НОВА ПОДІЯ</span>
          <div className={styles.headerRight}>
            <button
              type="button"
              className={`${styles.coverBtn} ${coverUrl ? styles.coverBtnFilled : ''}`}
              onClick={triggerCover}
              aria-label="Додати обкладинку"
              title="Обкладинка"
            >
              {coverUploading ? (
                <span className={styles.coverSpinner} />
              ) : coverUrl ? (
                <img src={coverUrl} alt="" className={styles.coverThumb} />
              ) : (
                <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                  <rect x="1" y="4" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.4"/>
                  <circle cx="9" cy="10" r="3" stroke="currentColor" strokeWidth="1.4"/>
                  <path d="M6 4l1.5-2h3L12 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
            <button type="button" className={styles.closeBtn} onClick={handleClose}>×</button>
          </div>
        </div>

        <div className={styles.body}>
          <div className={styles.field}>
            <label className={styles.label}>НАЗВА</label>
            <input
              className={styles.input}
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Назва події..."
            />
          </div>

          <div className={styles.row}>
            <div className={`${styles.field} ${styles.fieldLocation}`}>
              <label className={styles.label}>МІСЦЕ <span className={styles.optional}>(необов'язково)</span></label>
              <LocationSearch
                initial={location.address ?? ''}
                onSelect={setLocation}
              />
            </div>

            <div className={`${styles.field} ${styles.fieldDate}`}>
              <label className={styles.label}>ДАТА</label>
              <button
                type="button"
                className={styles.dateBtn}
                onClick={() => setShowPicker(true)}
              >
                {date ? formatDisplayDate(date) : 'Вибрати дату'}
              </button>
            </div>
          </div>

          {showPicker && (
            <CustomDatePicker
              value={date}
              onChange={setDate}
              onClose={() => setShowPicker(false)}
            />
          )}

          <div className={styles.field}>
            <label className={styles.label}>НОТАТКИ <span className={styles.optional}>(необов'язково)</span></label>
            <textarea
              className={styles.textarea}
              placeholder="Що запам'яталось..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>ТЕГИ <span className={styles.optional}>(Enter або кома)</span></label>
            <div className={styles.tagsWrap}>
              {tags.map(tag => (
                <span key={tag} className={styles.tag}>
                  #{tag}
                  <button type="button" className={styles.tagRemove} onClick={() => removeTag(tag)}>×</button>
                </span>
              ))}
              <input
                className={styles.tagInput}
                placeholder="+ додати тег"
                onKeyDown={handleTagKeyDown}
              />
            </div>
          </div>

          <Button
            fullWidth
            disabled={!title.trim() || !date}
            onClick={handleCreate}
          >
            СТВОРИТИ
          </Button>
        </div>

      </div>
    </div>
  )
}

export default AddMemoryModal
