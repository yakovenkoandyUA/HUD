import React from 'react'
import type { UnifiedTodo } from '../../../types'
import styles from './DaySummaryCard.module.css'

/**
 * DaySummaryCard
 * --------------
 * Єдина картка "СЬОГОДНІ" на Dashboard.
 * Зверху — рутин-чіпи (інтерактивні), знизу — 2×2 навігаційний грід.
 *
 * Props:
 * @prop {UnifiedTodo[]} routineItems   — рутини що заплановані на сьогодні
 * @prop {(t: UnifiedTodo) => boolean} isDoneToday — чи виконана рутина сьогодні
 * @prop {(id: string) => void} onToggle — тогл рутини
 * @prop {number}   activeQuests        — кількість активних квестів
 * @prop {number}   shoppingCount       — кількість непридбаних покупок
 * @prop {string[]} meals               — назви страв на сьогодні
 * @prop {number}   notesCount          — загальна кількість нотаток
 * @prop {string}   latestNote          — перший рядок останньої нотатки
 * @prop {() => void} onOpenDay         — відкрити DayOverlay
 * @prop {() => void} onQuestsClick     — перейти до квестів
 * @prop {() => void} onShoppingClick   — перейти до покупок
 * @prop {() => void} onMealsClick      — перейти до планера
 * @prop {() => void} onNotesClick      — перейти до нотаток
 */
interface DaySummaryCardProps {
  routineItems: UnifiedTodo[]
  isDoneToday: (t: UnifiedTodo) => boolean
  onToggle: (id: string) => void
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
  routineItems, isDoneToday, onToggle,
  activeQuests, shoppingCount, meals, notesCount, latestNote,
  onOpenDay, onQuestsClick, onShoppingClick, onMealsClick, onNotesClick,
}) => (
  <div className={styles.root}>
    <div className={styles.header}>
      <span className={styles.headerLabel}>Сьогодні</span>
      <button type="button" className={styles.openBtn} onClick={onOpenDay}>
        детальніше
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </button>
    </div>

    {routineItems.length > 0 && (
      <div className={styles.chipsRow}>
        {routineItems.map(r => {
          const done = isDoneToday(r)
          return (
            <button
              key={r.id}
              type="button"
              className={`${styles.chip} ${done ? styles.chipDone : ''}`}
              onClick={() => onToggle(r.id)}
            >
              <span className={styles.chipBox}>
                {done && (
                  <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                    <path d="M1.5 4.5l2 2 3.5-3.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </span>
              {r.title}
            </button>
          )
        })}
      </div>
    )}

    <div className={styles.grid}>
      <button type="button" className={styles.cell} onClick={onQuestsClick}>
        <div className={styles.cellTop}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.cellIcon}>
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
          <span className={styles.cellLabel}>Квести</span>
        </div>
        <span className={`${styles.cellVal} ${activeQuests > 0 ? styles.cellValGold : styles.cellValDim}`}>
          {activeQuests > 0 ? `${activeQuests} активних` : 'все виконано'}
        </span>
      </button>

      <button type="button" className={styles.cell} onClick={onShoppingClick}>
        <div className={styles.cellTop}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.cellIcon}>
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
          </svg>
          <span className={styles.cellLabel}>Покупки</span>
        </div>
        <span className={`${styles.cellVal} ${shoppingCount > 0 ? styles.cellValAccent : styles.cellValDim}`}>
          {shoppingCount > 0 ? `${shoppingCount} пунктів` : 'порожньо'}
        </span>
      </button>

      <button type="button" className={styles.cell} onClick={onMealsClick}>
        <div className={styles.cellTop}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={styles.cellIcon}>
            <path d="M3 2v7c0 1.1.9 2 2 2h0a2 2 0 0 0 2-2V2M5 11v11M21 2v20M21 2a5 5 0 0 0-5 5v4h5"/>
          </svg>
          <span className={styles.cellLabel}>Страва</span>
        </div>
        <span className={`${styles.cellVal} ${meals.length > 0 ? styles.cellValSecond : styles.cellValDim}`}>
          {meals.length > 0 ? meals.join(' · ') : 'не заплановано'}
        </span>
      </button>

      <button type="button" className={styles.cell} onClick={onNotesClick}>
        <div className={styles.cellTop}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={styles.cellIcon}>
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          <span className={styles.cellLabel}>Нотатки</span>
        </div>
        <span className={`${styles.cellVal} ${notesCount > 0 ? '' : styles.cellValDim}`}>
          {notesCount > 0 ? latestNote || `${notesCount} записів` : 'немає'}
        </span>
      </button>
    </div>
  </div>
)

export default DaySummaryCard
