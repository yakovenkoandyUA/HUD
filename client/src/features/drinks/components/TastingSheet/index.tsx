import React, { useState } from 'react'
import Modal from '@/shared/components/ui/Modal'
import CustomDatePicker from '@/shared/components/ui/CustomDatePicker'
import { useDrinksStore } from '../../store/drinksStore'
import styles from './TastingSheet.module.css'

interface Props {
  drinkId: string
  drinkName: string
  onClose: () => void
}

/**
 * TastingSheet — bottom sheet for logging a tasting session.
 */
const TastingSheet: React.FC<Props> = ({ drinkId, drinkName, onClose }) => {
  const { addTasting } = useDrinksStore()
  const [date,     setDate]     = useState(new Date().toISOString().slice(0, 10))
  const [rating,   setRating]   = useState(0)
  const [notes,    setNotes]    = useState('')
  const [occasion, setOccasion] = useState('')
  const [saving,   setSaving]   = useState(false)

  async function handleSave() {
    if (rating === 0) return
    setSaving(true)
    try {
      await addTasting(drinkId, { date, rating, notes, occasion })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen onClose={onClose} title="ДЕГУСТАЦІЯ" draggable>
      <div className={styles.body}>
        <p className={styles.drinkName}>{drinkName}</p>

        <div className={styles.field}>
          <label className={styles.label}>Дата</label>
          <CustomDatePicker value={date} onChange={setDate} />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Рейтинг сесії</label>
          <div className={styles.ratingRow}>
            {Array.from({ length: 10 }, (_, i) => i + 1).map(v => (
              <button
                key={v}
                className={`${styles.ratingBtn} ${rating >= v ? styles.ratingBtnActive : ''}`}
                onClick={() => setRating(v === rating ? 0 : v)}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Привід / Occasion</label>
          <input
            className={styles.input}
            value={occasion}
            onChange={e => setOccasion(e.target.value)}
            placeholder="День народження, вечір вдома..."
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Нотатки</label>
          <textarea
            className={styles.textarea}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Смакові враження, поєднання з їжею..."
            rows={3}
          />
        </div>

        <button
          className={styles.saveBtn}
          onClick={handleSave}
          disabled={saving || rating === 0}
        >
          {saving ? 'Зберігаю...' : 'ЗАПИСАТИ ДЕГУСТАЦІЮ'}
        </button>
      </div>
    </Modal>
  )
}

export default TastingSheet
