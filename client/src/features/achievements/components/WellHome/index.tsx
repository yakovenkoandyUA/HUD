import React from 'react'
import { CATEGORY_ICON, CATEGORY_LABEL } from '../../data'
import type { AchievementCategory } from '../../types'
import styles from './index.module.css'

/** Positions align with the medallion sockets on tree.png — % of canvas */
const CATEGORY_POS: Record<AchievementCategory, { x: number; y: number }> = {
  memory:    { x: 50, y: 25.1 },
  spaces:    { x: 81.3, y: 36.8 },
  finance:   { x: 82.6, y: 61.1 },
  sprint:    { x: 17.3, y: 61.2 },
  watchlist: { x: 18.6, y: 36.8 },
}

const CATEGORIES: AchievementCategory[] = ['memory', 'spaces', 'finance', 'sprint', 'watchlist']

interface WellHomeProps {
  onSelect: (category: AchievementCategory, origin: { x: number; y: number }) => void
  exiting: boolean
}

/**
 * WellHome
 * --------
 * Стартовий екран досягнень — 5 категорій-медальйонів на дереві (tree.png).
 * Тап на категорію запускає "занурення" (обробляється у батьківському компоненті).
 *
 * Props:
 * @prop {(category, origin) => void} onSelect — тап на категорію, origin — % координати для transform-origin анімації
 * @prop {boolean} exiting — програє анімацію занурення (клас .exiting)
 */
const WellHome: React.FC<WellHomeProps> = ({ onSelect, exiting }) => (
  <div className={`${styles.canvas} ${exiting ? styles.exiting : ''}`}>
    <img src="/achivement/tree.png" alt="" className={styles.treeImg} draggable={false} />

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
