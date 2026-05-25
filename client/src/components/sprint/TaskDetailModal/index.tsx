import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useSprintStore, LABEL_COLORS } from '../../../store/sprintStore'
import { useLongPress } from '../../../hooks/useLongPress'
import type { SprintLabel } from '../../../types'
import styles from './TaskDetailModal.module.css'

/**
 * TaskDetailModal
 * ---------------
 * Bottom-sheet картка задачі у стилі Trello.
 * Три таби: МІТКИ / ДАТИ / ЧЕК-ЛІСТ.
 * Дані беруться зі store по taskId.
 *
 * Props:
 * @prop {string | null}  taskId    — id задачі або null (modal закритий)
 * @prop {() => void}     onClose   — callback закриття
 */
interface TaskDetailModalProps {
  taskId: string | null
  onClose: () => void
}

type Tab = 'labels' | 'dates' | 'checklist'

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

// ── Checklist Item with long-press delete ────────────────────────────────────

interface ChecklistRowProps {
  taskId: string
  itemId: string
  title: string
  done: boolean
}

const ChecklistRow: React.FC<ChecklistRowProps> = ({ taskId, itemId, title, done }) => {
  const { toggleChecklistItem, removeChecklistItem } = useSprintStore()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const longPress = useLongPress(() => setConfirmDelete(true), 600)

  if (confirmDelete) {
    return (
      <li className={styles.checklistItem}>
        <span className={styles.checklistConfirmText}>Видалити підзадачу?</span>
        <button type="button" className={styles.checklistConfirmYes}
          onClick={() => removeChecklistItem(taskId, itemId)}>
          Так
        </button>
        <button type="button" className={styles.checklistConfirmNo}
          onClick={() => setConfirmDelete(false)}>
          Ні
        </button>
      </li>
    )
  }

  return (
    <li className={styles.checklistItem} {...longPress}>
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
    </li>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ taskId, onClose }) => {
  const {
    items,
    globalLabels,
    updateTask,
    toggleItem,
    addChecklistItem,
    addLabel,
    removeLabel,
    addGlobalLabel,
    updateGlobalLabel,
    deleteGlobalLabel,
  } = useSprintStore()

  const task = items.find(i => i.id === taskId) ?? null

  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('labels')

  // Title inline edit
  const [titleDraft, setTitleDraft] = useState('')
  const titleRef = useRef<HTMLTextAreaElement>(null)

  // Description
  const [descDraft, setDescDraft] = useState('')
  const descRef = useRef<HTMLTextAreaElement>(null)

  // Checklist input
  const [checkInput, setCheckInput] = useState('')
  const checkInputRef = useRef<HTMLInputElement>(null)

  // Labels state
  type LabelView = 'list' | 'create' | 'edit'
  const [labelView, setLabelView] = useState<LabelView>('list')
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null)
  const [labelFormTitle, setLabelFormTitle] = useState('')
  const [labelFormColor, setLabelFormColor] = useState(LABEL_COLORS[0])

  useEffect(() => {
    if (taskId) {
      setMounted(true)
      setActiveTab('labels')
      setLabelView('list')
      setEditingLabelId(null)
      setCheckInput('')
    } else {
      const t = setTimeout(() => setMounted(false), 280)
      return () => clearTimeout(t)
    }
  }, [taskId])

  useEffect(() => {
    if (task) {
      setTitleDraft(task.title)
      setDescDraft(task.description ?? '')
    }
  }, [task?.id])  // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-resize description textarea
  useEffect(() => {
    const el = descRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }, [descDraft])

  // Auto-resize title textarea
  useEffect(() => {
    const el = titleRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }, [titleDraft])

  // ESC to close
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

  const handleLabelToggle = (label: SprintLabel) => {
    if (!task) return
    const isAttached = (task.labels ?? []).some(l => l.id === label.id)
    if (isAttached) removeLabel(task.id, label.id)
    else            addLabel(task.id, label)
  }

  const handleLabelEditStart = (label: SprintLabel) => {
    setEditingLabelId(label.id)
    setLabelFormTitle(label.title)
    setLabelFormColor(label.color)
    setLabelView('edit')
  }

  const handleLabelCreateStart = () => {
    setEditingLabelId(null)
    setLabelFormTitle('')
    setLabelFormColor(LABEL_COLORS[0])
    setLabelView('create')
  }

  const handleLabelFormSave = () => {
    if (labelView === 'create') {
      const label: SprintLabel = {
        id: crypto.randomUUID(),
        title: labelFormTitle.trim(),
        color: labelFormColor,
      }
      addGlobalLabel(label)
      if (task) addLabel(task.id, label)
    } else if (labelView === 'edit' && editingLabelId) {
      updateGlobalLabel(editingLabelId, { title: labelFormTitle, color: labelFormColor })
    }
    setLabelView('list')
  }

  const handleLabelFormDelete = () => {
    if (editingLabelId) deleteGlobalLabel(editingLabelId)
    setEditingLabelId(null)
    setLabelView('list')
  }

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!task) return
    updateTask(task.id, { dueDate: e.target.value || undefined })
  }

  if (!mounted || !task) return null

  const checklist = task.checklist ?? []
  const checkDone = checklist.filter(c => c.done).length
  const checkPct  = checklist.length > 0 ? Math.round((checkDone / checklist.length) * 100) : 0
  const progressColor = checkPct === 100 ? 'var(--positive)' : checkPct >= 50 ? 'var(--gold)' : 'var(--negative)'
  const taskLabels = task.labels ?? []

  const isOpen = !!taskId

  return (
    <div
      className={`${styles.overlay} ${isOpen ? styles.overlayIn : styles.overlayOut}`}
      onClick={onClose}
    >
      <div
        className={`${styles.sheet} ${isOpen ? styles.sheetIn : styles.sheetOut}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
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
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={handleTitleBlur}
            rows={1}
          />

          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Закрити">
            ✕
          </button>
        </div>

        {/* ── Tabs ── */}
        <div className={styles.tabs}>
          {([
            { key: 'labels',    label: 'Мітки'    },
            { key: 'dates',     label: 'Дати'      },
            { key: 'checklist', label: 'Чек-ліст'  },
          ] as { key: Tab; label: string }[]).map(t => (
            <button
              key={t.key}
              type="button"
              className={`${styles.tab} ${activeTab === t.key ? styles.tabActive : ''}`}
              onClick={() => setActiveTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Body ── */}
        <div className={styles.body}>

          {/* ════ МІТКИ TAB ════ */}
          {activeTab === 'labels' && (
            <div className={styles.tabContent}>
              {(labelView === 'create' || labelView === 'edit' || globalLabels.length === 0) ? (
                /* ── Label form (create / edit / перша мітка) ── */
                <div className={styles.labelForm}>
                  {/* ← back — тільки якщо є куди повертатись */}
                  {globalLabels.length > 0 && (
                    <button
                      type="button"
                      className={styles.labelFormBack}
                      onClick={() => setLabelView('list')}
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Мітки
                    </button>
                  )}

                  {/* Preview */}
                  <div
                    className={styles.labelPreview}
                    style={{ background: labelFormColor }}
                  >
                    {labelFormTitle && (
                      <span className={styles.labelPreviewText}>{labelFormTitle}</span>
                    )}
                  </div>

                  {/* Name */}
                  <p className={styles.labelFieldLabel}>Назва</p>
                  <input
                    className={styles.labelInput}
                    value={labelFormTitle}
                    onChange={e => setLabelFormTitle(e.target.value)}
                    placeholder="Назва мітки..."
                    autoFocus
                  />

                  {/* Color grid */}
                  <p className={styles.labelFieldLabel}>Колір</p>
                  <div className={styles.colorGrid}>
                    {LABEL_COLORS.map(c => (
                      <button
                        key={c}
                        type="button"
                        className={styles.colorSwatch}
                        style={{ background: c }}
                        onClick={() => setLabelFormColor(c)}
                        aria-label={c}
                        aria-pressed={labelFormColor === c}
                      >
                        {labelFormColor === c && (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6.5l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className={styles.labelFormActions}>
                    <button type="button" className={styles.labelSaveBtn} onClick={handleLabelFormSave}>
                      Зберегти
                    </button>
                    {labelView === 'edit' && (
                      <button type="button" className={styles.labelDeleteBtn} onClick={handleLabelFormDelete}>
                        Видалити
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* ── Label list ── */
                <>
                  <div className={styles.globalLabelsList}>
                    {globalLabels.map(label => {
                      const isAttached = taskLabels.some(l => l.id === label.id)
                      return (
                        <div key={label.id} className={styles.globalLabelRow}>
                          <button
                            type="button"
                            className={`${styles.globalLabelCheck} ${isAttached ? styles.globalLabelCheckOn : ''}`}
                            onClick={() => handleLabelToggle(label)}
                            aria-label={isAttached ? 'Прибрати мітку' : 'Прикріпити мітку'}
                          >
                            {isAttached && (
                              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                                <path d="M1.5 4l2 2 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </button>
                          <button
                            type="button"
                            className={styles.globalLabelBlock}
                            style={{ background: label.color }}
                            onClick={() => handleLabelToggle(label)}
                          >
                            {label.title && (
                              <span className={styles.globalLabelName}>{label.title}</span>
                            )}
                          </button>
                          <button
                            type="button"
                            className={styles.globalLabelEdit}
                            onClick={() => handleLabelEditStart(label)}
                            aria-label="Редагувати мітку"
                          >
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                              <path d="M8.5 1.5l2 2L3.5 10.5H1.5v-2L8.5 1.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
                            </svg>
                          </button>
                        </div>
                      )
                    })}
                  </div>

                  <button
                    type="button"
                    className={styles.createLabelBtn}
                    onClick={handleLabelCreateStart}
                  >
                    Створити нову мітку
                  </button>
                </>
              )}
            </div>
          )}

          {/* ════ ДАТИ TAB ════ */}
          {activeTab === 'dates' && (
            <div className={styles.tabContent}>
              <p className={styles.fieldLabel}>Дедлайн</p>
              <div className={styles.dateRow}>
                <input
                  type="date"
                  className={styles.dateInput}
                  value={task.dueDate ?? ''}
                  onChange={handleDateChange}
                />
                {task.dueDate && (
                  <button
                    type="button"
                    className={styles.dateClear}
                    onClick={() => updateTask(task.id, { dueDate: undefined })}
                    aria-label="Очистити дедлайн"
                  >
                    ×
                  </button>
                )}
              </div>
              {task.dueDate && (
                <p className={styles.dateHuman} style={{ color: getDueDateColor(task.dueDate) }}>
                  {formatDueDateHuman(task.dueDate)}
                </p>
              )}
            </div>
          )}

          {/* ════ ЧЕК-ЛІСТ TAB ════ */}
          {activeTab === 'checklist' && (
            <div className={styles.tabContent}>
              {checklist.length > 0 && (
                <>
                  <div className={styles.checklistProgress}>
                    <span className={styles.checklistPct} style={{ color: progressColor }}>
                      {checkPct}%
                    </span>
                    <div className={styles.checklistBar}>
                      <div
                        className={styles.checklistBarFill}
                        style={{ width: `${checkPct}%`, background: progressColor }}
                      />
                    </div>
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
          )}

          {/* ── Опис — завжди видимий ── */}
          <div className={styles.descSection}>
            <p className={styles.fieldLabel}>Опис</p>
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
  )
}

export default TaskDetailModal
