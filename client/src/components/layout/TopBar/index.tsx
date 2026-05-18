import React, { useEffect, useState } from 'react'
import Modal from '../../ui/Modal'
import ThemePicker from '../ThemePicker'
import styles from './TopBar.module.css'

/**
 * TopBar
 * ------
 * Верхня панель: HUD логотип зліва, іконка теми (та опційно годинник) справа.
 *
 * Props:
 * @prop {string}  [title]     — назва поточного екрану
 * @prop {boolean} [showClock] — показати живий годинник (Dashboard)
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

const PaletteIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <rect x="1"  y="1"  width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
    <rect x="9"  y="1"  width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
    <rect x="1"  y="9"  width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
    <rect x="9"  y="9"  width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
)

const TopBar: React.FC<TopBarProps> = ({ title: _title, showClock }) => {
  const [now, setNow] = useState(new Date())
  const [showPicker, setShowPicker] = useState(false)

  useEffect(() => {
    if (!showClock) return
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [showClock])

  return (
    <>
      <header className={styles.bar}>
        <div className={styles.left}>
          <h1 className={styles.logo}>HUD</h1>
        </div>
        <div className={styles.right}>
          {showClock && (
            <div className={styles.clock}>
              <span className={styles.clockTime}>{formatTime(now)}</span>
              <span className={styles.clockDay}>{formatDay(now)}</span>
            </div>
          )}
          <button
            type="button"
            className={styles.themeBtn}
            onClick={() => setShowPicker(true)}
            aria-label="Змінити тему"
          >
            <PaletteIcon />
          </button>
        </div>
      </header>

      <Modal isOpen={showPicker} onClose={() => setShowPicker(false)} title="Тема">
        <ThemePicker onClose={() => setShowPicker(false)} />
      </Modal>
    </>
  )
}

export default TopBar
