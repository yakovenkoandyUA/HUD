import React from 'react'
import PriorityBadge from '../../ui/PriorityBadge'
import type { UnifiedTodo, SprintTag } from '../../../types'
import styles from './TaskCard.module.css'

/**
 * TaskCard
 * --------
 * Уніфікована картка задачі: Спринт / Покупка / Todo.
 *
 * Props:
 * @prop {UnifiedTodo}  item     — дані задачі
 * @prop {() => void}   onToggle — перемикання done
 * @prop {() => void}   onDelete — видалення
 */
interface TaskCardProps {
  item: UnifiedTodo
  onToggle: () => void
  onDelete: () => void
}

const TAG_LABEL: Record<SprintTag, string> = {
  dev:        'Розробка',
  mentorship: 'Менторство',
  personal:   'Особисте',
  learning:   'Навчання',
}

const TAG_COLOR: Record<SprintTag, string> = {
  dev:        'var(--accent)',
  mentorship: 'var(--second)',
  personal:   'var(--gold)',
  learning:   'var(--orange)',
}

const TAG_BG: Record<SprintTag, string> = {
  dev:        'var(--accent-soft)',
  mentorship: 'var(--second-soft)',
  personal:   'var(--gold-dim)',
  learning:   'var(--orange-s)',
}

const TaskCard: React.FC<TaskCardProps> = ({ item, onToggle, onDelete }) => (
  <li className={`${styles.item} ${item.done ? styles.done : ''}`}>
    <button type="button" className={styles.check} onClick={onToggle} aria-label="Toggle">
      <span className={`${styles.checkBox} ${item.type === 'sprint' ? styles.checkBoxSprint : ''}`}>
        {item.done ? '✓' : ''}
      </span>
    </button>

    <div className={styles.body}>
      <span className={styles.title}>{item.title}</span>

      <div className={styles.meta}>
        {item.type === 'sprint' && item.tag && (
          <span
            className={styles.tagChip}
            style={{ color: TAG_COLOR[item.tag], background: TAG_BG[item.tag] }}
          >
            {TAG_LABEL[item.tag]}
          </span>
        )}

        {(item.type === 'shopping' || item.type === 'todo') && item.priority && (
          <PriorityBadge priority={item.priority} />
        )}

        {item.type === 'shopping' && item.quantity && (
          <span className={styles.quantity}>{item.quantity}</span>
        )}
      </div>
    </div>

    <button type="button" className={styles.del} onClick={onDelete} aria-label="Delete">✕</button>
  </li>
)

export default TaskCard
