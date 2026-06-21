import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfileStore } from '../../../store/profileStore'
import { ACHIEVEMENTS } from '../../../data/achievements'
import styles from './AchievementTeaser.module.css'

/**
 * AchievementTeaser
 * ------------------
 * Рядок-тізер наступної нерозблокованої ачівки під балансом (HeroCard) —
 * багато вільного місця знизу картки, тут підказка не виглядає випадковою.
 * Зникає, коли всі ачівки розблоковано.
 */
const AchievementTeaser: React.FC = () => {
  const navigate = useNavigate()
  const unlockedIds = useProfileStore(s => s.activeProfile?.unlockedAchievements)
  const nextAchievement = ACHIEVEMENTS.find(a => !unlockedIds?.some(u => u.id === a.id))

  if (!nextAchievement) return null

  return (
    <button
      type="button"
      className={styles.teaser}
      onClick={() => navigate(nextAchievement.route)}
    >
      <span className={styles.icon} style={{ color: nextAchievement.color }}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M8 1.5l1.85 3.75L14 5.85l-3 2.92.7 4.13L8 10.9l-3.7 1.99.7-4.13-3-2.92 4.15-.6L8 1.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
        </svg>
      </span>
      <span className={styles.text}>
        <span className={styles.kicker}>СПРОБУЙ</span>
        <span className={styles.hint}>{nextAchievement.hint}</span>
      </span>
      <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true" className={styles.arrow}>
        <path d="M4.5 2.5l4 3.5-4 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  )
}

export default AchievementTeaser
