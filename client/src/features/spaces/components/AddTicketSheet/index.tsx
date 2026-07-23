import React, { useRef, useState } from 'react'
import { useSwipeToDismiss } from '@/shared/hooks/useSwipeToDismiss'
import CustomDatePicker from '@/shared/components/ui/CustomDatePicker'
import { useTicketStore } from '../../store/ticketStore'
import type { TicketTransport } from '../../store/ticketStore'
import styles from './AddTicketSheet.module.css'

// ── Types ──────────────────────────────────────────────────────────────────

interface Props {
  isOpen:  boolean
  spaceId: string
  color:   string
  onClose: () => void
}

// ── Helpers ────────────────────────────────────────────────────────────────

const TRANSPORT_LABELS: Record<TicketTransport, string> = {
  plane: 'Літак',
  train: 'Поїзд',
  bus:   'Автобус',
  ferry: 'Пором',
  car:   'Авто',
}

const TRANSPORT_ICONS: Record<TicketTransport, React.ReactNode> = {
  plane: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
    </svg>
  ),
  train: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="3" width="16" height="14" rx="3"/><path d="M4 11h16M12 3v8M8 19l-2 2M16 19l2 2M8 19h8"/>
    </svg>
  ),
  bus: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 6v6M15 6v6M2 12h19.6M18 18h2a1 1 0 0 0 1-1v-5l-3-4H6L3 12v5a1 1 0 0 0 1 1h2"/><circle cx="8" cy="18" r="2"/><circle cx="16" cy="18" r="2"/>
    </svg>
  ),
  ferry: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2M3 17l2 3h14l2-3M12 2v10M5 9l7 4 7-4"/>
    </svg>
  ),
  car: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2"/><rect x="7" y="14" width="10" height="6" rx="1"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/>
    </svg>
  ),
}

function fmtDateFull(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}.${m}.${y}`
}

// ── Component ──────────────────────────────────────────────────────────────

/**
 * AddTicketSheet
 * --------------
 * Bottom sheet для додавання квитка до trip space.
 *
 * @prop isOpen  — стан відкриття
 * @prop spaceId — ID простору
 * @prop color   — колір простору для акцентів
 * @prop onClose — callback закриття
 */
const AddTicketSheet: React.FC<Props> = ({ isOpen, spaceId, color, onClose }) => {
  const { create } = useTicketStore()

  const [transport, setTransport] = useState<TicketTransport>('plane')
  const [from, setFrom]           = useState('')
  const [to, setTo]               = useState('')
  const [date, setDate]           = useState('')
  const [dateOpen, setDateOpen]   = useState(false)
  const [depTime, setDepTime]     = useState('')
  const [arrTime, setArrTime]     = useState('')
  const [carrier, setCarrier]     = useState('')
  const [flightNum, setFlightNum] = useState('')
  const [seat, setSeat]           = useState('')
  const [bookCode, setBookCode]   = useState('')
  const [busy, setBusy]           = useState(false)
  const [mounted, setMounted]     = useState(false)
  const [visible, setVisible]     = useState(false)

  const sheetRef   = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const bodyRef    = useRef<HTMLDivElement>(null)

  useSwipeToDismiss(onClose, { enabled: isOpen, bodyRef, overlayRef, sheetRef })

  React.useEffect(() => {
    if (isOpen) {
      setTransport('plane'); setFrom(''); setTo(''); setDate(''); setDepTime('')
      setArrTime(''); setCarrier(''); setFlightNum(''); setSeat(''); setBookCode('')
      setMounted(true)
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    } else {
      setVisible(false)
      const t = setTimeout(() => setMounted(false), 320)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  const handleSave = async () => {
    if (!date) return
    setBusy(true)
    try {
      await create(spaceId, {
        transport,
        from:          from       || undefined,
        to:            to         || undefined,
        date,
        departureTime: depTime    || undefined,
        arrivalTime:   arrTime    || undefined,
        carrier:       carrier    || undefined,
        flightNumber:  flightNum  || undefined,
        seat:          seat       || undefined,
        bookingCode:   bookCode   || undefined,
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
          <span className={styles.sheetTitle}>КВИТОК</span>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Закрити">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div ref={bodyRef} className={styles.sheetBody}>
          {/* Transport type */}
          <div className={styles.field}>
            <label className={styles.fieldLabel}>ТИП ТРАНСПОРТУ</label>
            <div className={styles.pills}>
              {(Object.keys(TRANSPORT_LABELS) as TicketTransport[]).map(t => (
                <button
                  key={t} type="button"
                  className={`${styles.pill} ${transport === t ? styles.pillOn : ''}`}
                  onClick={() => setTransport(t)}
                >
                  {TRANSPORT_ICONS[t]}
                  {TRANSPORT_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          {/* Route */}
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>ЗВІДКИ</label>
              <input className={styles.fieldInput} value={from} onChange={e => setFrom(e.target.value)} placeholder="Київ, KBP…" />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>КУДИ</label>
              <input className={styles.fieldInput} value={to} onChange={e => setTo(e.target.value)} placeholder="Токіо, NRT…" />
            </div>
          </div>

          {/* Date + times */}
          <div className={styles.field}>
            <label className={styles.fieldLabel}>ДАТА</label>
            <button type="button" className={styles.dateField} onClick={() => setDateOpen(true)}>
              {date ? fmtDateFull(date) : 'Вибрати'}
            </button>
            {dateOpen && <CustomDatePicker value={date} onChange={v => { setDate(v); setDateOpen(false) }} onClose={() => setDateOpen(false)} />}
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>ВІДПРАВЛЕННЯ</label>
              <input className={styles.fieldInput} value={depTime} onChange={e => setDepTime(e.target.value)} placeholder="08:45" type="time" />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>ПРИБУТТЯ</label>
              <input className={styles.fieldInput} value={arrTime} onChange={e => setArrTime(e.target.value)} placeholder="14:30" type="time" />
            </div>
          </div>

          {/* Carrier + flight */}
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>ПЕРЕВІЗНИК</label>
              <input className={styles.fieldInput} value={carrier} onChange={e => setCarrier(e.target.value)} placeholder="Ryanair…" />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>РЕЙС / №</label>
              <input className={styles.fieldInput} value={flightNum} onChange={e => setFlightNum(e.target.value)} placeholder="FR9210…" />
            </div>
          </div>

          {/* Seat + booking code */}
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>МІСЦЕ</label>
              <input className={styles.fieldInput} value={seat} onChange={e => setSeat(e.target.value)} placeholder="14A…" />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>КОД БРОНЮВАННЯ</label>
              <input className={styles.fieldInput} value={bookCode} onChange={e => setBookCode(e.target.value)} placeholder="ABC123…" />
            </div>
          </div>
        </div>

        <div className={styles.sheetFooter}>
          <button
            type="button"
            className={styles.saveBtn}
            style={{ background: color }}
            onClick={handleSave}
            disabled={busy || !date}
          >
            {busy ? 'Збереження…' : 'Зберегти квиток'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AddTicketSheet
