import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useSwipeToDismiss } from '../../../hooks/useSwipeToDismiss'
import { useModalHistory } from '../../../hooks/useModalHistory'
import { authFetch } from '../../../services/api'
import { useSprintStore } from '../../../store/sprintStore'
import CustomDatePicker from '../../ui/CustomDatePicker'
import LabelPicker from '../LabelPicker'
import RepeatConfigScreen from '../RepeatConfigScreen'
import { isRecurring } from '../../../utils/sprint'
import type { RepeatConfig, UnifiedTodo } from '../../../types'
import styles from './TaskDetailModal.module.css'

/**
 * TaskDetailModal
 * ---------------
 * Bottom-sheet картка задачі у стилі Trello.
 * Для звичайних задач: МІТКИ / ДЕДЛАЙН / ЧЕК-ЛІСТ / ОПИС.
 * Для рутин (repeat !== 'none'): МІТКИ / ПОВТОРЮВАНІСТЬ / НАСТУПНЕ ВИКОНАННЯ / ОПИС.
 *
 * Props:
 * @prop {string | null}  taskId    — id задачі або null (modal закритий)
 * @prop {() => void}     onClose   — callback закриття
 */
interface TaskDetailModalProps {
  taskId: string | null
  onClose: () => void
}

const WEEK_DAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд']
const MONTHS_SHORT = ['січ.', 'лют.', 'бер.', 'квіт.', 'трав.', 'черв.', 'лип.', 'серп.', 'вер.', 'жовт.', 'лист.', 'груд.']
const DAY_SHORT    = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

function formatRepeatLabel(task: UnifiedTodo): string {
  if (task.repeat === 'daily')   return 'Щодня'
  if (task.repeat === 'weekly')  return 'Щотижня'
  if (task.repeat === 'monthly') return 'Щомісяця'
  if (task.repeat === 'yearly')  return 'Щороку'
  if (task.repeat === 'custom' && task.repeatConfig) {
    const { interval, unit, weekDays } = task.repeatConfig
    const UNITS: Record<RepeatConfig['unit'], [string, string]> = {
      day:   ['день', 'дні'],
      week:  ['тиждень', 'тижні'],
      month: ['місяць', 'місяці'],
      year:  ['рік', 'роки'],
    }
    const [sing, plur] = UNITS[unit]
    let label = interval === 1 ? `Кожен ${sing}` : `Кожні ${interval} ${plur}`
    if (unit === 'week' && weekDays && weekDays.length > 0) {
      label += ' — ' + [...weekDays].sort((a, b) => a - b).map(d => WEEK_DAY_LABELS[d]).join(', ')
    }
    return label
  }
  return 'Повтор'
}

function formatNextDue(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return `${DAY_SHORT[date.getDay()]} ${d} ${MONTHS_SHORT[m - 1]} ${y}`
}

function getInitialRepeatConfig(task: UnifiedTodo): RepeatConfig {
  if (task.repeatConfig) return task.repeatConfig
  const UNIT_MAP: Record<string, RepeatConfig['unit']> = {
    daily: 'day', weekly: 'week', monthly: 'month', yearly: 'year',
  }
  return { interval: 1, unit: UNIT_MAP[task.repeat ?? 'weekly'] ?? 'week', endsType: 'never' }
}

function getDueDateColor(dateStr: string): string {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr); target.setHours(0, 0, 0, 0)
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000)
  if (diff < 0)  return 'var(--negative)'
  if (diff <= 1) return 'var(--gold)'
  return 'var(--text)'
}

function formatDueDateHuman(dateStr: string): string {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr); target.setHours(0, 0, 0, 0)
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000)
  if (diff === 0) return 'Сьогодні'
  if (diff === 1) return 'Завтра'
  if (diff === -1) return 'Вчора'
  return `${DAY_SHORT[target.getDay()]} ${target.getDate()} ${MONTHS_SHORT[target.getMonth()]}`
}

