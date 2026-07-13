import React, { useEffect, useRef, useState } from 'react'
import { useVehicleStore, type VehicleEvent, type VehicleEventInput, type VehicleEventType } from '../../store/vehicleStore'
import { useSpacesStore, type VehicleProfile } from '@/features/memories/store/spacesStore'
import { useUiStore } from '@/shared/store/uiStore'
import { useProfileStore } from '@/shared/store/profileStore'
import { useSwipeToDismiss } from '@/shared/hooks/useSwipeToDismiss'
import { useImageUpload } from '@/shared/hooks/useImageUpload'
import CustomDatePicker from '@/shared/components/ui/CustomDatePicker'
import styles from './VehicleSpaceView.module.css'

// ── Types ──────────────────────────────────────────────────────────────────

interface Props {
  spaceId:       string
  color:         string
  spaceName:     string
  memoriesCount: number
  plansCount:    number
  tasksCount:    number
  membersCount:  number
  isOwner:       boolean
  onEditSpace:   () => void
  onBack:        () => void
}

type SheetType = 'fuel' | 'maintenance' | 'document' | 'note' | null

// ── Helpers ────────────────────────────────────────────────────────────────

function mapFuelType(nhtsa: string): string {
  if (!nhtsa) return ''
  const l = nhtsa.toLowerCase()
  if (l.includes('electric') && (l.includes('gas') || l.includes('hybrid'))) return 'Гібрид'
  if (l.includes('electric')) return 'Електро'
  if (l.includes('hybrid')) return 'Гібрид'
  if (l.includes('diesel')) return 'Дизель'
  if (l.includes('gasoline') || l.includes('petrol')) return 'Бензин'
  if (l.includes('gas')) return 'Газ'
  return nhtsa
}

const EVENT_LABELS: Record<VehicleEventType, string> = {
  fuel:        'Заправка',
  maintenance: 'ТО',
  repair:      'Ремонт',
  inspection:  'Огляд',
  insurance:   'Страховка',
  tire_change: 'Шини',
  document:    'Документ',
  note:        'Нотатка',
}

function fmtDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}.${m}.${y}`
}

function fmtMileage(n: number | null): string {
  if (n == null) return ''
  return n.toLocaleString('uk-UA') + ' км'
}

function fmtCost(n: number | null, currency: string): string {
  if (n == null) return ''
  const sym = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₴'
  return `${sym}${n.toLocaleString('uk-UA', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

// ── Event icon ─────────────────────────────────────────────────────────────

function EventIcon({ type, size = 16 }: { type: VehicleEventType; size?: number }) {
  switch (type) {
    case 'fuel':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 22V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"/>
          <path d="M3 22h12M15 8h2a2 2 0 0 1 2 2v6a1 1 0 0 0 2 0V9l-2-2"/>
          <line x1="7" y1="4" x2="7" y2="8"/>
        </svg>
      )
    case 'maintenance':
    case 'repair':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
        </svg>
      )
    case 'document':
    case 'insurance':
    case 'inspection':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="9" y1="13" x2="15" y2="13"/>
          <line x1="9" y1="17" x2="12" y2="17"/>
        </svg>
      )
    case 'tire_change':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9"/>
          <circle cx="12" cy="12" r="3"/>
          <line x1="12" y1="3" x2="12" y2="9"/>
          <line x1="12" y1="15" x2="12" y2="21"/>
          <line x1="3" y1="12" x2="9" y2="12"/>
          <line x1="15" y1="12" x2="21" y2="12"/>
        </svg>
      )
    default:
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="8" y1="6" x2="21" y2="6"/>
          <line x1="8" y1="12" x2="21" y2="12"/>
          <line x1="8" y1="18" x2="21" y2="18"/>
          <line x1="3" y1="6" x2="3.01" y2="6"/>
          <line x1="3" y1="12" x2="3.01" y2="12"/>
          <line x1="3" y1="18" x2="3.01" y2="18"/>
        </svg>
      )
  }
}

// ── Ornate vehicle medallion ───────────────────────────────────────────────

const VehicleMedallion: React.FC = () => {
  const ticks = [0, 45, 90, 135, 180, 225, 270, 315]
  return (
    <svg width="90" height="90" viewBox="0 0 90 90" fill="none" aria-hidden="true">
      {/* Outer decorative ring */}
      <circle cx="45" cy="45" r="43" stroke="currentColor" strokeWidth="0.8" opacity="0.3"/>
      {/* Tick marks */}
      {ticks.map((deg, i) => {
        const rad = (deg * Math.PI) / 180
        const isMain = i % 2 === 0
        const r1 = 41, r2 = isMain ? 35 : 38
        return (
          <line
            key={deg}
            x1={45 + r1 * Math.sin(rad)} y1={45 - r1 * Math.cos(rad)}
            x2={45 + r2 * Math.sin(rad)} y2={45 - r2 * Math.cos(rad)}
            stroke="currentColor" strokeWidth={isMain ? 1.4 : 0.9}
            opacity={isMain ? 0.55 : 0.3}
          />
        )
      })}
      {/* Diamond ornaments at cardinals */}
      <path d="M45,3 L47,7 L45,11 L43,7 Z" fill="currentColor" opacity="0.4"/>
      <path d="M79,43 L83,45 L79,47 L75,45 Z" fill="currentColor" opacity="0.4"/>
      <path d="M45,79 L47,83 L45,87 L43,83 Z" fill="currentColor" opacity="0.4"/>
      <path d="M11,43 L15,45 L11,47 L7,45 Z" fill="currentColor" opacity="0.4"/>
      {/* Inner filled circle */}
      <circle cx="45" cy="45" r="34" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeWidth="1.5" opacity="0.65"/>
      {/* Car icon centered (scale 1.5, offset 27,27) */}
      <g transform="translate(27,27) scale(1.5)" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.9">
        <path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h11l4 4v4a2 2 0 0 1-2 2h-2"/>
        <circle cx="7.5" cy="17.5" r="2.5"/>
        <circle cx="17.5" cy="17.5" r="2.5"/>
      </g>
    </svg>
  )
}

