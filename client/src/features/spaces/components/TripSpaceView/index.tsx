import React, { useEffect, useRef, useState } from 'react'
import { useTripStore } from '../../store/tripStore'
import { useTicketStore } from '../../store/ticketStore'
import { useAccommodationStore } from '../../store/accommodationStore'
import { useTripPlaceStore } from '../../store/tripPlaceStore'
import type { TripProfile } from '@/features/memories/store/spacesStore'
import type { Ticket } from '../../store/ticketStore'
import type { Accommodation } from '../../store/accommodationStore'
import type { TripPlace } from '../../store/tripPlaceStore'
import { useUiStore } from '@/shared/store/uiStore'
import { useSwipeToDismiss } from '@/shared/hooks/useSwipeToDismiss'
import CustomDatePicker from '@/shared/components/ui/CustomDatePicker'
import styles from './TripSpaceView.module.css'

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
  spaceId:           string
  color:             string
  profile:           TripProfile | null
  onProfileUpdate:   (p: TripProfile) => void
  spaceTxs:          SpaceTx[]
  onOpenCoverPicker?: () => void
  onEditTicket?:     (ticket: Ticket) => void
  onEditAccom?:      (item: Accommodation) => void
  onEditPlace?:      (place: TripPlace) => void
  onDeleteTx?:       (id: string) => void
}

// ── Helpers ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  planning:  'Планується',
  booked:    'Заброньовано',
  ongoing:   'В дорозі',
  completed: 'Завершено',
}

const STATUS_COLORS: Record<string, string> = {
  planning:  '#6b7db3',
  booked:    '#27ae60',
  ongoing:   '#e67e22',
  completed: '#95a5a6',
}

const TRANSPORT_LABELS: Record<string, string> = {
  plane: 'Літак', train: 'Поїзд', bus: 'Автобус', ferry: 'Пором', car: 'Авто',
}

const PLACE_LABELS: Record<string, string> = {
  museum: 'Музей', restaurant: 'Ресторан', cafe: 'Кафе',
  park: 'Парк', shop: 'Магазин', viewpoint: 'Оглядовий', hotel: 'Готель', other: 'Інше',
}

const MONTHS_SHORT = ['січ','лют','бер','квіт','трав','черв','лип','серп','вер','жов','лист','груд']

function fmtDate(iso: string): string {
  const [, m, d] = iso.slice(0, 10).split('-')
  return `${parseInt(d)} ${MONTHS_SHORT[parseInt(m) - 1]}`
}

