import React, { useRef, useState } from 'react'
import { useSwipeToDismiss } from '@/shared/hooks/useSwipeToDismiss'
import { useTripPlaceStore } from '../../store/tripPlaceStore'
import type { TripPlaceCategory } from '../../store/tripPlaceStore'
import styles from './AddPlaceSheet.module.css'

// ── Types ──────────────────────────────────────────────────────────────────

interface Props {
  isOpen:  boolean
  spaceId: string
  color:   string
  onClose: () => void
}

// ── Helpers ────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<TripPlaceCategory, string> = {
  museum:    'Музей',
  restaurant:'Ресторан',
  cafe:      'Кафе',
  park:      'Парк',
  shop:      'Магазин',
  viewpoint: 'Оглядовий',
  hotel:     'Готель',
  other:     'Інше',
}

// ── Component ──────────────────────────────────────────────────────────────

/**
 * AddPlaceSheet
 * -------------
 * Bottom sheet для додавання збереженого місця до trip space.
 *
 * @prop isOpen  — стан відкриття
 * @prop spaceId — ID простору
 * @prop color   — колір простору для акцентів
 * @prop onClose — callback закриття
 */
const AddPlaceSheet: React.FC<Props> = ({ isOpen, spaceId, color, onClose }) => {
  const { create } = useTripPlaceStore()

  const [name, setName]           = useState('')
  const [category, setCategory]   = useState<TripPlaceCategory>('other')
  const [address, setAddress]     = useState('')
  const [notes, setNotes]         = useState('')
  const [busy, setBusy]           = useState(false)
  const [mounted, setMounted]     = useState(false)
  const [visible, setVisible]     = useState(false)

  const sheetRef   = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const bodyRef    = useRef<HTMLDivElement>(null)

  useSwipeToDismiss(onClose, { enabled: isOpen, bodyRef, overlayRef, sheetRef })

  React.useEffect(() => {
    if (isOpen) {
      setName(''); setCategory('other'); setAddress(''); setNotes('')
      setMounted(true)
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    } else {
      setVisible(false)
      const t = setTimeout(() => setMounted(false), 320)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  const handleSave = async () => {
    if (!name.trim()) return
    setBusy(true)
    try {
      await create(spaceId, {
        name:    name.trim(),
        category,
        address: address || undefined,
        notes:   notes   || undefined,
      })
      onClose()
    } finally {
      setBusy(false)
    }
  }

  if (!mounted) return null
  const colorVar = { '--space-color': color } as React.CSSProperties

  return (
    <div
      ref={overlayRef}
      className={`${styles.overlay} ${visible ? styles.overlayVisible : ''}`}
      style={colorVar}
      onClick={e => { if (e.target === overlayRef.current) onClose() }}
    >
      <div ref={sheetRef} className={`${styles.sheet} ${visible ? styles.sheetVisible : ''}`}>
        <div className={styles.handle} />
        <div className={styles.sheetHeader}>
          <span className={styles.sheetTitle}>МІСЦЕ</span>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Закрити">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div ref={bodyRef} className={styles.sheetBody}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>НАЗВА</label>
            <input
              className={styles.fieldInput}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Лувр, Tsukiji Market…"
              autoFocus
            />
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>КАТЕГОРІЯ</label>
            <div className={styles.pills}>
              {(Object.keys(CATEGORY_LABELS) as TripPlaceCategory[]).map(c => (
                <button
                  key={c} type="button"
                  className={`${styles.pill} ${category === c ? styles.pillOn : ''}`}
                  onClick={() => setCategory(c)}
                >
                  {CATEGORY_LABELS[c]}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>АДРЕСА</label>
            <input
              className={styles.fieldInput}
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="Rue de Rivoli 1, Paris…"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>НОТАТКА</label>
            <textarea
              className={styles.textarea}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Відкрито до 18:00, бронювати заздалегідь…"
              rows={2}
            />
          </div>
        </div>

        <div className={styles.sheetFooter}>
          <button
            type="button"
            className={styles.saveBtn}
            style={{ background: color }}
            onClick={handleSave}
            disabled={busy || !name.trim()}
          >
            {busy ? 'Збереження…' : 'Зберегти місце'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AddPlaceSheet
