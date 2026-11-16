import React, { useEffect, useRef, useState } from 'react'
import { usePetStore, type PetEvent, type PetEventInput, type PetEventType } from '../../store/petStore'
import type { PetProfile, PetFoodItem } from '@/features/memories/store/spacesStore'
import { useUiStore } from '@/shared/store/uiStore'
import { useSwipeToDismiss } from '@/shared/hooks/useSwipeToDismiss'
import CustomDatePicker from '@/shared/components/ui/CustomDatePicker'
import InfoToggle from '@/shared/components/ui/InfoToggle'
import { uploadToCloudinary } from '@/shared/utils/uploadToCloudinary'
import { formatTxDateHeader } from '@/shared/utils/formatDate'
import { SPACE_TYPE_CONFIG } from '../../data/spaceTypes'
import styles from './PetSpaceView.module.css'

// ── Types ──────────────────────────────────────────────────────────────────

interface SpaceTx {
  _id:       string
  type:      'income' | 'expense'
  amount:    number
  desc:      string
  title?:    string
  category?: string
  date:      string
}

interface Props {
  spaceId:         string
  color:           string
  spaceName:       string
  profile:         PetProfile | null
  onFoodLogChange: (foodLog: PetFoodItem[]) => Promise<void>
  coverUrl?:       string
  coverPosition?:  string
  onEditProfile?:  () => void
  onBack?:         () => void
  spaceTxs?:       SpaceTx[]
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

const MONTHS_SHORT = ['січ.','лют.','бер.','квіт.','трав.','черв.','лип.','серп.','вер.','жов.','лист.','груд.']

function fmtDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}.${m}.${y}`
}

function fmtDateShort(iso: string): string {
  const [, m, d] = iso.slice(0, 10).split('-')
  return `${parseInt(d)} ${MONTHS_SHORT[parseInt(m) - 1]}`
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
  const birth  = new Date(birthDate)
  const now    = new Date()
  const months = (now.getFullYear() - birth.getFullYear()) * 12 + now.getMonth() - birth.getMonth()
  if (months < 12) return `${months} міс.`
  return `${Math.floor(months / 12)} р.`
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
          <circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 1.5"/>
        </svg>
      )
    default:
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
          <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
          <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
        </svg>
      )
  }
}

// ── Upcoming helpers ────────────────────────────────────────────────────────

function daysUntil(isoDate: string): number {
  const then = new Date(isoDate)
  const now  = new Date()
  then.setHours(0, 0, 0, 0); now.setHours(0, 0, 0, 0)
  return Math.round((then.getTime() - now.getTime()) / 86_400_000)
}

function pluralDays(n: number): string {
  const abs = Math.abs(n)
  if (abs === 1) return 'день'
  if (abs >= 2 && abs <= 4) return 'дні'
  return 'днів'
}

interface UpcomingItem { type: PetEventType; label: string; date: string; daysLeft: number }

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
    items.push({ type: e.type, label: EVENT_LABELS[e.type], date: e.nextDue, daysLeft: days })
  }
  items.sort((a, b) => a.daysLeft - b.daysLeft)
  return items.filter(i => i.date >= today || i.daysLeft >= -7)
}

// ── Add event sheet ────────────────────────────────────────────────────────

interface AddSheetProps {
  isOpen:     boolean
  type:       SheetType
  onClose:    () => void
  onSave:     (data: PetEventInput) => Promise<void>
  color:      string
  editEvent?: PetEvent
}

const CURRENCY_OPTIONS = ['UAH', 'USD', 'EUR'] as const

const AddEventSheet: React.FC<AddSheetProps> = ({ isOpen, type, onClose, onSave, color, editEvent }) => {
  const [date, setDate]             = useState(todayISO)
  const [title, setTitle]           = useState('')
  const [cost, setCost]             = useState('')
  const [currency, setCurrency]     = useState<'UAH' | 'USD' | 'EUR'>('UAH')
  const [clinic, setClinic]         = useState('')
  const [notes, setNotes]           = useState('')
  const [nextDue, setNextDue]       = useState('')
  const [weight, setWeight]         = useState('')
  const [medName, setMedName]       = useState('')
  const [attachments, setAttachments] = useState<string[]>([])
  const [dateOpen, setDateOpen]     = useState(false)
  const [nextDueOpen, setNextDueOpen] = useState(false)
  const [uploading, setUploading]   = useState(false)
  const [busy, setBusy]             = useState(false)
  const [mounted, setMounted]       = useState(false)
  const [visible, setVisible]       = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { showToast } = useUiStore()

  const sheetRef   = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const bodyRef    = useRef<HTMLDivElement>(null)

  useSwipeToDismiss(onClose, { enabled: isOpen, bodyRef, overlayRef, sheetRef })

  useEffect(() => {
    if (isOpen) {
      setMounted(true)
      if (editEvent) {
        setDate(editEvent.date)
        setTitle(editEvent.title || '')
        setCost(editEvent.cost != null ? String(editEvent.cost) : '')
        setCurrency(editEvent.currency ?? 'UAH')
        setClinic(editEvent.clinic || '')
        setNotes(editEvent.notes || '')
        setNextDue(editEvent.nextDue || '')
        setWeight(editEvent.weight != null ? String(editEvent.weight) : '')
        setMedName(editEvent.medicationName || '')
        setAttachments(editEvent.attachments ?? [])
      } else {
        setDate(todayISO())
        setTitle(''); setCost(''); setClinic(''); setNotes('')
        setNextDue(''); setWeight(''); setMedName(''); setAttachments([])
      }
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    } else {
      setVisible(false)
      const t = setTimeout(() => setMounted(false), 320)
      return () => clearTimeout(t)
    }
  }, [isOpen, editEvent])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadToCloudinary(file, 'pet-attachments')
      setAttachments(prev => [...prev, url])
    } catch {
      showToast('Помилка завантаження', 'error')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSave = async () => {
    if (!type || !date) return
    setBusy(true)
    try {
      const payload: PetEventInput = {
        type: type as PetEventType,
        date,
        title: title || EVENT_LABELS[type as PetEventType],
        cost:           cost    ? parseFloat(cost)   : null,
        currency,
        clinic:         clinic  || undefined,
        notes:          notes   || undefined,
        nextDue:        nextDue || null,
        weight:         weight  ? parseFloat(weight) : null,
        medicationName: medName || undefined,
        attachments,
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
          <span className={styles.sheetTitle}>{editEvent ? `РЕДАГУВАТИ: ${EVENT_LABELS[type as PetEventType]?.toUpperCase()}` : EVENT_LABELS[type as PetEventType]?.toUpperCase()}</span>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Закрити">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div ref={bodyRef} className={styles.sheetBody}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>НАЗВА</label>
            <input className={styles.fieldInput} value={title} onChange={e => setTitle(e.target.value)} placeholder={EVENT_LABELS[type as PetEventType]} />
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
              <input className={styles.fieldInput} type="number" inputMode="decimal" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} placeholder="0.0" />
            </div>
          )}

          {type !== 'note' && type !== 'weight' && (
            <div className={styles.field}>
              <label className={styles.fieldLabel}>ВАРТІСТЬ</label>
              <div className={styles.costRow}>
                <input className={`${styles.fieldInput} ${styles.costInput}`} type="number" inputMode="decimal" value={cost} onChange={e => setCost(e.target.value)} placeholder="0" />
                <div className={styles.currencyPills}>
                  {CURRENCY_OPTIONS.map(c => (
                    <button key={c} type="button" className={`${styles.currencyPill} ${currency === c ? styles.currencyPillOn : ''}`} onClick={() => setCurrency(c)}>{c}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {(type === 'vet_visit' || type === 'vaccination' || type === 'grooming') && (
            <div className={styles.field}>
              <label className={styles.fieldLabel}>КЛІНІКА / ЗАКЛАД</label>
              <input className={styles.fieldInput} value={clinic} onChange={e => setClinic(e.target.value)} placeholder="—" />
            </div>
          )}

          {type === 'medication' && (
            <div className={styles.field}>
              <label className={styles.fieldLabel}>НАЗВА ПРЕПАРАТУ</label>
              <input className={styles.fieldInput} value={medName} onChange={e => setMedName(e.target.value)} placeholder="—" />
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
            <textarea className={`${styles.fieldInput} ${styles.fieldTextarea}`} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Деталі…" rows={3} />
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>ФОТО / ДОКУМЕНТИ</label>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
            {attachments.length > 0 && (
              <div className={styles.attachList}>
                {attachments.map((url, i) => (
                  <div key={url} className={styles.attachThumb}>
                    <img src={url} alt={`фото ${i + 1}`} className={styles.attachImg} />
                    <button type="button" className={styles.attachRemove} onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))} aria-label="Видалити">
                      <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M2 2l10 10M12 2L2 12"/></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button type="button" className={styles.attachBtn} onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading
                ? <span className={styles.attachSpinner} />
                : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              }
              {uploading ? 'Завантаження…' : 'Додати фото'}
            </button>
          </div>
        </div>

        <div className={styles.sheetFooter}>
          <button type="button" className={styles.saveBtn} style={{ background: color }} onClick={handleSave} disabled={busy || !date}>
            {busy ? 'Збереження…' : editEvent ? 'Оновити' : 'Зберегти'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Food log ──────────────────────────────────────────────────────────────

const REACTIONS = ['yes', 'maybe', 'no'] as const
type Reaction = typeof REACTIONS[number]

const REACTION_META: Record<Reaction, { label: string; color: string }> = {
  yes:   { label: 'Їсть',     color: '#2ecc71' },
  maybe: { label: 'Так собі', color: '#f39c12' },
  no:    { label: 'Не їсть',  color: '#e74c3c' },
}

function nextReaction(r: Reaction): Reaction {
  return r === 'yes' ? 'maybe' : r === 'maybe' ? 'no' : 'yes'
}

function genId() { return Math.random().toString(36).slice(2, 10) }

interface PetFoodSuggestion { name: string; brand: string; imageUrl: string }

async function searchPetFood(q: string): Promise<PetFoodSuggestion[]> {
  if (q.length < 2) return []
  try {
    const res = await fetch(
      `https://world.openpetfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=20&fields=product_name,brands,image_small_url`
    )
    if (!res.ok) return []
    const data = await res.json() as { products?: { product_name?: string; brands?: string; image_small_url?: string }[] }
    return (data.products ?? [])
      .filter(p => p.product_name)
      .map(p => ({ name: p.product_name ?? '', brand: p.brands?.split(',')[0].trim() ?? '', imageUrl: p.image_small_url ?? '' }))
  } catch { return [] }
}

