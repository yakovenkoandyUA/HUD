import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PriorityBadge from '../../ui/PriorityBadge'
import TaskDetailModal from '../../sprint/TaskDetailModal'
import { useSprintStore } from '../../../store/sprintStore'
import { useNotesStore } from '../../../store/notesStore'
import { isRecurring } from '../../../utils/sprint'
import type { TodoPriority } from '../../../types'
import styles from './TasksAccordion.module.css'

/**
 * TasksAccordion
 * --------------
 * Єдиний акордеон-блок на Dashboard: КВЕСТИ / ПОКУПКИ / НОТАТКИ.
 *
 * Секція 1 — КВЕСТИ: type=sprint|todo та !isRecurring, перші 4, з чекбоксами.
 * Секція 2 — ПОКУПКИ: type=shopping, перші 3, з PriorityBadge.
 * Секція 3 — НОТАТКИ: останні 3, тап → /notes.
 */

const SPRINT_LIMIT = 4
const SHOPPING_LIMIT = 3
const PRIORITY_ORDER: Record<TodoPriority, number> = { urgent: 0, normal: 1, low: 2 }

const CheckIcon: React.FC = () => (
  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
    <path d="M1.5 4l2 2 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const d = new Date()
const todayIso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const NOTES_LIMIT = 3

function formatRelative(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (d.toDateString() === now.toDateString())
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  if (d.toDateString() === yesterday.toDateString()) return 'вчора'
  return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}`
}

const TasksAccordion: React.FC = () => {
  const navigate = useNavigate()
  const { items, toggleItem } = useSprintStore()
  const { notes, fetchNotes } = useNotesStore()

  useEffect(() => {
    let cancelled = false
    const load = async () => { await fetchNotes(); }
    load()
    return () => { cancelled = true; void cancelled }
  }, [])

  const isDoneToday = (t: Parameters<typeof isRecurring>[0]) =>
    isRecurring(t) ? !!(t.completionLog?.some(d => d >= todayIso)) : t.done

  const todoItems  = items.filter((t) => (t.type === 'sprint' || t.type === 'todo') && !isRecurring(t))
  const todoActive = todoItems.filter((t) => !isDoneToday(t))

  const [questsOpen, setQuestsOpen]   = useState(false)
  const [shoppingOpen, setShoppingOpen] = useState(false)
  const [notesOpen, setNotesOpen]       = useState(false)
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

  const todoVisible = todoActive.slice(0, SPRINT_LIMIT)
  const todoRest    = todoActive.length - SPRINT_LIMIT

  const shoppingItems = items
    .filter((t) => t.type === 'shopping' && (!t.done || completingShop.has(t.id)))
    .sort((a, b) => PRIORITY_ORDER[a.priority ?? 'normal'] - PRIORITY_ORDER[b.priority ?? 'normal'])
  const shoppingVisible = shoppingItems.slice(0, SHOPPING_LIMIT)
  const shoppingRest    = shoppingItems.length - SHOPPING_LIMIT
  const shoppingTotal   = items.filter((t) => t.type === 'shopping' && !t.done).length

  const notesPreview = notes.slice(0, NOTES_LIMIT)
  const notesRest    = notes.length - NOTES_LIMIT

  return (
    <div className={styles.root}>

      {/* ── Секція 1: КВЕСТИ ── */}
      <div className={styles.section}>
        <button type="button" className={styles.header} onClick={() => setQuestsOpen((v) => !v)} aria-expanded={questsOpen}>
          <span className={styles.headerLabel}>Квести</span>
          <div className={styles.headerRight}>
            {todoItems.length > 0 && (
              <span className={`${styles.count} ${todoActive.length === 0 ? styles.countDone : ''}`}>
                {todoActive.length === 0 ? '✓' : todoActive.length}
              </span>
            )}
            <svg className={`${styles.arrow} ${questsOpen ? styles.arrowOpen : ''}`} width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </button>
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
                      className={`${styles.checkbox} ${isDoneToday(t) ? styles.checkboxDone : styles.checkboxUndone}`}
                      onClick={(e) => { e.stopPropagation(); toggleItem(t.id) }}
                      aria-label={isDoneToday(t) ? 'Позначити невиконаним' : 'Позначити виконаним'}
                    >
                      {isDoneToday(t) && <CheckIcon />}
                    </button>
                    <span
                      className={`${styles.itemTitle} ${isDoneToday(t) ? styles.itemDone : ''}`}
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
              <button type="button" className={styles.moreBtn} onClick={() => navigate('/sprint')}>
                ще {todoRest} →
              </button>
            )}
          </div>
        </div>
      </div>

      <div className={styles.divider} />

      {/* ── Секція 2: ПОКУПКИ ── */}
      <div className={styles.section}>
        <button type="button" className={styles.header} onClick={() => setShoppingOpen((v) => !v)} aria-expanded={shoppingOpen}>
          <span className={styles.headerLabel}>Покупки</span>
          <div className={styles.headerRight}>
            {shoppingTotal > 0 && <span className={styles.count}>{shoppingTotal}</span>}
            <svg className={`${styles.arrow} ${shoppingOpen ? styles.arrowOpen : ''}`} width="12" height="12" viewBox="0 0 12 12" fill="none">
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
                      {(t.done || completingShop.has(t.id)) && <CheckIcon />}
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
                  </li>
                ))}
              </ul>
            )}
            {shoppingRest > 0 && (
              <button type="button" className={styles.moreBtn} onClick={() => navigate('/sprint')}>
                ще {shoppingRest} →
              </button>
            )}
          </div>
        </div>
      </div>

      <div className={styles.divider} />

      {/* ── Секція 3: НОТАТКИ ── */}
      <div className={styles.section}>
        <button type="button" className={styles.header} onClick={() => setNotesOpen((v) => !v)} aria-expanded={notesOpen}>
          <span className={styles.headerLabel}>Нотатки</span>
          <div className={styles.headerRight}>
            {notes.length > 0 && <span className={styles.count}>{notes.length}</span>}
            <svg className={`${styles.arrow} ${notesOpen ? styles.arrowOpen : ''}`} width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </button>
        <div className={`${styles.content} ${notesOpen ? styles.contentOpen : ''}`}>
          <div className={styles.contentInner}>
            {notes.length === 0 ? (
              <p className={styles.emptyText}>Нотаток немає</p>
            ) : (
              <ul className={styles.list}>
                {notesPreview.map((note) => (
                  <li key={note._id} className={styles.item} onClick={() => navigate('/notes')}>
                    <span className={styles.itemTitle}>{note.text}</span>
                    <span className={styles.noteDate}>{formatRelative(note.updatedAt)}</span>
                  </li>
                ))}
              </ul>
            )}
            {notesRest > 0 ? (
              <button type="button" className={styles.moreBtn} onClick={() => navigate('/notes')}>
                ще {notesRest} →
              </button>
            ) : notes.length > 0 ? (
              <button type="button" className={styles.moreBtn} onClick={() => navigate('/notes')}>
                Відкрити →
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* ── TaskDetailModal ── */}
      <TaskDetailModal taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} />

    </div>
  )
}

export default TasksAccordion
