import React from 'react'
import Card from '../../ui/Card'
import type { SprintTask } from '../../../types'
import styles from './SprintMini.module.css'

/**
 * SprintMini
 * ----------
 * Мінікартка прогресу спринту для Dashboard.
 *
 * Props:
 * @prop {SprintTask[]} tasks — завдання поточного тижня
 */
interface SprintMiniProps {
  tasks: SprintTask[]
}

const CATEGORY_LABEL: Record<SprintTask['category'], string> = {
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

      {/* Custom progress bar */}
      <div className={styles.barTrack}>
        <div className={styles.barFill} style={{ width: `${pct}%` }} />
      </div>

      {upcoming.length > 0 ? (
        <ul className={styles.list}>
          {upcoming.map((t) => (
            <li key={t.id} className={styles.item}>
              <span className={`${styles.circle} ${t.done ? styles.circleDone : ''}`} />
              <span className={styles.title}>{t.title}</span>
              <span className={styles.tag}>{CATEGORY_LABEL[t.category]}</span>
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