function fmtDateFull(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}.${m}.${y}`
}

function calcDuration(start: string | null, end: string | null): string {
  if (!start || !end) return ''
  const ms   = new Date(end).getTime() - new Date(start).getTime()
  const days = Math.round(ms / 86400000)
  if (days <= 0) return ''
  if (days === 1) return '1 день'
  if (days >= 2 && days <= 4) return `${days} дні`
  return `${days} днів`
}

function pluralDays(n: number): string {
  if (n === 1) return 'день'
  if (n >= 2 && n <= 4) return 'дні'
  return 'днів'
}

function calcCountdown(start?: string | null, end?: string | null): { text: string; type: 'future' | 'soon' | 'ongoing' } | null {
  if (!start) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const s = new Date(start + 'T00:00:00')
  const e = end ? new Date(end + 'T00:00:00') : null

  if (today < s) {
    const days = Math.round((s.getTime() - today.getTime()) / 86400000)
    if (days === 1) return { text: 'Завтра', type: 'soon' }
    if (days <= 7) return { text: `за ${days} ${pluralDays(days)}`, type: 'soon' }
    return { text: `за ${days} ${pluralDays(days)}`, type: 'future' }
  }
  if (!e || today <= e) {
    const day = Math.round((today.getTime() - s.getTime()) / 86400000) + 1
    return { text: `В дорозі · день ${day}`, type: 'ongoing' }
  }
  return null
}

function fmtAmount(n: number): string {
  return n.toLocaleString('uk-UA', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

// ── Edit sheet ─────────────────────────────────────────────────────────────

interface EditSheetProps {
  isOpen:   boolean
  profile:  TripProfile | null
  onClose:  () => void
  onSave:   (data: Partial<TripProfile>) => Promise<void>
  color:    string
}

const TripEditSheet: React.FC<EditSheetProps> = ({ isOpen, profile, onClose, onSave, color }) => {
  const [destination, setDestination]     = useState(profile?.destination ?? '')
  const [origin, setOrigin]               = useState(profile?.origin ?? '')
  const [startDate, setStartDate]         = useState(profile?.startDate ?? '')
  const [startDateOpen, setStartDateOpen] = useState(false)
  const [endDate, setEndDate]             = useState(profile?.endDate ?? '')
  const [endDateOpen, setEndDateOpen]     = useState(false)
  const [travelers, setTravelers]         = useState(profile?.travelers?.toString() ?? '')
  const [status, setStatus]               = useState<TripProfile['status']>(profile?.status ?? 'planning')
  const [busy, setBusy]                   = useState(false)
  const [mounted, setMounted]             = useState(false)
  const [visible, setVisible]             = useState(false)

  const sheetRef   = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const bodyRef    = useRef<HTMLDivElement>(null)

  useSwipeToDismiss(onClose, { enabled: isOpen, bodyRef, overlayRef, sheetRef })

  useEffect(() => {
    if (isOpen) {
      setDestination(profile?.destination ?? '')
      setOrigin(profile?.origin ?? '')
      setStartDate(profile?.startDate ?? '')
      setEndDate(profile?.endDate ?? '')
      setTravelers(profile?.travelers?.toString() ?? '')
      setStatus(profile?.status ?? 'planning')
      setMounted(true)
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    } else {
      setVisible(false)
      const t = setTimeout(() => setMounted(false), 320)
      return () => clearTimeout(t)
    }
  }, [isOpen, profile])

  const handleSave = async () => {
    setBusy(true)
    try {
      await onSave({
        destination: destination || undefined,
        origin:      origin      || undefined,
        startDate:   startDate   || null,
        endDate:     endDate     || null,
        travelers:   travelers ? parseInt(travelers, 10) : null,
        status,
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
          <span className={styles.sheetTitle}>ПОЇЗДКА</span>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Закрити">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div ref={bodyRef} className={styles.sheetBody}>
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>ЗВІДКИ</label>
              <input className={styles.fieldInput} value={origin} onChange={e => setOrigin(e.target.value)} placeholder="Київ, Токіо…" />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>КУДИ</label>
              <input className={styles.fieldInput} value={destination} onChange={e => setDestination(e.target.value)} placeholder="Париж, Берлін…" />
            </div>
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>ПОЧАТОК</label>
              <button type="button" className={styles.dateField} onClick={() => setStartDateOpen(true)}>
                {startDate ? fmtDateFull(startDate) : 'Вибрати'}
              </button>
              {startDateOpen && <CustomDatePicker value={startDate} onChange={v => { setStartDate(v); setStartDateOpen(false) }} onClose={() => setStartDateOpen(false)} />}
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>КІНЕЦЬ</label>
              <button type="button" className={styles.dateField} onClick={() => setEndDateOpen(true)}>
                {endDate ? fmtDateFull(endDate) : 'Вибрати'}
              </button>
              {endDateOpen && <CustomDatePicker value={endDate} onChange={v => { setEndDate(v); setEndDateOpen(false) }} onClose={() => setEndDateOpen(false)} />}
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>МАНДРІВНИКИ</label>
            <input
              className={styles.fieldInput}
              type="number"
              inputMode="numeric"
              value={travelers}
              onChange={e => setTravelers(e.target.value)}
              placeholder="1"
              min="1"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>СТАТУС</label>
            <div className={styles.pills}>
              {(['planning', 'booked', 'ongoing', 'completed'] as const).map(s => (
                <button
                  key={s} type="button"
                  className={`${styles.pill} ${status === s ? styles.pillOn : ''}`}
                  onClick={() => setStatus(s)}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.sheetFooter}>
          <button type="button" className={styles.saveBtn} style={{ background: color }} onClick={handleSave} disabled={busy}>
            {busy ? 'Збереження…' : 'Зберегти'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Ticket card ────────────────────────────────────────────────────────────

const TicketCard: React.FC<{ ticket: Ticket; color: string; onDelete: (id: string) => void; onEdit?: (t: Ticket) => void }> = ({ ticket, color, onDelete, onEdit }) => {
  const isNext = ticket.status !== 'used' && ticket.status !== 'cancelled'
  return (
    <div className={`${styles.ticketCard} ${isNext ? styles.ticketCardActive : ''}`} style={{ '--space-color': color } as React.CSSProperties}>
      <div className={styles.ticketLeft}>
        <span className={styles.ticketType}>{TRANSPORT_LABELS[ticket.transport] ?? ticket.transport}</span>
        <div className={styles.ticketRoute}>
          {ticket.from && <span>{ticket.from}</span>}
          {ticket.from && ticket.to && (
            <svg width="14" height="8" viewBox="0 0 22 10" fill="none" aria-hidden="true">
              <path d="M1 5h18M15 1l5 4-5 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
          {ticket.to && <span>{ticket.to}</span>}
        </div>
        <div className={styles.ticketMeta}>
          <span className={styles.ticketDate}>{fmtDate(ticket.date)}</span>
          {ticket.departureTime && <span className={styles.ticketTime}>{ticket.departureTime}{ticket.arrivalTime ? ` → ${ticket.arrivalTime}` : ''}</span>}
          {ticket.flightNumber && <span className={styles.ticketFlight}>{ticket.flightNumber}</span>}
          {ticket.seat && <span className={styles.ticketSeat}>сид. {ticket.seat}</span>}
          {ticket.bookingCode && <span className={styles.ticketCode}>{ticket.bookingCode}</span>}
        </div>
      </div>
      <div className={styles.ticketActions}>
        {onEdit && (
          <button type="button" className={styles.editBtn} onClick={() => onEdit(ticket)} aria-label="Редагувати квиток">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
        )}
        <button type="button" className={styles.deleteBtn} onClick={() => onDelete(ticket._id)} aria-label="Видалити квиток">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
        </button>
      </div>
    </div>
  )
}

// ── Accommodation card ─────────────────────────────────────────────────────

const AccomCard: React.FC<{ item: Accommodation; color: string; onDelete: (id: string) => void; onEdit?: (item: Accommodation) => void }> = ({ item, color, onDelete, onEdit }) => (
  <div className={styles.accomCard} style={{ '--space-color': color } as React.CSSProperties}>
    <div className={styles.accomLeft}>
      <span className={styles.accomName}>{item.name}</span>
      {item.address && <span className={styles.accomAddress}>{item.address}</span>}
      <div className={styles.accomMeta}>
        {item.checkIn && <span className={styles.accomDate}>{fmtDate(item.checkIn)}{item.checkOut ? ` — ${fmtDate(item.checkOut)}` : ''}</span>}
        {item.price != null && item.price > 0 && (
          <span className={styles.accomPrice}>
            {item.currency === 'UAH' ? '₴' : item.currency === 'USD' ? '$' : '€'}{fmtAmount(item.price)}
          </span>
        )}
        {item.bookingCode && <span className={styles.accomCode}>{item.bookingCode}</span>}
      </div>
    </div>
    <div className={styles.ticketActions}>
      {onEdit && (
        <button type="button" className={styles.editBtn} onClick={() => onEdit(item)} aria-label="Редагувати проживання">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
      )}
      <button type="button" className={styles.deleteBtn} onClick={() => onDelete(item._id)} aria-label="Видалити проживання">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
      </button>
    </div>
  </div>
)

// ── Place chip ─────────────────────────────────────────────────────────────

const PlaceChip: React.FC<{ place: TripPlace; color: string; onDelete: (id: string) => void; onEdit?: (place: TripPlace) => void }> = ({ place, color, onDelete, onEdit }) => (
  <div className={styles.placeChip} style={{ '--space-color': color } as React.CSSProperties}>
    <div className={styles.placeLeft}>
      <div className={styles.placeMeta}>
        <span className={styles.placeCategory}>{PLACE_LABELS[place.category] ?? place.category}</span>
        {place.visitDate && <span className={styles.placeVisitDate}>{fmtDate(place.visitDate)}</span>}
      </div>
      <span className={styles.placeName}>{place.name}</span>
      {place.address && <span className={styles.placeAddress}>{place.address}</span>}
    </div>
    <div className={styles.ticketActions}>
      {onEdit && (
        <button type="button" className={styles.editBtn} onClick={() => onEdit(place)} aria-label="Редагувати місце">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
      )}
      <button type="button" className={styles.deleteBtn} onClick={() => onDelete(place._id)} aria-label="Видалити місце">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
      </button>
    </div>
  </div>
)

// ── Main component ─────────────────────────────────────────────────────────

/**
 * TripSpaceView
 * -------------
 * Типізований вид для просторів типу 'trip'.
 * Показує: route header, квитки, проживання, місця, витрати.
 *
 * @prop spaceId         — ID простору
 * @prop color           — колір простору для акцентів
 * @prop profile         — поточний tripProfile
 * @prop onProfileUpdate — callback після збереження профілю
 * @prop spaceTxs        — транзакції простору (з SpaceDetail)
 */
const TripSpaceView: React.FC<Props> = ({ spaceId, color, profile, onProfileUpdate, spaceTxs, onOpenCoverPicker, onEditTicket, onEditAccom, onEditPlace, onDeleteTx }) => {
  const showToast = useUiStore(s => s.showToast)
  const { updateProfile } = useTripStore()
  const { tickets, load: loadTickets, remove: removeTicket }           = useTicketStore()
  const { items: accoms, load: loadAccoms, remove: removeAccom }       = useAccommodationStore()
  const { places, load: loadPlaces, remove: removePlace }              = useTripPlaceStore()
  const [editOpen, setEditOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      await Promise.all([loadTickets(spaceId), loadAccoms(spaceId), loadPlaces(spaceId)])
    }
    load()
    return () => { cancelled = true; void cancelled }
  }, [spaceId, loadTickets, loadAccoms, loadPlaces])

  const myTickets = tickets[spaceId] ?? []
  const myAccoms  = accoms[spaceId]  ?? []
  const myPlaces  = places[spaceId]  ?? []
  const expenses  = spaceTxs.filter(t => t.type === 'expense')
  const totalExp  = expenses.reduce((s, t) => s + t.amount, 0)

  // Accommodation costs grouped by currency
  const accomByCurrency = myAccoms.reduce<Record<string, number>>((acc, a) => {
    if (a.price != null && a.price > 0) {
      const cur = a.currency || 'UAH'
      acc[cur] = (acc[cur] ?? 0) + a.price
    }
    return acc
  }, {})
  const hasAccomCost = Object.keys(accomByCurrency).length > 0

  // Ticket costs grouped by currency
  const ticketByCurrency = myTickets.reduce<Record<string, number>>((acc, t) => {
    if (t.price != null && t.price > 0) {
      const cur = t.currency || 'UAH'
      acc[cur] = (acc[cur] ?? 0) + t.price
    }
    return acc
  }, {})
  const hasTicketCost = Object.keys(ticketByCurrency).length > 0

  const hasBudget = hasAccomCost || hasTicketCost || totalExp > 0

  const handleSaveProfile = async (data: Partial<TripProfile>) => {
    try {
      const updated = await updateProfile(spaceId, data)
      onProfileUpdate(updated)
      showToast('Збережено', 'success')
    } catch {
      showToast('Помилка збереження', 'error')
      throw new Error('Failed')
    }
  }

  const handleDeleteTicket = async (id: string) => {
    try { await removeTicket(spaceId, id) } catch { showToast('Помилка видалення', 'error') }
  }
  const handleDeleteAccom = async (id: string) => {
    try { await removeAccom(spaceId, id) } catch { showToast('Помилка видалення', 'error') }
  }
  const handleDeletePlace = async (id: string) => {
    try { await removePlace(spaceId, id) } catch { showToast('Помилка видалення', 'error') }
  }

  const duration    = calcDuration(profile?.startDate ?? null, profile?.endDate ?? null)
  const countdown   = calcCountdown(profile?.startDate, profile?.endDate)
  const statusColor = profile?.status ? (STATUS_COLORS[profile.status] ?? color) : color
  const colorVar    = { '--space-color': color } as React.CSSProperties

  // Auto-update status based on today vs trip dates (silent, once per profile change)
  const autoStatusRef = useRef<string | null>(null)
  useEffect(() => {
    if (!profile?.startDate) return
    const key = `${profile.startDate}_${profile.endDate ?? ''}_${profile.status ?? ''}`
    if (autoStatusRef.current === key) return
    autoStatusRef.current = key

    const today = new Date(); today.setHours(0, 0, 0, 0)
    const start = new Date(profile.startDate + 'T00:00:00')
    const end   = profile.endDate ? new Date(profile.endDate + 'T00:00:00') : null

    let newStatus: TripProfile['status'] | null = null
    if (today >= start && (!end || today <= end) && profile.status !== 'ongoing' && profile.status !== 'completed') {
      newStatus = 'ongoing'
    } else if (end && today > end && profile.status !== 'completed') {
      newStatus = 'completed'
    }
    if (newStatus) handleSaveProfile({ status: newStatus }).catch(() => {})
  }, [profile?.startDate, profile?.endDate, profile?.status])

  return (
    <div className={styles.root} style={colorVar}>

      {/* ── Route card ── */}
      <div className={styles.tripCard}>
        {onOpenCoverPicker && (
          <button type="button" className={styles.cycleCoverBtn} onClick={onOpenCoverPicker} aria-label="Обкладинка">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
              <path d="M21 15l-5-5L5 21"/>
            </svg>
          </button>
        )}
        <div className={styles.routeRow}>
          {profile?.origin ? (
            <>
              <span className={styles.routeCity}>{profile.origin}</span>
              <svg className={styles.routeArrow} width="18" height="10" viewBox="0 0 22 10" fill="none" aria-hidden="true">
                <path d="M1 5h18M15 1l5 4-5 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </>
          ) : null}
          <span className={`${styles.routeCity} ${styles.routeCityDest} ${!profile?.destination && !profile?.origin ? styles.routeCityEmpty : ''}`}>
            {profile?.destination || (profile?.origin ? '?' : 'Нова поїздка')}
          </span>
        </div>

        {profile?.startDate && (
          <div className={styles.datesRow}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span className={styles.datesText}>
              {fmtDate(profile.startDate)}
              {profile.endDate && ` — ${fmtDate(profile.endDate)}`}
            </span>
            {duration && <span className={styles.durationPill}>{duration}</span>}
          </div>
        )}

        {countdown && (
          <div className={`${styles.countdownRow} ${styles['countdown_' + countdown.type]}`}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
            </svg>
            {countdown.text}
          </div>
        )}

        <div className={styles.metaRow}>
          {profile?.status && (
            <span className={styles.statusBadge} style={{ background: statusColor + '22', color: statusColor, borderColor: statusColor + '44' }}>
              {STATUS_LABELS[profile.status]}
            </span>
          )}
          {profile?.travelers != null && profile.travelers > 0 && (
            <span className={styles.travelersBadge}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              {profile.travelers}
            </span>
          )}
          <button type="button" className={styles.editBtn} onClick={() => setEditOpen(true)} aria-label="Редагувати поїздку">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Редагувати
          </button>
        </div>
      {hasBudget && (
        <div className={styles.budgetRow}>
          {hasTicketCost && (
            <div className={styles.budgetItem}>
              <span className={styles.budgetLabel}>Квитки</span>
              <span className={styles.budgetVal}>
                {Object.entries(ticketByCurrency).map(([cur, amt]) =>
                  `${cur === 'UAH' ? '₴' : cur === 'USD' ? '$' : '€'}${fmtAmount(amt)}`
                ).join(' + ')}
              </span>
            </div>
          )}
          {hasAccomCost && (
            <div className={styles.budgetItem}>
              <span className={styles.budgetLabel}>Проживання</span>
              <span className={styles.budgetVal}>
                {Object.entries(accomByCurrency).map(([cur, amt]) =>
                  `${cur === 'UAH' ? '₴' : cur === 'USD' ? '$' : '€'}${fmtAmount(amt)}`
                ).join(' + ')}
              </span>
            </div>
          )}
          {totalExp > 0 && (
            <div className={styles.budgetItem}>
              <span className={styles.budgetLabel}>Витрати</span>
              <span className={styles.budgetVal}>₴{fmtAmount(totalExp)}</span>
            </div>
          )}
        </div>
      )}
      </div>

      {/* ── Tickets ── */}
      {myTickets.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>КВИТКИ</h2>
          <div className={styles.ticketList}>
            {myTickets.map(t => (
              <TicketCard key={t._id} ticket={t} color={color} onDelete={handleDeleteTicket} onEdit={onEditTicket} />
            ))}
          </div>
        </div>
      )}

      {/* ── Accommodations ── */}
      {myAccoms.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>ПРОЖИВАННЯ</h2>
          <div className={styles.accomList}>
            {myAccoms.map(a => (
              <AccomCard key={a._id} item={a} color={color} onDelete={handleDeleteAccom} onEdit={onEditAccom} />
            ))}
          </div>
        </div>
      )}

      {/* ── Places ── */}
      {myPlaces.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>МІСЦЯ</h2>
          <div className={styles.placeList}>
            {myPlaces.map(p => (
              <PlaceChip key={p._id} place={p} color={color} onDelete={handleDeletePlace} onEdit={onEditPlace} />
            ))}
          </div>
        </div>
      )}

      {/* ── Expenses (Phase 3) ── */}
      {expenses.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            ВИТРАТИ
            <span className={styles.expenseTotal}>₴{fmtAmount(totalExp)}</span>
          </h2>
          <div className={styles.expenseList}>
            {expenses.map(t => (
              <div key={t._id} className={styles.expenseRow}>
                <div className={styles.expenseLeft}>
                  <span className={styles.expenseTitle}>{t.title || t.desc || '—'}</span>
                  {t.category && <span className={styles.expenseCat}>{t.category}</span>}
                </div>
                <div className={styles.expenseRight}>
                  <span className={styles.expenseAmount}>−₴{fmtAmount(t.amount)}</span>
                  {onDeleteTx && (
                    <button type="button" className={styles.expenseDeleteBtn} onClick={() => onDeleteTx(t._id)} aria-label="Видалити витрату">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <TripEditSheet
        isOpen={editOpen}
        profile={profile}
        onClose={() => setEditOpen(false)}
        onSave={handleSaveProfile}
        color={color}
      />
    </div>
  )
}

export default TripSpaceView
