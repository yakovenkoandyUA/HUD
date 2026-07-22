import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Modal from '@/shared/components/ui/Modal'
import Button from '@/shared/components/ui/Button'
import CustomDatePicker from '@/shared/components/ui/CustomDatePicker'
import ReminderFields, { type ReminderUnit } from '../ReminderFields'
import { TimeWheelRow } from '@/shared/components/ui/TimeWheelPicker'
import LabelPicker from '../LabelPicker'
import RepeatConfigScreen from '../RepeatConfigScreen'
import { useSprintStore } from '@/features/sprint/store/sprintStore'
import { useUiStore } from '@/shared/store/uiStore'
import { useAchievementsStore } from '@/shared/store/achievementsStore'
import { usePlan } from '@/shared/hooks/usePlan'
import { uploadToCloudinaryFull } from '@/shared/utils/uploadToCloudinary'
import { useSpacesStore } from '@/features/memories/store/spacesStore'
import { useFamilyStore } from '@/shared/store/familyStore'
import type { TodoPriority, SprintLabel, RepeatConfig } from '@/shared/types'
import styles from './AddSprintItemModal.module.css'

type ItemType     = 'todo' | 'shopping'
type RepeatType   = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'

const PRIORITIES: TodoPriority[] = ['urgent', 'low']

const PRI_ICON_URGENT = (
  <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor" aria-hidden="true">
    <path d="M6.5 1L1.5 6.5h3.5L2.5 11l7-6H6L6.5 1z"/>
  </svg>
)
const PRI_ICON_LOW = (
  <svg width="12" height="8" viewBox="0 0 12 8" fill="none" aria-hidden="true">
    <path d="M1 4c.8-2 1.7-2 2.5 0s1.7 2 2.5 0 1.7-2 2.5 0 1.7 2 2.5 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
)

const PRIORITY_CONFIG: Record<TodoPriority, { icon: React.ReactNode; label: string; activeClass: string }> = {
  urgent: { icon: PRI_ICON_URGENT, label: 'ТЕРМІНОВО', activeClass: styles.priBtnActiveUrgent },
  normal: { icon: null,            label: 'НОРМ',      activeClass: styles.priBtnActiveNormal },
  low:    { icon: PRI_ICON_LOW,    label: 'АБИ БУЛО',  activeClass: styles.priBtnActiveLow    },
}

const QUICK_REPEAT_OPTIONS: { key: Exclude<RepeatType, 'none' | 'custom'>; label: string }[] = [
  { key: 'daily',   label: 'Щодня'    },
  { key: 'weekly',  label: 'Щотижня'  },
  { key: 'monthly', label: 'Щомісяця' },
  { key: 'yearly',  label: 'Щороку'   },
]

const START_DATE_MONTHS = ['січ.','лют.','бер.','квіт.','трав.','черв.','лип.','серп.','вер.','жовт.','лист.','груд.']

function repeatToUnit(r: Exclude<RepeatType, 'none' | 'custom'>): RepeatConfig['unit'] {
  if (r === 'daily')   return 'day'
  if (r === 'weekly')  return 'week'
  if (r === 'monthly') return 'month'
  return 'year'
}

function formatRepeatActiveLabel(repeat: RepeatType, config: RepeatConfig | null): string {
  if (repeat === 'daily')   return 'Щодня'
  if (repeat === 'weekly')  return 'Щотижня'
  if (repeat === 'monthly') return 'Щомісяця'
  if (repeat === 'yearly')  return 'Щороку'
  if (repeat === 'custom' && config) {
    const n = config.interval
    const UNITS: Record<RepeatConfig['unit'], [string, string]> = {
      day:   ['день', 'дні'],
      week:  ['тиждень', 'тижні'],
      month: ['місяць', 'місяці'],
      year:  ['рік', 'роки'],
    }
    const [sing, plur] = UNITS[config.unit]
    return n === 1 ? `Кожен ${sing}` : `Кожні ${n} ${plur}`
  }
  return 'Повтор'
}

