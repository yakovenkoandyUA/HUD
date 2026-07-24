import React, { useEffect, useRef, useState } from 'react'
import { useSportStore, type SportEvent, type SportEventInput } from '../../store/sportStore'
import type { SportProfile, SportPR } from '@/features/memories/store/spacesStore'
import { useUiStore } from '@/shared/store/uiStore'
import { useSwipeToDismiss } from '@/shared/hooks/useSwipeToDismiss'
import CustomDatePicker from '@/shared/components/ui/CustomDatePicker'
import { SPACE_TYPE_CONFIG } from '../../data/spaceTypes'
import AddWorkoutSheet from '../AddWorkoutSheet'
import styles from './SportSpaceView.module.css'

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

/** Props for SportSpaceView */
interface Props {
  spaceId:         string
  color:           string
  spaceName:       string
  profile:         SportProfile | null
  onProfileUpdate: (p: SportProfile) => void
  coverUrl?:       string
  coverPosition?:  string
  isOwner?:        boolean
  onEditSpace?:    () => void
  onBack?:         () => void
  spaceTxs?:       SpaceTx[]
}

// ── Constants ──────────────────────────────────────────────────────────────

const SPORT_LABELS: Record<string, string> = {
  running:  'Біг',
  cycling:  'Велосипед',
  swimming: 'Плавання',
  gym:      'Зал',
  football: 'Футбол',
  tennis:   'Теніс',
  crossfit: 'CrossFit',
  yoga:     'Йога',
  other:    'Інший',
}

const LEVEL_LABELS: Record<string, string> = {
  beginner:     'Початківець',
  intermediate: 'Середній',
  advanced:     'Просунутий',
}

const SPORT_OPTIONS = Object.entries(SPORT_LABELS).map(([value, label]) => ({ value, label }))

const MONTHS_SHORT = ['січ.','лют.','бер.','квіт.','трав.','черв.','лип.','серп.','вер.','жов.','лист.','груд.']

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}.${m}.${y}`
}

function fmtDateShort(iso: string): string {
  const [, m, d] = iso.slice(0, 10).split('-')
  return `${parseInt(d)} ${MONTHS_SHORT[parseInt(m) - 1]}`
}

function fmtDuration(min: number | null): string {
  if (!min) return ''
  if (min < 60) return `${min} хв`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} г ${m} хв` : `${h} г`
}

function calcStreak(events: SportEvent[]): number {
  if (!events.length) return 0
  const dates = [...new Set(events.map(e => e.date.slice(0, 10)))].sort().reverse()
  let streak = 0
  let cur = new Date()
  cur.setHours(0, 0, 0, 0)
  for (const d of dates) {
    const dt = new Date(d + 'T00:00:00')
    const diff = Math.round((cur.getTime() - dt.getTime()) / 86_400_000)
    if (diff > 1) break
    streak++
    cur = dt
  }
  return streak
}

function genId(): string {
  return Math.random().toString(36).slice(2, 10)
}

// ── Profile edit sheet ─────────────────────────────────────────────────────

interface ProfileSheetProps {
  isOpen:    boolean
  profile:   SportProfile | null
  color:     string
  onClose:   () => void
  onSave:    (data: Partial<SportProfile>) => Promise<void>
}

