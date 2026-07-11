import React, { useEffect, useRef, useState } from 'react'
import { useHomeStore, type HomeEvent, type HomeEventInput, type HomeEventType } from '../../store/homeStore'
import type { HomeProfile } from '@/features/memories/store/spacesStore'
import { useUiStore } from '@/shared/store/uiStore'
import { useSwipeToDismiss } from '@/shared/hooks/useSwipeToDismiss'
import CustomDatePicker from '@/shared/components/ui/CustomDatePicker'
import ImageUploadButton from '@/shared/components/ui/ImageUploadButton'
import styles from './HomeSpaceView.module.css'

// ── Types ──────────────────────────────────────────────────────────────────

interface Props {
  spaceId:     string
  color:       string
  profile:     HomeProfile | null
  onProfileUpdate: (p: HomeProfile) => void
}

type SheetType = 'payment' | 'repair' | 'purchase' | 'document' | 'note' | null

// ── Helpers ────────────────────────────────────────────────────────────────

const EVENT_LABELS: Record<HomeEventType, string> = {
  repair:      'Ремонт',
  payment:     'Оплата',
  purchase:    'Покупка',
  document:    'Документ',
  inspection:  'Огляд',
  note:        'Нотатка',
  photo:       'Фото',
}

const OWNERSHIP_LABELS: Record<string, string> = {
  rent:     'Оренда',
  own:      'Власність',
  mortgage: 'Іпотека',
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

// ── Event icon ─────────────────────────────────────────────────────────────

function EventIcon({ type }: { type: HomeEventType }) {
  switch (type) {
    case 'repair':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
        </svg>
      )
    case 'payment':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
          <line x1="1" y1="10" x2="23" y2="10"/>
        </svg>
      )
    case 'purchase':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
          <line x1="3" y1="6" x2="21" y2="6"/>
          <path d="M16 10a4 4 0 0 1-8 0"/>
        </svg>
      )
    case 'document':
    case 'inspection':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="9" y1="13" x2="15" y2="13"/>
          <line x1="9" y1="17" x2="12" y2="17"/>
        </svg>
      )
    case 'photo':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
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

// ── Empty state ────────────────────────────────────────────────────────────

function EmptyEvents() {
  return (
    <div className={styles.empty}>
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={styles.emptyIcon}>
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
      <p className={styles.emptyText}>Поки немає записів.<br/>Додай оплату, ремонт чи документ.</p>
    </div>
  )
}

// ── Add event sheet ────────────────────────────────────────────────────────

interface AddSheetProps {
  isOpen:   boolean
  type:     SheetType
  onClose:  () => void
  onSave:   (data: HomeEventInput) => Promise<void>
  color:    string
}

const CURRENCY_OPTIONS = ['UAH', 'USD', 'EUR'] as const

