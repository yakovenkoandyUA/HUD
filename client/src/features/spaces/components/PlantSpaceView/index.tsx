import React, { useEffect, useRef, useState } from 'react'
import { usePlantEventStore } from '../../store/plantEventStore'
import type { PlantEventType, PlantEventInput, HealthResult } from '../../store/plantEventStore'
import type { PlantProfile } from '@/features/memories/store/spacesStore'
import { useUiStore } from '@/shared/store/uiStore'
import { useSwipeToDismiss } from '@/shared/hooks/useSwipeToDismiss'
import ImageUploadButton from '@/shared/components/ui/ImageUploadButton'
import CustomDatePicker from '@/shared/components/ui/CustomDatePicker'
import styles from './PlantSpaceView.module.css'

// ── Types ──────────────────────────────────────────────────────────────────

interface Props {
  spaceId:         string
  color:           string
  profile:         PlantProfile | null
  onProfileUpdate: (p: PlantProfile) => void
}

// ── Helpers ────────────────────────────────────────────────────────────────

const EVENT_LABELS: Record<PlantEventType, string> = {
  watering:    'Полив',
  fertilizing: 'Добрива',
  repotting:   'Пересадка',
  pruning:     'Обрізка',
  treatment:   'Обробка',
  note:        'Нотатка',
}

