import React from 'react'
import type { Meal } from '../../../types'
import styles from './MealBanner.module.css'

/**
 * MealBanner
 * ----------
 * Компактна горизонтальна картка "Блюдо тижня" (~180px висота).
 * Фото зліва, назва + теги + кнопка праворуч.
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
    <div className={styles.sectionHeader}>
      <span className={styles.sectionLabel}>Блюдо тижня</span>
      <button type="button" className={styles.refreshBtn} onClick={onRefresh} aria-label="Нове блюдо">
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M12 7A5 5 0 1 1 7 2a5 5 0 0 1 3.54 1.46L12 2v4H8l1.5-1.5A3 3 0 1 0 10 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>

    <div className={styles.card}>
      <img src={meal.thumb} alt={meal.name} className={styles.photo} loading="lazy" />
      <div className={styles.body}>
        <h2 className={styles.name}>{meal.name}</h2>
        <div className={styles.tags}>
          {meal.area && <span className={styles.tag}>{meal.area}</span>}
          {meal.category && <span className={styles.tag}>{meal.category}</span>}
          <span className={styles.tag}>{meal.ingredients.length} інгр.</span>
        </div>
        <button type="button" className={styles.viewBtn} onClick={onView}>
          Переглянути
        </button>
      </div>
    </div>

    <p className={styles.hint}>Оновлюється щотижня</p>
  </div>
)

export default MealBanner
