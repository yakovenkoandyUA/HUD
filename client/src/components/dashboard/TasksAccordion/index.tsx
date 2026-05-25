import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PriorityBadge from '../../ui/PriorityBadge'
import { useSprintStore } from '../../../store/sprintStore'
import { getCurrentWeekStart } from '../../../utils/sprint'
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
 *
 * Секція 2 — ПОКУПКИ: items типу shopping/todo,
 *   за замовчуванням закрита, показує перші 3 з PriorityBadge.
 */

const SPRINT_LIMIT = 4
const SHOPPING_LIMIT = 3
const PRIORITY_ORDER: Record<TodoPriority, number> = { urgent: 0, normal: 1, low: 2 }

const TasksAccordion: React.FC = () => {
  const navigate = useNavigate()
  const { items, toggleItem } = useSprintStore()
  const [sprintOpen, setSprintOpen] = useState(true)
  const [shoppingOpen, setShoppingOpen] = useState(false)

  const weekStart = getCurrentWeekStart()

  const sprintTasks = items.filter((t) => t.type === 'sprint' && t.weekStart === weekStart)
  const sprintDone = sprintTasks.filter((t) => t.done).length
  const sprintPct = sprintTasks.length > 0 ? Math.round((sprintDone / sprintTasks.length) * 100) : 0
  const sprintVisible = sprintTasks.slice(0, SPRINT_LIMIT)
  const sprintRest = sprintTasks.length - SPRINT_LIMIT

  const shoppingItems = items
    .filter((t) => t.type !== 'sprint' && !t.done)
    .sort((a, b) => PRIORITY_ORDER[a.priority ?? 'normal'] - PRIORITY_ORDER[b.priority ?? 'normal'])
  const shoppingVisible = shoppingItems.slice(0, SHOPPING_LIMIT)
  const shoppingRest = shoppingItems.length - SHOPPING_LIMIT
  const shoppingTotal = items.filter((t) => t.type !== 'sprint' && !t.done).length

  return (
    <div className={styles.root}>

      {/* ── Секція 1: ЗАДАЧІ ── */}
      <div className={styles.section}>
        <button
          type="button"
          className={styles.header}
          onClick={() => setSprintOpen((v) => !v)}
          aria-expanded={sprintOpen}
        >
          <span className={styles.headerLabel}>Задачі</span>
          <div className={styles.headerRight}>
            <span className={styles.badge}>
              {sprintDone}/{sprintTasks.length}
            </span>
            <svg
              className={`${styles.arrow} ${sprintOpen ? styles.arrowOpen : ''}`}
              width="12" height="12" viewBox="0 0 12 12" fill="none"
            >
              <path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </button>

        <div className={`${styles.progressWrap} ${sprintOpen ? styles.progressVisible : ''}`}>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${sprintPct}%` }} />
          </div>
        </div>

        <div className={`${styles.content} ${sprintOpen ? styles.contentOpen : ''}`}>
          <div className={styles.contentInner}>
            {sprintTasks.length === 0 ? (
              <p className={styles.emptyText}>Завдань немає</p>
            ) : (
              <ul className={styles.list}>
                {sprintVisible.map((t) => (
                  <li key={t.id} className={styles.item}>
                    <button
                      type="button"
                      className={`${styles.checkbox} ${t.done ? styles.checkboxDone : ''}`}
                      onClick={() => toggleItem(t.id)}
                      aria-label={t.done ? 'Позначити невиконаним' : 'Позначити виконаним'}
                    >
                      {t.done && (
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                          <path d="M1.5 4l2 2 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </button>
                    <span className={`${styles.itemTitle} ${t.done ? styles.itemDone : ''}`}>
                      {t.title}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {sprintRest > 0 && (
              <button
                type="button"
                className={styles.moreBtn}
                onClick={() => navigate('/sprint')}
              >
                ще {sprintRest} →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Роздільник ── */}
      <div className={styles.divider} />

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
              <span className={styles.badge}>{shoppingTotal}</span>
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
                  <li key={t.id} className={styles.item}>
                    <button
                      type="button"
                      className={`${styles.checkbox} ${t.done ? styles.checkboxDone : ''}`}
                      onClick={() => toggleItem(t.id)}
                      aria-label={t.done ? 'Позначити невиконаним' : 'Позначити виконаним'}
                    >
                      {t.done && (
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                          <path d="M1.5 4l2 2 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </button>
                    <span className={`${styles.itemTitle} ${t.done ? styles.itemDone : ''}`}>
                      {t.title}
                    </span>
                    {t.priority && <PriorityBadge priority={t.priority} compact />}
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
