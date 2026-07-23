import React, { useRef, useState } from 'react'
import { useTripStore } from '../../store/tripStore'
import type { TripProfile } from '@/features/memories/store/spacesStore'
import { useUiStore } from '@/shared/store/uiStore'
import { useSwipeToDismiss } from '@/shared/hooks/useSwipeToDismiss'
import CustomDatePicker from '@/shared/components/ui/CustomDatePicker'
import styles from './TripSpaceView.module.css'

// ── Types ──────────────────────────────────────────────────────────────────

interface Props {
  spaceId:         string
  color:           string
  profile:         TripProfile | null
  onProfileUpdate: (p: TripProfile) => void
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

  React.useEffect(() => {
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
              <input
                className={styles.fieldInput}
                value={origin}
                onChange={e => setOrigin(e.target.value)}
                placeholder="Київ, Токіо…"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>КУДИ</label>
              <input
                className={styles.fieldInput}
                value={destination}
                onChange={e => setDestination(e.target.value)}
                placeholder="Париж, Берлін…"
              />
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
          <button
            type="button"
            className={styles.saveBtn}
            style={{ background: color }}
            onClick={handleSave}
            disabled={busy}
          >
            {busy ? 'Збереження…' : 'Зберегти'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

/**
 * TripSpaceView
 * -------------
 * Типізований вид для просторів типу 'trip'. Показує travel summary:
 * маршрут origin→destination, дати, тривалість, статус.
 *
 * @prop spaceId         — ID простору
 * @prop color           — колір простору для акцентів
 * @prop profile         — поточний tripProfile (з Space)
 * @prop onProfileUpdate — callback після збереження профілю
 */
const TripSpaceView: React.FC<Props> = ({ spaceId, color, profile, onProfileUpdate }) => {
  const showToast = useUiStore(s => s.showToast)
  const { updateProfile } = useTripStore()
  const [editOpen, setEditOpen] = useState(false)

  const handleSave = async (data: Partial<TripProfile>) => {
    try {
      const updated = await updateProfile(spaceId, data)
      onProfileUpdate(updated)
      showToast('Збережено', 'success')
    } catch {
      showToast('Помилка збереження', 'error')
      throw new Error('Failed')
    }
  }

  const duration    = calcDuration(profile?.startDate ?? null, profile?.endDate ?? null)
  const statusColor = profile?.status ? (STATUS_COLORS[profile.status] ?? color) : color
  const colorVar    = { '--space-color': color } as React.CSSProperties

  return (
    <div className={styles.root} style={colorVar}>
      <div className={styles.tripCard}>

        {/* ── Route line ── */}
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

        {/* ── Dates + duration ── */}
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

        {/* ── Status + travelers + edit ── */}
        <div className={styles.metaRow}>
          {profile?.status && (
            <span
              className={styles.statusBadge}
              style={{ background: statusColor + '22', color: statusColor, borderColor: statusColor + '44' }}
            >
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
          <button
            type="button"
            className={styles.editBtn}
            onClick={() => setEditOpen(true)}
            aria-label="Редагувати поїздку"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Редагувати
          </button>
        </div>
      </div>

      <TripEditSheet
        isOpen={editOpen}
        profile={profile}
        onClose={() => setEditOpen(false)}
        onSave={handleSave}
        color={color}
      />
    </div>
  )
}

export default TripSpaceView
