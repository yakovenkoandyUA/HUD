import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MimirLogo from '@/assets/mimir-logo.svg?react'
import VerificationBanner from '@/shared/components/ui/VerificationBanner'
import AiChatSheet from '@/features/dashboard/components/dashboard/AiChatSheet'
import MimirIcon from '@/shared/components/ui/MimirIcon'
import { useProfileStore } from '@/shared/store/profileStore'
import { useUiStore } from '@/shared/store/uiStore'
import { useCanUseFeature } from '@/shared/hooks/usePlan'
import { useRuneScore } from '@/features/achievements/hooks/useAchievementProgress'
import { getLevel } from '@/features/achievements/levels'
import { usePwaInstall } from '@/shared/hooks/usePwaInstall'
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
  const [showChat, setShowChat] = useState(false)
  const [offline, setOffline] = useState(!navigator.onLine)
  const { activeProfile } = useProfileStore()
  const { showToast } = useUiStore()
  const navigate = useNavigate()
  const canUseAI = useCanUseFeature('aiChat')
  const runeScore = useRuneScore()
  const level = getLevel(runeScore)
  const { isInstallable, isIOS } = usePwaInstall()
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
  const showInstallDot = !isStandalone && (isInstallable || isIOS)

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const on  = () => setOffline(false)
    const off = () => setOffline(true)
    window.addEventListener('online',  on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  return (
    <>
      <header className={styles.bar}>
        <div className={styles.left}>
          <span className={styles.clock}>{formatTime(now)}</span>
          {offline && <span className={styles.offlineBadge}>офлайн</span>}
        </div>

        <div className={styles.center}>
          <MimirLogo className={styles.logoSvg} />
        </div>

        <div className={styles.right}>
          {right}
          <button
            type="button"
            className={styles.aiBtn}
            onClick={() => {
              if (!activeProfile?.isVerified) { showToast('Підтвердіть email для AI-асистента', 'error'); return }
              if (!canUseAI) { navigate('/profile?tab=plan'); return }
              setShowChat(true)
            }}
            aria-label="AI асистент"
          >
            <MimirIcon size={16} />
            {!canUseAI && (
              <svg width="8" height="8" viewBox="0 0 10 10" fill="none" className={styles.aiBtnLock} aria-hidden="true">
                <rect x="1.5" y="4.5" width="7" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/>
                <path d="M3 4.5V3a2 2 0 0 1 4 0v1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
            )}
          </button>
          <button
            type="button"
            className={styles.avatarBtn}
            onClick={() => navigate('/profile')}
            aria-label="Профіль і налаштування"
          >
            {activeProfile?.avatarUrl ? (
              <img
                src={activeProfile.avatarUrl}
                alt={activeProfile.name}
                className={styles.avatar}
                style={{ borderColor: level.color }}
              />
            ) : (
              <div className={styles.avatarFallback} style={{ borderColor: level.color }}>
                {activeProfile?.username?.[0]?.toUpperCase() ?? '?'}
              </div>
            )}
            {showInstallDot && <span className={styles.installDot} aria-hidden="true" />}
          </button>
        </div>
      </header>

      <VerificationBanner />

      <AiChatSheet isOpen={showChat} onClose={() => setShowChat(false)} />
    </>
  )
}

export default AppHeader
