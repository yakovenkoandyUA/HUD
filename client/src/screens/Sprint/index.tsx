import React, { useState, useEffect } from 'react'
import TopBar from '../../components/layout/TopBar'
import WeekHeader from '../../components/sprint/WeekHeader'
import SprintProgress from '../../components/sprint/SprintProgress'
import TaskCard from '../../components/sprint/TaskCard'
import LessonItem from '../../components/lessons/LessonItem'
import LessonForm from '../../components/lessons/LessonForm'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import { useSprintStore, migrateLegacySprint } from '../../store/sprintStore'
import { useLessonStore } from '../../store/lessonStore'
import { useUiStore } from '../../store/uiStore'
import { getCurrentWeekStart } from '../../utils/sprint'
import { migrateSprintToBackend } from '../../utils/migrateToBackend'
import { getToken } from '../../services/api'
import type { Lesson, UnifiedTodo, SprintTag, TodoPriority } from '../../types'
import styles from './Sprint.module.css'

const SYNC_COLORS: Record<string, string> = {
  synced: 'var(--positive)', syncing: 'var(--gold)', error: 'var(--negative)', local: 'var(--text3)',
}

type Filter = 'all' | 'sprint' | 'shopping' | 'todo'

// ── Category config ───────────────────────────────────────────────────────────

const SPRINT_TAGS: SprintTag[] = ['mentorship', 'dev', 'personal', 'learning']

const TAG_LABEL: Record<SprintTag, string> = {
  mentorship: 'Менторство', dev: 'Розробка', personal: 'Особисте', learning: 'Навчання',
}

const TAG_ACTIVE_CLASS: Record<SprintTag, string> = {
  dev: styles.catActiveDev,
  mentorship: styles.catActiveMentorship,
  personal: styles.catActivePersonal,
  learning: styles.catActiveLearning,
}

// ── Priority config ───────────────────────────────────────────────────────────

const PRIORITIES: TodoPriority[] = ['urgent', 'normal', 'low']

const PRIORITY_CONFIG: Record<TodoPriority, { symbol: string; label: string; activeClass: string }> = {
  urgent: { symbol: '▲', label: 'ТЕРМІНОВО', activeClass: styles.priBtnActiveUrgent },
  normal: { symbol: '◆', label: 'НОРМ',      activeClass: styles.priBtnActiveNormal },
  low:    { symbol: '▽', label: 'АБИ БУЛО',  activeClass: styles.priBtnActiveLow    },
}

// ── Component ─────────────────────────────────────────────────────────────────

const Sprint: React.FC = () => {
  const { items, addItem, addItems, toggleItem, deleteItem, fetchItems, syncStatus } = useSprintStore()
  const { lessons, addLesson, updateLesson, deleteLesson } = useLessonStore()
  const { showToast } = useUiStore()

  const [filter, setFilter] = useState<Filter>('all')
  const [showLessons, setShowLessons] = useState(false)

  // ── Add task modal state ─────────────────────────────────────────────────
  const [showAdd, setShowAdd] = useState(false)
  const [newType, setNewType] = useState<UnifiedTodo['type']>('sprint')
  const [newTitle, setNewTitle] = useState('')
  const [newTag, setNewTag] = useState<SprintTag>('dev')
  const [newPriority, setNewPriority] = useState<TodoPriority>('normal')
  const [newQuantity, setNewQuantity] = useState('')

  // ── Lesson modal state ───────────────────────────────────────────────────
  const [showAddLesson, setShowAddLesson] = useState(false)
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null)

  useEffect(() => {
    migrateLegacySprint()
    if (!getToken()) return
    migrateSprintToBackend().then(() => fetchItems())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const weekStart = getCurrentWeekStart()
  const weekSprintItems = items.filter((t) => t.type === 'sprint' && t.weekStart === weekStart)
  const done = weekSprintItems.filter((t) => t.done).length

  const filteredItems = items.filter((t) => {
    if (filter === 'all') return true
    return t.type === filter
  })

  const resetForm = () => {
    setNewTitle('')
    setNewTag('dev')
    setNewPriority('normal')
    setNewQuantity('')
  }

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    addItem({
      type: newType,
      title: newTitle.trim(),
      ...(newType === 'sprint' ? { tag: newTag, weekStart } : {}),
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

  const FILTERS: { key: Filter; label: string }[] = [
    { key: 'all',      label: 'Всі'     },
    { key: 'sprint',   label: 'Спринт'  },
    { key: 'shopping', label: 'Покупки' },
    { key: 'todo',     label: 'Todo'    },
  ]

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

        {/* ── Filter chips ── */}
        <div className={styles.filterRow}>
          {FILTERS.map(f => (
            <button
              key={f.key}
              className={`${styles.filterChip} ${filter === f.key ? styles.filterChipActive : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* ── Section header + add ── */}
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>Задачі</span>
          <div className={styles.sectionActions}>
            <button className={styles.addBtn} onClick={() => setShowAdd(true)} aria-label="Додати задачу">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
            <button
              className={`${styles.addBtn} ${showLessons ? styles.addBtnActive : ''}`}
              onClick={() => setShowLessons(v => !v)}
              title="Уроки"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 3h10M2 7h7M2 11h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* ── Task list ── */}
        {filteredItems.length === 0 ? (
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
              />
            ))}
          </ul>
        )}

        {/* ── Lessons section ── */}
        {showLessons && (
          <div className={styles.lessonsSection}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionTitle}>Уроки</span>
              <button className={styles.addBtn} onClick={() => { setEditingLesson(null); setShowAddLesson(true) }} aria-label="Додати урок">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            {lessons.length === 0 ? (
              <p className={styles.emptySimple}>Уроків ще немає</p>
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
            )}
          </div>
        )}
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

          {/* Sprint: tag chips */}
          {newType === 'sprint' && (
            <div className={styles.catRow}>
              {SPRINT_TAGS.map(t => (
                <button
                  key={t}
                  type="button"
                  className={`${styles.catBtn} ${newTag === t ? TAG_ACTIVE_CLASS[t] : ''}`}
                  onClick={() => setNewTag(t)}
                >
                  {TAG_LABEL[t]}
                </button>
              ))}
            </div>
          )}

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
    </div>
  )
}

export default Sprint
