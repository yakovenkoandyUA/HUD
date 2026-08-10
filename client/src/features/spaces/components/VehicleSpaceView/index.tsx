import React, { useEffect, useRef, useState } from 'react'
import { useVehicleStore, type VehicleEvent, type VehicleEventInput, type VehicleEventType } from '../../store/vehicleStore'
import { useSpacesStore, type VehicleProfile } from '@/features/memories/store/spacesStore'
import { useUiStore } from '@/shared/store/uiStore'
import { useProfileStore } from '@/shared/store/profileStore'
import { useSwipeToDismiss } from '@/shared/hooks/useSwipeToDismiss'
import { useImageUpload } from '@/shared/hooks/useImageUpload'
import CustomDatePicker from '@/shared/components/ui/CustomDatePicker'
import PillSelector from '@/shared/components/ui/PillSelector'
import { SPACE_TYPE_CONFIG } from '../../data/spaceTypes'
import { fetchNearbyGasStations } from '../../utils/nearbyGasStations'
import styles from './VehicleSpaceView.module.css'

// ── Types ──────────────────────────────────────────────────────────────────

export interface SpaceLinkedTx {
  _id:      string
  type:     'income' | 'expense'
  amount:   number
  desc:     string
  category?: string
  date:     string
}

interface Props {
  spaceId:        string
  color:          string
  spaceName:      string
  memoriesCount:  number
  plansCount:     number
  tasksCount:     number
  membersCount:   number
  modules:        string[]
  spaceTxs:       SpaceLinkedTx[]
  isOwner:        boolean
  coverUrl?:      string
  coverPosition?: string
  onEditSpace:    () => void
  onBack:         () => void
}

type SheetType = 'fuel' | 'maintenance' | 'repair' | 'tire' | 'document' | 'note' | null

// ── Helpers ────────────────────────────────────────────────────────────────

// "Пальне" — що заливається в бак. "Електро" не пальне, тому тут його нема —
// це окремий атрибут ТИП СИЛОВОЇ УСТАНОВКИ (drivetrain) нижче.
const FUEL_TYPE_OPTIONS = [
  { value: 'Бензин', label: 'Бензин' },
  { value: 'Дизель', label: 'Дизель' },
  { value: 'Газ',    label: 'Газ' },
]

const DRIVETRAIN_OPTIONS = [
  { value: 'ДВЗ',     label: 'ДВЗ' },
  { value: 'Гібрид',  label: 'Гібрид' },
  { value: 'PHEV',    label: 'PHEV' },
  { value: 'Електро', label: 'Електро' },
]

function mapFuelType(nhtsa: string): string {
  if (!nhtsa) return ''
  const l = nhtsa.toLowerCase()
  if (l.includes('electric')) return ''
  if (l.includes('diesel')) return 'Дизель'
  if (l.includes('gasoline') || l.includes('petrol')) return 'Бензин'
  if (l.includes('gas')) return 'Газ'
  return nhtsa
}