// ── VehicleHero ────────────────────────────────────────────────────────────

interface HeroProps {
  spaceId:   string
  spaceName: string
  color:     string
  profile:   VehicleProfile | null
  lastEvent: VehicleEvent | null
  isOwner:   boolean
  onBack:    () => void
}

const VehicleHero: React.FC<HeroProps> = ({ spaceId, spaceName, color, profile, lastEvent, isOwner, onBack }) => {
  const [editOpen, setEditOpen] = useState(false)
  const [form, setForm]         = useState<Partial<VehicleProfile>>({})
  const [saving, setSaving]     = useState(false)
  const [decoding, setDecoding] = useState(false)
  const { showToast }           = useUiStore()
  const { updateProfile }       = useVehicleStore()
  const { setVehicleProfile }   = useSpacesStore()
  const { trigger: triggerPhoto, uploading: uploadingPhoto, inputElement: photoInput } =
    useImageUpload('mimir/vehicles', url => setForm(p => ({ ...p, photoUrl: url })))

  const overlayRef = useRef<HTMLDivElement>(null)
  const sheetRef   = useSwipeToDismiss(() => setEditOpen(false), { enabled: editOpen, overlayRef })
  const colorVar   = { '--space-color': color } as React.CSSProperties

  const handleDecodeVin = () => {
    const vin = (form.vin ?? '').trim().toUpperCase()
    if (vin.length !== 17) { showToast('VIN має бути 17 символів', 'error'); return }
    let cancelled = false
    const decode = async () => {
      setDecoding(true)
      try {
        const res = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/${vin}?format=json`)
        const data: { Results: Record<string, string>[] } = await res.json()
        const r = data.Results?.[0]
        if (!r || r.ErrorCode !== '0') { if (!cancelled) showToast('Авто не знайдено', 'error'); return }
        if (!cancelled) {
          setForm(p => ({
            ...p,
            make:     r.Make     || p.make,
            model:    r.Model    || p.model,
            year:     r.ModelYear ? Number(r.ModelYear) : p.year,
            fuelType: mapFuelType(r.FuelTypePrimary) || p.fuelType,
          }))
          showToast('Дані авто заповнено', 'success')
        }
      } catch {
        if (!cancelled) showToast('Помилка декодування VIN', 'error')
      } finally {
        if (!cancelled) setDecoding(false)
      }
    }
    decode()
    return () => { cancelled = true }
  }

  const openEdit = () => { setForm(profile ?? {}); setEditOpen(true) }

  const handleSave = () => {
    let cancelled = false
    const save = async () => {
      setSaving(true)
      try {
        const saved = await updateProfile(spaceId, form)
        if (!cancelled) setVehicleProfile(spaceId, saved)
        if (!cancelled) { setEditOpen(false); showToast('Профіль збережено', 'success') }
      } catch {
        if (!cancelled) showToast('Помилка збереження', 'error')
      } finally {
        if (!cancelled) setSaving(false)
      }
    }
    save()
    return () => { cancelled = true }
  }

  return (
    <>
      <div className={styles.vehicleHeroCard} style={colorVar}>
        <button type="button" className={styles.vehicleHeroBackBtn} onClick={onBack} aria-label="Назад">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M11 4l-5 5 5 5"/>
          </svg>
        </button>

        <div className={styles.vehicleMedallion}>
          <VehicleMedallion />
        </div>

        <div className={styles.vehicleHeroInfo}>
          <h1 className={styles.vehicleHeroName}>{spaceName}</h1>
          <span className={styles.vehicleHeroTypeBadge}>АВТО</span>
          {profile?.make || profile?.model ? (
            <span className={styles.vehicleHeroSubtitle}>
              {[profile.make, profile.model, profile.year].filter(Boolean).join(' ')}
              {profile.plateNumber ? ` · ${profile.plateNumber}` : ''}
            </span>
          ) : (
            <span className={styles.vehicleHeroDesc}>Хроніка авто: заправки, ТО, документи й витрати в одному місці.</span>
          )}
          <div className={styles.vehicleHeroLastEntry}>
            <span className={styles.vehicleHeroLastEntryIcon}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
            </span>
            <div className={styles.vehicleHeroLastEntryInfo}>
              <span className={styles.vehicleHeroLastEntryLabel}>Останній запис</span>
              <span className={styles.vehicleHeroLastEntryValue}>
                {lastEvent
                  ? `${fmtDate(lastEvent.date)} · ${EVENT_LABELS[lastEvent.type]}`
                  : 'Ще немає записів'}
              </span>
            </div>
          </div>
        </div>

        {isOwner && (
          <button type="button" className={styles.vehicleHeroEditBtn} onClick={openEdit} aria-label="Редагувати профіль авто">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M11 2.5l2.5 2.5L5 13.5H2.5V11L11 2.5z"/>
            </svg>
          </button>
        )}
      </div>

      {editOpen && (
        <div className={styles.overlay} ref={overlayRef} onClick={() => setEditOpen(false)}>
          <div className={styles.sheet} ref={sheetRef} onClick={e => e.stopPropagation()}>
            <div className={styles.sheetHandle} />
            <h3 className={styles.sheetTitle}>Профіль авто</h3>
            {photoInput}

            {profile?.photoUrl || form.photoUrl ? (
              <img src={form.photoUrl ?? profile?.photoUrl ?? ''} className={styles.vehiclePhotoPreview} alt="авто" />
            ) : null}
            <button type="button" className={styles.attachBtn} onClick={triggerPhoto} disabled={uploadingPhoto}>
              {uploadingPhoto ? <span className={styles.attachSpinner} /> : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              )}
              {uploadingPhoto ? 'Завантаження…' : 'Фото авто'}
            </button>

            {(['make','model'] as const).map(f => (
              <React.Fragment key={f}>
                <label className={styles.fieldLabel}>{f === 'make' ? 'МАРКА' : 'МОДЕЛЬ'}</label>
                <input
                  className={styles.fieldInput}
                  value={(form[f] as string) ?? ''}
                  onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))}
                  placeholder={f === 'make' ? 'Toyota' : 'Prius'}
                />
              </React.Fragment>
            ))}

            <label className={styles.fieldLabel}>РІК</label>
            <input className={styles.fieldInput} type="number" value={form.year ?? ''} onChange={e => setForm(p => ({ ...p, year: e.target.value ? Number(e.target.value) : undefined }))} placeholder="2020" />

            <label className={styles.fieldLabel}>ДЕРЖ. НОМЕР</label>
            <input className={styles.fieldInput} value={form.plateNumber ?? ''} onChange={e => setForm(p => ({ ...p, plateNumber: e.target.value }))} placeholder="АА 1234 ВВ" />

            <label className={styles.fieldLabel}>VIN</label>
            <div className={styles.vinRow}>
              <input className={styles.fieldInput} value={form.vin ?? ''} onChange={e => setForm(p => ({ ...p, vin: e.target.value.toUpperCase() }))} placeholder="WBA3A5G50FN..." maxLength={17} />
              <button type="button" className={styles.decodeBtn} onClick={handleDecodeVin} disabled={decoding || (form.vin ?? '').trim().length !== 17}>
                {decoding ? <span className={styles.attachSpinner} /> : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                  </svg>
                )}
              </button>
            </div>

            <label className={styles.fieldLabel}>ПАЛЬНЕ</label>
            <input className={styles.fieldInput} value={form.fuelType ?? ''} onChange={e => setForm(p => ({ ...p, fuelType: e.target.value }))} placeholder="Бензин / Дизель / Гібрид / Електро" />

            <label className={styles.fieldLabel}>ПРОБІГ (км)</label>
            <input className={styles.fieldInput} type="number" value={form.currentMileage ?? ''} onChange={e => setForm(p => ({ ...p, currentMileage: e.target.value ? Number(e.target.value) : undefined }))} placeholder="123 000" />

            <label className={styles.fieldLabel}>НАСТУПНЕ ТО (км)</label>
            <input className={styles.fieldInput} type="number" value={form.nextServiceMileage ?? ''} onChange={e => setForm(p => ({ ...p, nextServiceMileage: e.target.value ? Number(e.target.value) : undefined }))} placeholder="150 000" />

            <button type="button" className={styles.primaryBtn} style={colorVar} onClick={handleSave} disabled={saving}>
              {saving ? 'Зберігаємо…' : 'Зберегти'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}

// ── VehicleStats ───────────────────────────────────────────────────────────

const EMPTY_VEHICLE_EVENTS: VehicleEvent[] = []

interface StatsProps {
  spaceId: string
  color:   string
}

const VehicleStats: React.FC<StatsProps> = ({ spaceId, color }) => {
  const stats  = useVehicleStore(s => s.statsBySpace[spaceId])
  const events = useVehicleStore(s => s.eventsBySpace[spaceId] ?? EMPTY_VEHICLE_EVENTS)
  const [tripKm, setTripKm] = useState('')
  const colorVar = { '--space-color': color } as React.CSSProperties

  if (!stats) return null

  const items = [
    { label: 'Цього місяця',     value: stats.totalCostMonth > 0 ? `₴${stats.totalCostMonth.toLocaleString('uk-UA')}` : null },
    { label: 'Цього року',       value: stats.totalCostYear  > 0 ? `₴${stats.totalCostYear.toLocaleString('uk-UA')}`  : null },
    { label: 'Витрата л/100 км', value: stats.avgFuelConsumption != null ? `${stats.avgFuelConsumption} л` : null },
    { label: 'Вартість км',      value: stats.costPerKm != null ? `₴${stats.costPerKm}` : null },
  ].filter(i => i.value != null)

  const lastFuelWithPrice = [...events]
    .filter(e => e.type === 'fuel' && e.liters != null && e.liters > 0 && e.cost != null && e.cost > 0)
    .sort((a, b) => b.date.localeCompare(a.date))[0]
  const pricePerLiter = lastFuelWithPrice ? lastFuelWithPrice.cost! / lastFuelWithPrice.liters! : null

  const canCalculate = stats.avgFuelConsumption != null && pricePerLiter != null
  const km = parseFloat(tripKm)
  const tripCost = canCalculate && !isNaN(km) && km > 0
    ? Math.round((km * stats.avgFuelConsumption! / 100) * pricePerLiter!)
    : null

  if (items.length === 0 && stats.expiringDocs.length === 0 && !canCalculate) return null

  return (
    <div className={styles.statsBlock}>
      <h3 className={styles.sectionTitle}>СТАТИСТИКА</h3>
      {items.length > 0 && (
        <div className={styles.statsGrid}>
          {items.map(item => (
            <div key={item.label} className={styles.statItem} style={colorVar}>
              <span className={styles.statValue}>{item.value}</span>
              <span className={styles.statLabel}>{item.label}</span>
            </div>
          ))}
        </div>
      )}
      {canCalculate && (
        <div className={styles.tripCalc}>
          <label className={styles.fieldLabel}>ВАРТІСТЬ ПОЇЗДКИ</label>
          <div className={styles.tripCalcRow}>
            <input className={styles.tripCalcInput} type="number" min="1" placeholder="Відстань (км)" value={tripKm} onChange={e => setTripKm(e.target.value)} />
            {tripCost != null && <span className={styles.tripCalcResult} style={colorVar}>≈ ₴{tripCost.toLocaleString('uk-UA')}</span>}
          </div>
          {pricePerLiter != null && (
            <span className={styles.tripCalcHint}>{stats.avgFuelConsumption} л/100 км · ₴{pricePerLiter.toFixed(2)}/л</span>
          )}
        </div>
      )}
      {stats.expiringDocs.length > 0 && (
        <div className={styles.expiringDocs}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span>Документи спливають: {stats.expiringDocs.map(d => `${d.docType || 'Документ'} — ${fmtDate(d.docExpiresAt)}`).join(', ')}</span>
        </div>
      )}
    </div>
  )
}

// ── AttachmentsField ───────────────────────────────────────────────────────

interface AttachmentsFieldProps {
  value:    string[]
  onChange: (urls: string[]) => void
}

const AttachmentsField: React.FC<AttachmentsFieldProps> = ({ value, onChange }) => {
  const { showToast } = useUiStore()
  const { trigger, uploading, error, inputElement } = useImageUpload(
    'vehicle-attachments',
    (url) => onChange([...value, url]),
  )

  useEffect(() => {
    if (error) showToast('Помилка завантаження', 'error')
  }, [error, showToast])

  const remove = (idx: number) => onChange(value.filter((_, i) => i !== idx))

  return (
    <div>
      {inputElement}
      {value.length > 0 && (
        <div className={styles.attachList}>
          {value.map((url, i) => (
            <div key={url} className={styles.attachThumb}>
              <img src={url} alt={`фото ${i + 1}`} className={styles.attachImg} />
              <button type="button" className={styles.attachRemove} onClick={() => remove(i)} aria-label="Видалити фото">
                <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                  <path d="M2 2l10 10M12 2L2 12"/>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
      <button type="button" className={styles.attachBtn} onClick={trigger} disabled={uploading}>
        {uploading ? <span className={styles.attachSpinner} /> : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
        )}
        {uploading ? 'Завантаження…' : 'Додати фото / чек'}
      </button>
    </div>
  )
}

// ── Event form sheets ──────────────────────────────────────────────────────

interface SheetProps {
  spaceId:  string
  color:    string
  onClose:  () => void
  profile?: VehicleProfile | null
}

const FuelSheet: React.FC<SheetProps> = ({ spaceId, color, onClose, profile }) => {
  const [date, setDate]         = useState(todayISO())
  const [dateOpen, setDateOpen] = useState(false)
  const [mileage, setMileage]   = useState('')
  const [liters, setLiters]     = useState('')
  const [cost, setCost]         = useState('')
  const [vendor, setVendor]     = useState('')
  const [fuelType, setFuelType] = useState('')
  const [saving, setSaving]     = useState(false)
  const { createEvent, updateProfile } = useVehicleStore()
  const { setVehicleProfile }          = useSpacesStore()
  const { showToast }                  = useUiStore()
  const overlayRef = useRef<HTMLDivElement>(null)
  const sheetRef   = useSwipeToDismiss(onClose, { enabled: true, overlayRef })
  const colorVar   = { '--space-color': color } as React.CSSProperties

  const handleSave = () => {
    if (!date) return
    let cancelled = false
    const save = async () => {
      setSaving(true)
      try {
        const data: VehicleEventInput = {
          type: 'fuel', date,
          mileage:  mileage  ? Number(mileage)  : null,
          liters:   liters   ? Number(liters)   : null,
          cost:     cost     ? Number(cost)     : null,
          currency: 'UAH',
          vendor:   vendor.trim(),
          fuelType: fuelType.trim(),
        }
        await createEvent(spaceId, data)
        const newKm = mileage ? Number(mileage) : null
        if (newKm && (profile?.currentMileage == null || newKm > profile.currentMileage)) {
          const updated = await updateProfile(spaceId, { currentMileage: newKm })
          if (!cancelled) setVehicleProfile(spaceId, updated)
        }
        if (!cancelled) { showToast('Заправку додано', 'success'); onClose() }
      } catch {
        if (!cancelled) showToast('Помилка', 'error')
      } finally {
        if (!cancelled) setSaving(false)
      }
    }
    save()
    return () => { cancelled = true }
  }

  return (
    <div className={styles.overlay} ref={overlayRef} onClick={onClose}>
      <div className={styles.sheet} ref={sheetRef} onClick={e => e.stopPropagation()}>
        <div className={styles.sheetHandle} />
        <h3 className={styles.sheetTitle}>Заправка</h3>
        <label className={styles.fieldLabel}>ДАТА</label>
        <button type="button" className={styles.dateField} onClick={() => setDateOpen(true)}>{fmtDate(date)}</button>
        {dateOpen && <CustomDatePicker value={date} onChange={d => { setDate(d); setDateOpen(false) }} onClose={() => setDateOpen(false)} />}
        <div className={styles.twoCol}>
          <div>
            <label className={styles.fieldLabel}>ПРОБІГ (км)</label>
            <input className={styles.fieldInput} type="number" value={mileage} onChange={e => setMileage(e.target.value)} placeholder="123 450" />
          </div>
          <div>
            <label className={styles.fieldLabel}>ЛІТРИ</label>
            <input className={styles.fieldInput} type="number" value={liters} onChange={e => setLiters(e.target.value)} placeholder="45.0" />
          </div>
        </div>
        <div className={styles.twoCol}>
          <div>
            <label className={styles.fieldLabel}>СУМА (₴)</label>
            <input className={styles.fieldInput} type="number" value={cost} onChange={e => setCost(e.target.value)} placeholder="1 800" />
          </div>
          <div>
            <label className={styles.fieldLabel}>ПАЛЬНЕ</label>
            <input className={styles.fieldInput} value={fuelType} onChange={e => setFuelType(e.target.value)} placeholder="А-95" />
          </div>
        </div>
        <label className={styles.fieldLabel}>АЗС</label>
        <input className={styles.fieldInput} value={vendor} onChange={e => setVendor(e.target.value)} placeholder="WOG, ОККО…" />
        <button type="button" className={styles.primaryBtn} style={colorVar} onClick={handleSave} disabled={saving || !date}>
          {saving ? 'Зберігаємо…' : 'Зберегти'}
        </button>
      </div>
    </div>
  )
}

const MaintenanceSheet: React.FC<SheetProps> = ({ spaceId, color, onClose, profile }) => {
  const [date, setDate]               = useState(todayISO())
  const [dateOpen, setDateOpen]       = useState(false)
  const [mileage, setMileage]         = useState('')
  const [cost, setCost]               = useState('')
  const [vendor, setVendor]           = useState('')
  const [notes, setNotes]             = useState('')
  const [attachments, setAttachments] = useState<string[]>([])
  const [nextService, setNextService] = useState('')
  const [saving, setSaving]           = useState(false)
  const { createEvent, updateProfile } = useVehicleStore()
  const { setVehicleProfile }          = useSpacesStore()
  const { showToast }                  = useUiStore()
  const overlayRef = useRef<HTMLDivElement>(null)
  const sheetRef   = useSwipeToDismiss(onClose, { enabled: true, overlayRef })
  const colorVar   = { '--space-color': color } as React.CSSProperties
  const baseMileage = mileage ? Number(mileage) : (profile?.currentMileage ?? 0)

  const handleSave = () => {
    if (!date) return
    let cancelled = false
    const save = async () => {
      setSaving(true)
      try {
        await createEvent(spaceId, {
          type: 'maintenance', date,
          mileage:     mileage ? Number(mileage) : null,
          cost:        cost    ? Number(cost)    : null,
          currency:    'UAH',
          vendor:      vendor.trim(),
          notes:       notes.trim(),
          attachments,
        })
        const newKm = mileage ? Number(mileage) : null
        const nextKm = nextService ? Number(nextService) : null
        const shouldUpdateProfile =
          (newKm && (profile?.currentMileage == null || newKm > profile.currentMileage)) || nextKm != null
        if (shouldUpdateProfile) {
          const patch: Partial<import('@/features/memories/store/spacesStore').VehicleProfile> = {}
          if (newKm && (profile?.currentMileage == null || newKm > profile.currentMileage)) patch.currentMileage = newKm
          if (nextKm != null) patch.nextServiceMileage = nextKm
          const updated = await updateProfile(spaceId, patch)
          if (!cancelled) setVehicleProfile(spaceId, updated)
        }
        if (!cancelled) { showToast('ТО додано', 'success'); onClose() }
      } catch {
        if (!cancelled) showToast('Помилка', 'error')
      } finally {
        if (!cancelled) setSaving(false)
      }
    }
    save()
    return () => { cancelled = true }
  }

  return (
    <div className={styles.overlay} ref={overlayRef} onClick={onClose}>
      <div className={styles.sheet} ref={sheetRef} onClick={e => e.stopPropagation()}>
        <div className={styles.sheetHandle} />
        <h3 className={styles.sheetTitle}>ТО / Ремонт</h3>
        <label className={styles.fieldLabel}>ДАТА</label>
        <button type="button" className={styles.dateField} onClick={() => setDateOpen(true)}>{fmtDate(date)}</button>
        {dateOpen && <CustomDatePicker value={date} onChange={d => { setDate(d); setDateOpen(false) }} onClose={() => setDateOpen(false)} />}
        <div className={styles.twoCol}>
          <div>
            <label className={styles.fieldLabel}>ПРОБІГ (км)</label>
            <input className={styles.fieldInput} type="number" value={mileage} onChange={e => setMileage(e.target.value)} placeholder="123 450" />
          </div>
          <div>
            <label className={styles.fieldLabel}>СУМА (₴)</label>
            <input className={styles.fieldInput} type="number" value={cost} onChange={e => setCost(e.target.value)} placeholder="3 500" />
          </div>
        </div>
        <label className={styles.fieldLabel}>СЕРВІС</label>
        <input className={styles.fieldInput} value={vendor} onChange={e => setVendor(e.target.value)} placeholder="СТО Авто-профі…" />
        <label className={styles.fieldLabel}>ЩО ЗРОБЛЕНО</label>
        <textarea className={styles.textarea} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Заміна масла та фільтрів…" rows={3} />
        <label className={styles.fieldLabel}>НАСТУПНЕ ТО (км)</label>
        <div className={styles.vinRow}>
          <input className={styles.fieldInput} type="number" value={nextService} onChange={e => setNextService(e.target.value)} placeholder="Не встановлено" />
          <div className={styles.quickBtns}>
            <button type="button" className={styles.quickBtn} style={colorVar} onClick={() => setNextService(String(baseMileage + 10000))}>+10 000</button>
            <button type="button" className={styles.quickBtn} style={colorVar} onClick={() => setNextService(String(baseMileage + 15000))}>+15 000</button>
          </div>
        </div>
        <label className={styles.fieldLabel}>ФОТО / ЧЕК</label>
        <AttachmentsField value={attachments} onChange={setAttachments} />
        <button type="button" className={styles.primaryBtn} style={colorVar} onClick={handleSave} disabled={saving || !date}>
          {saving ? 'Зберігаємо…' : 'Зберегти'}
        </button>
      </div>
    </div>
  )
}

const DocumentSheet: React.FC<SheetProps> = ({ spaceId, color, onClose }) => {
  const [date, setDate]               = useState(todayISO())
  const [dateOpen, setDateOpen]       = useState(false)
  const [expiresAt, setExpiresAt]     = useState('')
  const [expiresOpen, setExpiresOpen] = useState(false)
  const [docType, setDocType]         = useState('')
  const [notes, setNotes]             = useState('')
  const [attachments, setAttachments] = useState<string[]>([])
  const [saving, setSaving]           = useState(false)
  const { createEvent }               = useVehicleStore()
  const { showToast }                 = useUiStore()
  const overlayRef = useRef<HTMLDivElement>(null)
  const sheetRef   = useSwipeToDismiss(onClose, { enabled: true, overlayRef })
  const colorVar   = { '--space-color': color } as React.CSSProperties
  const DOC_TYPES  = ['Страховка', 'Техогляд', 'Реєстрація', 'Довіреність', 'Договір', 'Інше']

  const handleSave = () => {
    if (!date) return
    let cancelled = false
    const save = async () => {
      setSaving(true)
      try {
        await createEvent(spaceId, { type: 'document', date, docType: docType.trim(), docExpiresAt: expiresAt || null, notes: notes.trim(), attachments })
        if (!cancelled) { showToast('Документ додано', 'success'); onClose() }
      } catch {
        if (!cancelled) showToast('Помилка', 'error')
      } finally {
        if (!cancelled) setSaving(false)
      }
    }
    save()
    return () => { cancelled = true }
  }

  return (
    <div className={styles.overlay} ref={overlayRef} onClick={onClose}>
      <div className={styles.sheet} ref={sheetRef} onClick={e => e.stopPropagation()}>
        <div className={styles.sheetHandle} />
        <h3 className={styles.sheetTitle}>Документ</h3>
        <label className={styles.fieldLabel}>ТИП ДОКУМЕНТА</label>
        <div className={styles.docTypeGrid}>
          {DOC_TYPES.map(t => (
            <button key={t} type="button" className={`${styles.docTypeChip} ${docType === t ? styles.docTypeChipActive : ''}`} style={docType === t ? colorVar : undefined} onClick={() => setDocType(t)}>{t}</button>
          ))}
        </div>
        {!DOC_TYPES.includes(docType) && (
          <input className={styles.fieldInput} value={docType} onChange={e => setDocType(e.target.value)} placeholder="Або введи свій тип…" />
        )}
        <label className={styles.fieldLabel}>ДАТА ВИДАЧІ / ПОДІЇ</label>
        <button type="button" className={styles.dateField} onClick={() => setDateOpen(true)}>{date ? fmtDate(date) : 'Вибрати дату'}</button>
        {dateOpen && <CustomDatePicker value={date} onChange={d => { setDate(d); setDateOpen(false) }} onClose={() => setDateOpen(false)} />}
        <label className={styles.fieldLabel}>ДІЙСНИЙ ДО</label>
        <button type="button" className={styles.dateField} onClick={() => setExpiresOpen(true)}>{expiresAt ? fmtDate(expiresAt) : 'Не вказано'}</button>
        {expiresOpen && <CustomDatePicker value={expiresAt} onChange={d => { setExpiresAt(d); setExpiresOpen(false) }} onClose={() => setExpiresOpen(false)} />}
        <label className={styles.fieldLabel}>ФОТО ДОКУМЕНТА</label>
        <AttachmentsField value={attachments} onChange={setAttachments} />
        <label className={styles.fieldLabel}>НОТАТКИ</label>
        <textarea className={styles.textarea} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Серія, номер, додаткова інформація…" rows={2} />
        <button type="button" className={styles.primaryBtn} style={colorVar} onClick={handleSave} disabled={saving || !date}>
          {saving ? 'Зберігаємо…' : 'Зберегти'}
        </button>
      </div>
    </div>
  )
}

const NoteSheet: React.FC<SheetProps> = ({ spaceId, color, onClose }) => {
  const [date, setDate]         = useState(todayISO())
  const [dateOpen, setDateOpen] = useState(false)
  const [notes, setNotes]       = useState('')
  const [saving, setSaving]     = useState(false)
  const { createEvent }   = useVehicleStore()
  const { showToast }     = useUiStore()
  const overlayRef        = useRef<HTMLDivElement>(null)
  const sheetRef          = useSwipeToDismiss(onClose, { enabled: true, overlayRef })
  const colorVar          = { '--space-color': color } as React.CSSProperties

  const handleSave = () => {
    if (!notes.trim()) return
    let cancelled = false
    const save = async () => {
      setSaving(true)
      try {
        await createEvent(spaceId, { type: 'note', date, notes: notes.trim() })
        if (!cancelled) { showToast('Нотатку додано', 'success'); onClose() }
      } catch {
        if (!cancelled) showToast('Помилка', 'error')
      } finally {
        if (!cancelled) setSaving(false)
      }
    }
    save()
    return () => { cancelled = true }
  }

  return (
    <div className={styles.overlay} ref={overlayRef} onClick={onClose}>
      <div className={styles.sheet} ref={sheetRef} onClick={e => e.stopPropagation()}>
        <div className={styles.sheetHandle} />
        <h3 className={styles.sheetTitle}>Нотатка</h3>
        <label className={styles.fieldLabel}>ДАТА</label>
        <button type="button" className={styles.dateField} onClick={() => setDateOpen(true)}>{fmtDate(date)}</button>
        {dateOpen && <CustomDatePicker value={date} onChange={d => { setDate(d); setDateOpen(false) }} onClose={() => setDateOpen(false)} />}
        <label className={styles.fieldLabel}>НОТАТКА</label>
        <textarea className={styles.textarea} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Дивний звук зліва при повороті…" rows={4} autoFocus />
        <button type="button" className={styles.primaryBtn} style={colorVar} onClick={handleSave} disabled={saving || !notes.trim()}>
          {saving ? 'Зберігаємо…' : 'Зберегти'}
        </button>
      </div>
    </div>
  )
}

// ── VehicleTimeline ────────────────────────────────────────────────────────

interface TimelineProps {
  events:           VehicleEvent[]
  color:            string
  loading:          boolean
  spaceId:          string
  onAddFuel:        () => void
  onAddMaintenance: () => void
}

function useCarIllustration(): string {
  const theme     = useUiStore(s => s.theme)
  const f1Enabled = useProfileStore(s => s.activeProfile?.f1Enabled ?? false)
  if (f1Enabled)         return '/car/car-f1.png'
  if (theme === 'cyber') return '/car/car-cyber.png'
  if (theme === 'pixel') return '/car/car-pixel.png'
  return '/car/car-default.png'
}

const VehicleTimeline: React.FC<TimelineProps> = ({ events, color, loading, spaceId, onAddFuel, onAddMaintenance }) => {
  const { deleteEvent } = useVehicleStore()
  const { showToast }   = useUiStore()
  const carImg          = useCarIllustration()
  const colorVar = { '--space-color': color } as React.CSSProperties

  const handleDelete = async (id: string) => {
    deleteEvent(spaceId, id)
    showToast('Видалено', 'success')
  }

  if (loading) {
    return (
      <div className={styles.timelineList}>
        {[1,2,3].map(i => <div key={i} className={styles.timelineSkeleton} />)}
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className={styles.vehicleEmptyState}>
        <img
          src={carImg}
          alt=""
          className={styles.vehicleEmptyIllustration}
          draggable={false}
        />
        <p className={styles.vehicleEmptyTitle}>Простір ще порожній</p>
        <p className={styles.vehicleEmptyDesc}>Додай першу заправку, ТО або документ, щоб почати хроніку.</p>
        <div className={styles.vehicleEmptyCtas}>
          <button type="button" className={styles.vehicleEmptyCtaPrimary} style={colorVar} onClick={onAddFuel}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 22V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"/><path d="M3 22h12"/>
            </svg>
            Додати заправку
          </button>
          <button type="button" className={styles.vehicleEmptyCtaSecondary} style={colorVar} onClick={onAddMaintenance}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
            </svg>
            Додати ТО
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.timelineList}>
      {events.map(e => (
        <div key={e._id} className={styles.timelineItem}>
          <div className={styles.timelineIcon} style={colorVar}>
            <EventIcon type={e.type} />
          </div>
          <div className={styles.timelineBody}>
            <div className={styles.timelineTop}>
              <span className={styles.timelineType}>{EVENT_LABELS[e.type]}</span>
              <span className={styles.timelineDate}>{fmtDate(e.date)}</span>
            </div>
            <div className={styles.timelineMeta}>
              {e.cost   != null && <span className={styles.timelineCost}>{fmtCost(e.cost, e.currency)}</span>}
              {e.mileage != null && <span className={styles.timelineMileage}>{fmtMileage(e.mileage)}</span>}
              {e.liters != null && <span>{e.liters} л</span>}
              {e.vendor && <span>{e.vendor}</span>}
              {e.docType && <span>{e.docType}</span>}
              {e.docExpiresAt && <span className={styles.timelineExpiry}>до {fmtDate(e.docExpiresAt)}</span>}
            </div>
            {e.notes && <p className={styles.timelineNotes}>{e.notes}</p>}
            {e.attachments.length > 0 && (
              <div className={styles.timelineAttachments}>
                {e.attachments.map((url, i) => (
                  <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                    <img src={url} alt={`фото ${i + 1}`} className={styles.timelineAttachThumb} />
                  </a>
                ))}
              </div>
            )}
          </div>
          <button type="button" className={styles.timelineDeleteBtn} onClick={() => handleDelete(e._id)} aria-label="Видалити">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      ))}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

/**
 * VehicleSpaceView
 * ----------------
 * Redesigned UI for Space type='vehicle'.
 * Renders its own hero, stats cards, onboarding checklist, action grid, and timeline.
 *
 * Props:
 * @prop {string} spaceId
 * @prop {string} color — space accent color hex
 * @prop {string} spaceName
 * @prop {number} memoriesCount
 * @prop {number} plansCount
 * @prop {number} tasksCount
 * @prop {number} membersCount
 * @prop {boolean} isOwner
 * @prop {() => void} onEditSpace — opens parent space edit sheet
 */
const VehicleSpaceView: React.FC<Props> = ({
  spaceId, color, spaceName, memoriesCount, plansCount, tasksCount, membersCount, isOwner, onEditSpace: _onEditSpace, onBack,
}) => {
  const [sheet, setSheet] = useState<SheetType>(null)
  const { fetchEvents, fetchStats, eventsBySpace, loading } = useVehicleStore()
  const space  = useSpacesStore(s => s.spaces.find(sp => sp.id === spaceId) ?? null)
  const events = eventsBySpace[spaceId] ?? []
  const colorVar = { '--space-color': color } as React.CSSProperties

  const profile  = space?.vehicleProfile ?? null
  const lastEvent = events.length > 0
    ? [...events].sort((a, b) => b.date.localeCompare(a.date))[0]
    : null

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      await Promise.all([fetchEvents(spaceId), fetchStats(spaceId)])
    }
    if (!cancelled) load()
    return () => { cancelled = true }
  }, [spaceId, fetchEvents, fetchStats])

  // Onboarding checklist completion
  const hasMakeModel  = Boolean(profile?.make && profile?.model)
  const hasMaintenanceEvent = events.some(e => e.type === 'maintenance')
  const hasFuelEvent        = events.some(e => e.type === 'fuel')
  const hasDocumentEvent    = events.some(e => e.type === 'document')
  const onboardingSteps = [hasMakeModel, hasMaintenanceEvent, hasFuelEvent, hasDocumentEvent]
  const onboardingDone  = onboardingSteps.every(Boolean)
  const onboardingCount = onboardingSteps.filter(Boolean).length

  // Stats items
  const STATS = [
    {
      num: memoriesCount, label: 'Спогади',
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="5"/><path d="M3 21v-1a9 9 0 0 1 18 0v1"/></svg>,
    },
    {
      num: plansCount, label: 'Плани',
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    },
    {
      num: tasksCount, label: 'Задачі',
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 12l2.5 2.5 4-5"/></svg>,
    },
    {
      num: membersCount, label: 'Учасники',
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-4 3.1-7 7-7s7 3 7 7"/><circle cx="17" cy="8" r="3"/><path d="M22 20c0-3-2.1-5.5-5-6"/></svg>,
    },
  ]

  // Action cards
  const ACTION_CARDS = [
    {
      key: 'fuel' as SheetType,
      label: '+ Заправка',
      desc: 'Додати заправку',
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 22V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"/><path d="M3 22h12M15 8h2a2 2 0 0 1 2 2v6a1 1 0 0 0 2 0V9l-2-2"/></svg>,
    },
    {
      key: 'maintenance' as SheetType,
      label: '+ ТО / ремонт',
      desc: 'Додати обслуговування',
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>,
    },
    {
      key: 'document' as SheetType,
      label: '+ Документ',
      desc: 'Додати документ',
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/></svg>,
    },
    {
      key: 'note' as SheetType,
      label: '+ Нотатка',
      desc: 'Зробити нотатку',
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    },
  ]

  // Onboarding checklist items
  const ONBOARDING_ITEMS = [
    { label: 'Додай марку та модель', done: hasMakeModel,          onClick: () => {} /* hero edit btn handles this */ },
    { label: 'Запиши останнє ТО',     done: hasMaintenanceEvent,   onClick: () => setSheet('maintenance') },
    { label: 'Додай першу заправку',  done: hasFuelEvent,          onClick: () => setSheet('fuel') },
    { label: 'Завантаж документ',     done: hasDocumentEvent,      onClick: () => setSheet('document') },
  ]

  return (
    <div className={styles.vehicleRoot}>
      {/* ── Hero ── */}
      <VehicleHero
        spaceId={spaceId}
        spaceName={spaceName}
        color={color}
        profile={profile}
        lastEvent={lastEvent}
        isOwner={isOwner}
        onBack={onBack}
      />

      {/* ── Stats cards ── */}
      <div className={styles.vehicleStatsGrid}>
        {STATS.map(s => (
          <div key={s.label} className={styles.vehicleStatCard}>
            <span className={styles.vehicleStatCardIcon}>{s.icon}</span>
            <span className={styles.vehicleStatCardNum}>{s.num}</span>
            <span className={styles.vehicleStatCardLabel}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── Onboarding checklist ── */}
      {!onboardingDone && (
        <div className={styles.vehicleOnboarding} style={colorVar}>
          <div className={styles.vehicleOnboardingHeader}>
            <span className={styles.vehicleOnboardingTitle}>Почни з цього</span>
            <div className={styles.vehicleOnboardingProgressWrap}>
              <span className={styles.vehicleOnboardingProgressLabel}>{onboardingCount} / 4 виконано</span>
              <div className={styles.vehicleOnboardingBar}>
                <div className={styles.vehicleOnboardingFill} style={{ width: `${onboardingCount / 4 * 100}%` }} />
              </div>
            </div>
          </div>
          <div className={styles.vehicleOnboardingItems}>
            {ONBOARDING_ITEMS.map(item => (
              <button key={item.label} type="button" className={styles.vehicleOnboardingItem} onClick={item.onClick} disabled={item.done}>
                <span className={`${styles.vehicleOnboardingCheck} ${item.done ? styles.vehicleOnboardingCheckDone : ''}`}>
                  {item.done && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M1.5 5l2.5 2.5 4.5-4"/>
                    </svg>
                  )}
                </span>
                <span className={`${styles.vehicleOnboardingItemText} ${item.done ? styles.vehicleOnboardingItemTextDone : ''}`}>
                  {item.label}
                </span>
                {!item.done && (
                  <span className={styles.vehicleOnboardingChevron}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M5 3l4 4-4 4"/>
                    </svg>
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Action grid 2×2 ── */}
      <div className={styles.vehicleActionGrid} style={colorVar}>
        {ACTION_CARDS.map(a => (
          <button key={a.key} type="button" className={styles.vehicleActionCard} onClick={() => setSheet(a.key)}>
            <span className={styles.vehicleActionCardIcon}>{a.icon}</span>
            <span className={styles.vehicleActionCardText}>
              <span className={styles.vehicleActionCardLabel}>{a.label}</span>
              <span className={styles.vehicleActionCardDesc}>{a.desc}</span>
            </span>
          </button>
        ))}
      </div>

      {/* ── Vehicle fuel/cost stats (shows only when has data) ── */}
      <VehicleStats spaceId={spaceId} color={color} />

      {/* ── Timeline ── */}
      <div className={styles.vehicleTimelineCard}>
        <div className={styles.vehicleTimelineHeader}>
          <h3 className={styles.vehicleTimelineTitle}>Хроніка</h3>
          {events.length > 0 && (
            <button type="button" className={styles.vehicleTimelineAllLink} style={colorVar}>
              Всі записи
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ marginLeft: 3 }}>
                <path d="M5 3l4 4-4 4"/>
              </svg>
            </button>
          )}
        </div>
        <VehicleTimeline
          events={events}
          color={color}
          loading={loading}
          spaceId={spaceId}
          onAddFuel={() => setSheet('fuel')}
          onAddMaintenance={() => setSheet('maintenance')}
        />
      </div>

      {/* ── Action sheets ── */}
      {sheet === 'fuel'        && <FuelSheet        spaceId={spaceId} color={color} onClose={() => setSheet(null)} profile={profile} />}
      {sheet === 'maintenance' && <MaintenanceSheet spaceId={spaceId} color={color} onClose={() => setSheet(null)} profile={profile} />}
      {sheet === 'document'    && <DocumentSheet    spaceId={spaceId} color={color} onClose={() => setSheet(null)} />}
      {sheet === 'note'        && <NoteSheet        spaceId={spaceId} color={color} onClose={() => setSheet(null)} />}
    </div>
  )
}

export default VehicleSpaceView
