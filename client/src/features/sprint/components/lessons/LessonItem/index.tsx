import React from 'react'
import type { Lesson } from '@/shared/types'
import Badge from '@/shared/components/ui/Badge'
import styles from './LessonItem.module.css'

/**
 * LessonItem
 * ----------
 * Один рядок уроку в списку менторської програми.
 *
 * Props:
 * @prop {Lesson}       lesson    — дані уроку
 * @prop {() => void}   onEdit    — відкрити форму редагування
 * @prop {() => void}   onDelete  — видалити урок
 */
interface LessonItemProps {
  lesson: Lesson
  onEdit: () => void
  onDelete: () => void
}

const STATUS_COLOR: Record<Lesson['status'], 'default' | 'green' | 'gold'> = {
  planned: 'gold',
  done:    'green',
  draft:   'default',
}

const STATUS_LABEL: Record<Lesson['status'], string> = {
  planned: 'Заплановано',
  done:    'Проведено',
  draft:   'Чернетка',
}

const LessonItem: React.FC<LessonItemProps> = ({ lesson, onEdit, onDelete }) => (
  <li className={styles.item} onClick={onEdit}>
    <div className={styles.top}>
      <span className={styles.title}>{lesson.title}</span>
      <Badge color={STATUS_COLOR[lesson.status]}>{STATUS_LABEL[lesson.status]}</Badge>
    </div>
    {lesson.description && <p className={styles.desc}>{lesson.description}</p>}
    <div className={styles.footer}>
      <span className={styles.date}>{new Date(lesson.date).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
      <button className={styles.del} onClick={(e) => { e.stopPropagation(); onDelete() }} aria-label="Delete">✕</button>
    </div>
  </li>
)

export default LessonItem
