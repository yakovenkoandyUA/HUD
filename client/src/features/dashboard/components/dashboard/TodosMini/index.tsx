import React, { useState } from 'react'
import Card from '@/shared/components/ui/Card'
import PriorityBadge from '@/shared/components/ui/PriorityBadge'
import { useSprintStore } from '@/features/sprint/store/sprintStore'
import type { TodoPriority } from '@/shared/types'
import styles from './TodosMini.module.css'

/**
 * TodosMini
 * ---------
 * Інтерактивний міні-список покупок/todos для Dashboard.
 * Показує всі type=shopping та type=todo елементи.
 * Чекбокс: квадратний (border-radius 6px), + коли невиконано, ✓ коли виконано.
 * Лічильник: var(--second), приглушений коли список порожній.
 */

const PRIORITY_ORDER: Record<TodoPriority, number> = { urgent: 0, normal: 1, low: 2 }
const VISIBLE_LIMIT = 5

const PlusIcon: React.FC = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
    <path d="M5 2v6M2 5h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
)

const CheckIcon: React.FC = () => (
  <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
    <path d="M1.5 4.5l2.2 2.2 4-4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const ShopTag: React.FC = () => (
  <span className={styles.tag} aria-hidden="true">
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
      <path
        d="M2 3.5h8l-.8 5.5H2.8L2 3.5z"
        stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"
      />
      <path
        d="M4 3.5V2.5a2 2 0 0 1 4 0v1"
        stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"
      />
    </svg>
  </span>
)

const TodosMini: React.FC = () => {
  const { items, toggleItem, addItem, addItems } = useSprintStore()
  const [showForm, setShowForm] = useState(false)
  const [closing, setClosing] = useState(false)
  const [mode, setMode] = useState<'single' | 'list'>('single')
  const [title, setTitle] = useState('')
  const [listText, setListText] = useState('')
  const [priority, setPriority] = useState<TodoPriority>('normal')

  const pending = items
    .filter((t) => !t.done && t.type !== 'sprint')
    .sort((a, b) => PRIORITY_ORDER[a.priority ?? 'normal'] - PRIORITY_ORDER[b.priority ?? 'normal'])

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
      addItem({ type: 'shopping', title: title.trim(), priority })
      setTitle('')
    } else {
      const lines = listText.split('\n').map((l) => l.trim()).filter(Boolean)
      if (!lines.length) return
      addItems(lines.map((t) => ({ type: 'shopping' as const, title: t, priority })))
      setListText('')
    }
    closeForm()
  }

  const badgeColor   = pending.length === 0 ? 'var(--text3)' : 'var(--second)'
  const badgeBg      = pending.length === 0 ? 'transparent' : 'var(--second-soft)'

  return (
    <Card className={styles.card}>
      <div className={styles.header}>
        <span className={styles.label}>Запаси</span>
        <div className={styles.headerRight}>
          {pending.length > 0 && (
            <span className={styles.badge} style={{ color: badgeColor, background: badgeBg }}>
              {pending.length}
            </span>
          )}
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
        <span className={styles.emptyText}>Запасів немає</span>
      )}

      {pending.length > 0 && (
        <ul className={styles.list}>
          {visible.map((t) => (
            <li key={t.id} className={styles.item}>
              <button
                type="button"
                className={`${styles.check} ${t.done ? styles.checkDone : ''}`}
                onClick={() => toggleItem(t.id)}
                aria-label={t.done ? 'Позначити невиконаним' : 'Позначити виконаним'}
              >
                {t.done ? <CheckIcon /> : <PlusIcon />}
              </button>
              <span className={`${styles.title} ${t.done ? styles.titleDone : ''}`}>
                {t.title}
              </span>
              {t.priority && <PriorityBadge priority={t.priority} compact />}
              <ShopTag />
            </li>
          ))}
        </ul>
      )}

      {rest > 0 && <div className={styles.more}>ще {rest} справ</div>}

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
