import React, { useState, useEffect } from 'react'
import styles from './ClockBlock.module.css'

/**
 * ClockBlock
 * ----------
 * Відображає поточний час і день тижня. Оновлюється щосекунди.
 * Не приймає пропсів.
 */
const DAYS = ['Неділя', 'Понеділок', 'Вівторок', 'Середа', 'Четвер', 'Пʼятниця', 'Субота']

const ClockBlock: React.FC = () => {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const day = DAYS[now.getDay()]

  return (
    <div className={styles.block}>
      <div className={styles.time}>
        {hh}<span className={styles.colon}>:</span>{mm}
      </div>
      <div className={styles.day}>{day}</div>
    </div>
  )
}

export default ClockBlock
