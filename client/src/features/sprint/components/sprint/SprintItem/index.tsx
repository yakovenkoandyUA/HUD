import React from 'react'
import type { SprintTask } from '@/shared/types'
import Badge from '@/shared/components/ui/Badge'
import styles from './SprintItem.module.css'

/**
 * SprintItem
 * ----------
 * Один рядок завдання в спринті.
 *
 * Props:
 * @prop {SprintTask}      task       — дані завдання
 * @prop {() => void}      onToggle   — перемкнути виконання
 * @prop {() => void}      onDelete   — видалити завдання
 */
interface SprintItemProps {
  task: SprintTask
  onToggle: () => void
  onDelete: () => void
}

const CATEGORY_COLOR: Record<SprintTask['category'], 'red' | 'gold' | 'green' | 'orange'> = {
  mentorship: 'green',
  dev:        'red',
  personal:   'gold',
  learning:   'orange',
}

const CATEGORY_LABEL: Record<SprintTask['category'], string> = {
  mentorship: 'Менторство',
  dev:        'Розробка',
  personal:   'Особисте',
  learning:   'Навчання',
}

const SprintItem: React.FC<SprintItemProps> = ({ task, onToggle, onDelete }) => (
  <li className={`${styles.item} ${task.done ? styles.done : ''}`}>
    <button className={styles.check} onClick={onToggle} aria-label="Toggle">
      <span className={styles.checkBox}>{task.done ? '✓' : ''}</span>
    </button>
    <div className={styles.content}>
      <span className={styles.title}>{task.title}</span>
      <Badge color={CATEGORY_COLOR[task.category]}>{CATEGORY_LABEL[task.category]}</Badge>
    </div>
    <button className={styles.del} onClick={onDelete} aria-label="Delete">✕</button>
  </li>
)

export default SprintItem
