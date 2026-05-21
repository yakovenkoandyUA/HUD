import React, { useEffect, useRef, useState } from 'react'
import Modal from '../../ui/Modal'
import ThemePicker from '../ThemePicker'
import { useLongPress } from '../../../hooks/useLongPress'
import styles from './TopBar.module.css'

/**
 * TopBar
 * ------
 * Верхня панель: HUD логотип зліва, іконка теми (та опційно годинник) справа.
 *
 * Props:
 * @prop {string}    [title]            — назва поточного екрану
 * @prop {boolean}   [showClock]        — показати живий годинник (Dashboard)
 * @prop {() => void} [onLogoLongPress] — активує Easter egg (NASA APOD)
 *                                        і показує перший-раз підказку
 */
interface TopBarProps {
  title?: string
  showClock?: boolean
  onLogoLongPress?: () => void
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

// type HintPhase = 'hidden' | 'visible' | 'fading'

const HINT_KEY = 'hud_nasa_hint_shown'

const TopBar: React.FC<TopBarProps> = ({ showClock, onLogoLongPress }) => {
  const [now, setNow] = useState(new Date())
  const [showPicker, setShowPicker] = useState(false)
  // const [hintPhase, setHintPhase] = useState<HintPhase>('hidden')
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    if (!showClock) return
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [showClock])

  // First-visit hint
  useEffect(() => {
    if (!onLogoLongPress || localStorage.getItem(HINT_KEY)) return
    const t = timers.current
    // t.push(setTimeout(() => setHintPhase('visible'), 800))
    // t.push(setTimeout(() => setHintPhase('fading'), 3300))   // 800 + 2500
    t.push(setTimeout(() => {
      // setHintPhase('hidden')
      localStorage.setItem(HINT_KEY, '1')
    }, 3800))                                                  // 3300 + 500
    return () => t.forEach(clearTimeout)
  }, [onLogoLongPress])

  const longPress = useLongPress(onLogoLongPress ?? (() => {}))

  const logoEl = onLogoLongPress ? (
    <div className={styles.logoWrap}>
      <button
        type="button"
        className={styles.logoBtn}
        aria-label="Hold for NASA APOD"
        {...longPress}
      >
        HUD
      </button>
      {/* {hintPhase !== 'hidden' && (
        <span
          className={`${styles.hint} ${hintPhase === 'visible' ? styles.hintVisible : styles.hintFading}`}
        >
          // hold to explore
        </span>
      )} */}
    </div>
  ) : (
    <h1 className={styles.logo}>HUD</h1>
  )

  return (
    <>
      <header className={styles.bar}>
        <div className={styles.left}>
          {logoEl}
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
