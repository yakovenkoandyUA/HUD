import React, { useEffect, useRef, useState } from 'react'
import MimirLogo from '../../assets/mimir-logo.svg?react'
import Modal from '../ui/Modal'
import ThemePicker from '../layout/ThemePicker'
import { useLongPress } from '../../hooks/useLongPress'
import styles from './AppHeader.module.css'

/**
 * AppHeader
 * ---------
 * Єдиний шапковий компонент для всіх екранів.
 * Ліво: живий годинник (год:хв), Центр: SVG-логотип, Право: кнопка теми.
 *
 * Props:
 * @prop {() => void}      [onLogoLongPress] — Easter egg (NASA APOD, тільки Dashboard)
 * @prop {React.ReactNode} [right]           — додатковий вміст зліва від кнопки теми
 */
interface AppHeaderProps {
  onLogoLongPress?: () => void
  right?: React.ReactNode
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })
}

const HINT_KEY = 'hud_nasa_hint_shown'

const AppHeader: React.FC<AppHeaderProps> = ({ onLogoLongPress, right }) => {
  const [now, setNow] = useState(new Date())
  const [showPicker, setShowPicker] = useState(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!onLogoLongPress || localStorage.getItem(HINT_KEY)) return
    const t = timers.current
    t.push(setTimeout(() => { localStorage.setItem(HINT_KEY, '1') }, 3800))
    return () => t.forEach(clearTimeout)
  }, [onLogoLongPress])

  const longPress = useLongPress(onLogoLongPress ?? (() => {}))

  const logoEl = onLogoLongPress ? (
    <button type="button" className={styles.logoBtn} aria-label="Hold for NASA APOD" {...longPress}>
      <MimirLogo className={styles.logoSvg} />
    </button>
  ) : (
    <MimirLogo className={styles.logoSvg} />
  )

  return (
    <>
      <header className={styles.bar}>
        <div className={styles.left}>
          <span className={styles.clock}>{formatTime(now)}</span>
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
            <GridIcon />
          </button>
        </div>
      </header>

      <Modal isOpen={showPicker} onClose={() => setShowPicker(false)} title="Тема">
        <ThemePicker onClose={() => setShowPicker(false)} />
      </Modal>
    </>
  )
}

const GridIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <rect x="1"  y="1"  width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
    <rect x="9"  y="1"  width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
    <rect x="1"  y="9"  width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
    <rect x="9"  y="9"  width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
)

export default AppHeader
