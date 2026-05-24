import React from 'react'
import Card from '../../ui/Card'
import type { UnifiedTodo, SprintTag } from '../../../types'
import styles from './SprintMini.module.css'

/**
 * SprintMini
 * ----------
 * Мінікартка прогресу спринту для Dashboard.
 *
 * Props:
 * @prop {UnifiedTodo[]} tasks — завдання спринту поточного тижня (type=sprint)
 */
interface SprintMiniProps {
  tasks: UnifiedTodo[]
}

const TAG_LABEL: Record<SprintTag, string> = {
  mentorship: 'Менторство',
  dev:        'Розробка',
  personal:   'Особисте',
  learning:   'Навчання',
}

const SprintMini: React.FC<SprintMiniProps> = ({ tasks }) => {
  const done = tasks.filter((t) => t.done).length
  const pct = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0
  const upcoming = tasks.filter((t) => !t.done).slice(0, 3)

  return (
    <Card className={styles.card}>
      <div className={styles.header}>
        <span className={styles.label}>Спрінт тижня</span>
        <span className={styles.count}>{done}/{tasks.length}</span>
      </div>

      <div className={styles.barTrack}>
        <div className={styles.barFill} style={{ width: `${pct}%` }} />
      </div>

      {upcoming.length > 0 ? (
        <ul className={styles.list}>
          {upcoming.map((t) => (
            <li key={t.id} className={styles.item}>
              <span className={`${styles.circle} ${t.done ? styles.circleDone : ''}`} />
              <span className={styles.title}>{t.title}</span>
              {t.tag && <span className={styles.tag}>{TAG_LABEL[t.tag]}</span>}
            </li>
          ))}
        </ul>
      ) : (
        <div className={styles.empty}>
          {tasks.length === 0 ? 'Завдань немає' : 'Всі виконано ✓'}
        </div>
      )}
    </Card>
  )
}

export default SprintMini
