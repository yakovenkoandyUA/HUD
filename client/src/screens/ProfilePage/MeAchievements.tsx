import React from 'react'
import { useProfileStore } from '../../store/profileStore'
import { ACHIEVEMENTS } from '../../data/achievements'
import AchievementPath from '../../components/profile/AchievementPath'
import styles from './ProfilePage.module.css'

const EMPTY_UNLOCKED: { id: string; unlockedAt: string }[] = []

/**
 * MeAchievements
 * --------------
 * Підекран "Досягнення" вкладки "Я" — стежка бейджів (косметичний прогрес,
 * не керує доступом до фіч). Тап на вузол → попап з описом прямо біля нього
 * (логіка в AchievementPath, тут лише обгортка з прогрес-баром).
 */
const MeAchievements: React.FC = () => {
  const unlocked = useProfileStore(s => s.activeProfile?.unlockedAchievements ?? EMPTY_UNLOCKED)
  const pct = Math.round((unlocked.length / ACHIEVEMENTS.length) * 100)

  return (
    <div className={styles.cardPadded}>
      <div className={styles.cardSubTitle}>
        ПРОГРЕС · {unlocked.length}/{ACHIEVEMENTS.length}
      </div>
      <div className={styles.achProgressTrack}>
        <div className={styles.achProgressFill} style={{ width: `${pct}%` }} />
      </div>
      <AchievementPath unlocked={unlocked} />
    </div>
  )
}

export default MeAchievements
