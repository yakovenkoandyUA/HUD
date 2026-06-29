import React, { useEffect } from 'react'
import { useAchievementsStore } from '../../../store/achievementsStore'
import styles from './AchievementUnlockedModal.module.css'

const AUTO_DISMISS_MS = 3200

const TROPHY_PATH = 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'

/**
 * AchievementUnlockedModal
 * ------------------------
 * Неблокуючий toast-банер зверху екрана при розблокуванні досягнення
 * (`achievementsStore.pending`) і за ним — картка підвищення рангу
 * (`pendingRank`), якщо це сталося в той самий момент. Без backdrop —
 * не перериває взаємодію з рештою застосунку. Авто-закриття або тап.
 * Монтується один раз глобально в App.tsx.
 */
const AchievementUnlockedModal: React.FC = () => {
  const pending     = useAchievementsStore(s => s.pending)
  const pendingRank = useAchievementsStore(s => s.pendingRank)
  const dismiss     = useAchievementsStore(s => s.dismiss)
  const dismissRank = useAchievementsStore(s => s.dismissRank)

  // Show the achievement banner first; once it's gone, fall through to the rank banner.
  const showAchievement = !!pending
  const showRank        = !pending && !!pendingRank

  useEffect(() => {
    if (!showAchievement) return
    const t = setTimeout(dismiss, AUTO_DISMISS_MS)
    return () => clearTimeout(t)
  }, [showAchievement, dismiss])

  useEffect(() => {
    if (!showRank) return
    const t = setTimeout(dismissRank, AUTO_DISMISS_MS)
    return () => clearTimeout(t)
  }, [showRank, dismissRank])

  if (showAchievement) {
    return (
      <div className={styles.banner} onClick={dismiss} role="button" aria-label="Закрити">
        <div className={styles.badge} style={{ '--badge-color': pending!.color } as React.CSSProperties}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d={TROPHY_PATH} fill="currentColor"/>
          </svg>
        </div>
        <div className={styles.text}>
          <p className={styles.kicker}>ДОСЯГНЕННЯ РОЗБЛОКОВАНО</p>
          <p className={styles.title}>{pending!.title}</p>
        </div>
      </div>
    )
  }

  if (showRank) {
    return (
      <div className={styles.banner} onClick={dismissRank} role="button" aria-label="Закрити">
        <div className={styles.badge} style={{ '--badge-color': pendingRank!.color } as React.CSSProperties}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d={TROPHY_PATH} fill="currentColor"/>
          </svg>
        </div>
        <div className={styles.text}>
          <p className={styles.kicker}>НОВИЙ РАНГ</p>
          <p className={styles.title}>{pendingRank!.label}</p>
        </div>
      </div>
    )
  }

  return null
}

export default AchievementUnlockedModal
