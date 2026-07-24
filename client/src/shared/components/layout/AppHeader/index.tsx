import React, { useEffect, useState } from 'react'

import { useNavigate } from 'react-router-dom'
import MimirLogo from '@/assets/mimir-logo.svg?react'
import VerificationBanner from '@/shared/components/ui/VerificationBanner'
import AiChatSheet from '@/features/dashboard/components/dashboard/AiChatSheet'
import MimirIcon from '@/shared/components/ui/MimirIcon'
import ProfileDrawer from '@/shared/components/layout/ProfileDrawer'
import { useProfileStore } from '@/shared/store/profileStore'
import { useUiStore } from '@/shared/store/uiStore'
import { useCanUseFeature } from '@/shared/hooks/usePlan'
import { useRuneScore } from '@/features/achievements/hooks/useAchievementProgress'
import { getLevel } from '@/features/achievements/levels'
import { usePwaInstall } from '@/shared/hooks/usePwaInstall'
import FeedbackSheet from '@/shared/components/ui/FeedbackSheet'
import styles from './AppHeader.module.css'

/**
 * AppHeader
 * ---------
 * Єдиний шапковий компонент для всіх екранів.
 * Ліво: аватар профілю, Центр: SVG-логотип, Право: feedback + AI.
 *
 * Props:
 * @prop {React.ReactNode} [right] — додатковий вміст зліва від кнопок
 */
interface AppHeaderProps {
  right?: React.ReactNode
}

const AppHeader: React.FC<AppHeaderProps> = ({ right }) => {
  const [showChat, setShowChat] = useState(false)
  const [showDrawer, setShowDrawer] = useState(false)
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
  const [showFeedback, setShowFeedback] = useState(false)

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
          <button
            type="button"
            className={styles.avatarBtn}
            onClick={() => setShowDrawer(true)}
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

        <div className={styles.center}>
          <MimirLogo className={styles.logoSvg} />
          {offline && <span className={styles.offlineBadge}>офлайн</span>}
          <span className={styles.offlineBadge}>.beta</span>
        </div>

        <div className={styles.right}>
          {right}
          <button
            type="button"
            className={styles.feedbackBtn}
            onClick={() => setShowFeedback(true)}
            aria-label="Надіслати фідбек"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13a2 2 0 0 1-2 2H6l-4 4V4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9Z"/>
              <line x1="7" y1="8" x2="13" y2="8"/>
              <line x1="7" y1="11" x2="10" y2="11"/>
            </svg>
          </button>
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
        </div>
      </header>

      <VerificationBanner />

      <AiChatSheet isOpen={showChat} onClose={() => setShowChat(false)} />
      <FeedbackSheet isOpen={showFeedback} onClose={() => setShowFeedback(false)} />
      <ProfileDrawer isOpen={showDrawer} onClose={() => setShowDrawer(false)} />
    </>
  )
}

export default AppHeader
