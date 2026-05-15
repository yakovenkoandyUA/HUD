import React from 'react'
import Card from '../../ui/Card'
import ProgressBar from '../../ui/ProgressBar'
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

const SprintMini: React.FC<SprintMiniProps> = ({ tasks }) => {
  const done = tasks.filter((t) => t.done).length
  const upcoming = tasks.filter((t) => !t.done).slice(0, 3)

  return (
    <Card className={styles.card}>
      <div className={styles.header}>
        <span className={styles.label}>Спрінт тижня</span>
        <span className={styles.count}>{done}/{tasks.length}</span>
      </div>
      <ProgressBar value={done} max={tasks.length} color="green" />
      {upcoming.length > 0 ? (
        <ul className={styles.list}>
          {upcoming.map((t) => (
            <li key={t.id} className={styles.item}>{t.title}</li>
          ))}
        </ul>
      ) : (
        <div className={styles.empty}>{tasks.length === 0 ? 'Завдань немає' : 'Всі виконано ✓'}</div>
      )}
    </Card>
  )
}

export default SprintMini
