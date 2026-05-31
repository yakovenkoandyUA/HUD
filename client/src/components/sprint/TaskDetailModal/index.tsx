import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useSprintStore } from '../../../store/sprintStore'
import CustomDatePicker from '../../ui/CustomDatePicker'
import LabelPicker from '../LabelPicker'
import type {  UnifiedTodo } from '../../../types'
import styles from './TaskDetailModal.module.css'

/**
 * TaskDetailModal
 * ---------------
 * Bottom-sheet картка задачі у стилі Trello.
 * Єдиний scrollable екран з секціями: МІТКИ / ДЕДЛАЙН / ЧЕК-ЛІСТ / ОПИС.
 * LabelPicker — окремий фіксований оверлей з пошуком та формою.
 *
 * Props:
 * @prop {string | null}  taskId    — id задачі або null (modal закритий)
 * @prop {() => void}     onClose   — callback закриття
 */
interface TaskDetailModalProps {
  taskId: string | null
  onClose: () => void
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
  const DAYS   = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
  const MONTHS = ['січ.', 'лют.', 'бер.', 'квіт.', 'трав.', 'черв.', 'лип.', 'серп.', 'вер.', 'жовт.', 'лист.', 'груд.']
  return `${DAYS[target.getDay()]} ${target.getDate()} ${MONTHS[target.getMonth()]}`
}

// ── Checklist row with animated delete ───────────────────────────────────────

interface ChecklistRowProps {
  taskId: string
  itemId: string
  title: string
  done: boolean
}

