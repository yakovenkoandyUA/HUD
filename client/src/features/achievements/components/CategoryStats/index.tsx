import React from 'react'
import { CATEGORY_LABEL, CATEGORY_ICON } from '../../data'
import type { AchievementCategory, AchievementWithStatus } from '../../types'
import styles from './index.module.css'

const CATEGORIES: AchievementCategory[] = ['memory', 'spaces', 'finance', 'sprint', 'watchlist']

interface CategoryStatsProps {
  achievements: AchievementWithStatus[]
}

/**
 * CategoryStats
 * -------------
 * Компактний список прогресу по категоріях під криницею —
 * % розблокованих досягнень на категорію.
 *
 * @prop {AchievementWithStatus[]} achievements — повний список з обчисленим статусом
 */
const CategoryStats: React.FC<CategoryStatsProps> = ({ achievements }) => (
  <div className={styles.root}>
    {CATEGORIES.map(cat => {
      const items    = achievements.filter(a => a.category === cat)
      const unlocked = items.filter(a => a.status === 'unlocked').length
      const total    = items.length
      const pct      = total > 0 ? Math.round((unlocked / total) * 100) : 0

      return (
        <div key={cat} className={styles.row}>
          <img src={CATEGORY_ICON[cat]} alt="" className={styles.icon} draggable={false} />
          <span className={styles.label}>{CATEGORY_LABEL[cat]}</span>
          <div className={styles.track}>
            <div className={styles.fill} style={{ width: `${pct}%` }} />
          </div>
          <span className={styles.pct}>{pct}%</span>
        </div>
      )
    })}
  </div>
)

export default CategoryStats