function formatReminderShort(amount: number, unit: ReminderUnit): string {
  if (unit === 'minutes') return `${amount} хв.`
  if (unit === 'hours')   return `${amount} год.`
  if (unit === 'days')    return amount === 1 ? '1 день' : amount < 5 ? `${amount} дні` : `${amount} днів`
  if (unit === 'weeks')   return amount === 1 ? '1 тиждень' : amount < 5 ? `${amount} тижні` : `${amount} тижнів`
  return String(amount)
}

function formatStartDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return `${String(d).padStart(2, '0')} ${START_DATE_MONTHS[m - 1]} ${y}`
}

function nextWeekDayFrom(from: Date, weekDays: number[]): string {
  const sorted = [...weekDays].sort((a, b) => a - b)
  for (let i = 0; i < 7; i++) {
    const d = new Date(from)
    d.setDate(from.getDate() + i)
    if (sorted.includes((d.getDay() + 6) % 7)) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    }
  }
  return `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}-${String(from.getDate()).padStart(2, '0')}`
}

/** Props for AddSprintItemModal */
interface Props {
  isOpen: boolean
  onClose: () => void
  /** Pre-select quest or shopping type when opening */
  defaultType?: ItemType
  /** Pre-fill the deadline date (e.g., from day long-press) */
  initialDate?: string | null
}

/**
 * AddSprintItemModal
 *
 * Full-featured add form for sprint items, identical to Sprint screen.
 * Handles todos (with labels, repeat, deadline, reminder) and shopping (with priority, quantity).
 */
