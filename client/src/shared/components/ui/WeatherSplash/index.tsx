import React, { useEffect, useState } from 'react'
import styles from './WeatherSplash.module.css'

/**
 * WeatherSplash
 * -------------
 * Вступна анімація при запуску застосунку.
 * Показує логотип HUD та поточну дату.
 * Анімація: fade-in 0.3s → показ 1.5s → fade-out 0.3s.
 *
 * Props:
 * @prop {() => void} onDone — колбек після завершення анімації
 */
interface WeatherSplashProps {
  onDone: () => void
}

function formatDate(): string {
  return new Date().toLocaleDateString('uk-UA', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

const WeatherSplash: React.FC<WeatherSplashProps> = ({ onDone }) => {
  const [phase, setPhase] = useState<'in' | 'hold' | 'out'>('in')

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('hold'), 300)
    const t2 = setTimeout(() => setPhase('out'),  1800)
    const t3 = setTimeout(onDone,                 2100)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [onDone])

  return (
    <div className={`${styles.overlay} ${styles[phase]}`} aria-hidden="true">
      <div className={styles.logo}>MIMIR</div>
      <div className={styles.body}>
        <div className={styles.loading}>
          <span /><span /><span />
        </div>
      </div>
      <div className={styles.date}>{formatDate()}</div>
    </div>
  )
}

export default WeatherSplash
