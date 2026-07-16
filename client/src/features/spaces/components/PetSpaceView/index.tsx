import React, { useEffect, useRef, useState } from 'react'
import { usePetStore, type PetEvent, type PetEventInput, type PetEventType } from '../../store/petStore'
import type { PetProfile } from '@/features/memories/store/spacesStore'
import { useUiStore } from '@/shared/store/uiStore'
import { useSwipeToDismiss } from '@/shared/hooks/useSwipeToDismiss'
import CustomDatePicker from '@/shared/components/ui/CustomDatePicker'
import ImageUploadButton from '@/shared/components/ui/ImageUploadButton'
import styles from './PetSpaceView.module.css'

// ── Types ──────────────────────────────────────────────────────────────────

interface Props {
  spaceId:         string
  color:           string
  profile:         PetProfile | null
  onProfileUpdate: (p: PetProfile) => void
}

type SheetType = 'vet_visit' | 'vaccination' | 'medication' | 'grooming' | 'weight' | 'note' | null

// ── Helpers ────────────────────────────────────────────────────────────────

const EVENT_LABELS: Record<PetEventType, string> = {
  vet_visit:   'Ветеринар',
  vaccination: 'Щеплення',
  medication:  'Ліки',
  grooming:    'Грумінг',
  weight:      'Вага',
  note:        'Нотатка',
}

function fmtDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}.${m}.${y}`
}

function fmtCost(n: number | null, currency: string): string {
  if (n == null) return ''
  const sym = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₴'
  return `${sym}${n.toLocaleString('uk-UA', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function calcAge(birthDate: string | null): string {
  if (!birthDate) return ''
  const birth = new Date(birthDate)
  const now = new Date()
  const months = (now.getFullYear() - birth.getFullYear()) * 12 + now.getMonth() - birth.getMonth()
  if (months < 12) return `${months} міс.`
  const years = Math.floor(months / 12)
  return `${years} р.`
}

// ── Event icon ─────────────────────────────────────────────────────────────

function EventIcon({ type }: { type: PetEventType }) {
  switch (type) {
    case 'vet_visit':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      )
    case 'vaccination':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M10.5 20H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H20a2 2 0 0 1 2 2v2"/>
          <path d="m9 17 3-3-3-3M15 17h6M18 14v6"/>
        </svg>
      )
    case 'medication':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M10.5 20H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H20a2 2 0 0 1 2 2v2"/>
          <circle cx="16" cy="16" r="6"/>
          <path d="m12.5 19.5 7-7"/>
        </svg>
      )
    case 'grooming':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      )
    case 'weight':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
          <path d="M12 6v6l4 2"/>
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

// ── Weight trend ──────────────────────────────────────────────────────────

function calcWeightTrend(events: PetEvent[]): { latest: number; delta: number } | null {
  const weights = [...events]
    .filter(e => e.type === 'weight' && e.weight != null)
    .sort((a, b) => a.date.localeCompare(b.date))
  if (weights.length < 2) return null
  const latest = weights[weights.length - 1].weight!
  const prev   = weights[weights.length - 2].weight!
  return { latest, delta: Math.round((latest - prev) * 10) / 10 }
}

// ── Upcoming (nextDue) block ───────────────────────────────────────────────

function daysUntil(isoDate: string): number {
  const then = new Date(isoDate)
  const now  = new Date()
  then.setHours(0, 0, 0, 0)
  now.setHours(0, 0, 0, 0)
  return Math.round((then.getTime() - now.getTime()) / 86_400_000)
}

function pluralDays(n: number): string {
  const abs = Math.abs(n)
  if (abs === 1) return 'день'
  if (abs >= 2 && abs <= 4) return 'дні'
  return 'днів'
}

interface UpcomingItem {
  label:   string
  date:    string
  daysLeft: number
}

function getUpcoming(events: PetEvent[]): UpcomingItem[] {
  const today = new Date().toISOString().slice(0, 10)
  const seen  = new Set<string>()
  const items: UpcomingItem[] = []

  for (const e of events) {
    if (!e.nextDue) continue
    const key = `${e.type}:${e.nextDue}`
    if (seen.has(key)) continue
    seen.add(key)
    const days = daysUntil(e.nextDue)
    if (days > 90) continue
    const typeLabel = EVENT_LABELS[e.type]
    items.push({ label: typeLabel, date: e.nextDue, daysLeft: days })
  }

  items.sort((a, b) => a.daysLeft - b.daysLeft)
  return items.filter(i => i.date >= today || i.daysLeft >= -7)
}

