import React from 'react'
import type { Recipe } from '../../../types'
import { useRecipesStore } from '../../../store/recipesStore'
import styles from './RecipeCard.module.css'

/**
 * RecipeCard
 * ----------
 * Grid-картка рецепту: фото на весь квадрат, серце top-right, meta overlay внизу.
 *
 * Props:
 * @prop {Recipe}     recipe  — дані рецепту
 * @prop {() => void} onClick — перейти на деталь
 */
interface RecipeCardProps {
  recipe: Recipe
  onClick: () => void
}

function formatCookTime(minutes: number): string {
  if (minutes < 60) return `${minutes} хв`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h} год` : `${h} год ${m} хв`
}

const HeartIcon: React.FC<{ filled: boolean }> = ({ filled }) => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill={filled ? 'currentColor' : 'none'} aria-hidden="true">
    <path d="M8 14s-6-3.5-6-7.5A3.5 3.5 0 0 1 8 4a3.5 3.5 0 0 1 6 2.5C14 10.5 8 14 8 14z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const ChefHatIcon: React.FC = () => (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path d="M4.5 10.5h5M5 10.5V12h4v-1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M3 7a2 2 0 1 1 1.4-3.4A2.5 2.5 0 0 1 7 2.5a2.5 2.5 0 0 1 2.6 1.1A2 2 0 1 1 11 7H3z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, onClick }) => {
  const { wishlistIds, toggleWishlist } = useRecipesStore()
  const isWishlisted = wishlistIds.includes(recipe.id)

  return (
    <div
      className={styles.card}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}
    >
      <div className={styles.photoWrap}>
        {recipe.imageUrl
          ? <img src={recipe.imageUrl} alt={recipe.title} className={styles.photo} loading="lazy" />
          : (
            <div className={styles.photoPlaceholder}>
              <span className={styles.photoInitial}>{recipe.title[0]?.toUpperCase()}</span>
            </div>
          )
        }

        <div className={styles.gradient} />

        <button
          type="button"
          className={`${styles.heartBtn} ${isWishlisted ? styles.heartActive : ''}`}
          onClick={e => { e.stopPropagation(); toggleWishlist(recipe.id) }}
          aria-label={isWishlisted ? 'Видалити з wishlist' : 'Додати до wishlist'}
        >
          <HeartIcon filled={isWishlisted} />
        </button>

        {(recipe.cookTime || recipe.difficulty) && (
          <div className={styles.metaOverlay}>
            {recipe.cookTime && (
              <span className={styles.metaTime}>⏱ {formatCookTime(recipe.cookTime)}</span>
            )}
            {recipe.difficulty && (
              <span className={styles.metaDiff}><ChefHatIcon /></span>
            )}
          </div>
        )}
      </div>

      <h3 className={styles.title}>{recipe.title}</h3>
    </div>
  )
}

export default RecipeCard
