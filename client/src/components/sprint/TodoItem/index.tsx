import React from 'react'
import type { TodoItem as TodoItemType } from '../../../types'
import PriorityBadge from '../../ui/PriorityBadge'
import styles from './TodoItem.module.css'

/**
 * TodoItem
 * --------
 * Елемент списку справ з пріоритетом, toggle та видаленням.
 *
 * Props:
 * @prop {TodoItemType}         todo     — об'єкт справи
 * @prop {() => void}           onToggle — перемикання done/undone
 * @prop {() => void}           onDelete — видалення справи
 */
interface TodoItemProps {
  todo: TodoItemType
  onToggle: () => void
  onDelete: () => void
}

const TodoItem: React.FC<TodoItemProps> = ({ todo, onToggle, onDelete }) => (
  <li className={`${styles.item} ${todo.done ? styles.done : ''}`}>
    <button type="button" className={styles.toggle} onClick={onToggle} aria-label="Toggle">
      <span className={styles.checkbox}>{todo.done ? '✓' : ''}</span>
    </button>
    <div className={styles.body}>
      <span className={styles.title}>{todo.title}</span>
      <PriorityBadge priority={todo.priority} />
    </div>
    <button type="button" className={styles.deleteBtn} onClick={onDelete} aria-label="Видалити">
      ×
    </button>
  </li>
)

export default TodoItem
