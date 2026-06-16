import React from 'react'
import styles from './DaySummaryCard.module.css'

/**
 * DaySummaryCard
 * --------------
 * Секція "МІЙ ДЕНЬ" на Dashboard.
 * Хедер → DayOverlay. Кожен рядок → відповідний екран.
 *
 * Props:
 * @prop {number}   activeQuests    — кількість активних квестів
 * @prop {number}   shoppingCount   — кількість непридбаних покупок
 * @prop {string[]} meals           — назви страв на сьогодні
 * @prop {() => void} onOpenDay     — відкрити DayOverlay
 * @prop {() => void} onQuestsClick — перейти до квестів
 * @prop {() => void} onShoppingClick — перейти до покупок
 * @prop {() => void} onMealsClick  — перейти до планера
 */
interface DaySummaryCardProps {
  activeQuests: number
  shoppingCount: number
  meals: string[]
  onOpenDay: () => void
  onQuestsClick: () => void
  onShoppingClick: () => void
  onMealsClick: () => void
}

const DaySummaryCard: React.FC<DaySummaryCardProps> = ({
  activeQuests,
  shoppingCount,
  meals,
  onOpenDay,
  onQuestsClick,
  onShoppingClick,
  onMealsClick,
}) => {
  return (
    <div className={styles.root}>
      {/* Header */}
      <div className={styles.header}>
        <span className={styles.headerLabel}>МІЙ ДЕНЬ</span>
        <button type="button" className={styles.openBtn} onClick={onOpenDay}>
          детальніше
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>
      </div>

      {/* Rows */}
      <div className={styles.rows}>
        {/* Quests */}
        <button type="button" className={styles.row} onClick={onQuestsClick}>
          <div className={styles.rowIcon}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          </div>
          <span className={styles.rowLabel}>Квести</span>
          <span className={`${styles.rowVal} ${activeQuests === 0 ? styles.rowValDim : ''}`}>
            {activeQuests > 0 ? `${activeQuests} активних` : 'все виконано'}
          </span>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.chevron}>
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>

        <div className={styles.divider} />

        {/* Shopping */}
        <button type="button" className={styles.row} onClick={onShoppingClick}>
          <div className={styles.rowIcon}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
          </div>
          <span className={styles.rowLabel}>Покупки</span>
          <span className={`${styles.rowVal} ${shoppingCount === 0 ? styles.rowValDim : ''}`}>
            {shoppingCount > 0 ? `${shoppingCount} ${shoppingCount === 1 ? 'пункт' : shoppingCount < 5 ? 'пункти' : 'пунктів'}` : 'список порожній'}
          </span>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.chevron}>
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>

        <div className={styles.divider} />

        {/* Meals */}
        <button type="button" className={styles.row} onClick={onMealsClick}>
          <div className={styles.rowIcon}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 2v7c0 1.1.9 2 2 2h0a2 2 0 0 0 2-2V2M5 11v11M21 2v20M21 2a5 5 0 0 0-5 5v4h5"/>
            </svg>
          </div>
          <span className={styles.rowLabel}>Страва</span>
          <span className={`${styles.rowVal} ${meals.length === 0 ? styles.rowValDim : styles.rowValMeal}`}>
            {meals.length > 0 ? meals.join(' · ') : 'не заплановано'}
          </span>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.chevron}>
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

export default DaySummaryCard
