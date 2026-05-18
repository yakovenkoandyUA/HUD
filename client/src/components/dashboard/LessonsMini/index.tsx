import React from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../../ui/Card'
import type { Lesson } from '../../../types'
import styles from './LessonsMini.module.css'

/**
 * LessonsMini
 * -----------
 * Компактний список запланованих уроків для Dashboard.
 * Відображається тільки якщо є хоча б один запланований урок.
 * Натискання — перехід на /sprint?tab=lessons.
 *
 * Props:
 * @prop {Lesson[]} lessons — всі уроки з lessonStore
 */
interface LessonsMiniProps {
  lessons: Lesson[]
}

const STATUS_ICON: Record<string, string> = {
  planned: '📅',
  done:    '✅',
  draft:   '📝',
}

const LessonsMini: React.FC<LessonsMiniProps> = ({ lessons }) => {
  const navigate = useNavigate()
  const upcoming = lessons
    .filter((l) => l.status === 'planned')
    .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))

  if (upcoming.length === 0) return null

  const visible = upcoming.slice(0, 3)
  const rest = upcoming.length - visible.length

  return (
    <Card className={styles.card} onClick={() => navigate('/sprint?tab=lessons')}>
      <div className={styles.header}>
        <span className={styles.label}>Уроки</span>
        <span className={styles.badge}>{upcoming.length}</span>
      </div>
      <ul className={styles.list}>
        {visible.map((l) => (
          <li key={l.id} className={styles.item}>
            <span className={styles.icon}>{STATUS_ICON[l.status]}</span>
            <span className={styles.title}>{l.title}</span>
            {l.date && <span className={styles.date}>{l.date}</span>}
          </li>
        ))}
      </ul>
      {rest > 0 && (
        <div className={styles.more}>ще {rest} уроків →</div>
      )}
    </Card>
  )
}

export default LessonsMini
