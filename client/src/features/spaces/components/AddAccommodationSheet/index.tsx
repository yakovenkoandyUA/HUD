import React, { useRef, useState } from 'react'
import { useSwipeToDismiss } from '@/shared/hooks/useSwipeToDismiss'
import CustomDatePicker from '@/shared/components/ui/CustomDatePicker'
import { useAccommodationStore } from '../../store/accommodationStore'
import styles from './AddAccommodationSheet.module.css'

// ── Types ──────────────────────────────────────────────────────────────────

interface Props {
  isOpen:  boolean
  spaceId: string
  color:   string
  onClose: () => void
}

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtDateFull(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}.${m}.${y}`
}

// ── Component ──────────────────────────────────────────────────────────────

/**
 * AddAccommodationSheet
 * ---------------------
 * Bottom sheet для додавання бронювання житла до trip space.
 *
 * @prop isOpen  — стан відкриття
 * @prop spaceId — ID простору
 * @prop color   — колір простору для акцентів
 * @prop onClose — callback закриття
 */
const AddAccommodationSheet: React.FC<Props> = ({ isOpen, spaceId, color, onClose }) => {
  const { create } = useAccommodationStore()

  const [name, setName]             = useState('')
  const [address, setAddress]       = useState('')
  const [checkIn, setCheckIn]       = useState('')
  const [checkInOpen, setCheckInOpen] = useState(false)
  const [checkOut, setCheckOut]     = useState('')
  const [checkOutOpen, setCheckOutOpen] = useState(false)
  const [bookCode, setBookCode]     = useState('')
  const [link, setLink]             = useState('')
  const [price, setPrice]           = useState('')
  const [currency, setCurrency]     = useState<'UAH' | 'USD' | 'EUR'>('UAH')
  const [notes, setNotes]           = useState('')
  const [busy, setBusy]             = useState(false)
  const [mounted, setMounted]       = useState(false)
  const [visible, setVisible]       = useState(false)

  const sheetRef   = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const bodyRef    = useRef<HTMLDivElement>(null)

  useSwipeToDismiss(onClose, { enabled: isOpen, bodyRef, overlayRef, sheetRef })

  React.useEffect(() => {
    if (isOpen) {
      setName(''); setAddress(''); setCheckIn(''); setCheckOut('')
      setBookCode(''); setLink(''); setPrice(''); setCurrency('UAH'); setNotes('')
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
        name:        name.trim(),
        address:     address     || undefined,
        checkIn:     checkIn     || undefined,
        checkOut:    checkOut    || undefined,
        bookingCode: bookCode    || undefined,
        link:        link        || undefined,
        price:       price ? parseFloat(price) : null,
        currency,
        notes:       notes       || undefined,
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
          <span className={styles.sheetTitle}>ПРОЖИВАННЯ</span>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Закрити">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div ref={bodyRef} className={styles.sheetBody}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>НАЗВА</label>
            <input className={styles.fieldInput} value={name} onChange={e => setName(e.target.value)} placeholder="Hilton, Airbnb на Podil…" autoFocus />
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>АДРЕСА</label>
            <input className={styles.fieldInput} value={address} onChange={e => setAddress(e.target.value)} placeholder="вул. Хрещатик 1, Київ…" />
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>ЗАЇЗД</label>
              <button type="button" className={styles.dateField} onClick={() => setCheckInOpen(true)}>
                {checkIn ? fmtDateFull(checkIn) : 'Вибрати'}
              </button>
              {checkInOpen && <CustomDatePicker value={checkIn} onChange={v => { setCheckIn(v); setCheckInOpen(false) }} onClose={() => setCheckInOpen(false)} />}
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>ВИЇЗД</label>
              <button type="button" className={styles.dateField} onClick={() => setCheckOutOpen(true)}>
                {checkOut ? fmtDateFull(checkOut) : 'Вибрати'}
              </button>
              {checkOutOpen && <CustomDatePicker value={checkOut} onChange={v => { setCheckOut(v); setCheckOutOpen(false) }} onClose={() => setCheckOutOpen(false)} />}
            </div>
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>КОД БРОНЮВАННЯ</label>
              <input className={styles.fieldInput} value={bookCode} onChange={e => setBookCode(e.target.value)} placeholder="BK12345…" />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>ЦІНА</label>
              <div className={styles.priceRow}>
                <input className={`${styles.fieldInput} ${styles.priceInput}`} value={price} onChange={e => setPrice(e.target.value)} placeholder="0" type="number" inputMode="decimal" min="0" />
                <div className={styles.currencyPills}>
                  {(['UAH','USD','EUR'] as const).map(c => (
                    <button key={c} type="button" className={`${styles.currencyPill} ${currency === c ? styles.pillOn : ''}`} onClick={() => setCurrency(c)}>{c}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>ПОСИЛАННЯ</label>
            <input className={styles.fieldInput} value={link} onChange={e => setLink(e.target.value)} placeholder="https://booking.com/…" />
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>НОТАТКА</label>
            <textarea className={styles.textarea} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Пізній заїзд, ключ під килимком…" rows={2} />
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
            {busy ? 'Збереження…' : 'Зберегти'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AddAccommodationSheet