const ProfileEditSheet: React.FC<ProfileSheetProps> = ({ isOpen, profile, color, onClose, onSave }) => {
  const [sport, setSport]   = useState(profile?.sport ?? '')
  const [level, setLevel]   = useState<SportProfile['level']>(profile?.level ?? null)
  const [goal, setGoal]     = useState(profile?.goal ?? '')
  const [busy, setBusy]     = useState(false)
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)

  const sheetRef   = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const bodyRef    = useRef<HTMLDivElement>(null)

  useSwipeToDismiss(onClose, { enabled: isOpen, bodyRef, overlayRef, sheetRef })

  useEffect(() => {
    if (isOpen) {
      setSport(profile?.sport ?? '')
      setLevel(profile?.level ?? null)
      setGoal(profile?.goal ?? '')
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
      await onSave({ sport, level, goal })
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
          <span className={styles.sheetTitle}>ПРОФІЛЬ</span>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Закрити">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div ref={bodyRef} className={styles.sheetBody}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>ВИД СПОРТУ</label>
            <div className={styles.sportGrid}>
              {SPORT_OPTIONS.map(o => (
                <button
                  key={o.value}
                  type="button"
                  className={`${styles.sportChip} ${sport === o.value ? styles.sportChipOn : ''}`}
                  style={sport === o.value ? colorVar : undefined}
                  onClick={() => setSport(o.value)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>РІВЕНЬ</label>
            <div className={styles.levelRow}>
              {(['beginner', 'intermediate', 'advanced'] as const).map(l => (
                <button
                  key={l}
                  type="button"
                  className={`${styles.levelChip} ${level === l ? styles.levelChipOn : ''}`}
                  style={level === l ? colorVar : undefined}
                  onClick={() => setLevel(l)}
                >
                  {LEVEL_LABELS[l]}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>ЦІЛЬ</label>
            <input
              className={styles.fieldInput}
              value={goal}
              onChange={e => setGoal(e.target.value)}
              placeholder="Пробігти марафон, жим 120 кг…"
            />
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

// ── PR Tracker ─────────────────────────────────────────────────────────────

interface PRTrackerProps {
  prs:     SportPR[]
  color:   string
  onSave:  (prs: SportPR[]) => Promise<void>
}

const PRTracker: React.FC<PRTrackerProps> = ({ prs, color, onSave }) => {
  const [open, setOpen]       = useState(false)
  const [name, setName]       = useState('')
  const [value, setValue]     = useState('')
  const [unit, setUnit]       = useState('')
  const [dateOpen, setDateOpen] = useState(false)
  const [date, setDate]       = useState('')
  const [saving, setSaving]   = useState(false)

  const handleAdd = async () => {
    if (!name.trim() || !value.trim()) return
    setSaving(true)
    const newPR: SportPR = { id: genId(), name: name.trim(), value: value.trim(), unit: unit.trim(), date: date || null }
    try { await onSave([...prs, newPR]) } finally { setSaving(false) }
    setName(''); setValue(''); setUnit(''); setDate(''); setOpen(false)
  }

  const handleDelete = async (id: string) => {
    await onSave(prs.filter(p => p.id !== id))
  }

  const colorVar = { '--space-color': color } as React.CSSProperties

  return (
    <div className={styles.section} style={colorVar}>
      <div className={styles.prHeader}>
        <h3 className={styles.sectionTitle}>РЕКОРДИ (PR)</h3>
      </div>

      {prs.length > 0 && (
        <div className={styles.prList}>
          {prs.map(pr => (
            <div key={pr.id} className={styles.prRow}>
              <div className={styles.prMain}>
                <span className={styles.prName}>{pr.name}</span>
                {pr.date && <span className={styles.prDate}>{fmtDateShort(pr.date)}</span>}
              </div>
              <div className={styles.prRight}>
                <span className={styles.prValue}>{pr.value}</span>
                {pr.unit && <span className={styles.prUnit}>{pr.unit}</span>}
                <button type="button" className={styles.prDelete} onClick={() => handleDelete(pr.id)} aria-label="Видалити">
                  <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M2 2l10 10M12 2L2 12"/>
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {prs.length === 0 && !open && (
        <p className={styles.prEmpty}>Зафіксуй перший рекорд — жим, дистанція, час…</p>
      )}

      {open ? (
        <div className={styles.prAddForm}>
          <div className={styles.prAddRow}>
            <input className={styles.fieldInput} value={name} onChange={e => setName(e.target.value)} placeholder="Назва (Жим лежачи, 5 km…)" />
          </div>
          <div className={styles.prAddRow}>
            <input className={`${styles.fieldInput} ${styles.prAddValue}`} value={value} onChange={e => setValue(e.target.value)} placeholder="100" />
            <input className={`${styles.fieldInput} ${styles.prAddUnit}`}  value={unit}  onChange={e => setUnit(e.target.value)}  placeholder="кг" />
            <button type="button" className={`${styles.fieldInput} ${styles.prDateBtn}`} onClick={() => setDateOpen(true)}>
              {date ? fmtDate(date) : 'Дата'}
            </button>
          </div>
          {dateOpen && <CustomDatePicker value={date} onChange={v => { setDate(v); setDateOpen(false) }} onClose={() => setDateOpen(false)} />}
          <div className={styles.prAddBtns}>
            <button type="button" className={styles.prCancelBtn} onClick={() => { setOpen(false); setName(''); setValue(''); setUnit(''); setDate('') }}>Скасувати</button>
            <button type="button" className={styles.prSaveBtn} style={{ background: color }} onClick={handleAdd} disabled={!name.trim() || !value.trim() || saving}>
              {saving ? '…' : 'Зберегти'}
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className={styles.prOpenBtn} onClick={() => setOpen(true)}>
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M7 2v10M2 7h10"/></svg>
          Додати рекорд
        </button>
      )}
    </div>
  )
}

// ── Workout row ────────────────────────────────────────────────────────────

interface WorkoutRowProps {
  event:    SportEvent
  onEdit:   () => void
  onDelete: () => void
}

const WorkoutRow: React.FC<WorkoutRowProps> = ({ event, onEdit, onDelete }) => {
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleDelete = () => {
    if (confirmDelete) { onDelete() }
    else { setConfirmDelete(true); setTimeout(() => setConfirmDelete(false), 2500) }
  }

  return (
    <div className={styles.workoutRow}>
      <div className={styles.workoutDateCol}>
        <span className={styles.workoutDateDay}>{event.date.slice(8, 10)}</span>
        <span className={styles.workoutDateMon}>{MONTHS_SHORT[parseInt(event.date.slice(5, 7)) - 1]}</span>
      </div>
      <div className={styles.workoutMain}>
        <div className={styles.workoutTitle}>{event.title || 'Тренування'}</div>
        {event.duration && <div className={styles.workoutDuration}>{fmtDuration(event.duration)}</div>}
        {event.metrics.length > 0 && (
          <div className={styles.workoutMetrics}>
            {event.metrics.filter(m => m.name && m.value).map((m, i) => (
              <span key={i} className={styles.workoutMetric}>
                {m.name}: <strong>{m.value}</strong>{m.unit && ` ${m.unit}`}
              </span>
            ))}
          </div>
        )}
        {event.notes && <div className={styles.workoutNotes}>{event.notes}</div>}
      </div>
      <div className={styles.workoutActions}>
        <button type="button" className={styles.workoutEditBtn} onClick={onEdit} aria-label="Редагувати">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button
          type="button"
          className={`${styles.workoutDeleteBtn} ${confirmDelete ? styles.workoutDeleteBtnConfirm : ''}`}
          onClick={handleDelete}
          aria-label="Видалити"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

/**
 * SportSpaceView
 * --------------
 * Typed view для просторів типу 'sports'. Hero + stats row,
 * профіль (вид спорту/рівень/ціль), PR трекер, workout log, витрати.
 *
 * @prop spaceId         — ID простору
 * @prop color           — акцентний колір
 * @prop spaceName       — назва простору
 * @prop profile         — sportProfile
 * @prop onProfileUpdate — callback після збереження профілю
 * @prop coverUrl        — URL обкладинки
 * @prop isOwner         — чи поточний юзер власник
 * @prop onEditSpace     — відкрити шторку редагування простору
 * @prop onBack          — навігація назад
 * @prop spaceTxs        — транзакції простору
 */
const SportSpaceView: React.FC<Props> = ({
  spaceId, color, spaceName, profile, onProfileUpdate,
  coverUrl, coverPosition, isOwner, onEditSpace, onBack, spaceTxs = [],
}) => {
  const { showToast } = useUiStore()
  const { eventsBySpace, loading, fetchEvents, createEvent, updateEvent, deleteEvent, updateProfile } = useSportStore()

  const [addOpen, setAddOpen]         = useState(false)
  const [editingEvent, setEditingEvent] = useState<SportEvent | null>(null)
  const [profileOpen, setProfileOpen] = useState(false)

  const events = eventsBySpace[spaceId] ?? []

  useEffect(() => {
    let cancelled = false
    const load = async () => { if (!cancelled) await fetchEvents(spaceId) }
    load()
    return () => { cancelled = true }
  }, [spaceId, fetchEvents])

  const handleCreate = async (data: SportEventInput) => {
    try {
      await createEvent(spaceId, data)
      showToast('Тренування збережено', 'success')
    } catch {
      showToast('Помилка збереження', 'error')
      throw new Error('Failed')
    }
  }

  const handleUpdate = async (data: SportEventInput) => {
    if (!editingEvent) return
    try {
      await updateEvent(spaceId, editingEvent._id, data)
      showToast('Оновлено', 'success')
    } catch {
      showToast('Помилка збереження', 'error')
      throw new Error('Failed')
    }
  }

  const openEdit = (event: SportEvent) => {
    setEditingEvent(event)
    setAddOpen(true)
  }

  const closeSheet = () => {
    setAddOpen(false)
    setEditingEvent(null)
  }

  const handleDelete = (eventId: string) => {
    deleteEvent(spaceId, eventId)
    showToast('Видалено', 'success')
  }

  const handleProfileSave = async (data: Partial<SportProfile>) => {
    try {
      const updated = await updateProfile(spaceId, data)
      onProfileUpdate(updated)
      showToast('Збережено', 'success')
    } catch {
      showToast('Помилка збереження', 'error')
      throw new Error('Failed')
    }
  }

  const handlePRSave = async (prs: SportPR[]) => {
    try {
      const updated = await updateProfile(spaceId, { prs })
      onProfileUpdate(updated)
    } catch {
      showToast('Помилка збереження', 'error')
    }
  }

  // ── Derived stats ──

  const now     = new Date()
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const thisMonthEvents  = events.filter(e => e.date.slice(0, 7) === monthStr)
  const streak           = calcStreak(events)
  const totalMinutes     = events.reduce((s, e) => s + (e.duration ?? 0), 0)
  const monthlyExpenses  = spaceTxs
    .filter(t => t.type === 'expense' && t.date.slice(0, 7) === monthStr)
    .reduce((s, t) => s + t.amount, 0)

  const isProfileEmpty = !profile?.sport && !profile?.goal

  const colorVar = { '--space-color': color } as React.CSSProperties

  return (
    <div className={styles.root} style={colorVar}>

      {/* ── Hero ── */}
      <div className={`${styles.hero} ${styles.heroCovered}`}>
        <img
          src={coverUrl || SPACE_TYPE_CONFIG.sports.iconSrc}
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
          <h1 className={`${styles.heroName} ${coverUrl ? styles.heroNameCovered : ''}`}>{spaceName}</h1>
          <div className={styles.heroMeta}>
            {profile?.sport && <span className={styles.heroSportBadge}>{SPORT_LABELS[profile.sport] ?? profile.sport}</span>}
            {profile?.level && <span className={styles.heroLevelBadge}>{LEVEL_LABELS[profile.level]}</span>}
          </div>
          {profile?.goal && <span className={styles.heroGoal}>{profile.goal}</span>}
        </div>

        {isOwner && (
          <button type="button" className={styles.heroEditBtn} onClick={onEditSpace} aria-label="Редагувати простір">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 2.5l2.5 2.5L5 13.5H2.5V11L11 2.5z"/>
            </svg>
          </button>
        )}
      </div>

      {/* ── Stats row ── */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <span className={styles.statVal}>{thisMonthEvents.length}</span>
          <span className={styles.statLabel}>трен./міс</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statVal}>{streak > 0 ? streak : '—'}</span>
          <span className={styles.statLabel}>{streak === 1 ? 'день поспіль' : 'дні поспіль'}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statVal}>{totalMinutes > 0 ? fmtDuration(totalMinutes) : '—'}</span>
          <span className={styles.statLabel}>загалом</span>
        </div>
      </div>

      {/* ── Profile card ── */}
      <div className={styles.profileSection}>
        <div className={styles.profileSectionHeader}>
          <span className={styles.sectionTitle}>ПРОФІЛЬ</span>
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
            <p className={styles.profileSetupText}>Вкажи вид спорту та ціль — і простір стане персональним тренувальним щоденником</p>
            <button type="button" className={styles.profileSetupBtn} onClick={() => setProfileOpen(true)}>Налаштувати профіль</button>
          </div>
        ) : (
          <div className={styles.profileCard} onClick={() => setProfileOpen(true)}>
            <div className={styles.profileInfo}>
              {profile?.sport && <span className={styles.sportBadge}>{SPORT_LABELS[profile.sport] ?? profile.sport}</span>}
              {profile?.level && <span className={styles.levelText}>{LEVEL_LABELS[profile.level]}</span>}
              {profile?.goal  && <span className={styles.goalText}>{profile.goal}</span>}
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={styles.profileChevron} aria-hidden="true">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </div>
        )}
      </div>

      {/* ── PR Tracker ── */}
      <PRTracker prs={profile?.prs ?? []} color={color} onSave={handlePRSave} />

      {/* ── Quick actions ── */}
      <div className={styles.actionsSection}>
        <button type="button" className={styles.addWorkoutBtn} style={colorVar} onClick={() => { setEditingEvent(null); setAddOpen(true) }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
          Додати тренування
          <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className={styles.plusIcon} aria-hidden="true"><path d="M7 2v10M2 7h10"/></svg>
        </button>
      </div>

      {/* ── Workout log ── */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>ТРЕНУВАННЯ</h3>

        {loading && events.length === 0 ? (
          <div className={styles.loadingRow}>
            <span className={styles.loadingDot} style={{ background: color }} />
          </div>
        ) : events.length === 0 ? (
          <div className={styles.empty}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.3" aria-hidden="true">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
            <p className={styles.emptyTitle}>Тренувань ще немає</p>
            <p className={styles.emptyDesc}>Додай перше тренування — пробіжка, зал, басейн або що завгодно.</p>
            <button type="button" className={styles.emptyAction} style={colorVar} onClick={() => setAddOpen(true)}>+ Тренування</button>
          </div>
        ) : (
          <div className={styles.workoutList}>
            {events.map(event => (
              <WorkoutRow
                key={event._id}
                event={event}
                onEdit={() => openEdit(event)}
                onDelete={() => handleDelete(event._id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Expenses ── */}
      {spaceTxs.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>ВИТРАТИ</h3>
          {monthlyExpenses > 0 && (
            <div className={styles.expenseMonthRow}>
              <span className={styles.expenseMonthLabel}>цього місяця</span>
              <span className={styles.expenseMonthVal}>₴{monthlyExpenses.toLocaleString('uk-UA', { minimumFractionDigits: 0 })}</span>
            </div>
          )}
          <div className={styles.txList}>
            {spaceTxs.map((t, idx) => {
              const curDate  = t.date.slice(0, 10)
              const prevDate = idx > 0 ? spaceTxs[idx - 1].date.slice(0, 10) : null
              const isIncome = t.type === 'income'
              const catColor = isIncome ? 'var(--positive)' : 'var(--negative)'
              return (
                <React.Fragment key={t._id}>
                  {curDate !== prevDate && <div className={styles.txDateHeader}>{fmtDate(curDate)}</div>}
                  <div className={styles.spaceTx}>
                    <div className={styles.txLeft}>
                      <div className={styles.txTypeIcon} style={{ '--cat-color': catColor } as React.CSSProperties}>
                        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          {isIncome ? <path d="M8 13V3M3 8l5-5 5 5"/> : <path d="M8 3v10M3 8l5 5 5-5"/>}
                        </svg>
                      </div>
                      <div className={styles.txContent}>
                        <span className={styles.txTitle}>{t.title || t.desc || t.category || '—'}</span>
                        {t.category && <span className={styles.txSub}>{t.category}</span>}
                      </div>
                    </div>
                    <span className={`${styles.txAmount} ${isIncome ? styles.txAmountPos : styles.txAmountNeg}`}>
                      {isIncome ? '+' : '−'}₴{t.amount.toLocaleString('uk-UA', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </React.Fragment>
              )
            })}
          </div>
        </div>
      )}

      <AddWorkoutSheet
        isOpen={addOpen}
        color={color}
        onClose={closeSheet}
        onSave={editingEvent ? handleUpdate : handleCreate}
        editEvent={editingEvent ?? undefined}
      />

      <ProfileEditSheet
        isOpen={profileOpen}
        profile={profile}
        color={color}
        onClose={() => setProfileOpen(false)}
        onSave={handleProfileSave}
      />
    </div>
  )
}

export default SportSpaceView
