import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PriorityBadge from '../../ui/PriorityBadge'
import TaskDetailModal from '../../sprint/TaskDetailModal'
import { useSprintStore } from '../../../store/sprintStore'
import type { TodoPriority } from '../../../types'
import styles from './TasksAccordion.module.css'

/**
 * TasksAccordion
 * --------------
 * Єдиний акордеон-блок на Dashboard що об'єднує спрінт-задачі та покупки.
 * Замінює окремі SprintMini і TodosMini.
 *
 * Секція 1 — ЗАДАЧІ: задачі поточного тижня (type=sprint),
 *   за замовчуванням відкрита, показує перші 4 задачі з чекбоксами.
 *   Тап на назву задачі → відкриває TaskDetailModal.
 *
 * Секція 2 — ПОКУПКИ: items типу shopping/todo,
 *   за замовчуванням закрита, показує перші 3 з PriorityBadge.
 *   Тап на назву → відкриває TaskDetailModal.
 */

const SPRINT_LIMIT = 4
const SHOPPING_LIMIT = 3
const PRIORITY_ORDER: Record<TodoPriority, number> = { urgent: 0, normal: 1, low: 2 }

const PlusIcon: React.FC = () => (
  <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
    <path d="M4.5 1.5v6M1.5 4.5h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
)

const CheckIcon: React.FC = () => (
  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
    <path d="M1.5 4l2 2 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const ShopTag: React.FC = () => (
  <span className={styles.shopTag} aria-hidden="true">
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
      <path d="M2 3.5h8l-.8 5.5H2.8L2 3.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
      <path d="M4 3.5V2.5a2 2 0 0 1 4 0v1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  </span>
)

