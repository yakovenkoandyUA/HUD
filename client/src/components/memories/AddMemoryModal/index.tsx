import React, { useState } from 'react'
import ImageUploadButton from '../../ui/ImageUploadButton'
import CustomDatePicker from '../../ui/CustomDatePicker'
import Button from '../../ui/Button'
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
  date: string
  coverUrl: string
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

const AddMemoryModal: React.FC<AddMemoryModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [title, setTitle]       = useState('')
  const [location, setLocation] = useState('')
  const [date, setDate]         = useState(today())
  const [coverUrl, setCoverUrl] = useState('')
  const [showPicker, setShowPicker] = useState(false)

  const reset = () => {
    setTitle('')
    setLocation('')
    setDate(today())
    setCoverUrl('')
    setShowPicker(false)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleCreate = () => {
    if (!title.trim() || !date) return
    onCreate({ title: title.trim(), location: location.trim() || undefined, date, coverUrl })
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
            variant="wide"
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

          <div className={styles.field}>
            <label className={styles.label}>МІСЦЕ <span className={styles.optional}>(необов'язково)</span></label>
            <input
              className={styles.input}
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="Де це було?"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>ДАТА</label>
            <button
              type="button"
              className={styles.dateBtn}
              onClick={() => setShowPicker(true)}
            >
              {date || 'Вибрати дату'}
            </button>
          </div>

          {showPicker && (
            <CustomDatePicker
              value={date}
              onChange={setDate}
              onClose={() => setShowPicker(false)}
            />
          )}

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