// ── Main component ───────────────────────────────────────────────────────────

type ReminderUnit = 'minutes' | 'hours' | 'days' | 'weeks'

const REMINDER_UNITS: { key: ReminderUnit; label: string }[] = [
  { key: 'minutes', label: 'Хв. до' },
  { key: 'hours',   label: 'Годин'  },
  { key: 'days',    label: 'Днів'   },
  { key: 'weeks',   label: 'Тижнів' },
]

function formatReminderLabel(reminder: { amount: number; unit: string }): string {
  const { amount, unit } = reminder
  if (unit === 'minutes') return `${amount} хв.`
  if (unit === 'hours')   return `${amount} год.`
  if (unit === 'days') {
    if (amount === 1) return '1 день'
    if (amount < 5)  return `${amount} дні`
    return `${amount} днів`
  }
  if (unit === 'weeks') {
    if (amount === 1) return '1 тиждень'
    if (amount < 5)  return `${amount} тижні`
    return `${amount} тижнів`
  }
  return String(amount)
}

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ taskId, onClose }) => {
  const { items, updateTask, toggleItem, addChecklistItem, toggleChecklistItem, removeChecklistItem, updateChecklist, addLabel, removeLabel, setReminder, pinItem } = useSprintStore()

  const [animatingIds, setAnimatingIds] = useState<Set<string>>(new Set())

  // Keep a snapshot so the task content stays visible during the close animation
  const liveTask = items.find(i => i.id === taskId) ?? null
  const lastTaskRef = useRef<UnifiedTodo | null>(null)
  // eslint-disable-next-line react-hooks/refs
  if (liveTask) lastTaskRef.current = liveTask
  // eslint-disable-next-line react-hooks/refs
  const task = liveTask ?? lastTaskRef.current

  const [mounted, setMounted]                 = useState(false)
  const [sheetVisible, setSheetVisible]       = useState(false)
  const [labelPickerOpen, setLabelPickerOpen] = useState(false)
  const [showDatePicker, setShowDatePicker]   = useState(false)
  const [showRepeatConfig, setShowRepeatConfig] = useState(false)
  const [showNextDuePicker, setShowNextDuePicker] = useState(false)
  const [showReminderPicker, setShowReminderPicker] = useState(false)
  const [reminderAmount, setReminderAmount] = useState<number | ''>(1)
  const [reminderUnit, setReminderUnit] = useState<ReminderUnit>('days')
  const [showConfirm, setShowConfirm]         = useState(false)
  const [animatingDone, setAnimatingDone]     = useState(false)

  const titleRef      = useRef<HTMLTextAreaElement>(null)
  const descRef       = useRef<HTMLTextAreaElement>(null)
  const checkInputRef = useRef<HTMLInputElement>(null)

  const sheetRef   = useRef<HTMLDivElement>(null)
  const bodyRef    = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const dragClosing = useRef(false)
  const onCloseRef  = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  useModalHistory(onClose, !!taskId)
  useSwipeToDismiss(
    () => { dragClosing.current = true; onCloseRef.current() },
    { enabled: mounted && !!taskId, bodyRef, overlayRef, sheetRef },
  )

  const [titleDraft, setTitleDraft]     = useState('')
  const [descDraft, setDescDraft]       = useState('')
  const [checkInput, setCheckInput]     = useState('')
  const [editingIdx, setEditingIdx]     = useState<number | null>(null)


  useEffect(() => {
    let raf: number | null = null
    let timer: ReturnType<typeof setTimeout> | null = null

    if (taskId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMounted(true)
      setLabelPickerOpen(false)
      setCheckInput('')
      setShowRepeatConfig(false)
      setShowNextDuePicker(false)
      setShowReminderPicker(false)
      setShowConfirm(false)
      setAnimatingDone(false)
      // RAF: component renders at translateY(100%), next frame trigger CSS transition to translateY(0)
      raf = requestAnimationFrame(() => setSheetVisible(true))
    } else {
      setSheetVisible(false)
      if (!dragClosing.current) {
        // Clear any inline drag styles so CSS exit transition plays cleanly
        if (sheetRef.current)   { sheetRef.current.style.transform = '';   sheetRef.current.style.transition = '' }
        if (overlayRef.current) { overlayRef.current.style.opacity = '';   overlayRef.current.style.transition = '' }
      }
      dragClosing.current = false
      timer = setTimeout(() => setMounted(false), 480)
    }

    return () => {
      if (raf   !== null) cancelAnimationFrame(raf)
      if (timer !== null) clearTimeout(timer)
    }
  }, [taskId])

  useEffect(() => {
    if (task) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTitleDraft(task.title)
      setDescDraft(task.description ?? '')
    }
  }, [task?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = titleRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }, [titleDraft])

  useEffect(() => {
    const el = descRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }, [descDraft])

  useEffect(() => {
    if (!taskId) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [taskId, onClose])

  const handleTitleBlur = useCallback(() => {
    if (!task || !titleDraft.trim()) return
    const trimmed = titleDraft.trim()
    if (trimmed === task.title) return
    updateTask(task.id, { title: trimmed })
    const endpoint = task.type === 'sprint' ? `/api/sprint/tasks/${task.id}` : `/api/sprint/todos/${task.id}`
    authFetch(endpoint, { method: 'PATCH', body: JSON.stringify({ title: trimmed }) }).catch(console.error)
  }, [task, titleDraft, updateTask])

  const handleDescBlur = useCallback(() => {
    if (!task) return
    if (descDraft !== (task.description ?? '')) updateTask(task.id, { description: descDraft })
  }, [task, descDraft, updateTask])

  const handleCheckboxClick = () => {
    if (task?.done) {
      toggleItem(task.id)
      return
    }
    setShowConfirm(true)
  }

  const handleConfirmDone = async () => {
    if (!task) return
    setShowConfirm(false)
    setAnimatingDone(true)
    await new Promise<void>(r => setTimeout(r, 600))
    toggleItem(task.id)
    onClose()
  }

  const handleAddChecklist = () => {
    if (!task || !checkInput.trim()) return
    addChecklistItem(task.id, checkInput.trim())
    setCheckInput('')
    checkInputRef.current?.focus()
  }

  const handleDateChange = (date: string) => {
    if (!task) return
    updateTask(task.id, { dueDate: date || undefined })
  }

  const handleRepeatSave = (config: RepeatConfig) => {
    if (!task) return
    updateTask(task.id, { repeat: 'custom', repeatConfig: config })
    setShowRepeatConfig(false)
  }

  const handleNextDueSave = (date: string) => {
    if (!task || !date) return
    updateTask(task.id, { nextDue: date })
    setShowNextDuePicker(false)
  }

  // eslint-disable-next-line react-hooks/refs
  if (!mounted || !task) return null

  const recurring  = isRecurring(task)
  const checklist      = task.checklist ?? []
  const sortedChecklist = [...checklist].sort((a, b) => {
    const aDone = a.done && !animatingIds.has(a.id)
    const bDone = b.done && !animatingIds.has(b.id)
    if (aDone === bDone) return 0
    return aDone ? 1 : -1
  })
  const checkDone    = checklist.filter(c => c.done).length
  const checkPct     = checklist.length > 0 ? Math.round((checkDone / checklist.length) * 100) : 0
  const progressColor = checkPct === 100 ? 'var(--positive)' : checkPct >= 50 ? 'var(--gold)' : 'var(--negative)'
  const taskLabels   = task.labels ?? []


  const saveEdit = (sortedIdx: number, value: string) => {
    const trimmed = value.trim()
    setEditingIdx(null)
    if (!trimmed || trimmed === sortedChecklist[sortedIdx]?.title) return
    const newList = [...sortedChecklist]
    newList[sortedIdx] = { ...newList[sortedIdx], title: trimmed }
    updateChecklist(task.id, newList)
  }

  const handleCheckItemToggle = (itemId: string, currentlyDone: boolean) => {
    toggleChecklistItem(task!.id, itemId)
    if (!currentlyDone) {
      setAnimatingIds(prev => new Set(prev).add(itemId))
      setTimeout(() => {
        setAnimatingIds(prev => {
          const next = new Set(prev)
          next.delete(itemId)
          return next
        })
      }, 350)
    }
  }

  return (
    <>
      <div
        ref={overlayRef}
        className={`${styles.overlay} ${sheetVisible ? styles.overlayVisible : ''}`}
        onClick={onClose}
      >
        <div
          ref={sheetRef}
          className={`${styles.sheet} ${sheetVisible ? styles.sheetVisible : ''}`}
          onClick={e => e.stopPropagation()}
        >
          <div className={styles.handle} />

          {/* ── Header ── */}
          <div className={styles.header}>
            <button
              type="button"
              className={`${styles.headerCheck} ${task.done ? styles.headerCheckDone : ''}`}
              onClick={handleCheckboxClick}
              aria-label={task.done ? 'Позначити невиконаним' : 'Виконати'}
            >
              {task.done && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5l2.5 2.5 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
            <textarea
              ref={titleRef}
              className={`${styles.titleEdit} ${task.done ? styles.titleDone : ''} ${animatingDone ? styles.titleStrike : ''}`}
              value={titleDraft}
              onChange={e => setTitleDraft(e.target.value)}
              onBlur={handleTitleBlur}
              rows={1}
            />
            {task.recipeImageUrl && (
              <img src={task.recipeImageUrl} className={styles.headerRecipeImg} alt="" />
            )}
            {!isRecurring(task) && task.type !== 'shopping' && (
              <button
                type="button"
                className={`${styles.pinBtn} ${task.isPinned ? styles.pinBtnActive : ''}`}
                onClick={() => pinItem(task.id)}
                aria-label={task.isPinned ? 'Відкріпити' : 'Закріпити'}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill={task.isPinned ? 'var(--gold)' : 'none'} stroke="currentColor" strokeWidth="2.2">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </button>
            )}
            <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Закрити">✕</button>
          </div>

          {/* ── Confirm close ── */}
          {showConfirm && (
            <div className={styles.confirmRow}>
              <span className={styles.confirmText}>Закриваємо квест?</span>
              <button type="button" className={styles.confirmYes} onClick={handleConfirmDone}>Так</button>
              <button type="button" className={styles.confirmNo} onClick={() => setShowConfirm(false)}>Ні</button>
            </div>
          )}

          {/* ── Label Picker — absolute overlay inside sheet ── */}
          {labelPickerOpen && (
            <div className={styles.labelPickerOverlay} onClick={() => setLabelPickerOpen(false)}>
              <div className={styles.labelPickerSheet} onClick={e => e.stopPropagation()}>
                <div className={styles.labelPickerHeader}>
                  <span>МІТКИ</span>
                  <button type="button" className={styles.closeBtn} onClick={() => setLabelPickerOpen(false)} aria-label="Закрити">
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                      <path d="M2 2l9 9M11 2l-9 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
                <LabelPicker
                  noOverlay
                  selectedLabels={taskLabels}
                  onToggle={label => {
                    const isOn = taskLabels.some(l => l.id === label.id)
                    if (isOn) removeLabel(task.id, label.id)
                    else      addLabel(task.id, label)
                  }}
                  onClose={() => setLabelPickerOpen(false)}
                />
              </div>
            </div>
          )}

          {/* ── Scrollable body ── */}
          <div ref={bodyRef} className={styles.body}>

            {recurring ? (
              <>
                {/* ── МІТКИ (рутини — окрема секція) ── */}
                <div className={styles.section}>
                  <p className={styles.sectionLabel}>Мітки</p>
                  <div className={styles.labelsRow}>
                    {taskLabels.map(l => (
                      <button key={l.id} type="button" className={styles.labelPill} style={{ background: l.color }} onClick={() => setLabelPickerOpen(true)}>
                        {l.title && <span className={styles.labelPillText}>{l.title}</span>}
                      </button>
                    ))}
                    <button type="button" className={styles.addLabelChip} onClick={() => setLabelPickerOpen(true)}>+ Додати</button>
                  </div>
                </div>

                {/* ── ПОВТОРЮВАНІСТЬ ── */}
                <div className={styles.section}>
                  <p className={styles.sectionLabel}>Повторюваність</p>
                  <button type="button" className={styles.infoRow} onClick={() => setShowRepeatConfig(true)}>
                    <span className={styles.infoRowText}>{formatRepeatLabel(task)}</span>
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" className={styles.editIcon}>
                      <path d="M9.5 1.5l2 2L4 11H2v-2L9.5 1.5z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>

                {/* ── НАСТУПНЕ ВИКОНАННЯ ── */}
                <div className={styles.section}>
                  <p className={styles.sectionLabel}>Наступне виконання</p>
                  <button type="button" className={styles.infoRow} onClick={() => setShowNextDuePicker(true)}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={styles.infoRowIcon}>
                      <rect x="1" y="2.5" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.2"/>
                      <path d="M1 6h12" stroke="currentColor" strokeWidth="1.2"/>
                      <path d="M4 1v3M10 1v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                    </svg>
                    <span className={styles.infoRowText}>
                      {task.nextDue ? formatNextDue(task.nextDue) : 'Не встановлено'}
                    </span>
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" className={styles.editIcon}>
                      <path d="M9.5 1.5l2 2L4 11H2v-2L9.5 1.5z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>

                {/* ── СПОВІЩЕННЯ ── */}
                <div className={styles.section}>
                  <p className={styles.sectionLabel}>Сповіщення</p>
                  {task.reminder ? (
                    <div className={styles.reminderActive}>
                      <svg width="14" height="14" viewBox="0 0 16 18" fill="none" className={styles.reminderIcon}>
                        <path d="M8 1a5 5 0 0 1 5 5v3l2 2H1l2-2V6a5 5 0 0 1 5-5z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M6 14a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                      </svg>
                      <span className={styles.reminderActiveText}>
                        За {formatReminderLabel(task.reminder)}
                      </span>
                      <button
                        type="button"
                        className={styles.reminderClear}
                        onClick={() => setReminder(task.id, undefined)}
                        aria-label="Видалити сповіщення"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className={styles.addReminderBtn}
                      onClick={() => {
                        setReminderAmount(1)
                        setReminderUnit('days')
                        setShowReminderPicker(true)
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 16 18" fill="none" className={styles.addReminderIcon}>
                        <path d="M8 1a5 5 0 0 1 5 5v3l2 2H1l2-2V6a5 5 0 0 1 5-5z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M6 14a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                      </svg>
                      Додати сповіщення
                    </button>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* ── МІТКИ + ДЕДЛАЙН ── */}
                <div className={styles.metaRow}>
                  <div className={styles.metaLeft}>
                    <p className={styles.sectionLabel}>Мітки</p>
                    <div className={styles.labelsRow}>
                      {taskLabels.map(l => (
                        <button key={l.id} type="button" className={styles.labelPill} style={{ background: l.color }} onClick={() => setLabelPickerOpen(true)}>
                          {l.title && <span className={styles.labelPillText}>{l.title}</span>}
                        </button>
                      ))}
                      <button type="button" className={styles.addLabelChip} onClick={() => setLabelPickerOpen(true)}>+ Додати</button>
                    </div>
                  </div>
                  <div className={styles.metaRight}>
                    <p className={styles.sectionLabel}>Дедлайн</p>
                    <div className={styles.deadlineCompact}>
                      <button type="button" className={styles.deadlineCompactBtn} onClick={() => setShowDatePicker(true)}>
                        <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                          <rect x="1" y="2.5" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.2"/>
                          <path d="M1 6h12" stroke="currentColor" strokeWidth="1.2"/>
                          <path d="M4 1v3M10 1v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                        </svg>
                        {task.dueDate ? (
                          <span style={{ color: getDueDateColor(task.dueDate) }}>{formatDueDateHuman(task.dueDate)}</span>
                        ) : (
                          <span className={styles.deadlinePlaceholder}>Додати</span>
                        )}
                      </button>
                      {task.dueDate && (
                        <button type="button" className={styles.deadlineClear} onClick={() => updateTask(task.id, { dueDate: undefined })} aria-label="Скинути дату">×</button>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── ЧЕК-ЛІСТ ── */}
                <div className={styles.section}>
                  <div className={styles.sectionHeaderRow}>
                    <p className={styles.sectionLabel}>Чек-ліст</p>
                    {checklist.length > 0 && (
                      <span className={styles.checklistCounter} style={{ color: progressColor }}>
                        {checkDone}/{checklist.length}
                      </span>
                    )}
                  </div>
                      <div className={styles.checklistBar}>
                        <div
                          className={styles.checklistBarFill}
                          style={{ width: `${checkPct}%`, background: progressColor }}
                        />
                      </div>
                  <div className={styles.checklistAdd}>
                    <input
                      ref={checkInputRef}
                      className={styles.checklistInput}
                      inputMode="text"
                      enterKeyHint="done"
                      value={checkInput}
                      onChange={e => setCheckInput(e.target.value)}
                      placeholder="Додати підзадачу..."
                      onKeyUp={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddChecklist() } }}
                    />
                    <button
                      type="button"
                      className={styles.checklistAddBtn}
                      onClick={handleAddChecklist}
                      disabled={!checkInput.trim()}
                    >
                      Додати
                    </button>
                  </div>
                  {checklist.length > 0 && (
                    <>
                      <div className={styles.checklistList}>
                        {sortedChecklist.map((item, idx) => {
                          const isEditing   = editingIdx === idx
                          const isDone      = item.done
                          const isAnimating = animatingIds.has(item.id)
                          return (
                            <div
                              key={item.id}
                              className={[
                                styles.checkItem,
                                isDone      ? styles.checkItemDone      : '',
                                isAnimating ? styles.checkItemAnimating : '',
                              ].filter(Boolean).join(' ')}
                            >
                              {/* Checkbox */}
                              <button
                                type="button"
                                className={`${styles.checkbox} ${isDone ? styles.checkboxDone : ''}`}
                                onClick={() => handleCheckItemToggle(item.id, isDone)}
                                aria-label={isDone ? 'Позначити невиконаним' : 'Виконати'}
                              >
                                {isDone && (
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                    <polyline points="20 6 9 17 4 12"/>
                                  </svg>
                                )}
                              </button>

                              {/* Text or inline edit */}
                              {isEditing ? (
                                <input
                                  className={styles.checklistTextInput}
                                  defaultValue={item.title}
                                  autoFocus
                                  inputMode="text"
                                  enterKeyHint="done"
                                  onBlur={e  => saveEdit(idx, e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter')  { e.preventDefault(); saveEdit(idx, e.currentTarget.value) }
                                    if (e.key === 'Escape') setEditingIdx(null)
                                  }}
                                />
                              ) : (
                                <span
                                  className={[
                                    styles.checkItemText,
                                    isDone      ? styles.checkItemTextDone      : '',
                                    isAnimating ? styles.checkItemTextAnimating : '',
                                  ].filter(Boolean).join(' ')}
                                  onClick={() => { if (!isDone) setEditingIdx(idx) }}
                                >
                                  {item.title}
                                </span>
                              )}

                              {/* Delete */}
                              <button
                                type="button"
                                className={styles.checkItemBtnDelete}
                                onClick={() => removeChecklistItem(task.id, item.id)}
                                aria-label="Видалити підзадачу"
                              >
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                                </svg>
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    </>
                  )}
                </div>
              </>
            )}

            {/* ── ОПИС ── */}
            <div className={`${styles.section} ${styles.sectionLast}`}>
              <p className={styles.sectionLabel}>Опис</p>
              <textarea
                ref={descRef}
                className={styles.descTextarea}
                value={descDraft}
                onChange={e => setDescDraft(e.target.value)}
                onBlur={handleDescBlur}
                placeholder="Додати опис..."
                rows={2}
              />
            </div>

            {/* ── Close button ── */}
            <button type="button" className={styles.closeBottomBtn} onClick={onClose}>
              Закрити
            </button>

          </div>
        </div>
      </div>

      {/* ── Date Picker for deadline (z-index 400) ── */}
      {showDatePicker && (
        <CustomDatePicker
          value={task.dueDate}
          onChange={handleDateChange}
          onClose={() => setShowDatePicker(false)}
        />
      )}

      {/* ── Repeat Config Screen (z-index 400) ── */}
      {showRepeatConfig && (
        <RepeatConfigScreen
          initial={getInitialRepeatConfig(task)}
          onSave={handleRepeatSave}
          onClose={() => setShowRepeatConfig(false)}
        />
      )}

      {/* ── Next Due Date Picker (z-index 400) ── */}
      {showNextDuePicker && (
        <CustomDatePicker
          value={task.nextDue}
          onChange={handleNextDueSave}
          onClose={() => setShowNextDuePicker(false)}
        />
      )}

      {/* ── Reminder Picker (z-index 400) ── */}
      {showReminderPicker && (
        <div className={styles.reminderOverlay} onClick={() => setShowReminderPicker(false)}>
          <div className={styles.reminderSheet} onClick={e => e.stopPropagation()}>
            <div className={styles.handle} />
            <div className={styles.reminderSheetHeader}>
              <span className={styles.reminderSheetTitle}>Сповіщення</span>
              <button type="button" className={styles.closeBtn} onClick={() => setShowReminderPicker(false)} aria-label="Закрити">✕</button>
            </div>
            <div className={styles.reminderSheetBody}>
              <div className={styles.reminderAmountRow}>
                <input
                  type="number"
                  className={styles.reminderAmountInput}
                  value={reminderAmount}
                  onFocus={e => e.target.select()}
                  onChange={e => setReminderAmount(e.target.value === '' ? '' : Math.min(999, Number(e.target.value)))}
                />
                <span className={styles.reminderAmountLabel}>
                  {reminderUnit === 'minutes' ? 'хвилин' : reminderUnit === 'hours' ? 'годин' : reminderUnit === 'days' ? 'днів' : 'тижнів'} до
                </span>
              </div>
              <div className={styles.reminderUnitList}>
                {REMINDER_UNITS.map(u => (
                  <button
                    key={u.key}
                    type="button"
                    className={styles.reminderUnitRow}
                    onClick={() => setReminderUnit(u.key)}
                  >
                    <span className={`${styles.reminderRadio} ${reminderUnit === u.key ? styles.reminderRadioActive : ''}`} />
                    <span className={`${styles.reminderUnitLabel} ${reminderUnit === u.key ? styles.reminderUnitLabelActive : ''}`}>
                      {u.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              className={styles.reminderDoneBtn}
              onClick={() => {
                setReminder(task.id, { amount: Math.max(1, Math.min(999, Number(reminderAmount) || 1)), unit: reminderUnit })
                setShowReminderPicker(false)
              }}
            >
              Готово
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default TaskDetailModal
