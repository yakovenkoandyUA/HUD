import React from 'react'
import styles from './SprintProgress.module.css'

/**
 * SprintProgress
 * --------------
 * Кільцевий SVG прогрес завдань тижня.
 *
 * Props:
 * @prop {number} done  — кількість виконаних завдань
 * @prop {number} total — загальна кількість завдань
 */
interface SprintProgressProps {
  done: number
  total: number
}

const R = 48
const CIRC = 2 * Math.PI * R

const SprintProgress: React.FC<SprintProgressProps> = ({ done, total }) => {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  const offset = CIRC * (1 - pct / 100)

  return (
    <div className={styles.wrapper}>
      <span className={styles.label}>Прогрес тижня</span>
      <div className={styles.ring}>
        <svg width="120" height="120" viewBox="0 0 120 120">
          <circle
            cx="60" cy="60" r={R}
            fill="none"
            stroke="var(--border)"
            strokeWidth="6"
          />
          <circle
            cx="60" cy="60" r={R}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={offset}
            transform="rotate(-90 60 60)"
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>
        <div className={styles.center}>
          <span className={styles.pct}>{pct}%</span>
          <span className={styles.count}>{done} / {total}</span>
        </div>
      </div>
    </div>
  )
}

export default SprintProgress
