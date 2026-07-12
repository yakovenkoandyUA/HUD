import React from 'react'
import styles from './DaySummaryCard.module.css'

/**
 * DaySummaryCard
 * --------------
 * Навігаційний 2×2 грід на Dashboard: Квести / Покупки / Страва / Нотатки.
 * Кожна клітинка: label + icon + primary value + secondary hint.
 *
 * Props:
 * @prop {number}   activeQuests        — кількість активних квестів
 * @prop {number}   shoppingCount       — кількість непридбаних покупок
 * @prop {string[]} meals               — назви страв на сьогодні
 * @prop {number}   notesCount          — загальна кількість нотаток
 * @prop {string}   latestNote          — перший рядок останньої нотатки
 * @prop {() => void} onQuestsClick     — перейти до квестів
 * @prop {() => void} onShoppingClick   — перейти до покупок
 * @prop {() => void} onMealsClick      — перейти до планера
 * @prop {() => void} onNotesClick      — перейти до нотаток
 */
interface DaySummaryCardProps {
  activeQuests: number
  shoppingCount: number
  meals: string[]
  notesCount: number
  latestNote: string
  onQuestsClick: () => void
  onShoppingClick: () => void
  onMealsClick: () => void
  onNotesClick: () => void
}

const DaySummaryCard: React.FC<DaySummaryCardProps> = ({
  activeQuests, shoppingCount, meals, notesCount, latestNote,
  onQuestsClick, onShoppingClick, onMealsClick, onNotesClick,
}) => (
  <div className={styles.grid}>
    {/* Квести */}
    <button type="button" className={styles.cell} onClick={onQuestsClick}>
      <div className={styles.cellHeader}>
        <span className={styles.cellLabel}>Квести</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${styles.cellIcon} ${styles.cellIconQuest}`} aria-hidden="true">
          <circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
        </svg>
      </div>
      {activeQuests > 0 ? (
        <>
          <span className={`${styles.cellVal} ${styles.cellValQuest}`}>{activeQuests}</span>
          <span className={`${styles.cellSub} ${styles.cellSubQuest}`}>активних</span>
        </>
      ) : (
        <span className={`${styles.cellVal} ${styles.cellValDim}`}>все виконано</span>
      )}
    </button>

    {/* Покупки */}
    <button type="button" className={styles.cell} onClick={onShoppingClick}>
      <div className={styles.cellHeader}>
        <span className={styles.cellLabel}>Покупки</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${styles.cellIcon} ${styles.cellIconShop}`} aria-hidden="true">
          <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
        </svg>
      </div>
      <span className={`${styles.cellVal} ${shoppingCount === 0 ? styles.cellValDim : ''}`}>
        {shoppingCount > 0 ? 'є товари' : 'порожньо'}
      </span>
      <span className={`${styles.cellSub} ${styles.cellSubShop}`}>
        {shoppingCount > 0 ? `${shoppingCount} пунктів` : '0 товарів'}
      </span>
    </button>

    {/* Страва */}
    <button type="button" className={styles.cell} onClick={onMealsClick}>
      <div className={styles.cellHeader}>
        <span className={styles.cellLabel}>Страва</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${styles.cellIcon} ${styles.cellIconMeal}`} aria-hidden="true">
          <path d="M3 2v7c0 1.1.9 2 2 2h0a2 2 0 0 0 2-2V2M5 11v11M21 2v20M21 2a5 5 0 0 0-5 5v4h5"/>
        </svg>
      </div>
      {meals.length > 0 ? (
        <>
          <span className={styles.cellVal}>{meals[0]}</span>
          {meals.length > 1 && (
            <span className={styles.cellSub}>+{meals.length - 1} страва</span>
          )}
        </>
      ) : (
        <>
          <span className={`${styles.cellVal} ${styles.cellValDim}`}>не заплановано</span>
          <span className={`${styles.cellSub} ${styles.cellSubMeal}`}>додати план</span>
        </>
      )}
    </button>

    {/* Нотатки */}
    <button type="button" className={styles.cell} onClick={onNotesClick}>
      <div className={styles.cellHeader}>
        <span className={styles.cellLabel}>Нотатки</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${styles.cellIcon} ${styles.cellIconNote}`} aria-hidden="true">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </div>
      {notesCount > 0 ? (
        <>
          <span className={styles.cellVal}>{latestNote || `${notesCount} записів`}</span>
          <span className={`${styles.cellSub} ${styles.cellSubNote}`}>остання нотатка</span>
        </>
      ) : (
        <span className={`${styles.cellVal} ${styles.cellValDim}`}>немає</span>
      )}
    </button>
  </div>
)

export default DaySummaryCard
