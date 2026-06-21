import React, { useEffect } from 'react'
import { useAchievementsStore } from '../../../store/achievementsStore'
import styles from './AchievementUnlockedModal.module.css'

const AUTO_DISMISS_MS = 3200

/**
 * AchievementUnlockedModal
 * ------------------------
 * Святкова transient-картка при розблокуванні досягнення (`achievementsStore.pending`).
 * Авто-закриття через AUTO_DISMISS_MS або тап будь-де. Монтується один раз
 * глобально в App.tsx — косметика, не блокує взаємодію з рештою застосунку
 * довше за анімацію.
 */
const AchievementUnlockedModal: React.FC = () => {
  const pending = useAchievementsStore(s => s.pending)
  const dismiss = useAchievementsStore(s => s.dismiss)

  useEffect(() => {
    if (!pending) return
    const t = setTimeout(dismiss, AUTO_DISMISS_MS)
    return () => clearTimeout(t)
  }, [pending, dismiss])

  if (!pending) return null

  return (
    <div className={styles.overlay} onClick={dismiss} role="button" aria-label="Закрити">
      <div className={styles.card} onClick={e => e.stopPropagation()}>
        <div className={styles.badge} style={{ '--badge-color': pending.color } as React.CSSProperties}>
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
              fill="currentColor"
            />
          </svg>
        </div>
        <p className={styles.kicker}>ДОСЯГНЕННЯ РОЗБЛОКОВАНО</p>
        <p className={styles.title}>{pending.title}</p>
        <p className={styles.desc}>{pending.description}</p>
      </div>
    </div>
  )
}

export default AchievementUnlockedModal