const TasksAccordion: React.FC = () => {
  const navigate = useNavigate()
  const { items, toggleItem } = useSprintStore()

  const todoItems  = items.filter((t) => t.type === 'todo')
  const todoActive = todoItems.filter((t) => !t.done)

  const [questsOpen, setQuestsOpen]   = useState(() => items.filter(t => t.type === 'todo' && !t.done).length > 0)
  const [shoppingOpen, setShoppingOpen] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [completingShop, setCompletingShop] = useState<Set<string>>(new Set())

  const handleShopToggle = (id: string, isDone: boolean) => {
    if (!isDone) {
      setCompletingShop(prev => new Set(prev).add(id))
      toggleItem(id)
      setTimeout(() => {
        setCompletingShop(prev => { const s = new Set(prev); s.delete(id); return s })
      }, 380)
    } else {
      toggleItem(id)
    }
  }

  const todoDone    = todoItems.filter((t) => t.done).length
  const todoAllDone = todoItems.length > 0 && todoDone === todoItems.length
  const todoPct     = todoItems.length > 0 ? Math.round((todoDone / todoItems.length) * 100) : 0
  const todoVisible = todoActive.slice(0, SPRINT_LIMIT)
  const todoRest    = todoActive.length - SPRINT_LIMIT

  const shoppingItems = items
    .filter((t) => t.type === 'shopping' && (!t.done || completingShop.has(t.id)))
    .sort((a, b) => PRIORITY_ORDER[a.priority ?? 'normal'] - PRIORITY_ORDER[b.priority ?? 'normal'])
  const shoppingVisible = shoppingItems.slice(0, SHOPPING_LIMIT)
  const shoppingRest    = shoppingItems.length - SHOPPING_LIMIT
  const shoppingTotal   = items.filter((t) => t.type === 'shopping' && !t.done).length

  return (
    <div className={styles.root}>

      {/* ── Секція 1: КВЕСТИ ── */}
      <div className={styles.section}>
        <button
          type="button"
          className={styles.header}
          onClick={() => setQuestsOpen((v) => !v)}
          aria-expanded={questsOpen}
        >
          <span className={styles.headerLabel}>Квести</span>
          <div className={styles.headerRight}>
            {todoItems.length > 0 && (
              <span
                className={styles.badge}
                style={{ color: todoAllDone ? 'var(--second)' : 'var(--accent)' }}
              >
                {todoDone}/{todoItems.length}
              </span>
            )}
            <svg
              className={`${styles.arrow} ${questsOpen ? styles.arrowOpen : ''}`}
              width="12" height="12" viewBox="0 0 12 12" fill="none"
            >
              <path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </button>

        <div className={`${styles.progressWrap} ${questsOpen ? styles.progressVisible : ''}`}>
          <div className={styles.progressTrack}>
            <div
              className={styles.progressFill}
              style={{
                width:      `${todoPct}%`,
                background: todoAllDone ? 'var(--second)' : 'var(--accent)',
              }}
            />
          </div>
        </div>

        <div className={`${styles.content} ${questsOpen ? styles.contentOpen : ''}`}>
          <div className={styles.contentInner}>
            {todoItems.length === 0 ? (
              <p className={styles.emptyText}>Квестів немає</p>
            ) : todoActive.length === 0 ? (
              <p className={styles.emptyText}>Всі квести виконано ✓</p>
            ) : (
              <ul className={styles.list}>
                {todoVisible.map((t) => (
                  <li key={t.id} className={styles.item}>
                    <button
                      type="button"
                      className={`${styles.checkbox} ${t.done ? styles.checkboxDone : styles.checkboxUndone}`}
                      onClick={(e) => { e.stopPropagation(); toggleItem(t.id) }}
                      aria-label={t.done ? 'Позначити невиконаним' : 'Позначити виконаним'}
                    >
                      {t.done && <CheckIcon />}
                    </button>
                    <span
                      className={`${styles.itemTitle} ${t.done ? styles.itemDone : ''}`}
                      onClick={() => setSelectedTaskId(t.id)}
                    >
                      {t.title}
                    </span>
                    {t.labels && t.labels.length > 0 && t.labels.slice(0, 2).map(label => (
                      <span key={label.id} className={styles.labelDot} style={{ background: label.color }} />
                    ))}
                    {t.checklist && t.checklist.length > 0 && (
                      <span className={styles.checklistBadge}>
                        {t.checklist.filter(i => i.done).length}/{t.checklist.length}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {todoRest > 0 && (
              <button
                type="button"
                className={styles.moreBtn}
                onClick={() => navigate('/sprint')}
              >
                ще {todoRest} →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Роздільник ── */}
      <div className={styles.divider} />

      {/* ── TaskDetailModal ── */}
      <TaskDetailModal
        taskId={selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
      />

      {/* ── Секція 2: ПОКУПКИ ── */}
      <div className={styles.section}>
        <button
          type="button"
          className={styles.header}
          onClick={() => setShoppingOpen((v) => !v)}
          aria-expanded={shoppingOpen}
        >
          <span className={styles.headerLabel}>Покупки</span>
          <div className={styles.headerRight}>
            {shoppingTotal > 0 && (
              <span className={styles.badge} style={{ color: 'var(--second)' }}>
                {shoppingTotal}
              </span>
            )}
            <svg
              className={`${styles.arrow} ${shoppingOpen ? styles.arrowOpen : ''}`}
              width="12" height="12" viewBox="0 0 12 12" fill="none"
            >
              <path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </button>

        <div className={`${styles.content} ${shoppingOpen ? styles.contentOpen : ''}`}>
          <div className={styles.contentInner}>
            {shoppingItems.length === 0 ? (
              <p className={styles.emptyText}>Список порожній</p>
            ) : (
              <ul className={styles.list}>
                {shoppingVisible.map((t) => (
                  <li key={t.id} className={`${styles.item} ${completingShop.has(t.id) ? styles.itemCompleting : ''}`}>
                    <button
                      type="button"
                      className={`${styles.checkboxShop} ${(t.done || completingShop.has(t.id)) ? styles.checkboxShopDone : ''}`}
                      onClick={(e) => { e.stopPropagation(); handleShopToggle(t.id, t.done) }}
                      aria-label={t.done ? 'Позначити невиконаним' : 'Позначити виконаним'}
                    >
                      {(t.done || completingShop.has(t.id)) ? <CheckIcon /> : <PlusIcon />}
                    </button>
                    <span
                      className={`${styles.itemTitle} ${(t.done || completingShop.has(t.id)) ? styles.itemDone : ''}`}
                      onClick={() => setSelectedTaskId(t.id)}
                    >
                      {t.title}
                    </span>
                    {t.priority && <PriorityBadge priority={t.priority} compact />}
                    {t.checklist && t.checklist.length > 0 && (
                      <span className={styles.checklistBadge}>
                        {t.checklist.filter(i => i.done).length}/{t.checklist.length}
                      </span>
                    )}
                    <ShopTag />
                  </li>
                ))}
              </ul>
            )}

            {shoppingRest > 0 && (
              <button
                type="button"
                className={styles.moreBtn}
                onClick={() => navigate('/sprint')}
              >
                ще {shoppingRest} →
              </button>
            )}
          </div>
        </div>
      </div>

    </div>
  )
}

export default TasksAccordion
