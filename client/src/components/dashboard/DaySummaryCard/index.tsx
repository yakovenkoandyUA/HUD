import React from 'react'
import styles from './DaySummaryCard.module.css'

/**
 * DaySummaryCard
 * --------------
 * Компактний summary дня на Dashboard.
 * Показує активні квести, покупки та страву дня.
 * Клік → відкриває DayOverlay.
 *
 * Props:
 * @prop {number}   activeQuests  — кількість активних квестів
 * @prop {number}   shoppingCount — кількість непридбаних покупок
 * @prop {string[]} meals         — назви страв на сьогодні
 * @prop {() => void} onClick     — відкрити DayOverlay
 */
interface DaySummaryCardProps {
  activeQuests: number
  shoppingCount: number
  meals: string[]
  onClick: () => void
}

const DaySummaryCard: React.FC<DaySummaryCardProps> = ({
  activeQuests,
  shoppingCount,
  meals,
  onClick,
}) => {
  return (
    <button type="button" className={styles.card} onClick={onClick}>
      <span className={styles.label}>МІЙ ДЕНЬ</span>

      <div className={styles.rows}>
        <div className={styles.row}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.icon}>
            <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
          </svg>
          <span className={styles.val}>
            {activeQuests > 0
              ? <><strong>{activeQuests}</strong> {activeQuests === 1 ? 'квест' : activeQuests < 5 ? 'квести' : 'квестів'}</>
              : <span className={styles.empty}>Квестів немає</span>}
          </span>
        </div>

        <div className={styles.row}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.icon}>
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
          </svg>
          <span className={styles.val}>
            {shoppingCount > 0
              ? <><strong>{shoppingCount}</strong> {shoppingCount === 1 ? 'покупка' : shoppingCount < 5 ? 'покупки' : 'покупок'}</>
              : <span className={styles.empty}>Список порожній</span>}
          </span>
        </div>

        <div className={styles.row}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={styles.icon}>
            <path d="M3 2v7c0 1.1.9 2 2 2h0a2 2 0 0 0 2-2V2M5 11v11M21 2v20M21 2a5 5 0 0 0-5 5v4h5"/>
          </svg>
          <span className={styles.val}>
            {meals.length > 0
              ? meals.join(' · ')
              : <span className={styles.empty}>Страва не запланована</span>}
          </span>
        </div>
      </div>

      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.arrow}>
        <path d="M9 18l6-6-6-6"/>
      </svg>
    </button>
  )
}

export default DaySummaryCard
