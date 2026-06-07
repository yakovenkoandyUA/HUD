import React, { useEffect, useState } from 'react'
import MimirLogo from '../../assets/mimir-logo.svg?react'
import Modal from '../ui/Modal'
import ThemePicker from '../layout/ThemePicker'
import { useProfileStore } from '../../store/profileStore'
import styles from './AppHeader.module.css'

/**
 * AppHeader
 * ---------
 * Єдиний шапковий компонент для всіх екранів.
 * Ліво: живий годинник (год:хв), Центр: SVG-логотип, Право: аватар профілю.
 *
 * Props:
 * @prop {React.ReactNode} [right] — додатковий вміст зліва від аватара
 */
interface AppHeaderProps {
  right?: React.ReactNode
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })
}

const AppHeader: React.FC<AppHeaderProps> = ({ right }) => {
  const [now, setNow] = useState(new Date())
  const [showPicker, setShowPicker] = useState(false)
  const { activeProfile } = useProfileStore()

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  return (
    <>
      <header className={styles.bar}>
        <div className={styles.left}>
          <span className={styles.clock}>{formatTime(now)}</span>
        </div>

        <div className={styles.center}>
          <MimirLogo className={styles.logoSvg} />
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