interface FoodLogProps {
  foodLog: PetFoodItem[]
  color:   string
  onSave:  (log: PetFoodItem[]) => Promise<void>
}

const FoodLog: React.FC<FoodLogProps> = ({ foodLog, color, onSave }) => {
  const [open, setOpen]         = useState(false)
  const [addName, setAddName]   = useState('')
  const [addBrand, setAddBrand] = useState('')
  const [addImageUrl, setAddImageUrl] = useState('')
  const [addReact, setAddReact] = useState<Reaction>('yes')
  const [saving, setSaving]     = useState(false)
  const [filter, setFilter]     = useState<'all' | Reaction>('all')
  const [suggestions, setSuggestions] = useState<PetFoodSuggestion[]>([])
  const [showSug, setShowSug]   = useState(false)
  const [editingFoodId, setEditingFoodId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editBrand, setEditBrand] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const colorVar = { '--space-color': color } as React.CSSProperties

  const handleNameChange = (val: string) => {
    setAddName(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      const results = await searchPetFood(val)
      setSuggestions(results); setShowSug(results.length > 0)
    }, 400)
  }

  const handlePickSuggestion = (s: PetFoodSuggestion) => {
    setAddName(s.name); setAddBrand(s.brand); setAddImageUrl(s.imageUrl); setShowSug(false)
  }

  const handleAdd = async () => {
    if (!addName.trim()) return
    setSaving(true); setShowSug(false)
    const item: PetFoodItem = { id: genId(), name: addName.trim(), brand: addBrand.trim(), reaction: addReact, notes: '', imageUrl: addImageUrl }
    try { await onSave([...foodLog, item]) } finally { setSaving(false) }
    setAddName(''); setAddBrand(''); setAddReact('yes'); setAddImageUrl('')
  }

  const handleCycleReaction = async (id: string) => {
    const item = foodLog.find(f => f.id === id)
    if (!item) return
    await onSave(foodLog.map(f => f.id === id ? { ...f, reaction: nextReaction(f.reaction) } : f))
  }

  const handleDelete = async (id: string) => { await onSave(foodLog.filter(f => f.id !== id)) }

  const startEditFood = (item: PetFoodItem) => {
    setEditingFoodId(item.id); setEditName(item.name); setEditBrand(item.brand ?? '')
  }

  const handleSaveFood = async (id: string) => {
    if (!editName.trim()) return
    await onSave(foodLog.map(f => f.id === id ? { ...f, name: editName.trim(), brand: editBrand.trim() } : f))
    setEditingFoodId(null)
  }

  const visible = filter === 'all' ? foodLog : foodLog.filter(f => f.reaction === filter)

  return (
    <div className={styles.section} style={colorVar}>
      <div className={styles.foodHeader}>
        <div className={styles.foodTitleRow}>
          <h3 className={styles.sectionTitle}>РАЦІОН</h3>
          <InfoToggle
            ariaLabel="Про пошук корму"
            text="Пошук шукає серед готової бази кормів і знаходить не все. Якщо потрібного корму немає в підказках — просто впиши назву вручну і додай, це теж збережеться."
          />
        </div>
        <div className={styles.foodFilters}>
          {(['all', ...REACTIONS] as const).map(f => (
            <button
              key={f} type="button"
              className={`${styles.foodFilterBtn} ${filter === f ? styles.foodFilterBtnOn : ''}`}
              onClick={() => setFilter(f)}
              style={filter === f && f !== 'all' ? { color: REACTION_META[f].color, borderColor: REACTION_META[f].color } : undefined}
            >
              {f === 'all' ? 'Всі' : REACTION_META[f].label}
            </button>
          ))}
        </div>
      </div>

      {visible.length > 0 && (
        <div className={styles.foodList}>
          {visible.map(item => {
            const meta = REACTION_META[item.reaction]
            return (
              <div key={item.id} className={`${styles.foodRow} ${editingFoodId === item.id ? styles.foodRowEditing : ''}`}>
                {item.imageUrl ? <img src={item.imageUrl} alt="" className={styles.foodImg} /> : <div className={styles.foodImgPlaceholder} />}
                {editingFoodId === item.id ? (
                  <div className={styles.foodEditForm}>
                    <input className={styles.foodEditInput} value={editName} onChange={e => setEditName(e.target.value)} placeholder="Назва" autoFocus onKeyDown={e => { if (e.key === 'Enter') handleSaveFood(item.id); if (e.key === 'Escape') setEditingFoodId(null) }} />
                    <input className={styles.foodEditInput} value={editBrand} onChange={e => setEditBrand(e.target.value)} placeholder="Бренд" onKeyDown={e => { if (e.key === 'Enter') handleSaveFood(item.id); if (e.key === 'Escape') setEditingFoodId(null) }} />
                    <div className={styles.foodEditBtns}>
                      <button type="button" className={styles.foodEditSave} style={colorVar} onClick={() => handleSaveFood(item.id)}>Зберегти</button>
                      <button type="button" className={styles.foodEditCancel} onClick={() => setEditingFoodId(null)}>Скасувати</button>
                    </div>
                  </div>
                ) : (
                  <div className={styles.foodMain}>
                    <span className={styles.foodName}>{item.name}</span>
                    {item.brand && <span className={styles.foodBrand}>{item.brand}</span>}
                  </div>
                )}
                {editingFoodId !== item.id && (
                  <>
                    <button type="button" className={styles.foodReactionPill} style={{ background: meta.color + '1a', borderColor: meta.color, color: meta.color }} onClick={() => handleCycleReaction(item.id)} title="Тап — змінити">
                      {meta.label}
                    </button>
                    <button type="button" className={styles.foodEditBtn} onClick={() => startEditFood(item)} aria-label="Редагувати">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button type="button" className={styles.foodDeleteBtn} onClick={() => handleDelete(item.id)}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                    </button>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}

      {visible.length === 0 && filter !== 'all' && <p className={styles.foodEmpty}>Немає позицій у цій категорії</p>}
      {foodLog.length === 0 && filter === 'all' && <p className={styles.foodEmpty}>Додай перший корм щоб відстежувати раціон</p>}

      <div className={`${styles.foodAddRow} ${open ? styles.foodAddRowOpen : ''}`}>
        {open ? (
          <>
            <div className={styles.foodInputWrap}>
              <input
                className={styles.foodInput}
                placeholder="Назва корму *"
                value={addName}
                onChange={e => handleNameChange(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setShowSug(false) }}
                onBlur={() => setTimeout(() => setShowSug(false), 150)}
                autoFocus
              />
              {showSug && (
                <div className={styles.foodSuggestions}>
                  {suggestions.map((s, i) => (
                    <button key={i} type="button" className={styles.foodSugItem} onMouseDown={() => handlePickSuggestion(s)}>
                      {s.imageUrl ? <img src={s.imageUrl} alt="" className={styles.foodSugImg} /> : <div className={styles.foodSugImgPlaceholder} />}
                      <div className={styles.foodSugText}>
                        <span className={styles.foodSugName}>{s.name}</span>
                        {s.brand && <span className={styles.foodSugBrand}>{s.brand}</span>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <input className={styles.foodInput} placeholder="Бренд (необов'язково)" value={addBrand} onChange={e => setAddBrand(e.target.value)} />
            <div className={styles.foodReactRow}>
              {REACTIONS.map(r => (
                <button key={r} type="button"
                  className={`${styles.foodReactChoice} ${addReact === r ? styles.foodReactChoiceOn : ''}`}
                  style={addReact === r ? { background: REACTION_META[r].color + '20', borderColor: REACTION_META[r].color, color: REACTION_META[r].color } : undefined}
                  onClick={() => setAddReact(r)}
                >{REACTION_META[r].label}</button>
              ))}
            </div>
            <div className={styles.foodAddBtns}>
              <button type="button" className={styles.foodCancelBtn} onClick={() => { setOpen(false); setAddName(''); setAddBrand(''); setShowSug(false) }}>Скасувати</button>
              <button type="button" className={styles.foodSaveBtn} style={{ background: color }} onClick={handleAdd} disabled={!addName.trim() || saving}>{saving ? '…' : 'Додати'}</button>
            </div>
          </>
        ) : (
          <button type="button" className={styles.foodOpenBtn} onClick={() => setOpen(true)}>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M7 2v10M2 7h10"/></svg>
            Додати корм
          </button>
        )}
      </div>
    </div>
  )
}

// ── Event row ──────────────────────────────────────────────────────────────

interface EventRowProps { event: PetEvent; color: string; onDelete: () => void; onEdit: () => void }

const PetEventRow: React.FC<EventRowProps> = ({ event, color, onDelete, onEdit }) => {
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleDelete = () => {
    if (confirmDelete) { onDelete() }
    else { setConfirmDelete(true); setTimeout(() => setConfirmDelete(false), 2500) }
  }

  return (
    <div className={styles.eventRow}>
      <div className={styles.eventIcon} style={{ color }}><EventIcon type={event.type} /></div>
      <div className={styles.eventMain}>
        <div className={styles.eventTitle}>{event.title || EVENT_LABELS[event.type]}</div>
        <div className={styles.eventMeta}>
          <span className={styles.eventType}>{EVENT_LABELS[event.type]}</span>
          {event.clinic && <><span className={styles.eventMetaDot}>·</span><span>{event.clinic}</span></>}
          {event.medicationName && <><span className={styles.eventMetaDot}>·</span><span>{event.medicationName}</span></>}
          {event.nextDue && <><span className={styles.eventMetaDot}>·</span><span>наст. {fmtDate(event.nextDue)}</span></>}
        </div>
        {event.weight != null && <div className={styles.eventNotes}>{event.weight} кг</div>}
        {event.notes && <div className={styles.eventNotes}>{event.notes}</div>}
        {event.attachments?.length > 0 && (
          <div className={styles.eventAttachments}>
            {event.attachments.map((url, i) => (
              <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                <img src={url} alt={`фото ${i + 1}`} className={styles.eventAttachThumb} />
              </a>
            ))}
          </div>
        )}
      </div>
      <div className={styles.eventRight}>
        <div className={styles.eventDate}>{fmtDate(event.date)}</div>
        {event.cost != null && <div className={styles.eventCost}>{fmtCost(event.cost, event.currency)}</div>}
        <div className={styles.eventRowBtns}>
          <button type="button" className={styles.editBtn} onClick={onEdit} aria-label="Редагувати">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button type="button" className={`${styles.deleteBtn} ${confirmDelete ? styles.deleteBtnConfirm : ''}`} onClick={handleDelete} aria-label="Видалити">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
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
 * Типізований вид для просторів типу 'pet'. Compact hero зі status strip,
 * metrics row (вага/щеплення/витрати), profile card, ЗДОРОВ'Я,
 * реорганізовані quick actions, хронологія, раціон, витрати.
 *
 * @prop spaceId         — ID простору
 * @prop color           — колір простору для акцентів
 * @prop spaceName       — назва простору
 * @prop profile         — поточний petProfile
 * @prop coverUrl        — URL обкладинки
 * @prop coverPosition   — позиція обкладинки
 * @prop isOwner         — чи поточний юзер є власником
 * @prop onEditProfile   — відкрити спільний редактор
 * @prop onBack          — навігація назад
 * @prop spaceTxs        — транзакції простору
 */
const PetSpaceView: React.FC<Props> = ({
  spaceId, color, spaceName, profile, onFoodLogChange,
  coverUrl, coverPosition, onEditProfile, onBack, spaceTxs = [],
}) => {
  const showToast = useUiStore(s => s.showToast)
  const { eventsBySpace, loading, fetchEvents, createEvent, updateEvent, deleteEvent } = usePetStore()

  const [addSheet, setAddSheet]           = useState<SheetType>(null)
  const [editingEvent, setEditingEvent]   = useState<PetEvent | null>(null)

  const events = eventsBySpace[spaceId] ?? []

  useEffect(() => {
    let cancelled = false
    const load = async () => { if (!cancelled) await fetchEvents(spaceId) }
    load()
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

  const handleUpdate = async (data: PetEventInput) => {
    if (!editingEvent) return
    try {
      await updateEvent(spaceId, editingEvent._id, data)
      showToast('Оновлено', 'success')
    } catch {
      showToast('Помилка збереження', 'error')
      throw new Error('Failed')
    }
  }

  const openEdit = (event: PetEvent) => {
    setEditingEvent(event)
    setAddSheet(event.type as SheetType)
  }

  const closeSheet = () => {
    setAddSheet(null)
    setEditingEvent(null)
  }

  const handleDelete = async (eventId: string) => {
    try {
      await deleteEvent(spaceId, eventId)
      showToast('Видалено', 'success')
    } catch {
      showToast('Не вдалося видалити запис', 'error')
    }
  }

  // ── Derived ──

  const age          = calcAge(profile?.birthDate ?? null)
  const upcoming     = getUpcoming(events)
  const nextUpcoming = upcoming[0] ?? null

  const monthlyExpenses = (() => {
    const now      = new Date()
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    return spaceTxs
      .filter(t => t.type === 'expense' && t.date.slice(0, 7) === monthStr)
      .reduce((s, t) => s + t.amount, 0)
  })()

  const lastVet = events.filter(event => event.type === 'vet_visit').sort((a, b) => b.date.localeCompare(a.date))[0]
  const nextVaccination = nextUpcoming?.type === 'vaccination'
    ? null
    : events.filter(event => event.type === 'vaccination' && event.nextDue)
      .sort((a, b) => (a.nextDue ?? '').localeCompare(b.nextDue ?? ''))[0]?.nextDue
  const name = profile?.name?.trim() || spaceName
  const description = [profile?.species, profile?.breed, age].filter(Boolean).join(' · ')
  const latestWeight = events.filter(event => event.weight != null)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))[0]
  const weight = latestWeight?.weight ?? profile?.weight
  const month = todayISO().slice(0, 7)
  const careCosts = new Map<string, number>()
  for (const event of events) {
    if (event.cost != null && event.date.slice(0, 7) === month) {
      careCosts.set(event.currency, (careCosts.get(event.currency) ?? 0) + event.cost)
    }
  }

  const colorVar = { '--space-color': color } as React.CSSProperties

  return (
    <div className={styles.root} style={colorVar}>

      {/* ── Compact hero ── */}
      <div className={styles.hero}>
        <img
          src={coverUrl || SPACE_TYPE_CONFIG.pet.iconSrc}
          alt=""
          className={styles.heroCoverImg}
          style={{ objectPosition: coverUrl ? `center ${coverPosition ?? 'center'}` : 'center center' }}
          aria-hidden="true"
        />
        <div className={styles.heroCoverOverlay} />

        <button type="button" className={styles.heroBackBtn} onClick={onBack} aria-label="Назад">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4l-5 5 5 5"/>
          </svg>
        </button>

        <div className={styles.heroContent}>
          {profile?.photoUrl && <img src={profile.photoUrl} alt="" className={styles.heroAvatar} />}
          <div className={styles.heroIdentity}>
            <h1 className={styles.heroName}>{name}</h1>
            <p className={styles.heroDescription}>{description || 'Улюбленець'}</p>
          </div>
        </div>

        {onEditProfile && (
          <button type="button" className={styles.heroEditBtn} onClick={onEditProfile} aria-label="Редагувати улюбленця">
            <svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M11 2.5l2.5 2.5L5 13.5H2.5V11L11 2.5z"/>
            </svg>
          </button>
        )}
      </div>

      {(weight != null || nextUpcoming || monthlyExpenses > 0 || careCosts.size > 0) && (
        <div className={styles.metricsRow}>
          {weight != null && (
            <div className={styles.metricCard}>
              <span className={styles.metricVal}>{weight} кг</span>
              <span className={styles.metricLabel}>Вага</span>
            </div>
          )}
          {nextUpcoming && (
            <div className={styles.metricCard}>
              <span className={styles.metricVal}>{fmtDateShort(nextUpcoming.date)}</span>
              <span className={`${styles.metricLabel} ${nextUpcoming.daysLeft <= 7 ? styles.metricLabelUrgent : ''}`}>
                {nextUpcoming.label}
              </span>
            </div>
          )}
          {monthlyExpenses > 0 && (
            <div className={styles.metricCard}>
              <span className={styles.metricVal}>{fmtCost(Math.round(monthlyExpenses), 'UAH')}</span>
              <span className={styles.metricLabel}>Гаманець за місяць</span>
            </div>
          )}
          {careCosts.size > 0 && (
            <div className={styles.metricCard}>
              <span className={styles.metricVal}>{[...careCosts].map(([currency, amount]) => fmtCost(amount, currency)).join(' · ')}</span>
              <span className={styles.metricLabel}>Вартість догляду за місяць</span>
            </div>
          )}
        </div>
      )}

      {!loading && (lastVet || nextVaccination) && (
        <div className={styles.healthBlock}>
          <span className={styles.sectionTitle}>ЗДОРОВ'Я</span>
          {nextVaccination && (
            <div className={styles.healthRow}>
              <span className={styles.healthRowLabel}>Наступне щеплення</span>
              <span className={styles.healthRowValue}>{fmtDate(nextVaccination)}</span>
            </div>
          )}
          {lastVet && (
            <div className={styles.healthRow}>
              <span className={styles.healthRowLabel}>Останній візит</span>
              <span className={styles.healthRowValue}>{fmtDate(lastVet.date)}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Quick actions ── */}
      <div className={styles.actionsSection}>
        <span className={styles.sectionTitle}>ШВИДКІ ДІЇ</span>

        <div className={styles.actionsSecondary}>
          {([
            { type: 'vet_visit'   as SheetType, label: 'Ветеринар', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> },
            { type: 'vaccination' as SheetType, label: 'Щеплення',  icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 17 3-3-3-3M15 17h6M18 14v6"/><path d="M10.5 20H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H20a2 2 0 0 1 2 2v2"/></svg> },
            { type: 'medication'  as SheetType, label: 'Ліки',      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="16" cy="16" r="6"/><path d="m12.5 19.5 7-7"/><path d="M10.5 20H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H20a2 2 0 0 1 2 2v2"/></svg> },
            { type: 'weight'      as SheetType, label: 'Вага',      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 1.5"/></svg> },
            { type: 'grooming'    as SheetType, label: 'Грумінг',   icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> },
            { type: 'note'        as SheetType, label: 'Нотатка',   icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> },
          ] as const).map(a => (
            <button key={a.type} type="button" className={styles.actionBtnSecondary} onClick={() => setAddSheet(a.type)}>
              <span className={styles.actionBtnSecIcon}>{a.icon}</span>
              {a.label}
              <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className={styles.actionBtnPlus} aria-hidden="true"><path d="M7 2v10M2 7h10"/></svg>
            </button>
          ))}
        </div>
      </div>

      {/* ── Chronology ── */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>ХРОНОЛОГІЯ</h3>
        {loading && events.length === 0 ? (
          <div className={styles.loadingRow}>
            <span className={styles.loadingDot} style={{ background: color }} />
          </div>
        ) : events.length === 0 ? (
          <div className={styles.emptyCompact}>
            <p className={styles.emptyCompactText}>Хронологія порожня — додай першу подію</p>
            <div className={styles.emptyCompactBtns}>
              <button type="button" className={styles.emptyCtaBtn} onClick={() => setAddSheet('vet_visit')}>+ Ветеринар</button>
              <button type="button" className={styles.emptyCtaBtn} onClick={() => setAddSheet('vaccination')}>+ Щеплення</button>
            </div>
          </div>
        ) : (
          <>
            {upcoming.length > 0 && (
              <div className={styles.upcomingBlock}>
                <span className={styles.upcomingTitle}>НАЙБЛИЖЧЕ</span>
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
                          : item.daysLeft === 0 ? 'сьогодні'
                          : `${item.daysLeft} ${pluralDays(item.daysLeft)}`}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
            <div className={styles.eventList}>
              {events.map(event => (
                <PetEventRow key={event._id} event={event} color={color} onDelete={() => handleDelete(event._id)} onEdit={() => openEdit(event)} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Food log ── */}
      <FoodLog foodLog={profile?.foodLog ?? []} color={color} onSave={onFoodLogChange} />

      {/* ── Expenses ── */}
      {spaceTxs.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>ВИТРАТИ</h3>
          <div className={styles.txList}>
            {spaceTxs.map((t, idx) => {
              const curDate  = t.date.slice(0, 10)
              const prevDate = idx > 0 ? spaceTxs[idx - 1].date.slice(0, 10) : null
              const isIncome = t.type === 'income'
              const catColor = isIncome ? 'var(--positive)' : 'var(--negative)'
              const txTitle  = t.title || t.desc || t.category || '—'
              const showSub  = t.category && t.category.toLowerCase() !== txTitle.toLowerCase()
              return (
								<React.Fragment key={t._id}>
									{curDate !== prevDate && <div className={styles.txDateHeader}>{formatTxDateHeader(curDate)}</div>}
									<div className={styles.spaceTx}>
										<div className={styles.txLeft}>
											<div className={styles.txTypeIcon} style={{ '--cat-color': catColor } as React.CSSProperties}>
												<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
													{isIncome ? <path d="M8 13V3M3 8l5-5 5 5" /> : <path d="M8 3v10M3 8l5 5 5-5" />}
												</svg>
											</div>
											<div className={styles.txContent}>
												<span className={styles.txTitle}>{txTitle}</span>
												{showSub && <span className={styles.txSub}>{t.category}</span>}
											</div>
										</div>
										<span className={`${styles.txAmount} ${isIncome ? styles.txAmountPos : styles.txAmountNeg}`}>
											{isIncome ? '+' : '−'}
											{t.amount.toLocaleString('uk-UA', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}₴
										</span>
									</div>
								</React.Fragment>
							)
            })}
          </div>
        </div>
      )}

      <AddEventSheet
        isOpen={addSheet !== null}
        type={addSheet}
        onClose={closeSheet}
        onSave={editingEvent ? handleUpdate : handleCreate}
        color={color}
        editEvent={editingEvent ?? undefined}
      />
    </div>
  )
}

export default PetSpaceView
