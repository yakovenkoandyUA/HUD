import React, { useEffect, useRef, useState } from 'react'
import Modal from '../../ui/Modal'
import ThemePicker from '../ThemePicker'
import { useLongPress } from '../../../hooks/useLongPress'
import styles from './TopBar.module.css'

/**
 * TopBar
 * ------
 * Верхня панель: годинник зліва, SVG логотип по центру, іконка теми справа.
 *
 * Props:
 * @prop {string}          [title]            — назва поточного екрану (не використовується у layout)
 * @prop {boolean}         [showClock]        — показати живий годинник зліва (Dashboard)
 * @prop {() => void}      [onLogoLongPress]  — активує Easter egg (NASA APOD)
 * @prop {React.ReactNode} [right]            — додатковий вміст зліва від кнопки теми
 */
interface TopBarProps {
  title?: string
  showClock?: boolean
  onLogoLongPress?: () => void
  right?: React.ReactNode
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })
}

const MimirLogo: React.FC = () => (
  <svg viewBox="0 0 1024 916" className={styles.logoSvg} aria-label="MIMIR" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g stroke="currentColor" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round">
      <path d="M122 783 V108 L464 401 L807 108"/>
      <path d="M192 303 L464 535 L807 242 V781 H463"/>
      <circle cx="390" cy="778" r="36"/>
    </g>
  </svg>
)

const PaletteIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <rect x="1"  y="1"  width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
    <rect x="9"  y="1"  width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
    <rect x="1"  y="9"  width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
    <rect x="9"  y="9"  width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
)

const HINT_KEY = 'hud_nasa_hint_shown'

const TopBar: React.FC<TopBarProps> = ({ showClock, onLogoLongPress, right }) => {
  const [now, setNow] = useState(new Date())
  const [showPicker, setShowPicker] = useState(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    if (!showClock) return
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [showClock])

  useEffect(() => {
    if (!onLogoLongPress || localStorage.getItem(HINT_KEY)) return
    const t = timers.current
    t.push(setTimeout(() => {
      localStorage.setItem(HINT_KEY, '1')
    }, 3800))
    return () => t.forEach(clearTimeout)
  }, [onLogoLongPress])

  const longPress = useLongPress(onLogoLongPress ?? (() => {}))

  const logoEl = onLogoLongPress ? (
    <button type="button" className={styles.logoBtn} aria-label="Hold for NASA APOD" {...longPress}>
      <MimirLogo />
    </button>
  ) : (
    <MimirLogo />
  )

  return (
    <>
      <header className={styles.bar}>
        <div className={styles.left}>
          {showClock && (
            <span className={styles.clockTime}>{formatTime(now)}</span>
          )}
        </div>

        <div className={styles.center}>
          {logoEl}
        </div>

        <div className={styles.right}>
          {right}
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
