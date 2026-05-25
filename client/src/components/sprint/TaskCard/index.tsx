import React from 'react'
import PriorityBadge from '../../ui/PriorityBadge'
import type { UnifiedTodo, SprintTag } from '../../../types'
import styles from './TaskCard.module.css'

/**
 * TaskCard
 * --------
 * Уніфікована картка задачі: Спринт / Покупка / Todo.
 * Тап на тіло картки (не чекбокс) → відкриває TaskDetailModal.
 *
 * Props:
 * @prop {UnifiedTodo}    item          — дані задачі
 * @prop {() => void}     onToggle      — перемикання done
 * @prop {() => void}     onDelete      — видалення
 * @prop {() => void}     onOpenDetail  — відкрити детальну картку
 */
interface TaskCardProps {
  item: UnifiedTodo
  onToggle: () => void
  onDelete: () => void
  onOpenDetail: () => void
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

function getDueDateColor(dateStr: string): string {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr); target.setHours(0, 0, 0, 0)
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000)
  if (diff < 0)  return 'var(--negative)'
  if (diff <= 1) return 'var(--gold)'
  return 'var(--text3)'
}

function formatDueDate(dateStr: string): string {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr); target.setHours(0, 0, 0, 0)
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000)
  if (diff === 0) return 'Сьогодні'
  if (diff === 1) return 'Завтра'
  const DAYS   = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
  const MONTHS = ['січ.', 'лют.', 'бер.', 'квіт.', 'трав.', 'черв.', 'лип.', 'серп.', 'вер.', 'жовт.', 'лист.', 'груд.']
  return `${DAYS[target.getDay()]} ${target.getDate()} ${MONTHS[target.getMonth()]}`
}

const TaskCard: React.FC<TaskCardProps> = ({ item, onToggle, onDelete, onOpenDetail }) => {
  const checkDone = (item.checklist ?? []).filter(c => c.done).length
  const checkTotal = (item.checklist ?? []).length
  const hasLabels = (item.labels ?? []).length > 0
  const hasChecklist = checkTotal > 0
  const hasDueDate = !!item.dueDate
  const hasExtras = hasLabels || hasChecklist || hasDueDate

  return (
    <li className={`${styles.item} ${item.done ? styles.done : ''}`}>
      <button type="button" className={styles.check} onClick={onToggle} aria-label="Toggle">
        <span className={`${styles.checkBox} ${item.type === 'sprint' ? styles.checkBoxSprint : ''}`}>
          {item.done ? '✓' : ''}
        </span>
      </button>

      {/* Clickable body → open detail */}
      <div className={styles.body} onClick={onOpenDetail} role="button" tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onOpenDetail()}
      >
        <div className={styles.topRow}>
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

        {/* Extra row: labels + checklist count + dueDate */}
        {hasExtras && (
          <div className={styles.extrasRow}>
            {hasLabels && (
              <div className={styles.labelPills}>
                {(item.labels ?? []).map(l => (
                  <span key={l.id} className={styles.labelPill} style={{ background: l.color }} />
                ))}
              </div>
            )}
            {hasChecklist && (
              <span className={styles.checklistBadge}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className={styles.checklistIcon}>
                  <path d="M2 5.5l2 2 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {checkDone}/{checkTotal}
              </span>
            )}
            {hasDueDate && (
              <span className={styles.dueDateBadge} style={{ color: getDueDateColor(item.dueDate!) }}>
                <svg width="9" height="9" viewBox="0 0 10 10" fill="none" className={styles.dueDateIcon}>
                  <circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.3"/>
                  <path d="M5 3v2.5l1.5 1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
                {formatDueDate(item.dueDate!)}
              </span>
            )}
          </div>
        )}
      </div>

      <button type="button" className={styles.del} onClick={onDelete} aria-label="Delete">✕</button>
    </li>
  )
}

export default TaskCard
