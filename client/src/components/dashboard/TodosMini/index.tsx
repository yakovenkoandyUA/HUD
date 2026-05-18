import React, { useState } from 'react'
import Card from '../../ui/Card'
import PriorityBadge from '../../ui/PriorityBadge'
import { useSprintStore } from '../../../store/sprintStore'
import type { TodoPriority } from '../../../types'
import styles from './TodosMini.module.css'

/**
 * TodosMini
 * ---------
 * Інтерактивний міні-список справ для Dashboard.
 * Відображається якщо є хоча б одна незавершена справа або відкрита форма.
 * Дозволяє позначати виконання і додавати нові справи (одну або списком).
 */

const PRIORITY_ORDER: Record<TodoPriority, number> = {
  urgent: 0, normal: 1, low: 2,
}

const VISIBLE_LIMIT = 5

const TodosMini: React.FC = () => {
  const { todos, toggleTodo, addTodo, addTodos } = useSprintStore()
  const [showForm, setShowForm] = useState(false)
  const [closing, setClosing] = useState(false)
  const [mode, setMode] = useState<'single' | 'list'>('single')
  const [title, setTitle] = useState('')
  const [listText, setListText] = useState('')
  const [priority, setPriority] = useState<TodoPriority>('normal')

  const pending = todos
    .filter((t) => !t.done)
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])

  const ANIM_MS = 220

  const openForm = () => { setClosing(false); setShowForm(true) }
  const closeForm = () => {
    setClosing(true)
    setTimeout(() => { setShowForm(false); setClosing(false) }, ANIM_MS)
  }

  const visible = pending.slice(0, VISIBLE_LIMIT)
  const rest = pending.length - visible.length

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (mode === 'single') {
      if (!title.trim()) return
      addTodo(title.trim(), priority)
      setTitle('')
    } else {
      const lines = listText.split('\n').map((l) => l.trim()).filter(Boolean)
      if (!lines.length) return
      addTodos(lines.map((t) => ({ title: t, priority })))
      setListText('')
    }
    closeForm()
  }

  return (
    <Card className={styles.card}>
      <div className={styles.header}>
        <span className={styles.label}>Запаси</span>
        <div className={styles.headerRight}>
          {pending.length > 0 && <span className={styles.badge}>{pending.length}</span>}
          <button
            type="button"
            className={`${styles.addBtn} ${showForm ? styles.addBtnActive : ''}`}
            onClick={() => showForm ? closeForm() : openForm()}
            aria-label={showForm ? 'Закрити' : 'Додати'}
          >
            {showForm ? '✕' : '+'}
          </button>
        </div>
      </div>

      {pending.length === 0 && !showForm && (
        <div className={styles.empty}>
          <svg className={styles.emptyIcon} width="32" height="32" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3"/>
            <path d="M10 16.5l4 4 8-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className={styles.emptyTitle}>СПИСОК ЧИСТИЙ</span>
          <span className={styles.emptyHint}>Нічого не потрібно. Поки що.</span>
        </div>
      )}

      {pending.length > 0 && (
        <ul className={styles.list}>
          {visible.map((t) => (
            <li key={t.id} className={styles.item}>
              <button
                type="button"
                className={styles.check}
                onClick={() => toggleTodo(t.id)}
                aria-label="Позначити виконаним"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
              </button>
              <span className={styles.title}>{t.title}</span>
              <PriorityBadge priority={t.priority} compact />
            </li>
          ))}
        </ul>
      )}

      {rest > 0 && (
        <div className={styles.more}>ще {rest} справ</div>
      )}

      {showForm && (
        <form
          className={`${styles.form} ${closing ? styles.formExit : ''}`}
          onSubmit={handleSubmit}
        >
          <div className={styles.modeRow}>
            <button
              type="button"
              className={`${styles.modeBtn} ${mode === 'single' ? styles.modeBtnActive : ''}`}
              onClick={() => setMode('single')}
            >
              Одна річ
            </button>
            <button
              type="button"
              className={`${styles.modeBtn} ${mode === 'list' ? styles.modeBtnActive : ''}`}
              onClick={() => setMode('list')}
            >
              Закупиться на повну
            </button>
          </div>

          <div className={styles.priorityRow}>
            {(['urgent', 'normal', 'low'] as TodoPriority[]).map((p) => (
              <button
                key={p}
                type="button"
                className={`${styles.priBtn} ${priority === p ? styles.priBtnActive : ''}`}
                onClick={() => setPriority(p)}
                aria-label={p}
              >
                <PriorityBadge priority={p} />
              </button>
            ))}
          </div>

          {mode === 'single' ? (
            <input
              className={styles.input}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Назва..."
              autoFocus
            />
          ) : (
            <textarea
              className={styles.textarea}
              value={listText}
              onChange={(e) => setListText(e.target.value)}
              placeholder={'Кожен рядок — окремий пункт:\nМолоко\nХліб\nКорм для кота'}
              rows={4}
              autoFocus
            />
          )}

          <button type="submit" className={styles.submitBtn}>Додати</button>
        </form>
      )}
    </Card>
  )
}

export default TodosMini