function mapDrivetrain(nhtsa: string): string {
  if (!nhtsa) return ''
  const l = nhtsa.toLowerCase()
  if (l.includes('electric') && (l.includes('gas') || l.includes('hybrid'))) return 'PHEV'
  if (l.includes('electric')) return 'Електро'
  if (l.includes('hybrid')) return 'Гібрид'
  if (l.includes('diesel') || l.includes('gasoline') || l.includes('petrol') || l.includes('gas')) return 'ДВЗ'
  return ''
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

function daysAgo(isoDate: string): number {
  const then = new Date(isoDate)
  const now  = new Date()
  return Math.floor((now.getTime() - then.getTime()) / 86_400_000)
}

function pluralDays(n: number): string {
  if (n === 1) return 'день'
  if (n >= 2 && n <= 4) return 'дні'
  return 'днів'
}

function pluralRecords(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return 'запис'
  if ([2,3,4].includes(n % 10) && ![12,13,14].includes(n % 100)) return 'записи'
  return 'записів'
}

function pluralDocs(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return 'документ'
  if ([2,3,4].includes(n % 10) && ![12,13,14].includes(n % 100)) return 'документи'
  return 'документів'
}

function fmtDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}.${m}.${y}`
}

const MONTH_ABBR_UA = ['січ','лют','берез','квіт','трав','черв','лип','серп','вер','жовт','лист','груд']

/** Compact chronicle date — "Сьогодні"/"Вчора" for recency, "10 серп" otherwise */
function fmtDateShort(iso: string): string {
  const date = iso.slice(0, 10)
  if (date === todayISO()) return 'Сьогодні'
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)
  if (date === yesterday) return 'Вчора'
  const [, m, d] = date.split('-')
  return `${parseInt(d, 10)} ${MONTH_ABBR_UA[parseInt(m, 10) - 1]}`
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
    <svg width="100%" height="100%" viewBox="0 0 90 90" fill="none" aria-hidden="true">
      <defs>
        <clipPath id="medallion-clip">
          <circle cx="45" cy="45" r="33"/>
        </clipPath>
      </defs>
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
      {/* Inner circle border */}
      <circle cx="45" cy="45" r="34" fill="currentColor" fillOpacity="0.06" stroke="currentColor" strokeWidth="1.5" opacity="0.65"/>
      {/* Car photo placeholder */}
      <image
        href="/scape_car.png"
        x="12" y="12" width="66" height="66"
        clipPath="url(#medallion-clip)"
        preserveAspectRatio="xMidYMid meet"
      />
    </svg>
  )
}

// ── VehicleHero ────────────────────────────────────────────────────────────

interface HeroProps {
  spaceId:        string
  spaceName:      string
  color:          string
  profile:        VehicleProfile | null
  isOwner:        boolean
  coverUrl?:      string
  coverPosition?: string
  onBack:         () => void
  onEditSpace:    () => void
}

const VehicleHero: React.FC<HeroProps> = ({ spaceId, spaceName, color, profile, isOwner, coverUrl, coverPosition, onBack, onEditSpace }) => {
  const [editOpen, setEditOpen]           = useState(false)
  const [form, setForm]                   = useState<Partial<VehicleProfile>>({})
  const [saving, setSaving]               = useState(false)
  const [decoding, setDecoding]           = useState(false)
  const [purchaseDateOpen, setPurchaseDateOpen] = useState(false)
  const [additionalOpen, setAdditionalOpen]     = useState(false)
  const { showToast }           = useUiStore()
  const { updateProfile }       = useVehicleStore()
  const { setVehicleProfile }   = useSpacesStore()
  const f1Enabled               = useProfileStore(s => s.activeProfile?.f1Enabled ?? false)
  const { trigger: triggerPhoto, uploading: uploadingPhoto, inputElement: photoInput } =
    useImageUpload('mimir/vehicles', url => setForm(p => ({ ...p, photoUrl: url })))
  const vehicleBanner = coverUrl || (f1Enabled
    ? '/space-identifiers-transparent/space_car_f1.png'
    : SPACE_TYPE_CONFIG.vehicle.iconSrc)

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
            make:       r.Make     || p.make,
            model:      r.Model    || p.model,
            year:       r.ModelYear ? Number(r.ModelYear) : p.year,
            fuelType:   mapFuelType(r.FuelTypePrimary)   || p.fuelType,
            drivetrain: mapDrivetrain(r.FuelTypePrimary) || p.drivetrain,
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
      {/* ── Hero banner ── */}
      <div className={`${styles.vehicleHero} ${styles.vehicleHeroCovered}`}>
        <img
          src={vehicleBanner}
          alt=""
          className={styles.vehicleHeroCoverImg}
          style={{ objectPosition: coverUrl ? `center ${coverPosition ?? 'center'}` : 'center center' }}
          aria-hidden="true"
        />
        <div className={styles.vehicleHeroCoverOverlay} style={coverUrl ? undefined : colorVar} />

        <button type="button" className={styles.vehicleHeroBackBtn} onClick={onBack} aria-label="Назад">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M11 4l-5 5 5 5"/>
          </svg>
        </button>

        {isOwner && (
          <button type="button" className={styles.vehicleHeroEditBtn} onClick={onEditSpace} aria-label="Редагувати простір">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M11 2.5l2.5 2.5L5 13.5H2.5V11L11 2.5z"/>
            </svg>
          </button>
        )}

        <div className={styles.vehicleHeroContent}>
          <span className={`${styles.vehicleHeroTypeLabel} ${coverUrl ? styles.vehicleHeroTypeLabelCovered : ''}`}>
            {profile?.make || profile?.model ? 'МІЙ АВТОМОБІЛЬ' : 'АВТО'}
          </span>
          <h1 className={`${styles.vehicleHeroName} ${coverUrl ? styles.vehicleHeroNameCovered : ''}`}>
            {profile?.make || profile?.model
              ? [profile.make, profile.model].filter(Boolean).join(' ')
              : spaceName}
          </h1>
        </div>
      </div>

      {/* ── Vehicle profile card ── */}
      <div className={styles.vehicleHeroCard} style={colorVar}>
        <div className={styles.vehicleMedallion}>
          {profile?.photoUrl
            ? <img src={profile.photoUrl} alt="авто" className={styles.vehicleMedallionPhoto} />
            : <VehicleMedallion />
          }
        </div>

        <div className={styles.vehicleHeroInfo}>
          {profile?.make || profile?.model ? (
            <span className={styles.vehicleHeroSubtitle}>
              {[profile.year, profile.plateNumber].filter(Boolean).join(' · ')}
            </span>
          ) : (
            <span className={styles.vehicleHeroDesc}>Хроніка авто: заправки, ТО, документи й витрати в одному місці.</span>
          )}
        </div>

        {isOwner && (
          <button type="button" className={styles.vehicleProfileEditBtn} onClick={openEdit} aria-label="Редагувати профіль авто">
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

            {form.photoUrl !== '' && (form.photoUrl || profile?.photoUrl) ? (
              <div className={styles.vehiclePhotoWrapper}>
                <img src={form.photoUrl ?? profile?.photoUrl ?? ''} className={styles.vehiclePhotoPreview} alt="авто" />
                <button
                  type="button"
                  className={styles.vehiclePhotoOverlay}
                  onClick={triggerPhoto}
                  disabled={uploadingPhoto}
                  aria-label="Змінити фото"
                >
                  {uploadingPhoto ? <span className={styles.attachSpinner} /> : (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M11 2.5l2.5 2.5L5 13.5H2.5V11L11 2.5z"/>
                    </svg>
                  )}
                </button>
                <button
                  type="button"
                  className={styles.vehiclePhotoDeleteBtn}
                  onClick={() => setForm(p => ({ ...p, photoUrl: '' }))}
                  aria-label="Видалити фото"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                  </svg>
                </button>
              </div>
            ) : (
              <button type="button" className={styles.vehiclePhotoPicker} onClick={triggerPhoto} disabled={uploadingPhoto}>
                <span className={styles.vehiclePhotoPlaceholderPicker}>
                  {uploadingPhoto ? <span className={styles.attachSpinner} /> : (
                    <>
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M3 17h1.5l1.2-3.6A2 2 0 0 1 7.6 12h8.8a2 2 0 0 1 1.9 1.4L19.5 17H21"/>
                        <path d="M5 17v2a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1"/>
                        <path d="M16 17v2a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1"/>
                        <rect x="3" y="17" width="18" height="0.01"/>
                        <path d="M3 17v-1a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1"/>
                      </svg>
                      <span className={styles.vehiclePhotoPickerText}>Додати фото авто</span>
                    </>
                  )}
                </span>
              </button>
            )}

            <h4 className={`${styles.sectionTitle} ${styles.sectionTitleSpaced}`}>ОСНОВНЕ</h4>

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

            <div className={styles.twoCol}>
              <div>
                <label className={styles.fieldLabel}>РІК</label>
                <input className={styles.fieldInput} type="number" value={form.year ?? ''} onChange={e => setForm(p => ({ ...p, year: e.target.value ? Number(e.target.value) : undefined }))} placeholder="2020" />
              </div>
              <div>
                <label className={styles.fieldLabel}>ДЕРЖ. НОМЕР</label>
                <input className={styles.fieldInput} value={form.plateNumber ?? ''} onChange={e => setForm(p => ({ ...p, plateNumber: e.target.value }))} placeholder="АА 1234 ВВ" />
              </div>
            </div>

            <h4 className={`${styles.sectionTitle} ${styles.sectionTitleSpaced}`}>ЕКСПЛУАТАЦІЯ</h4>

            <label className={styles.fieldLabel}>ПАЛЬНЕ</label>
            <PillSelector
              options={FUEL_TYPE_OPTIONS}
              value={form.fuelType ?? ''}
              onChange={v => setForm(p => ({ ...p, fuelType: v }))}
            />

            <label className={styles.fieldLabel}>ТИП СИЛОВОЇ УСТАНОВКИ</label>
            <PillSelector
              options={DRIVETRAIN_OPTIONS}
              value={form.drivetrain ?? ''}
              onChange={v => setForm(p => ({ ...p, drivetrain: v }))}
            />

            <label className={styles.fieldLabel}>ПРОБІГ (км)</label>
            <input className={styles.fieldInput} type="number" value={form.currentMileage ?? ''} onChange={e => setForm(p => ({ ...p, currentMileage: e.target.value ? Number(e.target.value) : undefined }))} placeholder="123 000" />

            <label className={styles.fieldLabel}>НАСТУПНЕ ТО (км)</label>
            <input className={styles.fieldInput} type="number" value={form.nextServiceMileage ?? ''} onChange={e => setForm(p => ({ ...p, nextServiceMileage: e.target.value ? Number(e.target.value) : undefined }))} placeholder="150 000" />

            <label className={styles.fieldLabel}>ДАТА КУПІВЛІ</label>
            <button type="button" className={styles.dateField} onClick={() => setPurchaseDateOpen(true)}>
              {form.purchaseDate ? fmtDate(form.purchaseDate) : 'Оберіть дату'}
            </button>
            {purchaseDateOpen && (
              <CustomDatePicker
                value={form.purchaseDate ?? ''}
                onChange={d => { setForm(p => ({ ...p, purchaseDate: d })); setPurchaseDateOpen(false) }}
                onClose={() => setPurchaseDateOpen(false)}
              />
            )}

            <button type="button" className={styles.additionalToggle} onClick={() => setAdditionalOpen(o => !o)}>
              ДОДАТКОВІ ДАНІ
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={additionalOpen ? styles.additionalChevronOpen : styles.additionalChevron}>
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
            <div className={`${styles.additionalBody} ${additionalOpen ? styles.additionalBodyOpen : ''}`}>
              <label className={styles.fieldLabel}>VIN</label>
              <div className={styles.vinRow}>
                <input className={styles.fieldInput} value={form.vin ?? ''} onChange={e => setForm(p => ({ ...p, vin: e.target.value.toUpperCase() }))} placeholder="WBA3A5G50FN..." maxLength={17} />
                <button type="button" className={styles.decodeBtn} onClick={handleDecodeVin} disabled={decoding || (form.vin ?? '').trim().length !== 17}>
                  {decoding ? <span className={styles.attachSpinner} /> : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                    </svg>
                  )}
                  Перевірити VIN
                </button>
              </div>

              <label className={styles.fieldLabel}>
                FRAME / НОМЕР КУЗОВА
                <span className={styles.optionalHint}> — для японських автомобілів</span>
              </label>
              <input className={styles.fieldInput} value={form.frameNumber ?? ''} onChange={e => setForm(p => ({ ...p, frameNumber: e.target.value.toUpperCase() }))} placeholder="DBA-ZVW30 / ZVW30-1234567" />
            </div>

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

const MONTH_NAMES_UA = ['січень','лютий','березень','квітень','травень','червень','липень','серпень','вересень','жовтень','листопад','грудень']

const VehicleStats: React.FC<StatsProps> = ({ spaceId, color }) => {
  const stats  = useVehicleStore(s => s.statsBySpace[spaceId])
  const events = useVehicleStore(s => s.eventsBySpace[spaceId] ?? EMPTY_VEHICLE_EVENTS)
  const [tripKm, setTripKm] = useState('')
  const colorVar = { '--space-color': color } as React.CSSProperties

  if (!stats) return null

  const lastFuelWithPrice = [...events]
    .filter(e => e.type === 'fuel' && e.liters != null && e.liters > 0 && e.cost != null && e.cost > 0)
    .sort((a, b) => b.date.localeCompare(a.date))[0]
  const pricePerLiter = lastFuelWithPrice ? lastFuelWithPrice.cost! / lastFuelWithPrice.liters! : null

  const canCalculate = stats.avgFuelConsumption != null && pricePerLiter != null
  const km = parseFloat(tripKm)
  const tripCost = canCalculate && !isNaN(km) && km > 0
    ? Math.round((km * stats.avgFuelConsumption! / 100) * pricePerLiter!)
    : null

  // Cost breakdown for the current month, by category
  const nowMonthKey = todayISO().slice(0, 7)
  const monthEvents = events.filter(e => e.date.slice(0, 7) === nowMonthKey && e.cost != null)
  const sumByTypes = (types: VehicleEventType[]) =>
    monthEvents.filter(e => types.includes(e.type)).reduce((sum, e) => sum + (e.cost ?? 0), 0)
  const breakdown = [
    { label: 'Пальне', value: sumByTypes(['fuel']) },
    { label: 'ТО',      value: sumByTypes(['maintenance', 'repair', 'tire_change']) },
    { label: 'Інше',    value: sumByTypes(['document', 'insurance', 'inspection', 'note']) },
  ].filter(b => b.value > 0)

  if (stats.totalCostMonth === 0 && !canCalculate) return null

  return (
    <div className={styles.statsBlock}>
      {stats.totalCostMonth > 0 && (
        <div className={styles.expensesPanel} style={colorVar}>
          <span className={styles.sectionTitle}>ВИТРАТИ</span>
          <div className={styles.expensesHeadline}>
            <span className={styles.expensesAmount}>₴{stats.totalCostMonth.toLocaleString('uk-UA')}</span>
            <span className={styles.expensesMonth}>{MONTH_NAMES_UA[new Date().getMonth()]}</span>
          </div>
          {breakdown.length > 0 && (
            <div className={styles.expensesBreakdown}>
              {breakdown.map(b => (
                <div key={b.label} className={styles.expensesBreakdownRow}>
                  <span className={styles.expensesBreakdownLabel}>{b.label}</span>
                  <span className={styles.expensesBreakdownValue}>₴{b.value.toLocaleString('uk-UA')}</span>
                </div>
              ))}
            </div>
          )}
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
  spaceId:    string
  color:      string
  onClose:    () => void
  profile?:   VehicleProfile | null
  editEvent?: VehicleEvent
}

/** Delete action inside an edit sheet — replaces the old per-row delete icon */
const DeleteRecordButton: React.FC<{ spaceId: string; eventId: string; onClose: () => void }> = ({ spaceId, eventId, onClose }) => {
  const { deleteEvent } = useVehicleStore()
  const { showToast }   = useUiStore()
  const [confirming, setConfirming] = useState(false)

  const handleDelete = () => {
    deleteEvent(spaceId, eventId)
    showToast('Видалено', 'success')
    onClose()
  }

  if (confirming) {
    return (
      <div className={styles.deleteConfirmRow}>
        <span className={styles.deleteConfirmText}>Видалити запис?</span>
        <button type="button" className={styles.deleteConfirmCancel} onClick={() => setConfirming(false)}>Ні</button>
        <button type="button" className={styles.deleteConfirmYes} onClick={handleDelete}>Так, видалити</button>
      </div>
    )
  }

  return (
    <button type="button" className={styles.deleteRecordBtn} onClick={() => setConfirming(true)}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
      </svg>
      Видалити запис
    </button>
  )
}

const FuelSheet: React.FC<SheetProps> = ({ spaceId, color, onClose, profile, editEvent }) => {
  const events = useVehicleStore(s => s.eventsBySpace[spaceId] ?? EMPTY_VEHICLE_EVENTS)
  const pastFuelEvents = events
    .filter(e => e.type === 'fuel')
    .sort((a, b) => b.date.localeCompare(a.date))
  const lastFuelType = pastFuelEvents.find(e => e.fuelType)?.fuelType ?? ''
  const vendorSuggestions = Array.from(new Set(pastFuelEvents.map(e => e.vendor).filter(Boolean)))
  const lastPriceEvent = pastFuelEvents.find(e => e.liters != null && e.liters > 0 && e.cost != null && e.cost > 0)
  const lastPricePerLiter = lastPriceEvent ? lastPriceEvent.cost! / lastPriceEvent.liters! : null

  const [date, setDate]         = useState(editEvent?.date ?? todayISO())
  const [dateOpen, setDateOpen] = useState(false)
  const [mileage, setMileage]   = useState(editEvent?.mileage != null ? String(editEvent.mileage) : '')
  const [liters, setLiters]     = useState(editEvent?.liters  != null ? String(editEvent.liters)  : '')
  const [cost, setCost]         = useState(editEvent?.cost    != null ? String(editEvent.cost)    : '')
  const [vendor, setVendor]     = useState(editEvent?.vendor    ?? '')
  const [fuelType, setFuelType] = useState(editEvent?.fuelType  ?? lastFuelType)
  const [saving, setSaving]     = useState(false)
  const { createEvent, updateEvent, updateProfile } = useVehicleStore()
  const { setVehicleProfile }                       = useSpacesStore()
  const { showToast }                               = useUiStore()
  const overlayRef = useRef<HTMLDivElement>(null)
  const sheetRef   = useSwipeToDismiss(onClose, { enabled: true, overlayRef })
  const colorVar   = { '--space-color': color } as React.CSSProperties

  const [nearbyStations, setNearbyStations] = useState<string[]>([])

  useEffect(() => {
    if (editEvent || !navigator.geolocation) return
    let cancelled = false
    navigator.geolocation.getCurrentPosition(
      pos => {
        fetchNearbyGasStations(pos.coords.latitude, pos.coords.longitude)
          .then(names => { if (!cancelled) setNearbyStations(names) })
          .catch(() => { /* тихо ігноруємо — юзер лишається з історією заправок */ })
      },
      () => { /* доступ до геолокації не надано — не критично */ },
      { timeout: 8000 },
    )
    return () => { cancelled = true }
  }, [editEvent])

  const allVendorSuggestions = Array.from(new Set([...nearbyStations, ...vendorSuggestions]))

  const handleLitersChange = (v: string) => {
    setLiters(v)
    if (!cost && lastPricePerLiter && Number(v) > 0) {
      setCost(String(Math.round(Number(v) * lastPricePerLiter)))
    }
  }

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
        if (editEvent) {
          await updateEvent(spaceId, editEvent._id, data)
        } else {
          await createEvent(spaceId, data)
        }
        const newKm = mileage ? Number(mileage) : null
        if (!editEvent && newKm && (profile?.currentMileage == null || newKm > profile.currentMileage)) {
          const updated = await updateProfile(spaceId, { currentMileage: newKm })
          if (!cancelled) setVehicleProfile(spaceId, updated)
        }
        if (!cancelled) { showToast(editEvent ? 'Заправку оновлено' : 'Заправку додано', 'success'); onClose() }
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
        <h3 className={styles.sheetTitle}>{editEvent ? 'Редагувати заправку' : 'Заправка'}</h3>
        <label className={styles.fieldLabel}>ДАТА</label>
        <button type="button" className={styles.dateField} onClick={() => setDateOpen(true)}>{fmtDate(date)}</button>
        {dateOpen && <CustomDatePicker value={date} onChange={d => { setDate(d); setDateOpen(false) }} onClose={() => setDateOpen(false)} />}
        <div className={styles.twoCol}>
          <div>
            <label className={styles.fieldLabel}>ЛІТРИ</label>
            <input className={styles.fieldInput} type="number" value={liters} onChange={e => handleLitersChange(e.target.value)} placeholder="45.0" />
          </div>
          <div>
            <label className={styles.fieldLabel}>ПАЛЬНЕ</label>
            <input className={styles.fieldInput} value={fuelType} onChange={e => setFuelType(e.target.value)} placeholder="А-95" />
          </div>
        </div>
        <label className={styles.fieldLabel}>СУМА (₴)</label>
        <input className={styles.fieldInput} type="number" value={cost} onChange={e => setCost(e.target.value)} placeholder="1 800" />
        {Number(liters) > 0 && Number(cost) > 0 && (
          <span className={styles.pricePerLiterHint}>≈{(Number(cost) / Number(liters)).toFixed(2)} ₴/л</span>
        )}
        <label className={styles.fieldLabel}>АЗС</label>
        <div className={styles.stationRow}>
          <input className={styles.fieldInput} value={vendor} onChange={e => setVendor(e.target.value)} placeholder="WOG, ОККО…" list={`azs-suggestions-${spaceId}`} />
          {allVendorSuggestions.length > 0 && (
            <datalist id={`azs-suggestions-${spaceId}`}>
              {allVendorSuggestions.map(v => <option key={v} value={v} />)}
            </datalist>
          )}
          <a
            href={/iphone|ipad|ipod|mac/i.test(navigator.userAgent) ? 'maps://?q=gas+station' : 'https://maps.google.com/?q=gas+station'}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.findStationBtn}
            title="Знайти заправку на карті"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
              <circle cx="12" cy="9" r="2.5"/>
            </svg>
          </a>
        </div>
        <label className={styles.fieldLabel}>ПРОБІГ (км) <span className={styles.optionalHint}>необов&rsquo;язково</span></label>
        <input className={styles.fieldInput} type="number" value={mileage} onChange={e => setMileage(e.target.value)} placeholder="123 450" />
        <button type="button" className={styles.primaryBtn} style={colorVar} onClick={handleSave} disabled={saving || !date}>
          {saving ? 'Зберігаємо…' : 'Зберегти'}
        </button>
        {editEvent && <DeleteRecordButton spaceId={spaceId} eventId={editEvent._id} onClose={onClose} />}
      </div>
    </div>
  )
}

const MaintenanceSheet: React.FC<SheetProps> = ({ spaceId, color, onClose, profile, editEvent }) => {
  const [date, setDate]               = useState(editEvent?.date ?? todayISO())
  const [dateOpen, setDateOpen]       = useState(false)
  const [mileage, setMileage]         = useState(editEvent?.mileage != null ? String(editEvent.mileage) : '')
  const [cost, setCost]               = useState(editEvent?.cost    != null ? String(editEvent.cost)    : '')
  const [vendor, setVendor]           = useState(editEvent?.vendor  ?? '')
  const [notes, setNotes]             = useState(editEvent?.notes   ?? '')
  const [attachments, setAttachments] = useState<string[]>(editEvent?.attachments ?? [])
  const [nextService, setNextService] = useState('')
  const [saving, setSaving]           = useState(false)
  const { createEvent, updateEvent, updateProfile } = useVehicleStore()
  const { setVehicleProfile }                       = useSpacesStore()
  const { showToast }                               = useUiStore()
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
        const data: VehicleEventInput = {
          type: 'maintenance', date,
          mileage:     mileage ? Number(mileage) : null,
          cost:        cost    ? Number(cost)    : null,
          currency:    'UAH',
          vendor:      vendor.trim(),
          notes:       notes.trim(),
          attachments,
        }
        if (editEvent) {
          await updateEvent(spaceId, editEvent._id, data)
        } else {
          await createEvent(spaceId, data)
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
        }
        if (!cancelled) { showToast(editEvent ? 'ТО оновлено' : 'ТО додано', 'success'); onClose() }
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
        <h3 className={styles.sheetTitle}>{editEvent ? 'Редагувати ТО' : 'ТО / Ремонт'}</h3>
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
        {!editEvent && (
          <>
            <label className={styles.fieldLabel}>НАСТУПНЕ ТО (км)</label>
            <div className={styles.vinRow}>
              <input className={styles.fieldInput} type="number" value={nextService} onChange={e => setNextService(e.target.value)} placeholder="Не встановлено" />
              <div className={styles.quickBtns}>
                <button type="button" className={styles.quickBtn} style={colorVar} onClick={() => setNextService(String(baseMileage + 10000))}>+10 000</button>
                <button type="button" className={styles.quickBtn} style={colorVar} onClick={() => setNextService(String(baseMileage + 15000))}>+15 000</button>
              </div>
            </div>
          </>
        )}
        <label className={styles.fieldLabel}>ФОТО / ЧЕК</label>
        <AttachmentsField value={attachments} onChange={setAttachments} />
        <button type="button" className={styles.primaryBtn} style={colorVar} onClick={handleSave} disabled={saving || !date}>
          {saving ? 'Зберігаємо…' : 'Зберегти'}
        </button>
        {editEvent && <DeleteRecordButton spaceId={spaceId} eventId={editEvent._id} onClose={onClose} />}
      </div>
    </div>
  )
}

const DocumentSheet: React.FC<SheetProps> = ({ spaceId, color, onClose, editEvent }) => {
  const [date, setDate]               = useState(editEvent?.date        ?? todayISO())
  const [dateOpen, setDateOpen]       = useState(false)
  const [expiresAt, setExpiresAt]     = useState(editEvent?.docExpiresAt ?? '')
  const [expiresOpen, setExpiresOpen] = useState(false)
  const [docType, setDocType]         = useState(editEvent?.docType      ?? '')
  const [notes, setNotes]             = useState(editEvent?.notes        ?? '')
  const [attachments, setAttachments] = useState<string[]>(editEvent?.attachments ?? [])
  const [saving, setSaving]           = useState(false)
  const { createEvent, updateEvent }  = useVehicleStore()
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
        const data: VehicleEventInput = { type: 'document', date, docType: docType.trim(), docExpiresAt: expiresAt || null, notes: notes.trim(), attachments }
        if (editEvent) {
          await updateEvent(spaceId, editEvent._id, data)
        } else {
          await createEvent(spaceId, data)
        }
        if (!cancelled) { showToast(editEvent ? 'Документ оновлено' : 'Документ додано', 'success'); onClose() }
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
        <h3 className={styles.sheetTitle}>{editEvent ? 'Редагувати документ' : 'Документ'}</h3>
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
        {editEvent && <DeleteRecordButton spaceId={spaceId} eventId={editEvent._id} onClose={onClose} />}
      </div>
    </div>
  )
}

const NoteSheet: React.FC<SheetProps> = ({ spaceId, color, onClose, editEvent }) => {
  const [date, setDate]         = useState(editEvent?.date  ?? todayISO())
  const [dateOpen, setDateOpen] = useState(false)
  const [notes, setNotes]       = useState(editEvent?.notes ?? '')
  const [saving, setSaving]     = useState(false)
  const { createEvent, updateEvent } = useVehicleStore()
  const { showToast }                = useUiStore()
  const overlayRef = useRef<HTMLDivElement>(null)
  const sheetRef   = useSwipeToDismiss(onClose, { enabled: true, overlayRef })
  const colorVar   = { '--space-color': color } as React.CSSProperties

  const handleSave = () => {
    if (!notes.trim()) return
    let cancelled = false
    const save = async () => {
      setSaving(true)
      try {
        if (editEvent) {
          await updateEvent(spaceId, editEvent._id, { type: 'note', date, notes: notes.trim() })
        } else {
          await createEvent(spaceId, { type: 'note', date, notes: notes.trim() })
        }
        if (!cancelled) { showToast(editEvent ? 'Нотатку оновлено' : 'Нотатку додано', 'success'); onClose() }
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
        <h3 className={styles.sheetTitle}>{editEvent ? 'Редагувати нотатку' : 'Нотатка'}</h3>
        <label className={styles.fieldLabel}>ДАТА</label>
        <button type="button" className={styles.dateField} onClick={() => setDateOpen(true)}>{fmtDate(date)}</button>
        {dateOpen && <CustomDatePicker value={date} onChange={d => { setDate(d); setDateOpen(false) }} onClose={() => setDateOpen(false)} />}
        <label className={styles.fieldLabel}>НОТАТКА</label>
        <textarea className={styles.textarea} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Дивний звук зліва при повороті…" rows={4} autoFocus />
        <button type="button" className={styles.primaryBtn} style={colorVar} onClick={handleSave} disabled={saving || !notes.trim()}>
          {saving ? 'Зберігаємо…' : 'Зберегти'}
        </button>
        {editEvent && <DeleteRecordButton spaceId={spaceId} eventId={editEvent._id} onClose={onClose} />}
      </div>
    </div>
  )
}

// ── RepairSheet ────────────────────────────────────────────────────────────

const RepairSheet: React.FC<SheetProps> = ({ spaceId, color, onClose, profile, editEvent }) => {
  const [date, setDate]               = useState(editEvent?.date    ?? todayISO())
  const [dateOpen, setDateOpen]       = useState(false)
  const [mileage, setMileage]         = useState(editEvent?.mileage != null ? String(editEvent.mileage) : '')
  const [cost, setCost]               = useState(editEvent?.cost    != null ? String(editEvent.cost)    : '')
  const [vendor, setVendor]           = useState(editEvent?.vendor  ?? '')
  const [notes, setNotes]             = useState(editEvent?.notes   ?? '')
  const [attachments, setAttachments] = useState<string[]>(editEvent?.attachments ?? [])
  const [saving, setSaving]           = useState(false)
  const { createEvent, updateEvent, updateProfile } = useVehicleStore()
  const { setVehicleProfile }                       = useSpacesStore()
  const { showToast }                               = useUiStore()
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
          type: 'repair', date,
          mileage: mileage ? Number(mileage) : null,
          cost:    cost    ? Number(cost)    : null,
          currency: 'UAH', vendor: vendor.trim(), notes: notes.trim(), attachments,
        }
        if (editEvent) {
          await updateEvent(spaceId, editEvent._id, data)
        } else {
          await createEvent(spaceId, data)
          const newKm = mileage ? Number(mileage) : null
          if (newKm && (profile?.currentMileage == null || newKm > profile.currentMileage)) {
            const updated = await updateProfile(spaceId, { currentMileage: newKm })
            if (!cancelled) setVehicleProfile(spaceId, updated)
          }
        }
        if (!cancelled) { showToast(editEvent ? 'Ремонт оновлено' : 'Ремонт додано', 'success'); onClose() }
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
        <h3 className={styles.sheetTitle}>{editEvent ? 'Редагувати ремонт' : 'Ремонт'}</h3>
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
            <input className={styles.fieldInput} type="number" value={cost} onChange={e => setCost(e.target.value)} placeholder="5 000" />
          </div>
        </div>
        <label className={styles.fieldLabel}>СЕРВІС</label>
        <input className={styles.fieldInput} value={vendor} onChange={e => setVendor(e.target.value)} placeholder="СТО, майстер…" />
        <label className={styles.fieldLabel}>ЩО ЗРОБЛЕНО</label>
        <textarea className={styles.textarea} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Заміна амортизаторів…" rows={3} />
        <label className={styles.fieldLabel}>ФОТО / ЧЕК</label>
        <AttachmentsField value={attachments} onChange={setAttachments} />
        <button type="button" className={styles.primaryBtn} style={colorVar} onClick={handleSave} disabled={saving || !date}>
          {saving ? 'Зберігаємо…' : 'Зберегти'}
        </button>
        {editEvent && <DeleteRecordButton spaceId={spaceId} eventId={editEvent._id} onClose={onClose} />}
      </div>
    </div>
  )
}

// ── TireSheet ──────────────────────────────────────────────────────────────

const TireSheet: React.FC<SheetProps> = ({ spaceId, color, onClose, profile, editEvent }) => {
  const [date, setDate]         = useState(editEvent?.date    ?? todayISO())
  const [dateOpen, setDateOpen] = useState(false)
  const [mileage, setMileage]   = useState(editEvent?.mileage != null ? String(editEvent.mileage) : '')
  const [cost, setCost]         = useState(editEvent?.cost    != null ? String(editEvent.cost)    : '')
  const [vendor, setVendor]     = useState(editEvent?.vendor  ?? '')
  const [notes, setNotes]       = useState(editEvent?.notes   ?? '')
  const [saving, setSaving]     = useState(false)
  const { createEvent, updateEvent, updateProfile } = useVehicleStore()
  const { setVehicleProfile }                       = useSpacesStore()
  const { showToast }                               = useUiStore()
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
          type: 'tire_change', date,
          mileage: mileage ? Number(mileage) : null,
          cost:    cost    ? Number(cost)    : null,
          currency: 'UAH', vendor: vendor.trim(), notes: notes.trim(),
        }
        if (editEvent) {
          await updateEvent(spaceId, editEvent._id, data)
        } else {
          await createEvent(spaceId, data)
          const newKm = mileage ? Number(mileage) : null
          if (newKm && (profile?.currentMileage == null || newKm > profile.currentMileage)) {
            const updated = await updateProfile(spaceId, { currentMileage: newKm })
            if (!cancelled) setVehicleProfile(spaceId, updated)
          }
        }
        if (!cancelled) { showToast(editEvent ? 'Шини оновлено' : 'Шини додано', 'success'); onClose() }
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
        <h3 className={styles.sheetTitle}>{editEvent ? 'Редагувати шини' : 'Заміна шин'}</h3>
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
            <input className={styles.fieldInput} type="number" value={cost} onChange={e => setCost(e.target.value)} placeholder="8 000" />
          </div>
        </div>
        <label className={styles.fieldLabel}>ШИНОМОНТАЖ</label>
        <input className={styles.fieldInput} value={vendor} onChange={e => setVendor(e.target.value)} placeholder="Назва сервісу…" />
        <label className={styles.fieldLabel}>НОТАТКИ <span style={{ opacity: 0.5, fontSize: '10px' }}>(розмір, сезон…)</span></label>
        <textarea className={styles.textarea} value={notes} onChange={e => setNotes(e.target.value)} placeholder="205/55 R16, літня…" rows={2} />
        <button type="button" className={styles.primaryBtn} style={colorVar} onClick={handleSave} disabled={saving || !date}>
          {saving ? 'Зберігаємо…' : 'Зберегти'}
        </button>
        {editEvent && <DeleteRecordButton spaceId={spaceId} eventId={editEvent._id} onClose={onClose} />}
      </div>
    </div>
  )
}

// ── TimelineRow — shared between the dashboard chronicle and "Всі записи" ──

interface TimelineRowProps {
  event:            VehicleEvent
  color:            string
  onEdit:           (event: VehicleEvent) => void
  showAttachments?: boolean
}

const TimelineRow: React.FC<TimelineRowProps> = ({ event: e, color, onEdit, showAttachments }) => {
  const colorVar = { '--space-color': color } as React.CSSProperties
  const pricePerLiter = e.type === 'fuel' && e.liters != null && e.liters > 0 && e.cost != null
    ? e.cost / e.liters
    : null

  return (
    <div className={styles.timelineItem}>
      <div className={styles.timelineIcon} style={colorVar}>
        <EventIcon type={e.type} />
      </div>
      <div className={styles.timelineBody}>
        <div className={styles.timelineTop}>
          <span className={styles.timelineType}>{EVENT_LABELS[e.type]}</span>
          <span className={styles.timelineDate}>{fmtDateShort(e.date)}</span>
        </div>
        <div className={styles.timelineMeta}>
          {e.cost != null && <span className={styles.timelineCost}>{fmtCost(e.cost, e.currency)}</span>}
          {e.liters != null && (
            <>
              <span className={styles.timelineDivider}>·</span>
              <span>{e.liters} л</span>
            </>
          )}
          {pricePerLiter != null && (
            <>
              <span className={styles.timelineDivider}>·</span>
              <span className={styles.timelineMuted}>₴{pricePerLiter.toFixed(2)}/л</span>
            </>
          )}
          {e.fuelType && (
            <>
              <span className={styles.timelineDivider}>·</span>
              <span className={styles.timelineTag}>{e.fuelType}</span>
            </>
          )}
          {e.vendor && (
            <>
              <span className={styles.timelineDivider}>·</span>
              <span>{e.vendor}</span>
            </>
          )}
          {e.mileage != null && (
            <>
              <span className={styles.timelineDivider}>·</span>
              <span className={styles.timelineMileage}>{fmtMileage(e.mileage)}</span>
            </>
          )}
          {e.docType && (
            <>
              <span className={styles.timelineDivider}>·</span>
              <span>{e.docType}</span>
            </>
          )}
          {e.docExpiresAt && (
            <>
              <span className={styles.timelineDivider}>·</span>
              <span className={styles.timelineExpiry}>до {fmtDate(e.docExpiresAt)}</span>
            </>
          )}
        </div>
        {e.notes && <p className={styles.timelineNotes}>{e.notes}</p>}
        {showAttachments && e.attachments.length > 0 && (
          <div className={styles.timelineAttachments}>
            {e.attachments.map((url, i) => (
              <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                <img src={url} alt={`фото ${i + 1}`} className={styles.timelineAttachThumb} />
              </a>
            ))}
          </div>
        )}
      </div>
      <button type="button" className={styles.timelineEditBtn} onClick={() => onEdit(e)} aria-label="Редагувати запис">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </button>
    </div>
  )
}

// ── AllRecordsSheet ────────────────────────────────────────────────────────

const ALL_FILTER_TYPES: Array<{ key: VehicleEventType | 'all'; label: string }> = [
  { key: 'all',         label: 'Всі'       },
  { key: 'fuel',        label: 'Заправка'  },
  { key: 'maintenance', label: 'ТО'        },
  { key: 'repair',      label: 'Ремонт'    },
  { key: 'tire_change', label: 'Шини'      },
  { key: 'document',    label: 'Документи' },
  { key: 'note',        label: 'Нотатки'   },
]

interface AllRecordsProps {
  events:   VehicleEvent[]
  color:    string
  onClose:  () => void
  onEdit:   (event: VehicleEvent) => void
}

const AllRecordsSheet: React.FC<AllRecordsProps> = ({ events, color, onClose, onEdit }) => {
  const [filter, setFilter] = useState<VehicleEventType | 'all'>('all')
  const overlayRef = useRef<HTMLDivElement>(null)
  const sheetRef   = useSwipeToDismiss(onClose, { enabled: true, overlayRef })
  const colorVar   = { '--space-color': color } as React.CSSProperties

  const sorted   = [...events].sort((a, b) => b.date.localeCompare(a.date))
  const filtered = filter === 'all' ? sorted : sorted.filter(e => e.type === filter)

  // Show only filter chips that have matching events
  const activeTypes = new Set(events.map(e => e.type))
  const chips = ALL_FILTER_TYPES.filter(f => f.key === 'all' || activeTypes.has(f.key as VehicleEventType))

  return (
    <div className={styles.overlay} ref={overlayRef} onClick={onClose}>
      <div className={`${styles.sheet} ${styles.sheetTall}`} ref={sheetRef} onClick={e => e.stopPropagation()}>
        <div className={styles.sheetHandle} />
        <h3 className={styles.sheetTitle}>Всі записи <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', opacity: 0.5 }}>({filtered.length})</span></h3>
        <div className={styles.allRecordsFilter}>
          {chips.map(f => (
            <button
              key={f.key}
              type="button"
              className={`${styles.allRecordsChip} ${filter === f.key ? styles.allRecordsChipActive : ''}`}
              style={filter === f.key ? colorVar : undefined}
              onClick={() => setFilter(f.key as VehicleEventType | 'all')}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className={styles.allRecordsList}>
          {filtered.map(e => (
            <TimelineRow
              key={e._id}
              event={e}
              color={color}
              onEdit={(ev) => { onClose(); onEdit(ev) }}
              showAttachments
            />
          ))}
          {filtered.length === 0 && (
            <p className={styles.empty}>Немає записів цього типу</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── VehicleStateBlock ──────────────────────────────────────────────────────

import type { VehicleStats } from '../../store/vehicleStore'

function StateIcon({ type }: { type: string }) {
  const props = { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }
  switch (type) {
    case 'maintenance':
      return <svg {...props}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
    case 'fuel':
      return <svg {...props}><path d="M3 22V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"/><path d="M3 22h12M15 8h2a2 2 0 0 1 2 2v6a1 1 0 0 0 2 0V9l-2-2"/></svg>
    case 'document':
      return <svg {...props}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/></svg>
    case 'coins':
      return <svg {...props}><circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/><path d="M7 6h1v4"/><line x1="16.71" y1="13.88" x2="17" y2="14"/></svg>
    default:
      return null
  }
}

interface StateBlockProps {
  profile: VehicleProfile | null
  events:  VehicleEvent[]
  stats:   VehicleStats | undefined
  color:   string
}

const VehicleStateBlock: React.FC<StateBlockProps> = ({ profile, events, stats, color }) => {
  const colorVar = { '--space-color': color } as React.CSSProperties
  type Status = 'ok' | 'warning' | 'danger'
  const items: { icon: string; label: string; value?: string; status: Status }[] = []

  if (profile?.nextServiceMileage != null && profile?.currentMileage != null) {
    const kmLeft = profile.nextServiceMileage - profile.currentMileage
    items.push({
      icon:   'maintenance',
      label:  kmLeft >= 0 ? `ТО через ${kmLeft.toLocaleString('uk-UA')} км` : 'ТО прострочено',
      status: kmLeft < 0 ? 'danger' : kmLeft < 1000 ? 'warning' : 'ok',
    })
  }

  if (stats?.expiringDocs?.length) {
    for (const doc of stats.expiringDocs) {
      items.push({
        icon:   'document',
        label:  `${doc.docType || 'Документ'} до ${fmtDate(doc.docExpiresAt)}`,
        status: 'warning',
      })
    }
  }

  const lastFuel = [...events]
    .filter(e => e.type === 'fuel')
    .sort((a, b) => b.date.localeCompare(a.date))[0]
  if (lastFuel) {
    const days = daysAgo(lastFuel.date)
    items.push({
      icon:   'fuel',
      label:  days === 0 ? 'Заправка сьогодні' : `Заправка ${days} ${pluralDays(days)} тому`,
      value:  lastFuel.cost != null ? fmtCost(lastFuel.cost, lastFuel.currency) : undefined,
      status: 'ok',
    })
  }

  const carName = [profile?.make, profile?.model].filter(Boolean).join(' ')

  if (items.length === 0 && !carName) return null

  return (
    <div className={styles.vehicleStateBlock} style={colorVar}>
      {(carName || profile?.currentMileage != null) && (
        <div className={styles.vehicleStateHeader}>
          <span className={styles.vehicleStateCarName}>{carName || 'Авто'}</span>
          {profile?.currentMileage != null && (
            <span className={styles.vehicleStateMileage}>{fmtMileage(profile.currentMileage)}</span>
          )}
        </div>
      )}
      <div className={styles.vehicleStateItems}>
        {items.map((item, i) => (
          <div key={i} className={styles.vehicleStateItem}>
            <span className={`${styles.vehicleStateIcon} ${item.status === 'warning' ? styles.vehicleStateIconWarning : item.status === 'danger' ? styles.vehicleStateIconDanger : ''}`}>
              <StateIcon type={item.icon} />
            </span>
            <span className={`${styles.vehicleStateLabel} ${item.status !== 'ok' ? styles.vehicleStateLabelAlert : ''}`}>
              {item.label}
            </span>
            {item.value && <span className={styles.vehicleStateValue}>{item.value}</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── VehicleTimeline ────────────────────────────────────────────────────────

interface TimelineProps {
  events:           VehicleEvent[]
  color:            string
  loading:          boolean
  onAddFuel:        () => void
  onAddMaintenance: () => void
  onEdit:           (event: VehicleEvent) => void
}

function useCarIllustration(): string {
  const theme     = useUiStore(s => s.theme)
  const f1Enabled = useProfileStore(s => s.activeProfile?.f1Enabled ?? false)
  if (f1Enabled)         return '/car/car-f1.png'
  if (theme === 'cyber') return '/car/car-cyber.png'
  if (theme === 'pixel') return '/car/car-default.png'
  return '/car/car-default.png'
}

const VehicleTimeline: React.FC<TimelineProps> = ({ events, color, loading, onAddFuel, onAddMaintenance, onEdit }) => {
  const carImg   = useCarIllustration()
  const colorVar = { '--space-color': color } as React.CSSProperties

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
            Заправитись
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
        <TimelineRow
          key={e._id}
          event={e}
          color={color}
          onEdit={onEdit}
          showAttachments
        />
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
 * @prop {number} tasksCount — shown only when tasks module enabled
 * @prop {number} membersCount
 * @prop {string[]} modules — active space modules (e.g. ['finance', 'tasks'])
 * @prop {SpaceLinkedTx[]} spaceTxs — transactions linked to this space
 * @prop {boolean} isOwner
 * @prop {() => void} onEditSpace — opens parent space edit sheet
 */
const VehicleSpaceView: React.FC<Props> = ({
  spaceId, color, spaceName,
  modules, spaceTxs, isOwner, coverUrl, coverPosition, onEditSpace, onBack,
}) => {
  const [sheet, setSheet]               = useState<SheetType>(null)
  const [editingEvent, setEditingEvent] = useState<VehicleEvent | null>(null)
  const [allRecordsOpen, setAllRecordsOpen] = useState(false)

  const closeSheet = () => { setSheet(null); setEditingEvent(null) }

  const handleEditEvent = (event: VehicleEvent) => {
    const typeToSheet: Partial<Record<VehicleEventType, SheetType>> = {
      fuel: 'fuel', maintenance: 'maintenance', repair: 'repair',
      tire_change: 'tire', document: 'document', note: 'note',
    }
    const s = typeToSheet[event.type]
    if (s) { setEditingEvent(event); setSheet(s) }
  }
  const { fetchEvents, fetchStats, eventsBySpace, statsBySpace, loading } = useVehicleStore()
  const stats = statsBySpace[spaceId]
  const space  = useSpacesStore(s => s.spaces.find(sp => sp.id === spaceId) ?? null)
  const events = eventsBySpace[spaceId] ?? []
  const colorVar = { '--space-color': color } as React.CSSProperties

  const profile  = space?.vehicleProfile ?? null

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

  const hasFinanceModule = modules.includes('finance')

  // Car-specific meta strip — replaces generic Space metadata (Спогади/Плани/Учасники),
  // which read as semantically weak for a vehicle-type space.
  const documentsCount = events.filter(e => e.type === 'document').length
  const META = [
    { value: `${events.length} ${pluralRecords(events.length)}` },
    ...(stats?.totalCostMonth ? [{ value: `₴${stats.totalCostMonth.toLocaleString('uk-UA')} цього місяця` }] : []),
    ...(documentsCount > 0 ? [{ value: `${documentsCount} ${pluralDocs(documentsCount)}` }] : []),
  ]

  // Action cards
  const ACTION_CARDS = [
    {
      key: 'fuel' as SheetType,
      label: '+ Заправитись',
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 22V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"/><path d="M3 22h12M15 8h2a2 2 0 0 1 2 2v6a1 1 0 0 0 2 0V9l-2-2"/></svg>,
    },
    {
      key: 'maintenance' as SheetType,
      label: '+ ТО',
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>,
    },
    {
      key: 'repair' as SheetType,
      label: '+ Ремонт',
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/><line x1="16" y1="8" x2="2" y2="22"/><line x1="17.5" y1="15" x2="9" y2="15"/></svg>,
    },
    {
      key: 'tire' as SheetType,
      label: '+ Шини',
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="3" x2="12" y2="9"/><line x1="12" y1="15" x2="12" y2="21"/><line x1="3" y1="12" x2="9" y2="12"/><line x1="15" y1="12" x2="21" y2="12"/></svg>,
    },
    {
      key: 'document' as SheetType,
      label: '+ Документ',
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/></svg>,
    },
    {
      key: 'note' as SheetType,
      label: '+ Нотатка',
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
  const nextOnboardingItem = ONBOARDING_ITEMS.find(i => !i.done)

  return (
    <div className={styles.vehicleRoot}>
      {/* ── Hero ── */}
      <VehicleHero
        spaceId={spaceId}
        spaceName={spaceName}
        color={color}
        profile={profile}
        isOwner={isOwner}
        coverUrl={coverUrl}
        coverPosition={coverPosition}
        onEditSpace={onEditSpace}
        onBack={onBack}
      />

      {/* ── Meta strip — car-specific, not generic Space metadata ── */}
      {META.length > 0 && (
        <div className={styles.vehicleStatStrip}>
          {META.map((m, i) => (
            <React.Fragment key={m.value}>
              {i > 0 && <span className={styles.vehicleStatStripDot}>·</span>}
              <span className={styles.vehicleStatStripValue}>{m.value}</span>
            </React.Fragment>
          ))}
        </div>
      )}

      {/* ── Onboarding — full checklist only for a genuinely new (empty) vehicle ── */}
      {events.length === 0 && !onboardingDone && (
        <div className={styles.vehicleOnboarding} style={colorVar}>
          <div className={styles.vehicleOnboardingHeader}>
            <span className={styles.vehicleOnboardingTitle}>Новий автомобіль</span>
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

      {/* ── Onboarding — compact progress + single CTA once the space has records ── */}
      {events.length > 0 && !onboardingDone && nextOnboardingItem && (
        <button
          type="button"
          className={styles.vehicleOnboardingCompact}
          style={colorVar}
          onClick={nextOnboardingItem.onClick}
        >
          <span className={styles.vehicleOnboardingCompactLabel}>Налаштуй авто · {onboardingCount}/4</span>
          <div className={styles.vehicleOnboardingBar}>
            <div className={styles.vehicleOnboardingFill} style={{ width: `${onboardingCount / 4 * 100}%` }} />
          </div>
          <span className={styles.vehicleOnboardingCompactCta}>
            {nextOnboardingItem.label}
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 3l4 4-4 4"/>
            </svg>
          </span>
        </button>
      )}

      {/* ── Vehicle state — make/model, mileage, next TO/document, last record ── */}
      <VehicleStateBlock profile={profile} events={events} stats={stats} color={color} />

      {/* ── Action grid 2×2 ── */}
      <div className={styles.vehicleActionGrid} style={colorVar}>
        {ACTION_CARDS.map(a => (
          <button key={a.key} type="button" className={styles.vehicleActionCard} onClick={() => setSheet(a.key)}>
            <span className={styles.vehicleActionCardIcon}>{a.icon}</span>
            <span className={styles.vehicleActionCardLabel}>{a.label}</span>
          </button>
        ))}
      </div>

      {/* ── Vehicle fuel/cost stats (shows only when has data) ── */}
      <VehicleStats spaceId={spaceId} color={color} />

      {/* ── Finance module — linked transactions (hidden when empty) ── */}
      {hasFinanceModule && spaceTxs.length > 0 && (
        <div className={styles.vehicleModuleCard} style={colorVar}>
          <div className={styles.vehicleModuleHeader}>
            <h3 className={styles.vehicleModuleTitle}>Витрати</h3>
            <span className={styles.vehicleModuleCount}>{spaceTxs.length}</span>
          </div>
          {spaceTxs.length === 0 ? (
            <p className={styles.vehicleModuleEmpty}>
              Прив'яжіть витрати до цього простору при створенні в розділі Фінанси
            </p>
          ) : (
            <div className={styles.vehicleModuleTxList}>
              {spaceTxs.slice(0, 5).map(tx => (
                <div key={tx._id} className={styles.vehicleModuleTxItem}>
                  <div className={styles.vehicleModuleTxLeft}>
                    <span className={styles.vehicleModuleTxDesc}>{tx.desc}</span>
                    {tx.category && <span className={styles.vehicleModuleTxCat}>{tx.category}</span>}
                  </div>
                  <span className={`${styles.vehicleModuleTxAmount} ${tx.type === 'income' ? styles.vehicleModuleTxIncome : styles.vehicleModuleTxExpense}`}>
                    {tx.type === 'expense' ? '−' : '+'}₴{tx.amount.toLocaleString('uk-UA')}
                  </span>
                </div>
              ))}
              {spaceTxs.length > 5 && (
                <p className={styles.vehicleModuleMore}>Ще {spaceTxs.length - 5} транзакцій</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Timeline ── */}
      <div className={styles.vehicleTimelineCard}>
        <div className={styles.vehicleTimelineHeader}>
          <h3 className={styles.vehicleTimelineTitle}>Хроніка</h3>
          {events.length > 0 && (
            <button type="button" className={styles.vehicleTimelineAllLink} style={colorVar} onClick={() => setAllRecordsOpen(true)}>
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
          onAddFuel={() => setSheet('fuel')}
          onAddMaintenance={() => setSheet('maintenance')}
          onEdit={handleEditEvent}
        />
      </div>

      {/* ── Action sheets ── */}
      {sheet === 'fuel'        && <FuelSheet        spaceId={spaceId} color={color} onClose={closeSheet} profile={profile} editEvent={editingEvent ?? undefined} />}
      {sheet === 'maintenance' && <MaintenanceSheet spaceId={spaceId} color={color} onClose={closeSheet} profile={profile} editEvent={editingEvent ?? undefined} />}
      {sheet === 'repair'      && <RepairSheet      spaceId={spaceId} color={color} onClose={closeSheet} profile={profile} editEvent={editingEvent ?? undefined} />}
      {sheet === 'tire'        && <TireSheet        spaceId={spaceId} color={color} onClose={closeSheet} editEvent={editingEvent ?? undefined} />}
      {sheet === 'document'    && <DocumentSheet    spaceId={spaceId} color={color} onClose={closeSheet} editEvent={editingEvent ?? undefined} />}
      {sheet === 'note'        && <NoteSheet        spaceId={spaceId} color={color} onClose={closeSheet} editEvent={editingEvent ?? undefined} />}

      {/* ── All records sheet ── */}
      {allRecordsOpen && (
        <AllRecordsSheet
          events={events}
          color={color}
          onClose={() => setAllRecordsOpen(false)}
          onEdit={handleEditEvent}
        />
      )}
    </div>
  )
}

export default VehicleSpaceView
