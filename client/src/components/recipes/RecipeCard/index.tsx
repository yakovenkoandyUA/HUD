import React from 'react'
import type { Recipe } from '../../../types'
import styles from './RecipeCard.module.css'

/**
 * RecipeCard
 * ----------
 * Картка особистого рецепту.
 *
 * Props:
 * @prop {Recipe}     recipe    — дані рецепту
 * @prop {() => void} onEdit    — відкрити форму редагування
 * @prop {() => void} onDelete  — видалити рецепт
 */
interface RecipeCardProps {
  recipe: Recipe
  onEdit: () => void
  onDelete: () => void
}

const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, onEdit, onDelete }) => (
  <div className={styles.card}>
    {recipe.imageUrl && (
      <img src={recipe.imageUrl} alt={recipe.title} className={styles.image} loading="lazy" />
    )}
    <div className={styles.body}>
      <div className={styles.top}>
        <h3 className={styles.title}>{recipe.title}</h3>
        <div className={styles.btns}>
          <button type="button" className={styles.iconBtn} onClick={onEdit} aria-label="Редагувати">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M9.5 2.5l2 2L4 12H2v-2L9.5 2.5z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button type="button" className={`${styles.iconBtn} ${styles.del}`} onClick={onDelete} aria-label="Видалити">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M2 3.5h10M5 3.5V2.5h4v1M5.5 6v4M8.5 6v4M3 3.5l.75 8h6.5l.75-8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
      {recipe.ingredients.length > 0 && (
        <p className={styles.ingredients}>
          {recipe.ingredients.slice(0, 4).join(' · ')}
          {recipe.ingredients.length > 4 && ` · +${recipe.ingredients.length - 4}`}
        </p>
      )}
    </div>
  </div>
)

export default RecipeCard
