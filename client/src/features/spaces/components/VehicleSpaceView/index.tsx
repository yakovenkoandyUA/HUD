import React, { useEffect, useRef, useState } from 'react'
import { useVehicleStore, type VehicleEvent, type VehicleEventInput, type VehicleEventType } from '../../store/vehicleStore'
import { useSpacesStore, type VehicleProfile } from '@/features/memories/store/spacesStore'
import { useUiStore } from '@/shared/store/uiStore'
import { useSwipeToDismiss } from '@/shared/hooks/useSwipeToDismiss'
import { useImageUpload } from '@/shared/hooks/useImageUpload'
import CustomDatePicker from '@/shared/components/ui/CustomDatePicker'
import styles from './VehicleSpaceView.module.css'

// ── Types ──────────────────────────────────────────────────────────────────

interface Props {
  spaceId: string
  color:   string
}

type SheetType = 'fuel' | 'maintenance' | 'document' | 'note' | null

// ── Helpers ────────────────────────────────────────────────────────────────

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

function EventIcon({ type }: { type: VehicleEventType }) {
  switch (type) {
    case 'fuel':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 22V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"/>
          <path d="M3 22h12M15 8h2a2 2 0 0 1 2 2v6a1 1 0 0 0 2 0V9l-2-2"/>
          <line x1="7" y1="4" x2="7" y2="8"/>
        </svg>
      )
    case 'maintenance':
    case 'repair':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
        </svg>
      )
    case 'document':
    case 'insurance':
    case 'inspection':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="9" y1="13" x2="15" y2="13"/>
          <line x1="9" y1="17" x2="12" y2="17"/>
        </svg>
      )
    case 'tire_change':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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

// ── VehicleHeader ──────────────────────────────────────────────────────────

interface HeaderProps {
  profile: VehicleProfile | null
  color:   string
  spaceId: string
}

