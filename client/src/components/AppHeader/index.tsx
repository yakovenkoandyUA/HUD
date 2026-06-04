import React, { useEffect, useRef, useState } from 'react'
import MimirLogo from '../../assets/mimir-logo.svg?react'
import Modal from '../ui/Modal'
import ThemePicker from '../layout/ThemePicker'
import { useLongPress } from '../../hooks/useLongPress'
import { useProfileStore } from '../../store/profileStore'
import styles from './AppHeader.module.css'

/**
 * AppHeader
 * ---------
 * Єдиний шапковий компонент для всіх екранів.
 * Ліво: живий годинник (год:хв), Центр: SVG-логотип, Право: аватар профілю.
 *
 * Props:
 * @prop {() => void}      [onLogoLongPress] — Easter egg (NASA APOD, тільки Dashboard)
 * @prop {React.ReactNode} [right]           — додатковий вміст зліва від аватара
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
  const { activeProfile } = useProfileStore()

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
            className={styles.avatarBtn}
            onClick={() => setShowPicker(true)}
            aria-label="Профіль і налаштування"
          >
            {activeProfile?.avatarUrl ? (
              <img src={activeProfile.avatarUrl} alt={activeProfile.name} className={styles.avatar} />
            ) : (
              <div className={styles.avatarFallback}>
                {activeProfile?.username?.[0]?.toUpperCase() ?? '?'}
              </div>
            )}
          </button>
        </div>
      </header>

      <Modal isOpen={showPicker} onClose={() => setShowPicker(false)}>
        <ThemePicker onClose={() => setShowPicker(false)} />
      </Modal>
    </>
  )
}

export default AppHeader
