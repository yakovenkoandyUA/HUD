import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MimirLogo from '@/assets/mimir-logo.svg?react'
import { useProfileStore } from '@/shared/store/profileStore'
import { useUiStore } from '@/shared/store/uiStore'
import styles from './TopBar.module.css'

/**
 * TopBar
 * ------
 * Верхня панель: годинник зліва, SVG логотип по центру, аватар профілю справа.
 *
 * Props:
 * @prop {string}          [title]     — назва поточного екрану
 * @prop {boolean}         [showClock] — показати живий годинник зліва (Dashboard)
 * @prop {React.ReactNode} [right]     — додатковий вміст зліва від аватара
 */
interface TopBarProps {
  title?: string
  showClock?: boolean
  right?: React.ReactNode
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })
}

const TopBar: React.FC<TopBarProps> = ({ showClock, right }) => {
  const [now, setNow] = useState(new Date())
  const { activeProfile } = useProfileStore()
  const { updateAvailable } = useUiStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (!showClock) return
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [showClock])

  return (
    <>
      <header className={styles.bar}>
        <div className={styles.left}>
          {showClock && (
            <span className={styles.clockTime}>{formatTime(now)}</span>
          )}
        </div>

        <div className={styles.center}>
          <MimirLogo className={styles.logoSvg} />
        </div>

        <div className={styles.right}>
          {right}
          <button
            type="button"
            className={`${styles.avatarBtn} ${updateAvailable ? styles.avatarBtnUpdate : ''}`}
            onClick={() => navigate('/profile')}
            aria-label={updateAvailable ? 'Доступне оновлення — відкрити профіль' : 'Профіль і налаштування'}
          >
            <div className={styles.avatarWrap}>
              {activeProfile?.avatarUrl ? (
                <img src={activeProfile.avatarUrl} alt={activeProfile.name} className={styles.avatar} />
              ) : (
                <div className={styles.avatarFallback}>
                  {activeProfile?.username?.[0]?.toUpperCase() ?? '?'}
                </div>
              )}
              {updateAvailable && <span className={styles.updateDot} aria-hidden="true" />}
            </div>
          </button>
        </div>
      </header>

    </>
  )
}

export default TopBar
