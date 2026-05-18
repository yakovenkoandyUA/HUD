import React, { useEffect, useState } from 'react'
import ThemeSwitcher from '../ThemeSwitcher'
import styles from './TopBar.module.css'

/**
 * TopBar
 * ------
 * Верхня панель: логотип HUD зліва, ThemeSwitcher або годинник справа.
 *
 * Props:
 * @prop {string}  [title]     — назва поточного екрану (опціонально)
 * @prop {boolean} [showClock] — показати живий годинник справа замість ThemeSwitcher
 */
interface TopBarProps {
  title?: string
  showClock?: boolean
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })
}

function formatDay(d: Date): string {
  return d.toLocaleDateString('uk-UA', { weekday: 'short' }).toUpperCase()
}

const TopBar: React.FC<TopBarProps> = ({ title, showClock }) => {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    if (!showClock) return
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [showClock])

  return (
    <header className={styles.bar}>
      <div className={styles.left}>
        <h1 className={styles.logo}>HUD</h1>
        {title && <span className={styles.title}>{title}</span>}
      </div>
      {showClock ? (
        <div className={styles.clock}>
          <span className={styles.clockTime}>{formatTime(now)}</span>
          <span className={styles.clockDay}>{formatDay(now)}</span>
        </div>
      ) : (
        <ThemeSwitcher />
      )}
    </header>
  )
}

export default TopBar
