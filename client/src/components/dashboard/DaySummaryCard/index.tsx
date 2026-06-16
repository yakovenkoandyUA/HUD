import React from 'react'
import styles from './DaySummaryCard.module.css'

/**
 * DaySummaryCard
 * --------------
 * Секція "МІЙ ДЕНЬ" на Dashboard — компактні рядки в картці.
 * Хедер → DayOverlay. Кожен рядок → відповідний екран.
 *
 * Props:
 * @prop {number}   activeQuests      — кількість активних квестів
 * @prop {number}   shoppingCount     — кількість непридбаних покупок
 * @prop {string[]} meals             — назви страв на сьогодні
 * @prop {number}   notesCount        — загальна кількість нотаток
 * @prop {string}   latestNote        — текст останньої нотатки (перший рядок)
 * @prop {() => void} onOpenDay       — відкрити DayOverlay
 * @prop {() => void} onQuestsClick   — перейти до квестів
 * @prop {() => void} onShoppingClick — перейти до покупок
 * @prop {() => void} onMealsClick    — перейти до планера
 * @prop {() => void} onNotesClick    — перейти до нотаток
 */
interface DaySummaryCardProps {
  activeQuests: number
  shoppingCount: number
  meals: string[]
  notesCount: number
  latestNote: string
  onOpenDay: () => void
  onQuestsClick: () => void
  onShoppingClick: () => void
  onMealsClick: () => void
  onNotesClick: () => void
}

const DaySummaryCard: React.FC<DaySummaryCardProps> = ({
  activeQuests,
  shoppingCount,
  meals,
  notesCount,
  latestNote,
  onOpenDay,
  onQuestsClick,
  onShoppingClick,
  onMealsClick,
  onNotesClick,
}) => (
  <div className={styles.root}>
    <div className={styles.header}>
      <span className={styles.headerLabel}>МІЙ ДЕНЬ</span>
      <button type="button" className={styles.openBtn} onClick={onOpenDay}>
        детальніше
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </button>
    </div>

    <div className={styles.rows}>
      <button type="button" className={styles.row} onClick={onQuestsClick}>
        <span className={styles.rowIcon}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
        </span>
        <span className={styles.rowLabel}>Квести</span>
        <span className={`${styles.rowVal} ${activeQuests > 0 ? styles.rowValGold : styles.rowValDim}`}>
          {activeQuests > 0 ? `${activeQuests} активних` : 'все виконано'}
        </span>
      </button>

      <button type="button" className={styles.row} onClick={onShoppingClick}>
        <span className={styles.rowIcon}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
          </svg>
        </span>
        <span className={styles.rowLabel}>Покупки</span>
        <span className={`${styles.rowVal} ${shoppingCount > 0 ? styles.rowValAccent : styles.rowValDim}`}>
          {shoppingCount > 0 ? `${shoppingCount} пунктів` : 'порожньо'}
        </span>
      </button>

      <button type="button" className={styles.row} onClick={onMealsClick}>
        <span className={styles.rowIcon}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 2v7c0 1.1.9 2 2 2h0a2 2 0 0 0 2-2V2M5 11v11M21 2v20M21 2a5 5 0 0 0-5 5v4h5"/>
          </svg>
        </span>
        <span className={styles.rowLabel}>Страва</span>
        <span className={`${styles.rowVal} ${meals.length > 0 ? styles.rowValSecond : styles.rowValDim}`}>
          {meals.length > 0 ? meals.join(' · ') : 'не заплановано'}
        </span>
      </button>

      <button type="button" className={styles.row} onClick={onNotesClick}>
        <span className={styles.rowIcon}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </span>
        <span className={styles.rowLabel}>Нотатки</span>
        <span className={`${styles.rowVal} ${notesCount > 0 ? '' : styles.rowValDim}`}>
          {notesCount > 0 ? latestNote || `${notesCount} записів` : 'немає'}
        </span>
      </button>
    </div>
  </div>
)

export default DaySummaryCard
