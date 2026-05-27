import React, { useState, useEffect } from 'react'
import TopBar from '../../components/layout/TopBar'
import WeekHeader from '../../components/sprint/WeekHeader'
import SprintProgress from '../../components/sprint/SprintProgress'
import TaskCard from '../../components/sprint/TaskCard'
import TaskDetailModal from '../../components/sprint/TaskDetailModal'
import LessonItem from '../../components/lessons/LessonItem'
import LessonForm from '../../components/lessons/LessonForm'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import { useSprintStore } from '../../store/sprintStore'
import { useLessonStore } from '../../store/lessonStore'
import { useUiStore } from '../../store/uiStore'
import { getCurrentWeekStart } from '../../utils/sprint'
import { getToken } from '../../services/api'
import type { Lesson, UnifiedTodo, TodoPriority } from '../../types'
import styles from './Sprint.module.css'

const SYNC_COLORS: Record<string, string> = {
  synced: 'var(--positive)', syncing: 'var(--gold)', error: 'var(--negative)', local: 'var(--text3)',
}

type FilterType = 'all' | 'sprint' | 'shopping' | 'todo' | 'lessons'
type SprintStatus = 'all' | 'active' | 'done'

const FILTER_OPTIONS: { key: FilterType; label: string }[] = [
  { key: 'all',      label: 'Всі'     },
  { key: 'sprint',   label: 'Спринт'  },
  { key: 'shopping', label: 'Покупки' },
  { key: 'todo',     label: 'Todo'    },
  { key: 'lessons',  label: 'Уроки'   },
]

const SPRINT_STATUS_OPTIONS: { key: SprintStatus; label: string }[] = [
  { key: 'all',    label: 'Всі'        },
  { key: 'active', label: 'Активні'    },
  { key: 'done',   label: 'Завершені'  },
]

const PRIORITIES: TodoPriority[] = ['urgent', 'normal', 'low']

const PRIORITY_CONFIG: Record<TodoPriority, { symbol: string; label: string; activeClass: string }> = {
  urgent: { symbol: '▲', label: 'ТЕРМІНОВО', activeClass: styles.priBtnActiveUrgent },
  normal: { symbol: '◆', label: 'НОРМ',      activeClass: styles.priBtnActiveNormal },
  low:    { symbol: '▽', label: 'АБИ БУЛО',  activeClass: styles.priBtnActiveLow    },
}

const IconFilter: React.FC = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
    <path d="M2 4h11M4 7.5h7M6 11h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
)