const AddEventSheet: React.FC<AddSheetProps> = ({ isOpen, type, onClose, onSave, color }) => {
  const [date, setDate]       = useState(todayISO)
  const [title, setTitle]     = useState('')
  const [cost, setCost]       = useState('')
  const [currency, setCurrency] = useState<'UAH' | 'USD' | 'EUR'>('UAH')
  const [vendor, setVendor]   = useState('')
  const [notes, setNotes]     = useState('')
  const [docType, setDocType]         = useState('')
  const [docExpiry, setDocExpiry]     = useState('')
  const [warranty, setWarranty]       = useState('')
  const [dateOpen, setDateOpen]       = useState(false)
  const [warrantyOpen, setWarrantyOpen]   = useState(false)
  const [docExpiryOpen, setDocExpiryOpen] = useState(false)
  const [busy, setBusy]       = useState(false)
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)

  const sheetRef   = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const bodyRef    = useRef<HTMLDivElement>(null)

  useSwipeToDismiss(onClose, { enabled: isOpen, bodyRef, overlayRef, sheetRef })

  useEffect(() => {
    if (isOpen) {
      setMounted(true)
      setDate(todayISO())
      setTitle(''); setCost(''); setVendor(''); setNotes('')
      setDocType(''); setDocExpiry(''); setWarranty('')
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
      const payload: HomeEventInput = {
        type: type as HomeEventType,
        date,
        title: title || EVENT_LABELS[type as HomeEventType],
        cost:  cost ? parseFloat(cost) : null,
        currency,
        vendor: vendor || undefined,
        notes:  notes  || undefined,
        docType:       type === 'document' ? docType : undefined,
        docExpiresAt:  type === 'document' && docExpiry ? docExpiry : undefined,
        warrantyUntil: type === 'purchase' && warranty ? warranty : undefined,
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
          <span className={styles.sheetTitle}>{EVENT_LABELS[type as HomeEventType]?.toUpperCase()}</span>
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
              placeholder={EVENT_LABELS[type as HomeEventType]}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>ДАТА</label>
            <button type="button" className={styles.dateField} onClick={() => setDateOpen(true)}>
              {date ? fmtDate(date) : 'Вибрати дату'}
            </button>
            {dateOpen && <CustomDatePicker value={date} onChange={v => { setDate(v); setDateOpen(false) }} onClose={() => setDateOpen(false)} />}
          </div>

          {type !== 'note' && (
            <div className={styles.field}>
              <label className={styles.fieldLabel}>СУМА</label>
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

          {(type === 'repair' || type === 'purchase' || type === 'payment') && (
            <div className={styles.field}>
              <label className={styles.fieldLabel}>{type === 'payment' ? 'ПОСТАЧАЛЬНИК' : 'ПІДРЯДНИК / МАГАЗИН'}</label>
              <input
                className={styles.fieldInput}
                value={vendor}
                onChange={e => setVendor(e.target.value)}
                placeholder="—"
              />
            </div>
          )}

          {type === 'purchase' && (
            <div className={styles.field}>
              <label className={styles.fieldLabel}>ГАРАНТІЯ ДО</label>
              <button type="button" className={styles.dateField} onClick={() => setWarrantyOpen(true)}>
                {warranty ? fmtDate(warranty) : 'Не вказано'}
              </button>
              {warrantyOpen && <CustomDatePicker value={warranty} onChange={v => { setWarranty(v); setWarrantyOpen(false) }} onClose={() => setWarrantyOpen(false)} />}
            </div>
          )}

          {type === 'document' && (
            <>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>ТИП ДОКУМЕНТА</label>
                <input
                  className={styles.fieldInput}
                  value={docType}
                  onChange={e => setDocType(e.target.value)}
                  placeholder="Договір оренди, поліс…"
                />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>ДІЙСНИЙ ДО</label>
                <button type="button" className={styles.dateField} onClick={() => setDocExpiryOpen(true)}>
                  {docExpiry ? fmtDate(docExpiry) : 'Не вказано'}
                </button>
                {docExpiryOpen && <CustomDatePicker value={docExpiry} onChange={v => { setDocExpiry(v); setDocExpiryOpen(false) }} onClose={() => setDocExpiryOpen(false)} />}
              </div>
            </>
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
  profile:  HomeProfile | null
  onClose:  () => void
  onSave:   (data: Partial<HomeProfile>) => Promise<void>
  color:    string
}

const ProfileEditSheet: React.FC<ProfileSheetProps> = ({ isOpen, profile, onClose, onSave, color }) => {
  const [address, setAddress]         = useState(profile?.addressLabel ?? '')
  const [ownership, setOwnership]     = useState<'rent' | 'own' | 'mortgage'>(profile?.ownershipType ?? 'rent')
  const [area, setArea]               = useState(profile?.area?.toString() ?? '')
  const [floor, setFloor]             = useState(profile?.floor?.toString() ?? '')
  const [moveInDate, setMoveInDate]     = useState(profile?.moveInDate ?? '')
  const [moveInDateOpen, setMoveInDateOpen] = useState(false)
  const [photoUrl, setPhotoUrl]         = useState(profile?.photoUrl ?? '')
  const [busy, setBusy]                 = useState(false)
  const [mounted, setMounted]         = useState(false)
  const [visible, setVisible]         = useState(false)

  const sheetRef   = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const bodyRef    = useRef<HTMLDivElement>(null)

  useSwipeToDismiss(onClose, { enabled: isOpen, bodyRef, overlayRef, sheetRef })

  useEffect(() => {
    if (isOpen) {
      setAddress(profile?.addressLabel ?? '')
      setOwnership(profile?.ownershipType ?? 'rent')
      setArea(profile?.area?.toString() ?? '')
      setFloor(profile?.floor?.toString() ?? '')
      setMoveInDate(profile?.moveInDate ?? '')
      setPhotoUrl(profile?.photoUrl ?? '')
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
        addressLabel:  address || undefined,
        ownershipType: ownership,
        area:          area  ? parseFloat(area)  : null,
        floor:         floor ? parseInt(floor, 10) : null,
        moveInDate:    moveInDate || null,
        photoUrl:      photoUrl  || '',
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
          <span className={styles.sheetTitle}>ПРОФІЛЬ БУДИНКУ</span>
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
            <label className={styles.fieldLabel}>АДРЕСА / НАЗВА</label>
            <input
              className={styles.fieldInput}
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="Квартира в Києві"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>ТИП</label>
            <div className={styles.pills}>
              {(['rent', 'own', 'mortgage'] as const).map(o => (
                <button
                  key={o} type="button"
                  className={`${styles.pill} ${ownership === o ? styles.pillOn : ''}`}
                  onClick={() => setOwnership(o)}
                >
                  {OWNERSHIP_LABELS[o]}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>ПЛОЩА (м²)</label>
              <input
                className={styles.fieldInput}
                type="number"
                inputMode="decimal"
                value={area}
                onChange={e => setArea(e.target.value)}
                placeholder="—"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>ПОВЕРХ</label>
              <input
                className={styles.fieldInput}
                type="number"
                inputMode="numeric"
                value={floor}
                onChange={e => setFloor(e.target.value)}
                placeholder="—"
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>ДАТА ЗАСЕЛЕННЯ</label>
            <button type="button" className={styles.dateField} onClick={() => setMoveInDateOpen(true)}>
              {moveInDate ? fmtDate(moveInDate) : 'Не вказано'}
            </button>
            {moveInDateOpen && <CustomDatePicker value={moveInDate} onChange={v => { setMoveInDate(v); setMoveInDateOpen(false) }} onClose={() => setMoveInDateOpen(false)} />}
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
 * HomeSpaceView
 * -------------
 * Типізований вид для просторів типу 'home'. Показує профіль будинку
 * (адреса, тип власності, площа, поверх) та хронологію подій
 * (оплати, ремонти, покупки, документи).
 *
 * @prop spaceId         — ID простору
 * @prop color           — колір простору для акцентів
 * @prop profile         — поточний homeProfile (з Space)
 * @prop onProfileUpdate — callback після збереження профілю
 */
const HomeSpaceView: React.FC<Props> = ({ spaceId, color, profile, onProfileUpdate }) => {
  const showToast = useUiStore(s => s.showToast)
  const { eventsBySpace, loading, fetchEvents, createEvent, deleteEvent } = useHomeStore()
  const { updateProfile } = useHomeStore()

  const [addSheet, setAddSheet]     = useState<SheetType>(null)
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

  const handleCreate = async (data: HomeEventInput) => {
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

  const handleProfileSave = async (data: Partial<HomeProfile>) => {
    try {
      const updated = await updateProfile(spaceId, data)
      onProfileUpdate(updated)
      showToast('Збережено', 'success')
    } catch {
      showToast('Помилка збереження', 'error')
      throw new Error('Failed')
    }
  }

  const colorVar = { '--space-color': color } as React.CSSProperties

  return (
    <div className={styles.root} style={colorVar}>

      {/* Profile card */}
      <div className={styles.profileCard}>
        {profile?.photoUrl && (
          <img src={profile.photoUrl} alt="" className={styles.profilePhoto} />
        )}
        <div className={styles.profileInfo}>
          <div className={styles.profileAddress}>
            {profile?.addressLabel || 'Будинок'}
          </div>
          <div className={styles.profileMeta}>
            {profile?.ownershipType && (
              <span className={styles.ownershipBadge}>
                {OWNERSHIP_LABELS[profile.ownershipType]}
              </span>
            )}
            {profile?.area && (
              <span className={styles.metaItem}>{profile.area} м²</span>
            )}
            {profile?.floor != null && (
              <span className={styles.metaItem}>{profile.floor} пов.</span>
            )}
            {profile?.moveInDate && (
              <span className={styles.metaItem}>з {fmtDate(profile.moveInDate)}</span>
            )}
          </div>
        </div>
        <button
          type="button"
          className={styles.profileEditBtn}
          onClick={() => setProfileOpen(true)}
          aria-label="Редагувати профіль"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
      </div>

      {/* Quick actions */}
      <div className={styles.actions}>
        <button type="button" className={styles.actionBtn} onClick={() => setAddSheet('payment')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="1" y="4" width="22" height="16" rx="2"/>
            <line x1="1" y1="10" x2="23" y2="10"/>
          </svg>
          Оплата
        </button>
        <button type="button" className={styles.actionBtn} onClick={() => setAddSheet('repair')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
          </svg>
          Ремонт
        </button>
        <button type="button" className={styles.actionBtn} onClick={() => setAddSheet('purchase')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <path d="M16 10a4 4 0 0 1-8 0"/>
          </svg>
          Покупка
        </button>
        <button type="button" className={styles.actionBtn} onClick={() => setAddSheet('document')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          Документ
        </button>
        <button type="button" className={styles.actionBtn} onClick={() => setAddSheet('note')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="8" y1="6" x2="21" y2="6"/>
            <line x1="8" y1="12" x2="21" y2="12"/>
            <line x1="8" y1="18" x2="21" y2="18"/>
            <line x1="3" y1="6" x2="3.01" y2="6"/>
            <line x1="3" y1="12" x2="3.01" y2="12"/>
            <line x1="3" y1="18" x2="3.01" y2="18"/>
          </svg>
          Нотатка
        </button>
      </div>

      {/* Events list */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>ХРОНОЛОГІЯ</h3>
        {loading && events.length === 0 ? (
          <div className={styles.loadingRow}>
            <span className={styles.loadingDot} style={{ background: color }} />
          </div>
        ) : events.length === 0 ? (
          <EmptyEvents />
        ) : (
          <div className={styles.eventList}>
            {events.map(event => (
              <EventRow
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
  event:    HomeEvent
  color:    string
  onDelete: () => void
}

const EventRow: React.FC<EventRowProps> = ({ event, color, onDelete }) => {
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
          {event.vendor && <span className={styles.eventMetaDot}>·</span>}
          {event.vendor && <span>{event.vendor}</span>}
          {event.docExpiresAt && (
            <>
              <span className={styles.eventMetaDot}>·</span>
              <span>до {fmtDate(event.docExpiresAt)}</span>
            </>
          )}
          {event.warrantyUntil && (
            <>
              <span className={styles.eventMetaDot}>·</span>
              <span>гарантія до {fmtDate(event.warrantyUntil)}</span>
            </>
          )}
        </div>
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

export default HomeSpaceView
