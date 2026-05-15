import React from 'react'
import ProgressBar from '../../ui/ProgressBar'
import styles from './SprintProgress.module.css'

/**
 * SprintProgress
 * --------------
 * Прогрес-бар завдань тижня з підписом.
 *
 * Props:
 * @prop {number} done  — кількість виконаних завдань
 * @prop {number} total — загальна кількість завдань
 */
interface SprintProgressProps {
  done: number
  total: number
}

const SprintProgress: React.FC<SprintProgressProps> = ({ done, total }) => (
  <div className={styles.wrapper}>
    <div className={styles.row}>
      <span className={styles.label}>Прогрес тижня</span>
      <span className={styles.count}>{done} / {total}</span>
    </div>
    <ProgressBar value={done} max={total} color="green" showLabel />
  </div>
)

export default SprintProgress
