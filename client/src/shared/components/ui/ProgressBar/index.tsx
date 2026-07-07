import React from 'react'
import styles from './ProgressBar.module.css'

/**
 * ProgressBar
 * -----------
 * Горизонтальна смуга прогресу.
 *
 * Props:
 * @prop {number}  value      — поточне значення
 * @prop {number}  max        — максимальне значення
 * @prop {'red'|'green'|'gold'} [color]
 * @prop {boolean} [showLabel]
 */
interface ProgressBarProps {
  value: number
  max: number
  color?: 'red' | 'green' | 'gold'
  showLabel?: boolean
}

const ProgressBar: React.FC<ProgressBarProps> = ({ value, max, color = 'red', showLabel = false }) => {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className={styles.wrapper}>
      <div className={styles.track}>
        <div className={`${styles.fill} ${styles[color]}`} style={{ width: `${pct}%` }} />
      </div>
      {showLabel && <span className={styles.label}>{pct}%</span>}
    </div>
  )
}

export default ProgressBar
