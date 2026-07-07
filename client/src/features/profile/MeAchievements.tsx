import React from 'react'
import { useProfileStore } from '@/shared/store/profileStore'
import { ACHIEVEMENTS } from '@/shared/data/achievements'
import AchievementGrid from './components/AchievementGrid'
import styles from './ProfilePage.module.css'

const EMPTY_UNLOCKED: { id: string; unlockedAt: string }[] = []

/**
 * MeAchievements
 * --------------
 * Підекран "Досягнення" вкладки "Я" — грід бейджів (косметичний прогрес,
 * не керує доступом до фіч). Тап на картку розгортає опис/підказку прямо
 * під назвою (логіка в AchievementGrid, тут лише обгортка з прогрес-баром).
 */
const MeAchievements: React.FC = () => {
  const unlocked = useProfileStore(s => s.activeProfile?.unlockedAchievements ?? EMPTY_UNLOCKED)
  const pct = Math.round((unlocked.length / ACHIEVEMENTS.length) * 100)

  return (
    <div className={styles.cardPadded}>
      <div className={styles.achProgressTrack}>
        <div className={styles.achProgressFill} style={{ width: `${pct}%` }} />
      </div>
      <AchievementGrid unlocked={unlocked} />
    </div>
  )
}

export default MeAchievements
