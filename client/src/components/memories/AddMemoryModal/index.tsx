import React, { useState } from 'react'
import { useModalHistory } from '../../../hooks/useModalHistory'
import ImageUploadButton from '../../ui/ImageUploadButton'
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
  useModalHistory(onClose, isOpen)

  const [title, setTitle]       = useState('')
  const [location, setLocation] = useState<PlanLocation>({ name: null, address: null, lat: null, lng: null })
  const [date, setDate]         = useState(today())
  const [coverUrl, setCoverUrl] = useState('')
  const [notes, setNotes]       = useState('')
  const [tags, setTags]         = useState<string[]>([])
  const [showPicker, setShowPicker] = useState(false)

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

  if (!isOpen) return null

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.sheet} onClick={e => e.stopPropagation()}>

        <div className={styles.header}>
          <span className={styles.headerTitle}>НОВА ПОДІЯ</span>
          <button type="button" className={styles.closeBtn} onClick={handleClose}>×</button>
        </div>

        <div className={styles.body}>
          <ImageUploadButton
            currentUrl={coverUrl}
            folder="mimir/memories/covers"
            onUpload={setCoverUrl}
            placeholder="Обкладинка"
            variant="compact"
          />

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