const VehicleHeader: React.FC<HeaderProps> = ({ profile, color, spaceId }) => {
  const [editOpen, setEditOpen]   = useState(false)
  const [form, setForm]           = useState<Partial<VehicleProfile>>({})
  const [saving, setSaving]       = useState(false)
  const { showToast }             = useUiStore()
  const { updateProfile }         = useVehicleStore()
  const { updateSpace }           = useSpacesStore()
  const overlayRef                = useRef<HTMLDivElement>(null)
  const sheetRef = useSwipeToDismiss(() => setEditOpen(false), { enabled: editOpen, overlayRef })
  const colorVar = { '--space-color': color } as React.CSSProperties

  const openEdit = () => {
    setForm(profile ?? {})
    setEditOpen(true)
  }

  const handleSave = async () => {
    let cancelled = false
    const save = async () => {
      setSaving(true)
      try {
        await updateProfile(spaceId, form)
        // also update Space emoji if make+model changed
        if (form.make || form.model) {
          const name = [form.make, form.model, form.year].filter(Boolean).join(' ')
          if (name) await updateSpace(spaceId, { emoji: '🚗' })
        }
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

  const hasProfile = profile && (profile.make || profile.model)

  return (
    <>
      <div className={styles.vehicleHeader} style={colorVar}>
        {profile?.photoUrl
          ? <img src={profile.photoUrl} className={styles.vehiclePhoto} alt="авто" />
          : <div className={styles.vehiclePhotoPlaceholder}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.4" aria-hidden="true">
                <path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h11l4 4v4a2 2 0 0 1-2 2h-2"/>
                <circle cx="7.5" cy="17.5" r="2.5"/>
                <circle cx="17.5" cy="17.5" r="2.5"/>
              </svg>
            </div>
        }
        <div className={styles.vehicleInfo}>
          {hasProfile ? (
            <>
              <h2 className={styles.vehicleName}>{profile.make} {profile.model}</h2>
              <div className={styles.vehicleMeta}>
                {profile.year && <span>{profile.year}</span>}
                {profile.plateNumber && <span className={styles.vehiclePlate}>{profile.plateNumber}</span>}
                {profile.currentMileage != null && (
                  <span className={styles.vehicleMileage}>{fmtMileage(profile.currentMileage)}</span>
                )}
              </div>
              {profile.fuelType && <span className={styles.vehicleFuelType}>{profile.fuelType}</span>}
            </>
          ) : (
            <span className={styles.vehicleEmpty}>Заповни профіль авто</span>
          )}
        </div>
        <button type="button" className={styles.vehicleEditBtn} onClick={openEdit} aria-label="Редагувати авто">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M11 2.5l2.5 2.5L5 13.5H2.5V11L11 2.5z"/>
          </svg>
        </button>
      </div>

      {editOpen && (
        <div className={styles.overlay} ref={overlayRef} onClick={() => setEditOpen(false)}>
          <div className={styles.sheet} ref={sheetRef} onClick={e => e.stopPropagation()}>
            <div className={styles.sheetHandle} />
            <h3 className={styles.sheetTitle}>Профіль авто</h3>

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
            <input
              className={styles.fieldInput}
              type="number"
              value={form.year ?? ''}
              onChange={e => setForm(p => ({ ...p, year: e.target.value ? Number(e.target.value) : null }))}
              placeholder="2020"
            />

            <label className={styles.fieldLabel}>ДЕРЖ. НОМЕР</label>
            <input
              className={styles.fieldInput}
              value={form.plateNumber ?? ''}
              onChange={e => setForm(p => ({ ...p, plateNumber: e.target.value }))}
              placeholder="АА 1234 ВВ"
            />

            <label className={styles.fieldLabel}>VIN</label>
            <input
              className={styles.fieldInput}
              value={form.vin ?? ''}
              onChange={e => setForm(p => ({ ...p, vin: e.target.value }))}
              placeholder="WBA..."
            />

            <label className={styles.fieldLabel}>ПАЛЬНЕ</label>
            <input
              className={styles.fieldInput}
              value={form.fuelType ?? ''}
              onChange={e => setForm(p => ({ ...p, fuelType: e.target.value }))}
              placeholder="Бензин / Дизель / Гібрид / Електро"
            />

            <button
              type="button"
              className={styles.primaryBtn}
              style={{ '--space-color': color } as React.CSSProperties}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Зберігаємо…' : 'Зберегти'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}

// ── VehicleStats ───────────────────────────────────────────────────────────

interface StatsProps {
  spaceId: string
  color:   string
}

const VehicleStats: React.FC<StatsProps> = ({ spaceId, color }) => {
  const stats = useVehicleStore(s => s.statsBySpace[spaceId])
  const colorVar = { '--space-color': color } as React.CSSProperties

  if (!stats) return null

  const items = [
    { label: 'Цього місяця',     value: stats.totalCostMonth > 0 ? `₴${stats.totalCostMonth.toLocaleString('uk-UA')}` : null },
    { label: 'Цього року',       value: stats.totalCostYear  > 0 ? `₴${stats.totalCostYear.toLocaleString('uk-UA')}`  : null },
    { label: 'Витрата л/100 км', value: stats.avgFuelConsumption != null ? `${stats.avgFuelConsumption} л` : null },
    { label: 'Вартість км',      value: stats.costPerKm != null ? `₴${stats.costPerKm}` : null },
  ].filter(i => i.value != null)

  if (items.length === 0 && stats.expiringDocs.length === 0) return null

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
      {stats.expiringDocs.length > 0 && (
        <div className={styles.expiringDocs}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span>
            Документи спливають: {stats.expiringDocs.map(d => `${d.docType || 'Документ'} — ${fmtDate(d.docExpiresAt)}`).join(', ')}
          </span>
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
              <button
                type="button"
                className={styles.attachRemove}
                onClick={() => remove(i)}
                aria-label="Видалити фото"
              >
                <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                  <path d="M2 2l10 10M12 2L2 12"/>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        className={styles.attachBtn}
        onClick={trigger}
        disabled={uploading}
      >
        {uploading ? (
          <span className={styles.attachSpinner} />
        ) : (
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
}

const FuelSheet: React.FC<SheetProps> = ({ spaceId, color, onClose }) => {
  const [date, setDate]       = useState(todayISO())
  const [mileage, setMileage] = useState('')
  const [liters, setLiters]   = useState('')
  const [cost, setCost]       = useState('')
  const [vendor, setVendor]   = useState('')
  const [fuelType, setFuelType] = useState('')
  const [saving, setSaving]   = useState(false)
  const { createEvent }       = useVehicleStore()
  const { showToast }         = useUiStore()
  const overlayRef            = useRef<HTMLDivElement>(null)
  const sheetRef = useSwipeToDismiss(onClose, { enabled: true, overlayRef })
  const colorVar = { '--space-color': color } as React.CSSProperties

  const handleSave = async () => {
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
        <CustomDatePicker value={date} onChange={setDate} onClose={() => {}} />

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

const MaintenanceSheet: React.FC<SheetProps> = ({ spaceId, color, onClose }) => {
  const [date, setDate]             = useState(todayISO())
  const [mileage, setMileage]       = useState('')
  const [cost, setCost]             = useState('')
  const [vendor, setVendor]         = useState('')
  const [notes, setNotes]           = useState('')
  const [attachments, setAttachments] = useState<string[]>([])
  const [saving, setSaving]         = useState(false)
  const { createEvent }             = useVehicleStore()
  const { showToast }               = useUiStore()
  const overlayRef                  = useRef<HTMLDivElement>(null)
  const sheetRef = useSwipeToDismiss(onClose, { enabled: true, overlayRef })
  const colorVar = { '--space-color': color } as React.CSSProperties

  const handleSave = async () => {
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
        <CustomDatePicker value={date} onChange={setDate} onClose={() => {}} />

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
        <textarea className={styles.textarea} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Заміна масла та фільтрів, регулювання клапанів…" rows={3} />

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
  const [docType, setDocType]         = useState('')
  const [expiresAt, setExpiresAt]     = useState('')
  const [notes, setNotes]             = useState('')
  const [attachments, setAttachments] = useState<string[]>([])
  const [saving, setSaving]           = useState(false)
  const { createEvent }               = useVehicleStore()
  const { showToast }                 = useUiStore()
  const overlayRef                    = useRef<HTMLDivElement>(null)
  const sheetRef = useSwipeToDismiss(onClose, { enabled: true, overlayRef })
  const colorVar = { '--space-color': color } as React.CSSProperties

  const DOC_TYPES = ['Страховка', 'Техогляд', 'Реєстрація', 'Довіреність', 'Договір', 'Інше']

  const handleSave = async () => {
    if (!date) return
    let cancelled = false
    const save = async () => {
      setSaving(true)
      try {
        await createEvent(spaceId, {
          type: 'document', date,
          docType:      docType.trim(),
          docExpiresAt: expiresAt || null,
          notes:        notes.trim(),
          attachments,
        })
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
            <button
              key={t}
              type="button"
              className={`${styles.docTypeChip} ${docType === t ? styles.docTypeChipActive : ''}`}
              style={docType === t ? { '--space-color': color } as React.CSSProperties : undefined}
              onClick={() => setDocType(t)}
            >
              {t}
            </button>
          ))}
        </div>
        {!DOC_TYPES.includes(docType) && (
          <input className={styles.fieldInput} value={docType} onChange={e => setDocType(e.target.value)} placeholder="Або введи свій тип…" />
        )}

        <label className={styles.fieldLabel}>ДАТА ВИДАЧІ / ПОДІЇ</label>
        <CustomDatePicker value={date} onChange={setDate} onClose={() => {}} />

        <label className={styles.fieldLabel}>ДІЙСНИЙ ДО</label>
        <CustomDatePicker value={expiresAt} onChange={setExpiresAt} onClose={() => {}} />

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
  const [date, setDate]     = useState(todayISO())
  const [notes, setNotes]   = useState('')
  const [saving, setSaving] = useState(false)
  const { createEvent }     = useVehicleStore()
  const { showToast }       = useUiStore()
  const overlayRef          = useRef<HTMLDivElement>(null)
  const sheetRef = useSwipeToDismiss(onClose, { enabled: true, overlayRef })
  const colorVar = { '--space-color': color } as React.CSSProperties

  const handleSave = async () => {
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
        <CustomDatePicker value={date} onChange={setDate} onClose={() => {}} />

        <label className={styles.fieldLabel}>НОТАТКА</label>
        <textarea
          className={styles.textarea}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Дивний звук зліва при повороті, перевірити підшипник…"
          rows={4}
          autoFocus
        />

        <button type="button" className={styles.primaryBtn} style={colorVar} onClick={handleSave} disabled={saving || !notes.trim()}>
          {saving ? 'Зберігаємо…' : 'Зберегти'}
        </button>
      </div>
    </div>
  )
}

// ── VehicleTimeline ────────────────────────────────────────────────────────

interface TimelineProps {
  events:  VehicleEvent[]
  color:   string
  loading: boolean
  spaceId: string
}

const VehicleTimeline: React.FC<TimelineProps> = ({ events, color, loading, spaceId }) => {
  const { deleteEvent } = useVehicleStore()
  const { showToast }   = useUiStore()
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
      <div className={styles.timelineEmpty}>
        <p>Подій ще немає</p>
        <p className={styles.timelineEmptySub}>Додай першу заправку або ТО</p>
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
          <button
            type="button"
            className={styles.timelineDeleteBtn}
            onClick={() => handleDelete(e._id)}
            aria-label="Видалити"
          >
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
 * Повний UI для Space з type='vehicle':
 * профіль авто, статистика, 4 quick actions, хронологічна timeline подій.
 */
const VehicleSpaceView: React.FC<Props> = ({ spaceId, color }) => {
  const [sheet, setSheet] = useState<SheetType>(null)
  const { fetchEvents, fetchStats, eventsBySpace, loading } = useVehicleStore()
  const space = useSpacesStore(s => s.spaces.find(sp => sp.id === spaceId) ?? null)
  const events = eventsBySpace[spaceId] ?? []
  const colorVar = { '--space-color': color } as React.CSSProperties

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      await Promise.all([fetchEvents(spaceId), fetchStats(spaceId)])
    }
    if (!cancelled) load()
    return () => { cancelled = true }
  }, [spaceId, fetchEvents, fetchStats])

  const ACTIONS: { key: SheetType & string; label: string }[] = [
    { key: 'fuel',        label: 'Заправка' },
    { key: 'maintenance', label: 'ТО / Ремонт' },
    { key: 'document',    label: 'Документ' },
    { key: 'note',        label: 'Нотатка' },
  ]

  return (
    <div className={styles.root}>
      <VehicleHeader profile={space?.vehicleProfile ?? null} color={color} spaceId={spaceId} />

      <VehicleStats spaceId={spaceId} color={color} />

      {/* Quick actions */}
      <div className={styles.actions} style={colorVar}>
        {ACTIONS.map(a => (
          <button
            key={a.key}
            type="button"
            className={styles.actionBtn}
            style={colorVar}
            onClick={() => setSheet(a.key as SheetType)}
          >
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M7 2v10M2 7h10"/>
            </svg>
            {a.label}
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div className={styles.timelineSection}>
        <h3 className={styles.sectionTitle}>ХРОНІКА</h3>
        <VehicleTimeline events={events} color={color} loading={loading} spaceId={spaceId} />
      </div>

      {/* Sheets */}
      {sheet === 'fuel'        && <FuelSheet        spaceId={spaceId} color={color} onClose={() => setSheet(null)} />}
      {sheet === 'maintenance' && <MaintenanceSheet spaceId={spaceId} color={color} onClose={() => setSheet(null)} />}
      {sheet === 'document'    && <DocumentSheet    spaceId={spaceId} color={color} onClose={() => setSheet(null)} />}
      {sheet === 'note'        && <NoteSheet        spaceId={spaceId} color={color} onClose={() => setSheet(null)} />}
    </div>
  )
}

export default VehicleSpaceView
