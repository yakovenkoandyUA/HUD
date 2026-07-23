import React, { useRef, useState } from 'react'
import { useSwipeToDismiss } from '@/shared/hooks/useSwipeToDismiss'
import CustomDatePicker from '@/shared/components/ui/CustomDatePicker'
import { authFetch } from '@/shared/services/api'
import styles from './AddSpaceExpenseSheet.module.css'

// ── Types ──────────────────────────────────────────────────────────────────

interface SpaceTx {
  _id:      string
  type:     'income' | 'expense'
  amount:   number
  desc:     string
  title?:   string
  category?: string
  date:     string
}

interface Props {
  isOpen:      boolean
  spaceId:     string
  color:       string
  onClose:     () => void
  onExpenseAdded: (tx: SpaceTx) => void
}

// ── Helpers ────────────────────────────────────────────────────────────────

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function fmtDateFull(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}.${m}.${y}`
}

// ── Component ──────────────────────────────────────────────────────────────

/**
 * AddSpaceExpenseSheet
 * --------------------
 * Швидка форма додавання витрати в trip space (Фаза 3).
 * Створює Transaction з type='expense' і preinject spaceId.
 *
 * @prop isOpen           — стан відкриття
 * @prop spaceId          — ID простору
 * @prop color            — колір простору для акцентів
 * @prop onClose          — callback закриття
 * @prop onExpenseAdded   — callback з новою транзакцією (для оновлення spaceTxs)
 */
const AddSpaceExpenseSheet: React.FC<Props> = ({ isOpen, spaceId, color, onClose, onExpenseAdded }) => {
  const [amount, setAmount]       = useState('')
  const [desc, setDesc]           = useState('')
  const [date, setDate]           = useState(todayIso)
  const [dateOpen, setDateOpen]   = useState(false)
  const [busy, setBusy]           = useState(false)
  const [mounted, setMounted]     = useState(false)
  const [visible, setVisible]     = useState(false)

  const sheetRef   = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const bodyRef    = useRef<HTMLDivElement>(null)

  useSwipeToDismiss(onClose, { enabled: isOpen, bodyRef, overlayRef, sheetRef })

  React.useEffect(() => {
    if (isOpen) {
      setAmount(''); setDesc(''); setDate(todayIso())
      setMounted(true)
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    } else {
      setVisible(false)
      const t = setTimeout(() => setMounted(false), 320)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  const handleSave = async () => {
    const parsed = parseFloat(amount)
    if (!parsed || parsed <= 0) return
    setBusy(true)
    try {
      const res = await authFetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type:    'expense',
          amount:  parsed,
          desc:    desc.trim() || 'Витрата',
          date,
          source:  'manual',
          spaceId,
        }),
      })
      if (!res.ok) throw new Error('Failed')
      const tx = await res.json() as SpaceTx
      onExpenseAdded(tx)
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
          <span className={styles.sheetTitle}>ВИТРАТА</span>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Закрити">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div ref={bodyRef} className={styles.sheetBody}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>СУМА (₴)</label>
            <input
              className={styles.amountInput}
              value={amount}
              onChange={e => setAmount(e.target.value)}
              type="number"
              inputMode="decimal"
              placeholder="0"
              min="0"
              autoFocus
            />
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>ОПИС</label>
            <input
              className={styles.fieldInput}
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="Вечеря, таксі, сувеніри…"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>ДАТА</label>
            <button type="button" className={styles.dateField} onClick={() => setDateOpen(true)}>
              {fmtDateFull(date)}
            </button>
            {dateOpen && <CustomDatePicker value={date} onChange={v => { setDate(v); setDateOpen(false) }} onClose={() => setDateOpen(false)} />}
          </div>
        </div>

        <div className={styles.sheetFooter}>
          <button
            type="button"
            className={styles.saveBtn}
            style={{ background: color }}
            onClick={handleSave}
            disabled={busy || !amount || parseFloat(amount) <= 0}
          >
            {busy ? 'Збереження…' : 'Зберегти витрату'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AddSpaceExpenseSheet