const AddSprintItemModal: React.FC<Props> = ({ isOpen, onClose, defaultType, initialDate }) => {
  const navigate = useNavigate()
  const { addItem, items } = useSprintStore()
  const { showToast } = useUiStore()
  const { limits } = usePlan()
  const maxImages = limits.maxTaskImages

  const { spaces } = useSpacesStore()
  const spaceOptions = useMemo(() => spaces.filter(s => !s.archived && s.modules.includes('tasks')), [spaces])

  const familyMembers = useFamilyStore(s => s.accepted)
  const fetchFamily   = useFamilyStore(s => s.fetchFamily)
  const [newAssignedTo, setNewAssignedTo] = useState<string[]>([])

  const [newType, setNewType]                   = useState<ItemType>(defaultType ?? 'todo')
  const [newTitle, setNewTitle]                 = useState('')
  const [newPriority, setNewPriority]           = useState<TodoPriority | null>(null)
  const [newSpaceId, setNewSpaceId]             = useState<string | null>(null)
  const [newQuantity, setNewQuantity]           = useState('')
  const [newLabels, setNewLabels]               = useState<SprintLabel[]>([])
  const [showLabelPicker, setShowLabelPicker]   = useState(false)
  const [newRepeat, setNewRepeat]               = useState<RepeatType>('none')
  const [showRepeatList, setShowRepeatList]     = useState(false)
  const [showRepeatConfigScreen, setShowRepeatConfigScreen] = useState(false)
  const [newRepeatConfig, setNewRepeatConfig]   = useState<RepeatConfig | null>(null)
  const [repeatStartDate, setRepeatStartDate]   = useState(() => new Date().toISOString().split('T')[0])
  const [showStartDatePicker, setShowStartDatePicker] = useState(false)
  const [newReminderAmount, setNewReminderAmount] = useState<number | ''>(1)
  const [newReminderUnit, setNewReminderUnit]   = useState<ReminderUnit>('days')
  const [newReminder, setNewReminder]           = useState<{ amount: number; unit: ReminderUnit } | null>(null)
  const [showFormReminderPicker, setShowFormReminderPicker] = useState(false)
  const [quickAddDate, setQuickAddDate]         = useState<string | null>(null)
  const [quickAddTime, setQuickAddTime]         = useState<string | null>(null)
  const [showTimeEditor, setShowTimeEditor]               = useState(false)
  const [showReminderEditor, setShowReminderEditor]       = useState(false)
  const [draftTime, setDraftTime]                         = useState('09:00')
  const [showInitialDatePicker, setShowInitialDatePicker] = useState(false)
  const [pendingImages, setPendingImages]       = useState<File[]>([])
  const [imageUploading, setImageUploading]     = useState(false)
  const imageInputRef                           = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setNewType(defaultType ?? 'todo')
      setQuickAddDate(initialDate ?? null)
      if (familyMembers.length === 0) fetchFamily()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, defaultType, initialDate])

  const duplicateItem = useMemo(() => {
    const t = newTitle.trim().toLowerCase()
    if (t.length < 2) return undefined
    return items.find(it =>
      !it.done &&
      it.title.trim().toLowerCase() === t &&
      (newType === 'shopping' ? it.type === 'shopping' : it.type !== 'shopping')
    )
  }, [newTitle, newType, items])

  const reset = () => {
    setNewTitle('')
    setNewType(defaultType ?? 'todo')
    setNewPriority(null)
    setNewSpaceId(null)
    setNewQuantity('')
    setNewLabels([])
    setShowLabelPicker(false)
    setNewRepeat('none')
    setNewRepeatConfig(null)
    setShowRepeatList(false)
    setShowRepeatConfigScreen(false)
    setRepeatStartDate(new Date().toISOString().split('T')[0])
    setShowStartDatePicker(false)
    setNewReminderAmount(1)
    setNewReminderUnit('days')
    setNewReminder(null)
    setShowFormReminderPicker(false)
    setQuickAddDate(null)
    setQuickAddTime(null)
    setShowTimeEditor(false)
    setShowReminderEditor(false)
    setDraftTime('09:00')
    setShowInitialDatePicker(false)
    setPendingImages([])
    setNewAssignedTo([])
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleAdd = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!newTitle.trim()) return

    const isRoutine = newType === 'todo' && newRepeat !== 'none'

    // Upload images (only for non-routines)
    let imageUrls: string[] = []
    let imagePublicIds: string[] = []
    if (pendingImages.length > 0 && !isRoutine) {
      setImageUploading(true)
      try {
        const results = await Promise.all(
          pendingImages.map(f => uploadToCloudinaryFull(f, 'sprint'))
        )
        imageUrls = results.map(r => r.url)
        imagePublicIds = results.map(r => r.publicId)
      } catch {
        showToast('Помилка завантаження зображень', 'error')
        setImageUploading(false)
        return
      }
      setImageUploading(false)
    }

    const hasStartDate = newRepeat !== 'none' && newRepeat !== 'daily' && newRepeat !== 'custom'
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(0, 0, 0, 0)
    const initialNextDue = newRepeat === 'daily'
      ? `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`
      : newRepeat === 'custom' && newRepeatConfig?.weekDays?.length
        ? nextWeekDayFrom(tomorrow, newRepeatConfig.weekDays)
        : hasStartDate ? repeatStartDate : new Date().toISOString().split('T')[0]

    addItem({
      type:     newType,
      title:    newTitle.trim(),
      priority: newType === 'shopping' ? (newPriority ?? undefined) : undefined,
      ...(quickAddDate && newRepeat === 'none' ? { dueDate: quickAddDate } : {}),
      ...(quickAddDate && newRepeat === 'none' && quickAddTime ? { dueTime: quickAddTime } : {}),
      ...(quickAddDate && newRepeat === 'none' && newReminder ? { reminder: newReminder } : {}),
      ...(newType === 'shopping' && newQuantity.trim() ? { quantity: newQuantity.trim() } : {}),
      ...(newType === 'todo' && newLabels.length > 0 ? { labels: newLabels } : {}),
      ...(newType === 'todo' && newRepeat !== 'none' ? {
        repeat:       newRepeat,
        repeatConfig: newRepeatConfig ?? { interval: 1, unit: repeatToUnit(newRepeat as Exclude<RepeatType, 'none' | 'custom'>), endsType: 'never' as const },
        nextDue:      initialNextDue,
        ...(hasStartDate ? { repeatStartDate } : {}),
        ...(newReminder ? { reminder: newReminder } : {}),
      } : {}),
      ...(imageUrls.length > 0 ? { imageUrls, imagePublicIds } : {}),
      ...(newSpaceId ? { spaceId: newSpaceId } : {}),
      ...(newAssignedTo.length > 0 ? { assignedTo: newAssignedTo } : {}),
    },
    // Rollback images if backend save fails
    imagePublicIds.length > 0 ? imagePublicIds : undefined)

    if (newType !== 'shopping') useAchievementsStore.getState().unlock('first-quest')

    const msg = isRoutine ? `Звичку «${newTitle.trim()}» додано` : newType === 'shopping' ? 'Покупку додано' : 'Квест додано'
    showToast(msg, 'success')
    reset()
    onClose()
  }

  const modalTitle = newType === 'shopping' ? 'Нова покупка' : 'Новий квест'

  return (
    <>
      <Modal isOpen={isOpen} onClose={handleClose} title={modalTitle} draggable>
        <form onSubmit={handleAdd} className={styles.taskForm}>
          <div className={styles.typeSegment}>
            <button
              type="button"
              className={`${styles.typeSegmentBtn} ${styles.typeSegmentBtnTodo} ${newType === 'todo' ? styles.typeSegmentBtnActive : ''}`}
              onClick={() => setNewType('todo')}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <rect x="1" y="1" width="12" height="12" rx="3" stroke="currentColor" strokeWidth="1.3"/>
                <path d="M4 7l2 2 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Квест
            </button>
            <button
              type="button"
              className={`${styles.typeSegmentBtn} ${styles.typeSegmentBtnShopping} ${newType === 'shopping' ? styles.typeSegmentBtnActive : ''}`}
              onClick={() => setNewType('shopping')}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M2 3h10l-1.2 6H3.2L2 3z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
                <path d="M4.5 3V2a2 2 0 0 1 4 0v1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                <circle cx="5" cy="11" r=".8" fill="currentColor"/>
                <circle cx="9" cy="11" r=".8" fill="currentColor"/>
              </svg>
              Покупка
            </button>
          </div>

          {spaceOptions.length > 0 && (
            <div className={styles.spaceSection}>
              <span className={styles.spaceLabel}>
                Простір <span className={styles.spaceLabelOpt}>(необов'язково)</span>
              </span>
              <div className={styles.spaceRow}>
                {spaceOptions.map(sp => (
                  <button
                    key={sp.id}
                    type="button"
                    className={`${styles.spaceChip} ${newSpaceId === sp.id ? styles.spaceChipActive : ''}`}
                    style={{ '--chip-color': sp.color } as React.CSSProperties}
                    onClick={() => setNewSpaceId(newSpaceId === sp.id ? null : sp.id)}
                  >
                    <span className={styles.spaceChipDot} />
                    {sp.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {familyMembers.length > 0 && (
            <div className={styles.assignSection}>
              <span className={styles.assignLabel}>
                Асайнити <span className={styles.spaceLabelOpt}>(необов'язково)</span>
              </span>
              <div className={styles.assignRow}>
                {familyMembers.map(m => {
                  const on = newAssignedTo.includes(m.id)
                  const initials = (m.name || m.username).slice(0, 2).toUpperCase()
                  return (
                    <button
                      key={m.id}
                      type="button"
                      className={`${styles.assignAvatar} ${on ? styles.assignAvatarOn : ''}`}
                      onClick={() => setNewAssignedTo(prev =>
                        prev.includes(m.id) ? prev.filter(x => x !== m.id) : [...prev, m.id]
                      )}
                    >
                      <div className={styles.assignAvatarCircle}>
                        {m.avatarUrl
                          ? <img src={m.avatarUrl} alt={m.name} />
                          : initials
                        }
                        {on && (
                          <div className={styles.assignCheckMark}>
                            <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                              <path d="M1.5 4.5l2 2 4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </div>
                        )}
                      </div>
                      <span className={styles.assignAvatarName}>{m.name || m.username}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <input
            className={styles.todoInput}
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder="Назва..."
            autoFocus
          />

          {duplicateItem && (
            <div className={styles.dupHint}>
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.4"/>
                <path d="M7 4.5v3M7 9.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              <span>«{duplicateItem.title}» вже є у списку</span>
              <button
                type="button"
                className={styles.dupHintBtn}
                onClick={() => { handleClose(); navigate('/sprint') }}
              >
                Відкрити
              </button>
            </div>
          )}

          {newType === 'shopping' && (
            <>
              <div className={styles.priorityRow}>
                {PRIORITIES.map(p => {
                  const { icon, label, activeClass } = PRIORITY_CONFIG[p]
                  return (
                    <button
                      key={p}
                      type="button"
                      className={`${styles.priBtn} ${newPriority === p ? activeClass : ''}`}
                      onClick={() => setNewPriority(newPriority === p ? null : p)}
                    >
                      <span className={styles.priSymbol}>{icon}</span>
                      <span className={styles.priLabel}>{label}</span>
                    </button>
                  )
                })}
              </div>
              <input
                className={styles.todoInput}
                value={newQuantity}
                onChange={e => setNewQuantity(e.target.value)}
                placeholder="Кількість (необов'язково)"
              />
            </>
          )}

          {newType === 'todo' && (
            <div className={styles.todoExtras}>
              {newLabels.length > 0 && (
                <div className={styles.extrasLabels}>
                  {newLabels.map(l => (
                    <button
                      key={l.id}
                      type="button"
                      className={styles.selectedLabel}
                      style={{ background: l.color }}
                      onClick={() => setNewLabels(prev => prev.filter(x => x.id !== l.id))}
                    >
                      {l.title}
                      <svg width="7" height="7" viewBox="0 0 7 7" fill="none">
                        <path d="M1 1l5 5M6 1L1 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                      </svg>
                    </button>
                  ))}
                </div>
              )}

              <div className={styles.metaRow}>
                {/* Label */}
                <button type="button" className={styles.metaChip} onClick={() => setShowLabelPicker(true)}>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M5 2v6M2 5h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                  Мітка
                </button>

                {/* Repeat */}
                {newRepeat === 'none' ? (
                  <button type="button" className={styles.metaChip} onClick={() => setShowRepeatList(v => !v)}>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M1.5 5a3.5 3.5 0 1 0 .7-2.1M1.5 2v1.5h1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Повторити
                  </button>
                ) : (
                  <button type="button" className={`${styles.metaChip} ${styles.metaChipActive}`} onClick={() => setShowRepeatList(v => !v)}>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M1.5 5a3.5 3.5 0 1 0 .7-2.1M1.5 2v1.5h1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {formatRepeatActiveLabel(newRepeat, newRepeatConfig)}
                    <span
                      className={styles.metaChipClear}
                      onClick={e => {
                        e.stopPropagation()
                        setNewRepeat('none')
                        setNewRepeatConfig(null)
                        setShowRepeatList(false)
                        setShowRepeatConfigScreen(false)
                      }}
                    >✕</span>
                  </button>
                )}

                {/* Deadline chip — non-routine only; shows single chip when no date set */}
                {newRepeat === 'none' && !showRepeatList && !quickAddDate && (
                  <button type="button" className={styles.metaChip} onClick={() => setShowInitialDatePicker(true)}>
                    <svg width="10" height="10" viewBox="0 0 11 11" fill="none">
                      <rect x="1" y="2" width="9" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                      <path d="M1 5h9M3.5 1v2M7.5 1v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                    </svg>
                    Дедлайн
                  </button>
                )}

                {/* Reminder — routines only (one-off reminder lives inside the Deadline sheet) */}
                {newRepeat !== 'none' && !showRepeatList && (
                  newReminder ? (
                    <button type="button" className={`${styles.metaChip} ${styles.metaChipActive}`} onClick={() => setShowFormReminderPicker(true)}>
                      <svg width="10" height="10" viewBox="0 0 16 18" fill="none">
                        <path d="M8 1a5 5 0 0 1 5 5v3l2 2H1l2-2V6a5 5 0 0 1 5-5z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M6 14a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                      </svg>
                      {formatReminderShort(newReminder.amount, newReminder.unit)}
                      <span className={styles.metaChipClear} onClick={e => { e.stopPropagation(); setNewReminder(null) }}>✕</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={styles.metaChip}
                      onClick={() => {
                        setNewReminderAmount(1); setNewReminderUnit('days'); setShowFormReminderPicker(true)
                        if ('Notification' in window && Notification.permission === 'default') {
                          Notification.requestPermission().catch(() => {})
                        }
                      }}
                    >
                      <svg width="10" height="10" viewBox="0 0 16 18" fill="none">
                        <path d="M8 1a5 5 0 0 1 5 5v3l2 2H1l2-2V6a5 5 0 0 1 5-5z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M6 14a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                      </svg>
                      Нагадати
                    </button>
                  )
                )}
              </div>

              {/* Deadline chips row — appears below metaRow when date is set */}
              {newRepeat === 'none' && quickAddDate && (
                <div className={styles.deadlineChipsRow}>
                  {/* Date chip */}
                  <button type="button" className={`${styles.metaChip} ${styles.metaChipActive}`} onClick={() => setShowInitialDatePicker(true)}>
                    <svg width="10" height="10" viewBox="0 0 11 11" fill="none">
                      <rect x="1" y="2" width="9" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                      <path d="M1 5h9M3.5 1v2M7.5 1v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                    </svg>
                    {new Date(quickAddDate + 'T00:00:00').toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })}
                    <span className={styles.metaChipClear} onClick={e => { e.stopPropagation(); setQuickAddDate(null); setQuickAddTime(null); setNewReminder(null); setShowTimeEditor(false); setShowReminderEditor(false) }}>✕</span>
                  </button>
                  {/* Time chip */}
                  <button
                    type="button"
                    className={`${styles.metaChip} ${quickAddTime ? styles.metaChipActive : ''}`}
                    onClick={() => { setDraftTime(quickAddTime ?? '09:00'); setShowTimeEditor(v => !v); setShowReminderEditor(false) }}
                  >
                    <svg width="10" height="10" viewBox="0 0 15 15" fill="none">
                      <circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.3" />
                      <path d="M7.5 4.5v3.25l2 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {quickAddTime ?? 'Час'}
                    {quickAddTime && <span className={styles.metaChipClear} onClick={e => { e.stopPropagation(); setQuickAddTime(null); setShowTimeEditor(false) }}>✕</span>}
                  </button>
                  {/* Reminder chip */}
                  <button
                    type="button"
                    className={`${styles.metaChip} ${newReminder ? styles.metaChipActive : ''}`}
                    onClick={() => {
                      if (!newReminder && 'Notification' in window && Notification.permission === 'default') {
                        Notification.requestPermission().catch(() => {})
                      }
                      setShowReminderEditor(v => !v); setShowTimeEditor(false)
                    }}
                  >
                    <svg width="10" height="10" viewBox="0 0 16 18" fill="none">
                      <path d="M8 1a5 5 0 0 1 5 5v3l2 2H1l2-2V6a5 5 0 0 1 5-5z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M6 14a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                    </svg>
                    {newReminder ? formatReminderShort(newReminder.amount, newReminder.unit) : 'Нагадати'}
                    {newReminder && <span className={styles.metaChipClear} onClick={e => { e.stopPropagation(); setNewReminder(null); setShowReminderEditor(false) }}>✕</span>}
                  </button>
                </div>
              )}

              {/* Start date row — routines with weekly/monthly/yearly */}
              {(newRepeat === 'weekly' || newRepeat === 'monthly' || newRepeat === 'yearly') && !showRepeatList && (
                <div className={styles.startDateRow}>
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
                    <rect x="1" y="2" width="9" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                    <path d="M1 5h9M3.5 1v2M7.5 1v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                  <span className={styles.startDateLabel}>Починаючи з:</span>
                  <button type="button" className={styles.dateDisplayBtn} onClick={() => setShowStartDatePicker(true)}>
                    {formatStartDate(repeatStartDate)}
                  </button>
                </div>
              )}

              {/* Routine hint */}
              {newRepeat !== 'none' && !showRepeatList && (
                <div className={styles.routineHint}>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.3" />
                    <path d="M5 3v2.5l1.5 1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                  Ця задача стане звичкою — видно у тижневому вигляді
                </div>
              )}

              {/* Repeat option list */}
              {showRepeatList && (
                <div className={styles.repeatList}>
                  <button
                    type="button"
                    className={`${styles.repeatListItem} ${newRepeat === 'none' ? styles.repeatListItemActive : ''}`}
                    onClick={() => { setNewRepeat('none'); setNewRepeatConfig(null); setShowRepeatList(false) }}
                  >
                    <span>Не повторюється</span>
                    {newRepeat === 'none' && (
                      <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                        <path d="M2 5.5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                  {QUICK_REPEAT_OPTIONS.map(opt => (
                    <button
                      type="button"
                      key={opt.key}
                      className={`${styles.repeatListItem} ${newRepeat === opt.key ? styles.repeatListItemActive : ''}`}
                      onClick={() => { setNewRepeat(opt.key); setNewRepeatConfig(null); setShowRepeatList(false) }}
                    >
                      <span>{opt.label}</span>
                      {newRepeat === opt.key && (
                        <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                          <path d="M2 5.5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                  ))}
                  <button
                    type="button"
                    className={`${styles.repeatListItem} ${styles.repeatListCustom} ${newRepeat === 'custom' ? styles.repeatListItemActive : ''}`}
                    onClick={() => { setShowRepeatList(false); setShowRepeatConfigScreen(true) }}
                  >
                    <span>Налаштувати...</span>
                    {newRepeat === 'custom' && (
                      <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                        <path d="M2 5.5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Inline deadline editors (time / reminder) ── */}
          {newRepeat === 'none' && quickAddDate && (
            <>
              <div className={`${styles.deadlineAccordion} ${showTimeEditor ? styles.deadlineAccordionOpen : ''}`}>
                <div className={styles.deadlineAccordionInner}>
                  <TimeWheelRow value={draftTime} onChange={setDraftTime} />
                  <button type="button" className={styles.deadlineConfirmBtn} onClick={() => { setQuickAddTime(draftTime); setShowTimeEditor(false) }}>
                    Підтвердити
                  </button>
                </div>
              </div>
              <div className={`${styles.deadlineAccordion} ${showReminderEditor ? styles.deadlineAccordionOpen : ''}`}>
                <div className={styles.deadlineAccordionInner}>
                  <ReminderFields
                    amount={newReminderAmount}
                    unit={newReminderUnit}
                    onAmountChange={setNewReminderAmount}
                    onUnitChange={setNewReminderUnit}
                    suffix="до дедлайну"
                  />
                  <button
                    type="button"
                    className={styles.deadlineConfirmBtn}
                    onClick={() => { setNewReminder({ amount: Math.max(1, Math.min(999, Number(newReminderAmount) || 1)), unit: newReminderUnit }); setShowReminderEditor(false) }}
                  >
                    Підтвердити
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ── Image attachments (non-routine only) ── */}
          {newRepeat === 'none' && (
            <div>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={e => {
                  const files = Array.from(e.target.files ?? [])
                  if (!files.length) return
                  e.target.value = ''
                  setPendingImages(prev => {
                    const combined = [...prev, ...files]
                    return combined.slice(0, maxImages)
                  })
                }}
              />
              {pendingImages.length > 0 && (
                <div className={styles.imagePreviews}>
                  {pendingImages.map((f, i) => (
                    <div key={i} className={styles.imageThumb}>
                      <img src={URL.createObjectURL(f)} alt="" />
                      <button
                        type="button"
                        className={styles.imageRemoveBtn}
                        onClick={() => setPendingImages(prev => prev.filter((_, j) => j !== i))}
                        aria-label="Видалити"
                      >
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                          <path d="M1 1l6 6M7 1L1 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {pendingImages.length < maxImages && (
                <button
                  type="button"
                  className={styles.imageAddBtn}
                  onClick={() => imageInputRef.current?.click()}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <rect x="0.5" y="1.5" width="11" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                    <circle cx="4" cy="5.5" r="1" stroke="currentColor" strokeWidth="1.2"/>
                    <path d="M0.5 8.5l3-3 2 2 2-2 4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {pendingImages.length === 0 ? 'Додати фото' : 'Додати ще'}
                </button>
              )}
            </div>
          )}

          <Button type="submit" fullWidth disabled={imageUploading || !newTitle.trim()}>
            {imageUploading ? 'Завантаження...' : 'Додати'}
          </Button>
        </form>
      </Modal>

      {/* Reminder picker sheet */}
      {showFormReminderPicker && (
        <div className={styles.formReminderOverlay} onClick={() => setShowFormReminderPicker(false)}>
          <div className={styles.formReminderSheet} onClick={e => e.stopPropagation()}>
            <div className={styles.formReminderHandle} />
            <div className={styles.formReminderSheetHeader}>
              <span className={styles.formReminderSheetTitle}>Сповіщення</span>
              <button type="button" className={styles.formReminderSheetClose} onClick={() => setShowFormReminderPicker(false)} aria-label="Закрити">
                ✕
              </button>
            </div>
            <div className={styles.formReminderSheetBody}>
              <ReminderFields
                amount={newReminderAmount}
                unit={newReminderUnit}
                onAmountChange={setNewReminderAmount}
                onUnitChange={setNewReminderUnit}
              />
            </div>
            <button
              type="button"
              className={styles.formReminderDoneBtn}
              onClick={() => {
                setNewReminder({ amount: Math.max(1, Math.min(999, Number(newReminderAmount) || 1)), unit: newReminderUnit })
                setShowFormReminderPicker(false)
              }}
            >
              Готово
            </button>
          </div>
        </div>
      )}

      {/* Repeat config screen */}
      {showRepeatConfigScreen && (
        <RepeatConfigScreen
          initial={newRepeatConfig ?? undefined}
          onSave={config => {
            setNewRepeat('custom')
            setNewRepeatConfig(config)
            setShowRepeatConfigScreen(false)
          }}
          onClose={() => setShowRepeatConfigScreen(false)}
        />
      )}

      {/* Start date picker */}
      {showStartDatePicker && (
        <CustomDatePicker
          value={repeatStartDate}
          onChange={date => { setRepeatStartDate(date); setShowStartDatePicker(false) }}
          onClose={() => setShowStartDatePicker(false)}
        />
      )}

      {/* Initial calendar — opens directly when tapping "Дедлайн" without a date */}
      {showInitialDatePicker && (
        <CustomDatePicker
          value={quickAddDate ?? undefined}
          minDate={new Date()}
          onChange={date => {
            setQuickAddDate(date)
            setShowInitialDatePicker(false)
          }}
          onClose={() => setShowInitialDatePicker(false)}
        />
      )}

      {/* Label picker */}
      {showLabelPicker && (
        <LabelPicker
          selectedLabels={newLabels}
          onToggle={label => setNewLabels(prev => (prev.some(l => l.id === label.id) ? prev.filter(l => l.id !== label.id) : [...prev, label]))}
          onClose={() => setShowLabelPicker(false)}
        />
      )}
    </>
  )
}

export default AddSprintItemModal