// ── Empty state ────────────────────────────────────────────────────────────

function EmptyEvents({ onVet, onVacc }: { onVet: () => void; onVacc: () => void }) {
  return (
    <div className={styles.empty}>
      <p className={styles.emptyTitle}>Хронологія порожня</p>
      <p className={styles.emptyText}>Додай першу подію, щоб почати хронологію життя улюбленця.</p>
      <div className={styles.emptyCtaRow}>
        <button type="button" className={styles.emptyCtaBtn} onClick={onVet}>+ Ветеринар</button>
        <button type="button" className={styles.emptyCtaBtn} onClick={onVacc}>+ Щеплення</button>
      </div>
    </div>
  )
}

// ── Add event sheet ────────────────────────────────────────────────────────

interface AddSheetProps {
  isOpen:  boolean
  type:    SheetType
  onClose: () => void
  onSave:  (data: PetEventInput) => Promise<void>
  color:   string
}

const CURRENCY_OPTIONS = ['UAH', 'USD', 'EUR'] as const

const AddEventSheet: React.FC<AddSheetProps> = ({ isOpen, type, onClose, onSave, color }) => {
  const [date, setDate]             = useState(todayISO)
  const [title, setTitle]           = useState('')
  const [cost, setCost]             = useState('')
  const [currency, setCurrency]     = useState<'UAH' | 'USD' | 'EUR'>('UAH')
  const [clinic, setClinic]         = useState('')
  const [notes, setNotes]           = useState('')
  const [nextDue, setNextDue]           = useState('')
  const [weight, setWeight]             = useState('')
  const [medName, setMedName]           = useState('')
  const [dateOpen, setDateOpen]         = useState(false)
  const [nextDueOpen, setNextDueOpen]   = useState(false)
  const [busy, setBusy]                 = useState(false)
  const [mounted, setMounted]           = useState(false)
  const [visible, setVisible]           = useState(false)

  const sheetRef   = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const bodyRef    = useRef<HTMLDivElement>(null)

  useSwipeToDismiss(onClose, { enabled: isOpen, bodyRef, overlayRef, sheetRef })

  useEffect(() => {
    if (isOpen) {
      setMounted(true)
      setDate(todayISO())
      setTitle(''); setCost(''); setClinic(''); setNotes('')
      setNextDue(''); setWeight(''); setMedName('')
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    } else {
      setVisible(false)
      const t = setTimeout(() => setMounted(false), 320)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  const handleSave = async () => {
    if (!type || !date) return
    setBusy(true)
    try {
      const payload: PetEventInput = {
        type: type as PetEventType,
        date,
        title: title || EVENT_LABELS[type as PetEventType],
        cost:           cost   ? parseFloat(cost)   : null,
        currency,
        clinic:         clinic  || undefined,
        notes:          notes   || undefined,
        nextDue:        nextDue || null,
        weight:         weight  ? parseFloat(weight) : null,
        medicationName: medName || undefined,
      }
      await onSave(payload)
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
          <span className={styles.sheetTitle}>{EVENT_LABELS[type as PetEventType]?.toUpperCase()}</span>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Закрити">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div ref={bodyRef} className={styles.sheetBody}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>НАЗВА</label>
            <input
              className={styles.fieldInput}
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={EVENT_LABELS[type as PetEventType]}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>ДАТА</label>
            <button type="button" className={styles.dateField} onClick={() => setDateOpen(true)}>
              {date ? fmtDate(date) : 'Вибрати дату'}
            </button>
            {dateOpen && <CustomDatePicker value={date} onChange={v => { setDate(v); setDateOpen(false) }} onClose={() => setDateOpen(false)} />}
          </div>

          {type === 'weight' && (
            <div className={styles.field}>
              <label className={styles.fieldLabel}>ВАГА (кг)</label>
              <input
                className={styles.fieldInput}
                type="number"
                inputMode="decimal"
                step="0.1"
                value={weight}
                onChange={e => setWeight(e.target.value)}
                placeholder="0.0"
              />
            </div>
          )}

          {type !== 'note' && type !== 'weight' && (
            <div className={styles.field}>
              <label className={styles.fieldLabel}>ВАРТІСТЬ</label>
              <div className={styles.costRow}>
                <input
                  className={`${styles.fieldInput} ${styles.costInput}`}
                  type="number"
                  inputMode="decimal"
                  value={cost}
                  onChange={e => setCost(e.target.value)}
                  placeholder="0"
                />
                <div className={styles.currencyPills}>
                  {CURRENCY_OPTIONS.map(c => (
                    <button
                      key={c} type="button"
                      className={`${styles.currencyPill} ${currency === c ? styles.currencyPillOn : ''}`}
                      onClick={() => setCurrency(c)}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {(type === 'vet_visit' || type === 'vaccination' || type === 'grooming') && (
            <div className={styles.field}>
              <label className={styles.fieldLabel}>КЛІНІКА / ЗАКЛАД</label>
              <input
                className={styles.fieldInput}
                value={clinic}
                onChange={e => setClinic(e.target.value)}
                placeholder="—"
              />
            </div>
          )}

          {type === 'medication' && (
            <div className={styles.field}>
              <label className={styles.fieldLabel}>НАЗВА ПРЕПАРАТУ</label>
              <input
                className={styles.fieldInput}
                value={medName}
                onChange={e => setMedName(e.target.value)}
                placeholder="—"
              />
            </div>
          )}

          {(type === 'vaccination' || type === 'medication') && (
            <div className={styles.field}>
              <label className={styles.fieldLabel}>НАСТУПНИЙ ПРИЙОМ</label>
              <button type="button" className={styles.dateField} onClick={() => setNextDueOpen(true)}>
                {nextDue ? fmtDate(nextDue) : 'Не вказано'}
              </button>
              {nextDueOpen && <CustomDatePicker value={nextDue} onChange={v => { setNextDue(v); setNextDueOpen(false) }} onClose={() => setNextDueOpen(false)} />}
            </div>
          )}

          <div className={styles.field}>
            <label className={styles.fieldLabel}>НОТАТКА</label>
            <textarea
              className={`${styles.fieldInput} ${styles.fieldTextarea}`}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Деталі…"
              rows={3}
            />
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
  profile:  PetProfile | null
  onClose:  () => void
  onSave:   (data: Partial<PetProfile>) => Promise<void>
  color:    string
}

const ProfileEditSheet: React.FC<ProfileSheetProps> = ({ isOpen, profile, onClose, onSave, color }) => {
  const [name, setName]         = useState(profile?.name ?? '')
  const [species, setSpecies]   = useState(profile?.species ?? '')
  const [breed, setBreed]       = useState(profile?.breed ?? '')
  const [birthDate, setBirthDate]       = useState(profile?.birthDate ?? '')
  const [birthDateOpen, setBirthDateOpen] = useState(false)
  const [weight, setWeight]             = useState(profile?.weight?.toString() ?? '')
  const [photoUrl, setPhotoUrl] = useState(profile?.photoUrl ?? '')
  const [chipNum, setChipNum]   = useState(profile?.chipNumber ?? '')
  const [passport, setPassport] = useState(profile?.passportNumber ?? '')
  const [busy, setBusy]         = useState(false)
  const [mounted, setMounted]   = useState(false)
  const [visible, setVisible]   = useState(false)

  const sheetRef   = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const bodyRef    = useRef<HTMLDivElement>(null)

  useSwipeToDismiss(onClose, { enabled: isOpen, bodyRef, overlayRef, sheetRef })

  useEffect(() => {
    if (isOpen) {
      setName(profile?.name ?? '')
      setSpecies(profile?.species ?? '')
      setBreed(profile?.breed ?? '')
      setBirthDate(profile?.birthDate ?? '')
      setWeight(profile?.weight?.toString() ?? '')
      setPhotoUrl(profile?.photoUrl ?? '')
      setChipNum(profile?.chipNumber ?? '')
      setPassport(profile?.passportNumber ?? '')
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
        name:           name     || undefined,
        species:        species  || undefined,
        breed:          breed    || undefined,
        birthDate:      birthDate || null,
        weight:         weight ? parseFloat(weight) : null,
        photoUrl:       photoUrl  || '',
        chipNumber:     chipNum   || '',
        passportNumber: passport  || '',
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
          <span className={styles.sheetTitle}>ПРОФІЛЬ УЛЮБЛЕНЦЯ</span>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Закрити">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div ref={bodyRef} className={styles.sheetBody}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>ФОТО</label>
            <div className={styles.photoRow}>
              {photoUrl && <img src={photoUrl} alt="" className={styles.profilePhotoPreview} />}
              <ImageUploadButton
                onUpload={url => setPhotoUrl(url)}
                currentUrl={photoUrl || undefined}
                folder="spaces"
                variant="wide"
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>КЛИЧКА</label>
            <input
              className={styles.fieldInput}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="—"
            />
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>ВИД</label>
              <input
                className={styles.fieldInput}
                value={species}
                onChange={e => setSpecies(e.target.value)}
                placeholder="Кіт, Собака…"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>ПОРОДА</label>
              <input
                className={styles.fieldInput}
                value={breed}
                onChange={e => setBreed(e.target.value)}
                placeholder="—"
              />
            </div>
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>ДАТА НАРОДЖЕННЯ</label>
              <button type="button" className={styles.dateField} onClick={() => setBirthDateOpen(true)}>
                {birthDate ? fmtDate(birthDate) : 'Не вказано'}
              </button>
              {birthDateOpen && <CustomDatePicker value={birthDate} onChange={v => { setBirthDate(v); setBirthDateOpen(false) }} onClose={() => setBirthDateOpen(false)} />}
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>ВАГА (кг)</label>
              <input
                className={styles.fieldInput}
                type="number"
                inputMode="decimal"
                step="0.1"
                value={weight}
                onChange={e => setWeight(e.target.value)}
                placeholder="—"
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>НОМЕР МІКРОЧІПА</label>
            <input
              className={styles.fieldInput}
              value={chipNum}
              onChange={e => setChipNum(e.target.value)}
              placeholder="—"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>НОМЕР ПАСПОРТА</label>
            <input
              className={styles.fieldInput}
              value={passport}
              onChange={e => setPassport(e.target.value)}
              placeholder="—"
            />
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
 * PetSpaceView
 * ------------
 * Типізований вид для просторів типу 'pet'. Показує профіль улюбленця
 * (кличка, вид/порода, вік, вага) та хронологію подій
 * (ветеринар, щеплення, ліки, грумінг, вага).
 *
 * @prop spaceId         — ID простору
 * @prop color           — колір простору для акцентів
 * @prop profile         — поточний petProfile (з Space)
 * @prop onProfileUpdate — callback після збереження профілю
 */
const PetSpaceView: React.FC<Props> = ({ spaceId, color, profile, onProfileUpdate }) => {
  const showToast = useUiStore(s => s.showToast)
  const { eventsBySpace, loading, fetchEvents, createEvent, deleteEvent, updateProfile } = usePetStore()

  const [addSheet, setAddSheet]       = useState<SheetType>(null)
  const [profileOpen, setProfileOpen] = useState(false)

  const events = eventsBySpace[spaceId] ?? []

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      await fetchEvents(spaceId)
    }
    if (!cancelled) load()
    return () => { cancelled = true }
  }, [spaceId, fetchEvents])

  const handleCreate = async (data: PetEventInput) => {
    try {
      await createEvent(spaceId, data)
      showToast('Додано', 'success')
    } catch {
      showToast('Помилка збереження', 'error')
      throw new Error('Failed')
    }
  }

  const handleDelete = async (eventId: string) => {
    deleteEvent(spaceId, eventId)
    showToast('Видалено', 'success')
  }

  const handleProfileSave = async (data: Partial<PetProfile>) => {
    try {
      const updated = await updateProfile(spaceId, data)
      onProfileUpdate(updated)
      showToast('Збережено', 'success')
    } catch {
      showToast('Помилка збереження', 'error')
      throw new Error('Failed')
    }
  }

  const isProfileEmpty = !profile?.name && !profile?.species && !profile?.breed && !profile?.birthDate && profile?.weight == null
  const colorVar = { '--space-color': color } as React.CSSProperties

  return (
    <div className={styles.root} style={colorVar}>

      {/* ── Profile section ── */}
      <div className={styles.profileSection}>
        <div className={styles.profileSectionHeader}>
          <span className={styles.sectionTitle}>ПРОФІЛЬ УЛЮБЛЕНЦЯ</span>
          {!isProfileEmpty && (
            <button type="button" className={styles.profileEditBtn} onClick={() => setProfileOpen(true)} aria-label="Редагувати профіль">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
          )}
        </div>

        {isProfileEmpty ? (
          <div className={styles.profileSetupCard}>
            <div className={styles.profileSetupRows}>
              <div className={styles.profileSetupRow}>
                <span className={styles.profileSetupIcon}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </span>
                <span className={styles.profileSetupContent}>
                  <span className={styles.profileSetupLabel}>Кличка</span>
                  <span className={styles.profileSetupValue}>не вказано</span>
                </span>
              </div>
              <div className={styles.profileSetupRow}>
                <span className={styles.profileSetupIcon}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="14" r="5"/><circle cx="5" cy="8" r="2"/><circle cx="19" cy="8" r="2"/><circle cx="8" cy="5" r="1.5"/><circle cx="16" cy="5" r="1.5"/></svg>
                </span>
                <span className={styles.profileSetupContent}>
                  <span className={styles.profileSetupLabel}>Вид / порода</span>
                  <span className={styles.profileSetupValue}>не вказано</span>
                </span>
              </div>
              <div className={styles.profileSetupRow}>
                <span className={styles.profileSetupIcon}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                </span>
                <span className={styles.profileSetupContent}>
                  <span className={styles.profileSetupLabel}>Дата народження</span>
                  <span className={styles.profileSetupValue}>не вказано</span>
                </span>
              </div>
            </div>
            <button type="button" className={styles.profileSetupBtn} onClick={() => setProfileOpen(true)}>
              Заповнити профіль
            </button>
          </div>
        ) : (
          <div className={styles.profileCard}>
            {profile?.photoUrl && (
              <img src={profile.photoUrl} alt={profile.name || ''} className={styles.profilePhoto} />
            )}
            <div className={styles.profileInfo}>
              <div className={styles.profileName}>{profile?.name || '—'}</div>
              <div className={styles.profileMeta}>
                {profile?.species && <span className={styles.speciesBadge}>{profile.species}</span>}
                {profile?.breed   && <span className={styles.metaItem}>{profile.breed}</span>}
                {profile?.birthDate && <span className={styles.metaItem}>{calcAge(profile.birthDate)}</span>}
                {profile?.weight != null && <span className={styles.metaItem}>{profile.weight} кг</span>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Quick actions ── */}
      <div className={styles.actionsSection}>
        <span className={styles.sectionTitle}>ШВИДКІ ДІЇ</span>
        <div className={styles.actionsGrid}>
          {([
            { type: 'vet_visit'   as SheetType, label: 'Ветеринар', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> },
            { type: 'vaccination' as SheetType, label: 'Щеплення',  icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 17 3-3-3-3M15 17h6M18 14v6"/><path d="M10.5 20H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H20a2 2 0 0 1 2 2v2"/></svg> },
            { type: 'medication'  as SheetType, label: 'Ліки',      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="16" cy="16" r="6"/><path d="m12.5 19.5 7-7"/><path d="M10.5 20H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H20a2 2 0 0 1 2 2v2"/></svg> },
            { type: 'grooming'    as SheetType, label: 'Грумінг',   icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> },
            { type: 'weight'      as SheetType, label: 'Вага',      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 1.5"/></svg> },
            { type: 'note'        as SheetType, label: 'Нотатка',   icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> },
          ] as const).map(a => (
            <button key={a.type} type="button" className={styles.actionBtn} onClick={() => setAddSheet(a.type)}>
              <span className={styles.actionBtnIcon}>{a.icon}</span>
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Weight trend ── */}
      {(() => {
        const trend = calcWeightTrend(events)
        if (!trend) return null
        const up = trend.delta > 0
        const eq = trend.delta === 0
        return (
          <div className={styles.weightTrendRow} style={colorVar}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 1.5"/></svg>
            <span className={styles.weightTrendVal}>{trend.latest} кг</span>
            {!eq && (
              <span className={`${styles.weightTrendDelta} ${up ? styles.weightTrendUp : styles.weightTrendDown}`}>
                {up ? '▲' : '▼'} {Math.abs(trend.delta)} кг
              </span>
            )}
          </div>
        )
      })()}

      {/* ── Upcoming (nextDue) ── */}
      {(() => {
        const upcoming = getUpcoming(events)
        if (upcoming.length === 0) return null
        return (
          <div className={styles.upcomingBlock} style={colorVar}>
            <span className={styles.sectionTitle}>НАЙБЛИЖЧЕ</span>
            <div className={styles.upcomingList}>
              {upcoming.map((item, i) => {
                const overdue = item.daysLeft < 0
                const soon    = item.daysLeft >= 0 && item.daysLeft <= 3
                return (
                  <div key={i} className={styles.upcomingItem}>
                    <span className={`${styles.upcomingDot} ${overdue ? styles.upcomingDotDanger : soon ? styles.upcomingDotWarn : ''}`} />
                    <span className={styles.upcomingLabel}>{item.label}</span>
                    <span className={styles.upcomingDate}>{fmtDate(item.date)}</span>
                    <span className={`${styles.upcomingDays} ${overdue ? styles.upcomingDaysDanger : soon ? styles.upcomingDaysWarn : ''}`}>
                      {overdue
                        ? `${Math.abs(item.daysLeft)} ${pluralDays(item.daysLeft)} тому`
                        : item.daysLeft === 0
                          ? 'сьогодні'
                          : `${item.daysLeft} ${pluralDays(item.daysLeft)}`}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* ── Events list ── */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>ХРОНОЛОГІЯ</h3>
        {loading && events.length === 0 ? (
          <div className={styles.loadingRow}>
            <span className={styles.loadingDot} style={{ background: color }} />
          </div>
        ) : events.length === 0 ? (
          <EmptyEvents onVet={() => setAddSheet('vet_visit')} onVacc={() => setAddSheet('vaccination')} />
        ) : (
          <div className={styles.eventList}>
            {events.map(event => (
              <PetEventRow
                key={event._id}
                event={event}
                color={color}
                onDelete={() => handleDelete(event._id)}
              />
            ))}
          </div>
        )}
      </div>

      <AddEventSheet
        isOpen={addSheet !== null}
        type={addSheet}
        onClose={() => setAddSheet(null)}
        onSave={handleCreate}
        color={color}
      />

      <ProfileEditSheet
        isOpen={profileOpen}
        profile={profile}
        onClose={() => setProfileOpen(false)}
        onSave={handleProfileSave}
        color={color}
      />
    </div>
  )
}

// ── Event row ──────────────────────────────────────────────────────────────

interface EventRowProps {
  event:    PetEvent
  color:    string
  onDelete: () => void
}

const PetEventRow: React.FC<EventRowProps> = ({ event, color, onDelete }) => {
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleDelete = () => {
    if (confirmDelete) {
      onDelete()
    } else {
      setConfirmDelete(true)
      setTimeout(() => setConfirmDelete(false), 2500)
    }
  }

  return (
    <div className={styles.eventRow}>
      <div className={styles.eventIcon} style={{ color }}>
        <EventIcon type={event.type} />
      </div>
      <div className={styles.eventMain}>
        <div className={styles.eventTitle}>{event.title || EVENT_LABELS[event.type]}</div>
        <div className={styles.eventMeta}>
          <span className={styles.eventType}>{EVENT_LABELS[event.type]}</span>
          {event.clinic && <span className={styles.eventMetaDot}>·</span>}
          {event.clinic && <span>{event.clinic}</span>}
          {event.medicationName && <span className={styles.eventMetaDot}>·</span>}
          {event.medicationName && <span>{event.medicationName}</span>}
          {event.nextDue && (
            <>
              <span className={styles.eventMetaDot}>·</span>
              <span>наст. {fmtDate(event.nextDue)}</span>
            </>
          )}
        </div>
        {event.weight != null && (
          <div className={styles.eventNotes}>{event.weight} кг</div>
        )}
        {event.notes && <div className={styles.eventNotes}>{event.notes}</div>}
      </div>
      <div className={styles.eventRight}>
        <div className={styles.eventDate}>{fmtDate(event.date)}</div>
        {event.cost != null && (
          <div className={styles.eventCost}>{fmtCost(event.cost, event.currency)}</div>
        )}
      </div>
      <button
        type="button"
        className={`${styles.deleteBtn} ${confirmDelete ? styles.deleteBtnConfirm : ''}`}
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

export default PetSpaceView