const Sprint: React.FC = () => {
  const { items, addItem, toggleItem, deleteItem, fetchItems, syncStatus } = useSprintStore()
  const { lessons, addLesson, updateLesson, deleteLesson } = useLessonStore()
  const { showToast } = useUiStore()

  const [filter, setFilter] = useState<FilterType>('all')
  const [sprintStatus, setSprintStatus] = useState<SprintStatus>('all')
  const [showFilterPanel, setShowFilterPanel] = useState(false)

  // ── Add task modal ───────────────────────────────────────────────────────
  const [showAdd, setShowAdd] = useState(false)
  const [newType, setNewType] = useState<UnifiedTodo['type']>('sprint')
  const [newTitle, setNewTitle] = useState('')
  const [newPriority, setNewPriority] = useState<TodoPriority>('normal')
  const [newQuantity, setNewQuantity] = useState('')

  // ── Task detail modal ────────────────────────────────────────────────────
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null)

  // ── Lesson modal ─────────────────────────────────────────────────────────
  const [showAddLesson, setShowAddLesson] = useState(false)
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null)

  useEffect(() => {
    if (!getToken()) return
    fetchItems()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const weekStart = getCurrentWeekStart()
  const weekSprintItems = items.filter((t) => t.type === 'sprint' && t.weekStart === weekStart)
  const done = weekSprintItems.filter((t) => t.done).length

  const filteredItems = items.filter((t) => {
    if (filter === 'lessons') return false
    if (filter === 'all') return true
    if (filter === 'sprint') {
      if (t.type !== 'sprint') return false
      if (sprintStatus === 'active') return !t.done
      if (sprintStatus === 'done') return t.done
      return true
    }
    return t.type === filter
  })

  const resetForm = () => {
    setNewTitle('')
    setNewPriority('normal')
    setNewQuantity('')
  }

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    addItem({
      type: newType,
      title: newTitle.trim(),
      ...(newType === 'sprint' ? { tag: 'dev', weekStart } : {}),
      ...(newType !== 'sprint' ? { priority: newPriority } : {}),
      ...(newType === 'shopping' && newQuantity.trim() ? { quantity: newQuantity.trim() } : {}),
    })
    resetForm()
    setShowAdd(false)
    showToast('Задачу додано', 'success')
  }

  const handleSaveLesson = (data: Omit<Lesson, 'id'>) => {
    if (editingLesson) {
      updateLesson(editingLesson.id, data)
      showToast('Урок оновлено', 'success')
    } else {
      addLesson(data.title, data.description, data.date)
      showToast('Урок додано', 'success')
    }
    setShowAddLesson(false)
    setEditingLesson(null)
  }

  const handleFilterSelect = (key: FilterType) => {
    setFilter(key)
    if (key !== 'sprint') setSprintStatus('all')
    setShowFilterPanel(false)
  }

  const isFiltered = filter !== 'all' || sprintStatus !== 'all'

  return (
    <div className={styles.screen}>
      <TopBar title="Todo" right={
        <span
          title={syncStatus}
          style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: SYNC_COLORS[syncStatus] }}
        />
      } />

      <div className={styles.content}>
        <WeekHeader weekStart={weekStart} />
        <SprintProgress done={done} total={weekSprintItems.length} />

        {/* ── Section header ── */}
        <div key={filter + sprintStatus} className={styles.tabContent}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>{filter === 'lessons' ? 'Уроки' : 'Задачі'}</span>
            <div className={styles.sectionActions}>
              <button
                className={`${styles.filterBtn} ${showFilterPanel ? styles.filterBtnOpen : ''} ${isFiltered && !showFilterPanel ? styles.filterBtnActive : ''}`}
                onClick={() => setShowFilterPanel(v => !v)}
                aria-label="Фільтр"
              >
                <IconFilter />
              </button>
              <button
                className={styles.addBtn}
                onClick={() => {
                  if (filter === 'lessons') { setEditingLesson(null); setShowAddLesson(true) }
                  else { setShowAdd(true) }
                }}
                aria-label="Додати"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          </div>

          {/* ── Filter panel ── */}
          {showFilterPanel && (
            <div className={styles.filterPanel}>
              <div className={styles.filterPanelRow}>
                {FILTER_OPTIONS.map(f => (
                  <button
                    key={f.key}
                    className={`${styles.filterChip} ${filter === f.key ? styles.filterChipActive : ''}`}
                    onClick={() => handleFilterSelect(f.key)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              {filter === 'sprint' && (
                <div className={styles.filterPanelRow}>
                  {SPRINT_STATUS_OPTIONS.map(s => (
                    <button
                      key={s.key}
                      className={`${styles.filterChip} ${sprintStatus === s.key ? styles.filterChipStatus : ''}`}
                      onClick={() => { setSprintStatus(s.key); setShowFilterPanel(false) }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Task list ── */}
          {filter !== 'lessons' && (
            filteredItems.length === 0 ? (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>✓</span>
                <span className={styles.emptyTitle}>Список чистий</span>
                <span className={styles.emptyHint}>Додай першу задачу</span>
              </div>
            ) : (
              <ul className={styles.list}>
                {filteredItems.map(t => (
                  <TaskCard
                    key={t.id}
                    item={t}
                    onToggle={() => toggleItem(t.id)}
                    onDelete={() => deleteItem(t.id)}
                    onOpenDetail={() => setDetailTaskId(t.id)}
                  />
                ))}
              </ul>
            )
          )}

          {/* ── Lessons list ── */}
          {filter === 'lessons' && (
            lessons.length === 0 ? (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>📖</span>
                <span className={styles.emptyTitle}>Уроків ще немає</span>
                <span className={styles.emptyHint}>Додай перший урок</span>
              </div>
            ) : (
              <ul className={styles.lessonList}>
                {lessons.map(l => (
                  <LessonItem
                    key={l.id}
                    lesson={l}
                    onEdit={() => { setEditingLesson(l); setShowAddLesson(true) }}
                    onDelete={() => deleteLesson(l.id)}
                  />
                ))}
              </ul>
            )
          )}
        </div>
      </div>

      {/* ── Add task modal ── */}
      <Modal isOpen={showAdd} onClose={() => { setShowAdd(false); resetForm() }} title="Нова задача">
        <form onSubmit={handleAdd} className={styles.taskForm}>
          {/* Type selector */}
          <div className={styles.typeRow}>
            <button
              type="button"
              className={`${styles.typeChip} ${styles.typeChipSprint} ${newType === 'sprint' ? styles.typeChipActive : ''}`}
              onClick={() => setNewType('sprint')}
            >
              ⚡ Спринт
            </button>
            <button
              type="button"
              className={`${styles.typeChip} ${styles.typeChipShopping} ${newType === 'shopping' ? styles.typeChipActive : ''}`}
              onClick={() => setNewType('shopping')}
            >
              🛒 Покупка
            </button>
            <button
              type="button"
              className={`${styles.typeChip} ${styles.typeChipTodo} ${newType === 'todo' ? styles.typeChipActive : ''}`}
              onClick={() => setNewType('todo')}
            >
              ✓ Todo
            </button>
          </div>

          {/* Title */}
          <input
            className={styles.todoInput}
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder="Назва задачі..."
            autoFocus
          />

          {/* Shopping/Todo: priority chips */}
          {(newType === 'shopping' || newType === 'todo') && (
            <div className={styles.priorityRow}>
              {PRIORITIES.map(p => {
                const { symbol, label, activeClass } = PRIORITY_CONFIG[p]
                return (
                  <button
                    key={p}
                    type="button"
                    className={`${styles.priBtn} ${newPriority === p ? activeClass : ''}`}
                    onClick={() => setNewPriority(p)}
                  >
                    <span className={styles.priSymbol}>{symbol}</span>
                    <span className={styles.priLabel}>{label}</span>
                  </button>
                )
              })}
            </div>
          )}

          {/* Shopping: optional quantity */}
          {newType === 'shopping' && (
            <input
              className={styles.todoInput}
              value={newQuantity}
              onChange={e => setNewQuantity(e.target.value)}
              placeholder="Кількість (необов'язково)"
            />
          )}

          <Button type="submit" fullWidth>Додати</Button>
        </form>
      </Modal>

      {/* ── Lesson modal ── */}
      <Modal
        isOpen={showAddLesson}
        onClose={() => { setShowAddLesson(false); setEditingLesson(null) }}
        title={editingLesson ? 'Редагувати урок' : 'Новий урок'}
      >
        <LessonForm
          initial={editingLesson ?? undefined}
          onSave={handleSaveLesson}
          onCancel={() => { setShowAddLesson(false); setEditingLesson(null) }}
        />
      </Modal>

      {/* ── Task detail modal ── */}
      <TaskDetailModal
        taskId={detailTaskId}
        onClose={() => setDetailTaskId(null)}
      />
    </div>
  )
}

export default Sprint