const SUNLIGHT_LABELS: Record<string, string> = {
  low:    'Тінь',
  medium: 'Розсіяне',
  high:   'Пряме сонце',
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function fmtDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}.${m}.${y}`
}

function daysSince(iso: string | null): number | null {
  if (!iso) return null
  const ms = Date.now() - new Date(iso + 'T00:00:00').getTime()
  return Math.floor(ms / 86400000)
}

function wateringStatus(profile: PlantProfile | null): 'ok' | 'soon' | 'overdue' | 'unknown' | 'noHistory' {
  const days = daysSince(profile?.lastWateredAt ?? null)
  const interval = profile?.wateringIntervalDays ?? null
  if (interval === null) return 'unknown'
  if (days === null) return 'noHistory'
  if (days >= interval) return 'overdue'
  if (days >= interval * 0.75) return 'soon'
  return 'ok'
}

// ── Event icon ─────────────────────────────────────────────────────────────

function EventIcon({ type }: { type: PlantEventType }) {
  switch (type) {
    case 'watering':
      return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 2C6 2 2 8 2 13a10 10 0 0 0 20 0c0-5-4-11-10-11z"/></svg>
    case 'fertilizing':
      return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>
    case 'repotting':
      return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 21h14M12 3v12M8 9l4-4 4 4"/></svg>
    case 'pruning':
      return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12L12 12"/></svg>
    case 'treatment':
      return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
    default:
      return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
  }
}

// ── Water drop SVG ────────────────────────────────────────────────────────

const DROP_PATH = 'M 24 3 C 12 15 2 32 2 46 Q 2 62 24 62 Q 46 62 46 46 C 46 32 36 15 24 3 Z'

interface WaterDropProps {
  pct:    number   // 0..1 — how full (1 = just watered, 0 = overdue)
  status: 'ok' | 'soon' | 'overdue' | 'unknown'
}

function WaterDrop({ pct, status }: WaterDropProps) {
  const dropColor = status === 'overdue' ? '#ef4444' : status === 'soon' ? '#d97706' : '#3b82f6'
  const maxFillH  = 56          // max fill height in viewBox units
  const fillH     = pct * maxFillH
  const fillY     = 64 - fillH  // y from which fill starts (drops fill from bottom)
  const waveAmp   = 2.5

  return (
    <svg width="48" height="64" viewBox="0 0 48 64" aria-hidden="true">
      <defs>
        <clipPath id="wdrop-clip">
          <path d={DROP_PATH} />
        </clipPath>
      </defs>

      {/* drop background */}
      <path d={DROP_PATH} fill={dropColor} fillOpacity={status === 'unknown' ? 0 : 0.1} />

      {/* water fill */}
      {pct > 0.01 && (
        <g clipPath="url(#wdrop-clip)">
          <path
            d={`M 0 ${fillY} Q 12 ${fillY - waveAmp} 24 ${fillY} Q 36 ${fillY + waveAmp} 48 ${fillY} L 48 64 L 0 64 Z`}
            fill={dropColor}
            fillOpacity={0.8}
          />
        </g>
      )}

      {/* drop outline */}
      <path
        d={DROP_PATH}
        fill="none"
        stroke={dropColor}
        strokeWidth="1.5"
        strokeOpacity={status === 'unknown' ? 0.35 : 0.55}
        strokeDasharray={status === 'unknown' ? '4 3' : undefined}
      />
    </svg>
  )
}

// ── Watering block ─────────────────────────────────────────────────────────

interface WateringBlockProps {
  profile:       PlantProfile | null
  onOpenProfile: () => void
  inline?:       boolean
}

function WateringBlock({ profile, onOpenProfile, inline }: WateringBlockProps) {
  const status   = wateringStatus(profile)
  const days     = daysSince(profile?.lastWateredAt ?? null)
  const interval = profile?.wateringIntervalDays ?? null

  // pct: 1.0 = just watered (full), 0 = overdue (empty)
  const pct = (days != null && interval != null && interval > 0)
    ? Math.max(0, 1 - days / interval)
    : 0

  const daysLeft = (interval != null && days != null) ? Math.max(0, interval - days) : null

  const blockClass = inline ? styles.waterBlockInline : styles.waterBlock

  if (status === 'unknown') {
    return (
      <div className={blockClass}>
        <WaterDrop pct={0} status="unknown" />
        <div className={styles.waterInfo}>
          <span className={styles.waterLabel}>Полив</span>
          {!inline && (
            <button type="button" className={styles.waterSetupBtn} onClick={e => { e.stopPropagation(); onOpenProfile() }}>
              Налаштувати інтервал →
            </button>
          )}
          {inline && <span className={styles.waterSub}>Інтервал не вказано</span>}
        </div>
      </div>
    )
  }

  if (status === 'noHistory') {
    return (
      <div className={blockClass}>
        <WaterDrop pct={0} status="unknown" />
        <div className={styles.waterInfo}>
          <span className={styles.waterLabel}>Полив кожні {interval}д</span>
          <span className={styles.waterSub}>Ще не поливали</span>
        </div>
      </div>
    )
  }

  const statusLabel = status === 'overdue'
    ? 'Потребує поливу'
    : status === 'soon'
      ? 'Скоро полив'
      : 'Наступний полив'

  const subLabel = status === 'overdue'
    ? `${days}д без поливу`
    : `через ${daysLeft}д`

  return (
    <div className={blockClass}>
      <WaterDrop pct={pct} status={status} />
      <div className={styles.waterInfo}>
        <span className={`${styles.waterLabel} ${status === 'overdue' ? styles.waterLabelOverdue : status === 'soon' ? styles.waterLabelSoon : ''}`}>
          {statusLabel}
        </span>
        <span className={styles.waterSub}>{subLabel}</span>
        <span className={styles.waterFraction}>{days}/{interval}д</span>
      </div>
    </div>
  )
}

// ── Health section ─────────────────────────────────────────────────────────

interface HealthSectionProps {
  result:    HealthResult | undefined
  hasPhoto:  boolean
  checking:  boolean
  color:     string
  onCheck:   () => void
}

function HealthSection({ result, hasPhoto, checking, color, onCheck }: HealthSectionProps) {
  const scoreColor = !result
    ? color
    : result.healthProbability >= 0.7
      ? '#22c55e'
      : result.healthProbability >= 0.4
        ? '#d97706'
        : '#ef4444'

  const scoreLabel = !result
    ? ''
    : result.isHealthy
      ? 'Здорова'
      : result.healthProbability >= 0.5
        ? 'Є проблеми'
        : 'Потребує уваги'

  const topIssues = result?.issues.filter(i => i.probability > 0.08).slice(0, 3) ?? []

  function fmtCheckedAt(iso: string) {
    const [y, m, d] = iso.slice(0, 10).split('-')
    return `${d}.${m}.${y}`
  }

  return (
    <div className={styles.healthSection}>
      <div className={styles.healthHeader}>
        <span className={styles.sectionTitle}>ЗДОРОВ'Я</span>
        <button
          type="button"
          className={styles.healthCheckBtn}
          style={{ color }}
          onClick={onCheck}
          disabled={!hasPhoto || checking}
        >
          {checking ? (
            <span className={styles.healthSpinner} style={{ borderTopColor: color }} />
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          )}
          {checking ? 'Аналіз…' : result ? 'Оновити' : 'Перевірити'}
        </button>
      </div>

      {!result && !checking && (
        <p className={styles.healthEmpty}>
          {hasPhoto ? 'Натисни «Перевірити» щоб оцінити стан рослини' : 'Додай фото рослини у профіль щоб перевірити здоров\'я'}
        </p>
      )}

      {result && (
        <>
          <div className={styles.healthScore}>
            <div className={styles.healthScoreBar}>
              <div
                className={styles.healthScoreFill}
                style={{ width: `${Math.round(result.healthProbability * 100)}%`, background: scoreColor }}
              />
            </div>
            <span className={styles.healthScoreLabel} style={{ color: scoreColor }}>
              {Math.round(result.healthProbability * 100)}% — {scoreLabel}
            </span>
          </div>

          {topIssues.length > 0 && (
            <div className={styles.healthIssues}>
              {topIssues.map((issue, i) => (
                <div key={i} className={styles.healthIssueRow}>
                  <div className={styles.healthIssueName}>{issue.name}</div>
                  <div className={styles.healthIssuePct}>{Math.round(issue.probability * 100)}%</div>
                </div>
              ))}
            </div>
          )}

          <div className={styles.healthMeta}>
            Перевірено {fmtCheckedAt(result.checkedAt)}
          </div>
        </>
      )}
    </div>
  )
}

// ── Add event sheet ────────────────────────────────────────────────────────

interface AddSheetProps {
  isOpen:  boolean
  type:    PlantEventType | null
  color:   string
  onClose: () => void
  onSave:  (data: PlantEventInput) => Promise<void>
}

const AddEventSheet: React.FC<AddSheetProps> = ({ isOpen, type, color, onClose, onSave }) => {
  const [date, setDate]       = useState(todayISO)
  const [dateOpen, setDateOpen] = useState(false)
  const [notes, setNotes]     = useState('')
  const [busy, setBusy]       = useState(false)
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)

  const sheetRef   = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const bodyRef    = useRef<HTMLDivElement>(null)

  useSwipeToDismiss(onClose, { enabled: isOpen, bodyRef, overlayRef, sheetRef })

  useEffect(() => {
    if (isOpen) {
      setDate(todayISO()); setNotes('')
      setMounted(true)
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    } else {
      setVisible(false)
      const t = setTimeout(() => setMounted(false), 320)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  const handleSave = async () => {
    if (!type) return
    setBusy(true)
    try {
      await onSave({ type, date, notes: notes || undefined })
      onClose()
    } finally {
      setBusy(false)
    }
  }

  if (!mounted || !type) return null
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
          <span className={styles.sheetTitle}>{EVENT_LABELS[type].toUpperCase()}</span>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Закрити">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div ref={bodyRef} className={styles.sheetBody}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>ДАТА</label>
            <button type="button" className={styles.dateField} onClick={() => setDateOpen(true)}>
              {date ? fmtDate(date) : 'Вибрати'}
            </button>
            {dateOpen && <CustomDatePicker value={date} onChange={v => { setDate(v); setDateOpen(false) }} onClose={() => setDateOpen(false)} />}
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>НОТАТКА</label>
            <textarea className={styles.textarea} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Деталі…" rows={3} />
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

// ── Profile edit sheet ─────────────────────────────────────────────────────

interface ProfileSheetProps {
  isOpen:   boolean
  profile:  PlantProfile | null
  color:    string
  onClose:  () => void
  onSave:   (data: Partial<PlantProfile>) => Promise<void>
  onIdentify: (photoUrl: string) => void
  identifying: boolean
}

const ProfileEditSheet: React.FC<ProfileSheetProps> = ({ isOpen, profile, color, onClose, onSave, onIdentify, identifying }) => {
  const [commonName, setCommonName]           = useState(profile?.commonName ?? '')
  const [species, setSpecies]                 = useState(profile?.species ?? '')
  const [location, setLocation]               = useState(profile?.location ?? '')
  const [acquiredDate, setAcquiredDate]       = useState(profile?.acquiredDate ?? '')
  const [acquiredOpen, setAcquiredOpen]       = useState(false)
  const [intervalDays, setIntervalDays]       = useState(profile?.wateringIntervalDays?.toString() ?? '')
  const [sunlight, setSunlight]               = useState<PlantProfile['sunlight']>(profile?.sunlight ?? null)
  const [photoUrl, setPhotoUrl]               = useState(profile?.photoUrl ?? '')
  const [toxicToPets, setToxicToPets]         = useState<boolean | null>(profile?.toxicToPets ?? null)
  const [careNotes, setCareNotes]             = useState(profile?.careNotes ?? '')
  const [busy, setBusy]                       = useState(false)
  const [mounted, setMounted]                 = useState(false)
  const [visible, setVisible]                 = useState(false)

  const sheetRef   = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const bodyRef    = useRef<HTMLDivElement>(null)

  useSwipeToDismiss(onClose, { enabled: isOpen, bodyRef, overlayRef, sheetRef })

  useEffect(() => {
    if (isOpen) {
      setCommonName(profile?.commonName ?? '')
      setSpecies(profile?.species ?? '')
      setLocation(profile?.location ?? '')
      setAcquiredDate(profile?.acquiredDate ?? '')
      setIntervalDays(profile?.wateringIntervalDays?.toString() ?? '')
      setSunlight(profile?.sunlight ?? null)
      setPhotoUrl(profile?.photoUrl ?? '')
      setToxicToPets(profile?.toxicToPets ?? null)
      setCareNotes(profile?.careNotes ?? '')
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
        commonName:           commonName || undefined,
        species:              species || undefined,
        location:             location || undefined,
        acquiredDate:         acquiredDate || null,
        wateringIntervalDays: intervalDays ? parseInt(intervalDays, 10) : null,
        sunlight,
        photoUrl:             photoUrl || '',
        toxicToPets,
        careNotes:            careNotes || '',
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
          <span className={styles.sheetTitle}>РОСЛИНА</span>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Закрити">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div ref={bodyRef} className={styles.sheetBody}>
          {/* Photo + name fields side-by-side */}
          <div className={styles.photoFormRow}>
            <div className={styles.photoThumbWrap}>
              <ImageUploadButton onUpload={url => setPhotoUrl(url)} currentUrl={photoUrl || undefined} folder="spaces" variant="fill" />
            </div>
            <div className={styles.photoFields}>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>НАЗВА</label>
                <input className={styles.fieldInput} value={commonName} onChange={e => setCommonName(e.target.value)} placeholder="Монстера, Фікус…" />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>ВИД (НАУКОВА НАЗВА)</label>
                <input className={styles.fieldInput} value={species} onChange={e => setSpecies(e.target.value)} placeholder="Monstera deliciosa…" />
              </div>
              <button
                type="button"
                className={styles.identifyBtn}
                style={{ borderColor: color + '55', color }}
                onClick={() => onIdentify(photoUrl)}
                disabled={identifying || !photoUrl}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                </svg>
                {identifying ? 'Визначення…' : 'Визначити вид'}
              </button>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>МІСЦЕ В ДОМІ</label>
            <input className={styles.fieldInput} value={location} onChange={e => setLocation(e.target.value)} placeholder="Підвіконня, балкон…" />
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>ДАТА ПОЯВИ</label>
              <button type="button" className={styles.dateField} onClick={() => setAcquiredOpen(true)}>
                {acquiredDate ? fmtDate(acquiredDate) : 'Не вказано'}
              </button>
              {acquiredOpen && <CustomDatePicker value={acquiredDate} onChange={v => { setAcquiredDate(v); setAcquiredOpen(false) }} onClose={() => setAcquiredOpen(false)} />}
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>ПОЛИВ КОЖНІ (ДН.)</label>
              <input className={styles.fieldInput} type="number" inputMode="numeric" value={intervalDays} onChange={e => setIntervalDays(e.target.value)} placeholder="7" min="1" />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>ОСВІТЛЕННЯ</label>
            <div className={styles.pills}>
              {(['low', 'medium', 'high'] as const).map(s => (
                <button key={s} type="button" className={`${styles.pill} ${sunlight === s ? styles.pillOn : ''}`} onClick={() => setSunlight(s)}>
                  {SUNLIGHT_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>ТОКСИЧНА ДЛЯ ТВАРИН</label>
            <div className={styles.pills}>
              {([['true', 'Так'], ['false', 'Ні'], ['null', 'Невідомо']] as const).map(([val, label]) => (
                <button
                  key={val} type="button"
                  className={`${styles.pill} ${String(toxicToPets) === val ? styles.pillOn : ''}`}
                  onClick={() => setToxicToPets(val === 'true' ? true : val === 'false' ? false : null)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>НОТАТКИ ПО ДОГЛЯДУ</label>
            <textarea className={styles.textarea} value={careNotes} onChange={e => setCareNotes(e.target.value)} placeholder="Особливості поливу, ґрунт, добрива…" rows={3} />
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

// ── Main component ─────────────────────────────────────────────────────────

/**
 * PlantSpaceView
 * --------------
 * Вид для просторів типу 'plant'.
 * Показує профіль рослини, індикатор поливу, журнал подій.
 * Інтегрується з Plant.id v3 (ідентифікація + care data + health assessment).
 *
 * @prop spaceId         — ID простору
 * @prop color           — колір простору
 * @prop profile         — plantProfile рослини
 * @prop onProfileUpdate — callback після збереження профілю
 */
const PlantSpaceView: React.FC<Props> = ({ spaceId, color, profile, onProfileUpdate }) => {
  const showToast = useUiStore(s => s.showToast)
  const { eventsBySpace, healthChecksBySpace, loading, fetchEvents, createEvent, deleteEvent, updateProfile, saveHealthCheck } = usePlantEventStore()

  const [addSheet, setAddSheet]       = useState<PlantEventType | null>(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const [identifying, setIdentifying] = useState(false)
  const [healthChecking, setHealthChecking] = useState(false)

  const events = eventsBySpace[spaceId] ?? []

  useEffect(() => {
    let cancelled = false
    const load = async () => { if (!cancelled) await fetchEvents(spaceId) }
    load()
    return () => { cancelled = true }
  }, [spaceId, fetchEvents])

  const handleCreate = async (data: PlantEventInput) => {
    try {
      const event = await createEvent(spaceId, data)
      // optimistic update lastWateredAt / lastFertilizedAt in profile
      if (data.type === 'watering' || data.type === 'fertilizing') {
        const patch = data.type === 'watering'
          ? { lastWateredAt: event.date }
          : { lastFertilizedAt: event.date }
        const updated = await updateProfile(spaceId, patch)
        onProfileUpdate(updated)
      }
      showToast('Додано', 'success')
    } catch {
      showToast('Помилка збереження', 'error')
      throw new Error('Failed')
    }
  }

  const handleDelete = async (event: { _id: string; type: PlantEventType }) => {
    await deleteEvent(spaceId, event._id)

    if (event.type === 'watering' || event.type === 'fertilizing') {
      const remaining = (eventsBySpace[spaceId] ?? [])
        .filter(e => e._id !== event._id && e.type === event.type)
        .sort((a, b) => b.date.localeCompare(a.date))
      const lastDate = remaining[0]?.date ?? null
      const patch = event.type === 'watering'
        ? { lastWateredAt: lastDate }
        : { lastFertilizedAt: lastDate }
      const updated = await updateProfile(spaceId, patch)
      onProfileUpdate(updated)
    }

    showToast('Видалено', 'success')
  }

  const handleProfileSave = async (data: Partial<PlantProfile>) => {
    try {
      const updated = await updateProfile(spaceId, data)
      onProfileUpdate(updated)
      showToast('Збережено', 'success')
    } catch {
      showToast('Помилка збереження', 'error')
      throw new Error('Failed')
    }
  }

  const translateToUk = async (text: string): Promise<string> => {
    try {
      const res = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|uk`
      )
      if (!res.ok) return text
      const data = await res.json() as { responseData?: { translatedText?: string }; responseStatus?: number }
      const translated = data.responseData?.translatedText
      return (translated && data.responseStatus === 200) ? translated : text
    } catch {
      return text
    }
  }

  // Plant.id v3 — identification + care data in one request
  const handleIdentify = async (currentPhotoUrl: string) => {
    const plantKey = import.meta.env.VITE_PLANTID_API_KEY as string | undefined
    if (!plantKey) { showToast('Plant.id ключ не налаштовано', 'error'); return }
    if (!currentPhotoUrl) { showToast('Спочатку завантаж фото', 'error'); return }
    setIdentifying(true)
    try {
      const details = 'common_names,watering,best_watering,best_soil_type,best_light_condition,toxicity'
      const idRes = await fetch(`https://plant.id/api/v3/identification?details=${details}&language=ua`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Api-Key': plantKey },
        body: JSON.stringify({ images: [currentPhotoUrl], classification_level: 'species' }),
      })
      if (!idRes.ok) throw new Error('plantid')

      const idData = await idRes.json() as {
        result: {
          classification: {
            suggestions: Array<{
              name: string
              probability: number
              details: {
                common_names?: string[]
                watering?: { min: number; max: number }
                best_watering?: string
                best_soil_type?: string
                best_light_condition?: string
                toxicity?: string
              }
            }>
          }
        }
      }

      const top = idData.result?.classification?.suggestions?.[0]
      if (!top) { showToast('Не вдалось визначити рослину', 'error'); return }

      const species    = top.name
      const d          = top.details
      const commonName = d.common_names?.[0] || profile?.commonName || species

      // Watering interval — average of min/max
      let wateringIntervalDays: number | null = null
      if (d.watering?.min != null && d.watering?.max != null) {
        wateringIntervalDays = Math.round((d.watering.min + d.watering.max) / 2)
      }

      // Sunlight
      let sunlight: PlantProfile['sunlight'] = profile?.sunlight ?? null
      const lightStr = (d.best_light_condition ?? '').toLowerCase()
      if (lightStr.includes('full sun') || lightStr.includes('direct'))         sunlight = 'high'
      else if (lightStr.includes('indirect') || lightStr.includes('partial'))   sunlight = 'medium'
      else if (lightStr.includes('shade') || lightStr.includes('low'))          sunlight = 'low'

      // Toxicity
      const toxicStr = (d.toxicity ?? '').toLowerCase()
      const toxicToPets = toxicStr.length > 0
        ? !(toxicStr.includes('non-toxic') || toxicStr.includes('not toxic'))
        : null

      // Care notes — полив + ґрунт + світло, translated to Ukrainian
      const [wateringUk, soilUk, lightUk] = await Promise.all([
        d.best_watering        ? translateToUk(d.best_watering)        : Promise.resolve(''),
        d.best_soil_type       ? translateToUk(d.best_soil_type)       : Promise.resolve(''),
        d.best_light_condition ? translateToUk(d.best_light_condition) : Promise.resolve(''),
      ])
      const parts: string[] = []
      if (wateringUk) parts.push(`Полив: ${wateringUk}`)
      if (soilUk)     parts.push(`Ґрунт: ${soilUk}`)
      if (lightUk)    parts.push(`Світло: ${lightUk}`)
      const careNotes = parts.join('\n')

      const updated = await updateProfile(spaceId, {
        species, commonName, careNotes, sunlight, wateringIntervalDays, toxicToPets,
        photoUrl: currentPhotoUrl,
      })
      onProfileUpdate(updated)
      showToast(`Визначено: ${species}`, 'success')
    } catch {
      showToast('Помилка ідентифікації', 'error')
    } finally {
      setIdentifying(false)
    }
  }

  const handleHealthCheck = async () => {
    const plantKey = import.meta.env.VITE_PLANTID_API_KEY as string | undefined
    if (!plantKey) { showToast('Plant.id ключ не налаштовано', 'error'); return }
    if (!profile?.photoUrl) { showToast('Спочатку завантаж фото', 'error'); return }
    setHealthChecking(true)
    try {
      const res = await fetch('https://plant.id/api/v3/health_assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Api-Key': plantKey },
        body: JSON.stringify({
          images:  [profile.photoUrl],
          health:  'all',
          details: ['treatment', 'description'],
        }),
      })
      if (!res.ok) throw new Error('health_api')
      const data = await res.json() as {
        result: {
          is_healthy: { probability: number; binary: boolean }
          disease: {
            suggestions: Array<{
              name: string
              probability: number
              details?: { treatment?: { prevention?: string[]; biological?: string[] } }
            }>
          }
        }
      }

      const r = data.result
      const issues = (r.disease?.suggestions ?? [])
        .map(s => ({
          name:        s.name,
          probability: s.probability,
          treatment:   s.details?.treatment?.prevention?.[0]
            ?? s.details?.treatment?.biological?.[0],
        }))
        .sort((a, b) => b.probability - a.probability)

      saveHealthCheck(spaceId, {
        checkedAt:         new Date().toISOString(),
        isHealthy:         r.is_healthy.binary,
        healthProbability: r.is_healthy.probability,
        issues,
      })
      showToast(r.is_healthy.binary ? 'Рослина здорова' : 'Знайдено проблеми', r.is_healthy.binary ? 'success' : 'error')
    } catch {
      showToast('Помилка діагностики', 'error')
    } finally {
      setHealthChecking(false)
    }
  }

  const colorVar = { '--space-color': color } as React.CSSProperties

  return (
    <div className={styles.root} style={colorVar}>

      {/* ── Profile + watering unified card ── */}
      <div className={styles.profileCard} onClick={() => setProfileOpen(true)}>
        {profile?.photoUrl ? (
          <img src={profile.photoUrl} alt="" className={styles.profilePhoto} />
        ) : (
          <div className={styles.profilePhotoPlaceholder}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.3" aria-hidden="true">
              <path d="M12 2C6 2 2 8 2 13a10 10 0 0 0 20 0c0-5-4-11-10-11z"/>
            </svg>
          </div>
        )}
        <div className={styles.profileInfo}>
          <div className={styles.profileName}>{profile?.commonName || 'Моя рослина'}</div>
          {profile?.species && <div className={styles.profileSpecies}>{profile.species}</div>}
          {!profile?.commonName && !profile?.species ? (
            <button type="button" className={styles.profileHint} onClick={e => { e.stopPropagation(); setProfileOpen(true) }}>
              Додай назву, фото та інтервал поливу →
            </button>
          ) : (
            <div className={styles.profileMeta}>
              {profile?.location && (
                <span className={styles.metaItem}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  {profile.location}
                </span>
              )}
              {profile?.sunlight && <span className={styles.metaItem}>{SUNLIGHT_LABELS[profile.sunlight]}</span>}
              {profile?.acquiredDate && <span className={styles.metaItem}>з {fmtDate(profile.acquiredDate)}</span>}
              {profile?.toxicToPets === true && <span className={styles.toxicBadge}>Токсична</span>}
            </div>
          )}

          {/* Watering inline */}
          <div className={styles.profileWatering}>
            <WateringBlock profile={profile} onOpenProfile={() => setProfileOpen(true)} inline />
          </div>
        </div>
        <button type="button" className={styles.profileEditBtn} onClick={e => { e.stopPropagation(); setProfileOpen(true) }} aria-label="Редагувати">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
      </div>

      {/* ── Health check ── */}
      <HealthSection
        result={healthChecksBySpace[spaceId]}
        hasPhoto={!!profile?.photoUrl}
        checking={healthChecking}
        color={color}
        onCheck={handleHealthCheck}
      />

      {/* ── Quick actions ── */}
      <div className={styles.actionsSection}>
        <span className={styles.sectionTitle}>ШВИДКІ ДІЇ</span>
        <div className={styles.actionsGrid}>
          {([
            { type: 'watering'    as PlantEventType, label: 'Полив',     icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 2C6 2 2 8 2 13a10 10 0 0 0 20 0c0-5-4-11-10-11z"/></svg> },
            { type: 'fertilizing' as PlantEventType, label: 'Добрива',   icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg> },
            { type: 'repotting'   as PlantEventType, label: 'Пересадка', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 21h14M12 3v12M8 9l4-4 4 4"/></svg> },
            { type: 'pruning'     as PlantEventType, label: 'Обрізка',   icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12L12 12"/></svg> },
            { type: 'treatment'   as PlantEventType, label: 'Обробка',   icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg> },
            { type: 'note'        as PlantEventType, label: 'Нотатка',   icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/></svg> },
          ]).map(a => (
            <button key={a.type} type="button" className={styles.actionBtn} onClick={() => setAddSheet(a.type)}>
              <span className={styles.actionBtnIcon}>{a.icon}</span>
              {a.label}
              <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className={styles.actionBtnPlus} aria-hidden="true"><path d="M7 2v10M2 7h10"/></svg>
            </button>
          ))}
        </div>
      </div>

      {/* ── Care notes ── */}
      {profile?.careNotes && (
        <div className={styles.careNotes}>
          <span className={styles.careNotesLabel}>ДОГЛЯД</span>
          {profile.careNotes.split('\n').filter(Boolean).map((line, i) => {
            const colon = line.indexOf(':')
            if (colon === -1) return <p key={i} className={styles.careNotesText}>{line}</p>
            const heading = line.slice(0, colon)
            const body    = line.slice(colon + 1).trim()
            return (
              <div key={i} className={styles.careNotesItem}>
                <span className={styles.careNotesItemLabel}>{heading}</span>
                <p className={styles.careNotesText}>{body}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Event log ── */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>ЖУРНАЛ</h3>
        {loading && events.length === 0 ? (
          <div className={styles.loadingRow}><span className={styles.loadingDot} style={{ background: color }} /></div>
        ) : events.length === 0 ? (
          <div className={styles.empty}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" className={styles.emptyIcon} aria-hidden="true">
              <path d="M12 2C6 2 2 8 2 13a10 10 0 0 0 20 0c0-5-4-11-10-11z"/>
            </svg>
            <p className={styles.emptyText}>Поки немає записів.<br/>Додай полив або нотатку.</p>
          </div>
        ) : (
          <div className={styles.eventList}>
            {events.map(event => (
              <EventRow key={event._id} event={event} color={color} onDelete={() => handleDelete(event)} />
            ))}
          </div>
        )}
      </div>

      <AddEventSheet isOpen={addSheet !== null} type={addSheet} color={color} onClose={() => setAddSheet(null)} onSave={handleCreate} />

      <ProfileEditSheet
        isOpen={profileOpen}
        profile={profile}
        color={color}
        onClose={() => setProfileOpen(false)}
        onSave={handleProfileSave}
        onIdentify={handleIdentify}
        identifying={identifying}
      />
    </div>
  )
}

// ── Event row ──────────────────────────────────────────────────────────────

interface EventRowProps {
  event:    import('../../store/plantEventStore').PlantEvent
  color:    string
  onDelete: () => void
}

const EventRow: React.FC<EventRowProps> = ({ event, color, onDelete }) => {
  const [confirm, setConfirm] = useState(false)

  const handleDelete = () => {
    if (confirm) { onDelete() }
    else { setConfirm(true); setTimeout(() => setConfirm(false), 2500) }
  }

  return (
    <div className={styles.eventRow}>
      <div className={styles.eventIcon} style={{ color }}>
        <EventIcon type={event.type} />
      </div>
      <div className={styles.eventMain}>
        <div className={styles.eventTitle}>{EVENT_LABELS[event.type]}</div>
        {event.notes && <div className={styles.eventNotes}>{event.notes}</div>}
      </div>
      <div className={styles.eventDate}>{fmtDate(event.date)}</div>
      <button
        type="button"
        className={`${styles.deleteBtn} ${confirm ? styles.deleteBtnConfirm : ''}`}
        onClick={handleDelete}
        aria-label="Видалити"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
        </svg>
      </button>
    </div>
  )
}

export default PlantSpaceView
