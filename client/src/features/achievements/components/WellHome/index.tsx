import React from 'react'
import { CATEGORY_ICON, CATEGORY_LABEL } from '../../data'
import type { AchievementCategory } from '../../types'
import styles from './index.module.css'

/** Pentagon layout around the well image — % of canvas */
const CATEGORY_POS: Record<AchievementCategory, { x: number; y: number }> = {
  memory:    { x: 50, y: 19 },
  spaces:    { x: 85, y: 33 },
  finance:   { x: 73, y: 58 },
  sprint:    { x: 27, y: 58 },
  watchlist: { x: 15, y: 33 },
}

const CATEGORIES: AchievementCategory[] = ['memory', 'spaces', 'finance', 'sprint', 'watchlist']

interface WellHomeProps {
  onSelect: (category: AchievementCategory, origin: { x: number; y: number }) => void
  exiting: boolean
}

/**
 * WellHome
 * --------
 * Стартовий екран криниці — 5 категорій-кружечків навколо well.png.
 * Тап на категорію запускає "занурення" (обробляється у батьківському компоненті).
 *
 * Props:
 * @prop {(category, origin) => void} onSelect — тап на категорію, origin — % координати для transform-origin анімації
 * @prop {boolean} exiting — програє анімацію занурення (клас .exiting)
 */
const WellHome: React.FC<WellHomeProps> = ({ onSelect, exiting }) => (
  <div className={`${styles.canvas} ${exiting ? styles.exiting : ''}`}>
    <img src="/achivement/well-bg-dark.webp" alt="" className={`${styles.bgImg} ${styles.bgImgDark}`} draggable={false} />
    <img src="/achivement/well-bg-light.webp" alt="" className={`${styles.bgImg} ${styles.bgImgLight}`} draggable={false} />
    <img src="/achivement/well.webp" alt="" className={styles.wellImg} draggable={false} />

    {CATEGORIES.map(cat => {
      const pos = CATEGORY_POS[cat]
      return (
        <button
          key={cat}
          type="button"
          className={styles.categoryBtn}
          style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
          onClick={() => onSelect(cat, pos)}
        >
          <img src={CATEGORY_ICON[cat]} alt="" className={styles.categoryIcon} draggable={false} />
          <span className={styles.categoryLabel}>{CATEGORY_LABEL[cat]}</span>
        </button>
      )
    })}
  </div>
)

export default WellHome