const ChecklistRow: React.FC<ChecklistRowProps> = ({ taskId, itemId, title, done }) => {
  const { toggleChecklistItem, removeChecklistItem } = useSprintStore()
  const [deleting, setDeleting] = useState(false)

  const handleDelete = () => {
    setDeleting(true)
    setTimeout(() => {
      removeChecklistItem(taskId, itemId)
      setDeleting(false)
    }, 280)
  }

  return (
    <li className={`${styles.checklistItem} ${deleting ? styles.checklistItemDeleting : ''}`}>
      <button
        type="button"
        className={`${styles.checklistCheckbox} ${done ? styles.checklistCheckboxDone : ''}`}
        onClick={() => toggleChecklistItem(taskId, itemId)}
        aria-label={done ? 'Позначити невиконаним' : 'Виконати'}
      >
        {done && (
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
            <path d="M1.5 4l2 2 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>
      <span className={`${styles.checklistTitle} ${done ? styles.checklistTitleDone : ''}`}>
        {title}
      </span>
      <button
        type="button"
        className={styles.checklistDeleteBtn}
        onClick={handleDelete}
        aria-label="Видалити підзадачу"
      >
        ×
      </button>
    </li>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ taskId, onClose }) => {
  const { items, updateTask, toggleItem, addChecklistItem, addLabel, removeLabel } = useSprintStore()

  // Keep a snapshot so the task content stays visible during the close animation
  const liveTask = items.find(i => i.id === taskId) ?? null
  const lastTaskRef = useRef<UnifiedTodo | null>(null)
  // eslint-disable-next-line react-hooks/refs
  if (liveTask) lastTaskRef.current = liveTask
  // eslint-disable-next-line react-hooks/refs
  const task = liveTask ?? lastTaskRef.current

  const [mounted, setMounted]                 = useState(false)
  const [labelPickerOpen, setLabelPickerOpen] = useState(false)
  const [showDatePicker, setShowDatePicker]   = useState(false)

  const titleRef      = useRef<HTMLTextAreaElement>(null)
  const descRef       = useRef<HTMLTextAreaElement>(null)
  const checkInputRef = useRef<HTMLInputElement>(null)

  const [titleDraft, setTitleDraft] = useState('')
  const [descDraft, setDescDraft]   = useState('')
  const [checkInput, setCheckInput] = useState('')

  useEffect(() => {
    if (taskId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMounted(true)
      setLabelPickerOpen(false)
      setCheckInput('')
    } else {
      const t = setTimeout(() => setMounted(false), 280)
      return () => clearTimeout(t)
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
    if (titleDraft.trim() !== task.title) updateTask(task.id, { title: titleDraft.trim() })
  }, [task, titleDraft, updateTask])

  const handleDescBlur = useCallback(() => {
    if (!task) return
    if (descDraft !== (task.description ?? '')) updateTask(task.id, { description: descDraft })
  }, [task, descDraft, updateTask])

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

  // eslint-disable-next-line react-hooks/refs
  if (!mounted || !task) return null

  const checklist    = task.checklist ?? []
  const checkDone    = checklist.filter(c => c.done).length
  const checkPct     = checklist.length > 0 ? Math.round((checkDone / checklist.length) * 100) : 0
  const progressColor = checkPct === 100 ? 'var(--positive)' : checkPct >= 50 ? 'var(--gold)' : 'var(--negative)'
  const taskLabels   = task.labels ?? []
  const isOpen       = !!taskId

  return (
    <>
      <div
        className={`${styles.overlay} ${isOpen ? styles.overlayIn : styles.overlayOut}`}
        onClick={onClose}
      >
        <div
          className={`${styles.sheet} ${isOpen ? styles.sheetIn : styles.sheetOut}`}
          onClick={e => e.stopPropagation()}
        >
          <div className={styles.handle} />

          {/* ── Header ── */}
          <div className={styles.header}>
            <button
              type="button"
              className={`${styles.headerCheck} ${task.done ? styles.headerCheckDone : ''}`}
              onClick={() => toggleItem(task.id)}
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
              className={`${styles.titleEdit} ${task.done ? styles.titleDone : ''}`}
              value={titleDraft}
              onChange={e => setTitleDraft(e.target.value)}
              onBlur={handleTitleBlur}
              rows={1}
            />
            <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Закрити">✕</button>
          </div>

          {/* ── Scrollable body ── */}
          <div className={styles.body}>

            {/* ── МІТКИ ── */}
            <div className={styles.section}>
              <p className={styles.sectionLabel}>Мітки</p>
              <div className={styles.labelsRow}>
                {taskLabels.map(l => (
                  <button
                    key={l.id}
                    type="button"
                    className={styles.labelPill}
                    style={{ background: l.color }}
                    onClick={() => setLabelPickerOpen(true)}
                  >
                    {l.title && <span className={styles.labelPillText}>{l.title}</span>}
                  </button>
                ))}
                <button
                  type="button"
                  className={styles.addLabelChip}
                  onClick={() => setLabelPickerOpen(true)}
                >
                  + Додати
                </button>
              </div>
            </div>

            {/* ── ДЕДЛАЙН ── */}
            <div className={styles.section}>
              <p className={styles.sectionLabel}>Дедлайн</p>
              <div className={styles.deadlineRow}>
                <button type="button" className={styles.deadlineBtn} onClick={() => setShowDatePicker(true)}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={styles.deadlineIcon}>
                    <rect x="1" y="2.5" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.2"/>
                    <path d="M1 6h12" stroke="currentColor" strokeWidth="1.2"/>
                    <path d="M4 1v3M10 1v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                  {task.dueDate ? (
                    <span style={{ color: getDueDateColor(task.dueDate) }}>
                      {formatDueDateHuman(task.dueDate)}
                    </span>
                  ) : (
                    <span className={styles.deadlinePlaceholder}>Встановити дату</span>
                  )}
                </button>
                {task.dueDate && (
                  <button
                    type="button"
                    className={styles.deadlineClear}
                    onClick={() => updateTask(task.id, { dueDate: undefined })}
                    aria-label="Скинути дату"
                  >
                    ×
                  </button>
                )}
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
              {checklist.length > 0 && (
                <>
                  <div className={styles.checklistBar}>
                    <div
                      className={styles.checklistBarFill}
                      style={{ width: `${checkPct}%`, background: progressColor }}
                    />
                  </div>
                  <ul className={styles.checklistList}>
                    {checklist.map(item => (
                      <ChecklistRow
                        key={item.id}
                        taskId={task.id}
                        itemId={item.id}
                        title={item.title}
                        done={item.done}
                      />
                    ))}
                  </ul>
                </>
              )}
              <div className={styles.checklistAdd}>
                <input
                  ref={checkInputRef}
                  className={styles.checklistInput}
                  value={checkInput}
                  onChange={e => setCheckInput(e.target.value)}
                  placeholder="Додати підзадачу..."
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddChecklist() } }}
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
            </div>

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

          </div>
        </div>
      </div>

      {/* ── Label Picker (separate fixed overlay, z-index 300) ── */}
      {labelPickerOpen && (
        <LabelPicker
          selectedLabels={taskLabels}
          onToggle={label => {
            const isOn = taskLabels.some(l => l.id === label.id)
            if (isOn) removeLabel(task.id, label.id)
            else      addLabel(task.id, label)
          }}
          onClose={() => setLabelPickerOpen(false)}
        />
      )}

      {/* ── Date Picker (separate fixed overlay, z-index 400) ── */}
      {showDatePicker && (
        <CustomDatePicker
          value={task.dueDate}
          onChange={handleDateChange}
          onClose={() => setShowDatePicker(false)}
        />
      )}
    </>
  )
}

export default TaskDetailModal
