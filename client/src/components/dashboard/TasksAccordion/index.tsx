import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PriorityBadge from '../../ui/PriorityBadge'
import TaskDetailModal from '../../sprint/TaskDetailModal'
import { useSprintStore } from '../../../store/sprintStore'
import { isRecurring } from '../../../utils/sprint'
import styles from './TasksAccordion.module.css'

/**
 * TasksAccordion
 * --------------
 * Peek-блок активних задач на Dashboard.
 * Показує до 4 активних квестів/todo завжди відкрито — без акордеону.
 * Footer: кількість активних + посилання → /sprint.
 */

const PEEK_LIMIT = 4

const d = new Date()
const todayIso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const CheckIcon: React.FC = () => (
  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
    <path d="M1.5 4l2 2 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const TasksAccordion: React.FC = () => {
  const navigate = useNavigate()
  const { items, toggleItem } = useSprintStore()
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)

  const isDoneToday = (t: (typeof items)[number]) =>
    isRecurring(t) ? !!(t.completionLog?.some(d => d >= todayIso)) : t.done

  const allTasks   = items.filter(t => (t.type === 'sprint' || t.type === 'todo') && !isRecurring(t))
  const active     = allTasks.filter(t => !isDoneToday(t))
  const peek       = active.slice(0, PEEK_LIMIT)
  const rest       = active.length - PEEK_LIMIT

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <span className={styles.headerLabel}>Квести</span>
        {active.length > 0 && (
          <span className={styles.badge}>{active.length}</span>
        )}
        <button type="button" className={styles.allBtn} onClick={() => navigate('/sprint')}>
          всі →
        </button>
      </div>

      {active.length === 0 ? (
        <p className={styles.empty}>
          {allTasks.length === 0 ? 'Квестів немає' : 'Всі квести виконано ✓'}
        </p>
      ) : (
        <ul className={styles.list}>
          {peek.map(t => (
            <li key={t.id} className={styles.item}>
              <button
                type="button"
                className={`${styles.checkbox} ${isDoneToday(t) ? styles.checkboxDone : styles.checkboxUndone}`}
                onClick={e => { e.stopPropagation(); toggleItem(t.id) }}
              >
                {isDoneToday(t) && <CheckIcon />}
              </button>
              <span
                className={`${styles.title} ${isDoneToday(t) ? styles.titleDone : ''}`}
                onClick={() => setSelectedTaskId(t.id)}
              >
                {t.title}
              </span>
              {t.labels && t.labels.slice(0, 2).map(l => (
                <span key={l.id} className={styles.labelDot} style={{ background: l.color }} />
              ))}
              {t.priority && t.priority !== 'normal' && (
                <PriorityBadge priority={t.priority} compact />
              )}
              {t.checklist && t.checklist.length > 0 && (
                <span className={styles.checklistBadge}>
                  {t.checklist.filter(i => i.done).length}/{t.checklist.length}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {rest > 0 && (
        <button type="button" className={styles.moreBtn} onClick={() => navigate('/sprint')}>
          ще {rest} задач →
        </button>
      )}

      <TaskDetailModal taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} />
    </div>
  )
}

export default TasksAccordion
