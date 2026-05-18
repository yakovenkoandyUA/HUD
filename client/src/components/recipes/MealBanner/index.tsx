import React from 'react'
import type { Meal } from '../../../types'
import styles from './MealBanner.module.css'

/**
 * MealBanner
 * ----------
 * Hero-картка "Блюдо тижня" з TheMealDB.
 * Велике фото, назва, категорія/регіон, кнопка перегляду повного рецепту.
 *
 * Props:
 * @prop {Meal}       meal      — дані блюда з API
 * @prop {() => void} onView    — відкрити деталі рецепту
 * @prop {() => void} onRefresh — завантажити нове блюдо
 */
interface MealBannerProps {
  meal: Meal
  onView: () => void
  onRefresh: () => void
}

const MealBanner: React.FC<MealBannerProps> = ({ meal, onView, onRefresh }) => (
  <div className={styles.wrap}>
    <div className={styles.imageWrap}>
      <img src={meal.thumb} alt={meal.name} className={styles.image} loading="lazy" />
      <div className={styles.overlay} />
      <div className={styles.badges}>
        {meal.area && <span className={styles.badge}>{meal.area}</span>}
        {meal.category && <span className={styles.badge}>{meal.category}</span>}
      </div>
    </div>
    <div className={styles.body}>
      <h2 className={styles.name}>{meal.name}</h2>
      <p className={styles.meta}>{meal.ingredients.length} інгредієнтів</p>
      <div className={styles.actions}>
        <button type="button" className={styles.viewBtn} onClick={onView}>
          Переглянути рецепт
        </button>
        <button type="button" className={styles.refreshBtn} onClick={onRefresh} aria-label="Нове блюдо">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M12 7A5 5 0 1 1 7 2a5 5 0 0 1 3.54 1.46L12 2v4H8l1.5-1.5A3 3 0 1 0 10 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
)

export default MealBanner
