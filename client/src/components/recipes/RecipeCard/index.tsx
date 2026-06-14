import React, { useState } from 'react'
import type { Recipe } from '../../../types'
import { useRecipesStore } from '../../../store/recipesStore'
import styles from './RecipeCard.module.css'

/**
 * RecipeCard
 * ----------
 * Фото зверху (4/3), info блок знизу: назва + owner, category pill, difficulty pill, час.
 *
 * Props:
 * @prop {Recipe}     recipe       — дані рецепту
 * @prop {() => void} onClick      — перейти на деталь
 * @prop {boolean}    hideCategory — приховати category pill (коли фільтр активний)
 */
interface RecipeCardProps {
  recipe: Recipe
  onClick: () => void
  hideCategory?: boolean
}

function formatCookTime(minutes: number): string {
  if (minutes < 60) return `${minutes} хв`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h} год` : `${h} год ${m} хв`
}

const HeartIcon: React.FC<{ filled: boolean }> = ({ filled }) => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill={filled ? 'currentColor' : 'none'} aria-hidden="true">
    <path d="M8 14s-6-3.5-6-7.5A3.5 3.5 0 0 1 8 4a3.5 3.5 0 0 1 6 2.5C14 10.5 8 14 8 14z"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const DIFFICULTY_LABEL: Record<string, string> = {
  easy:   'легко',
  medium: 'середньо',
  hard:   'складно',
}

const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, onClick, hideCategory = false }) => {
  const { wishlistIds, toggleWishlist } = useRecipesStore()
  const isWishlisted = wishlistIds.includes(recipe.id)
  const [loaded, setLoaded] = useState(false)

  const hasOwner = recipe.isOwn === false && !!recipe.ownerName

  return (
    <div
      className={styles.card}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}
    >
      {/* ── Photo section ── */}
      <div className={styles.photoWrap}>
        {recipe.imageUrl ? (
          <>
            {!loaded && <div className={styles.shimmer} />}
            <img
              src={recipe.imageUrl}
              alt={recipe.title}
              className={`${styles.photo} ${loaded ? styles.photoLoaded : ''}`}
              loading="lazy"
              onLoad={() => setLoaded(true)}
            />
          </>
        ) : (
          <div className={styles.photoPlaceholder}>
            <span className={styles.photoInitial}>{recipe.title[0]?.toUpperCase()}</span>
          </div>
        )}

        {recipe.difficulty && DIFFICULTY_LABEL[recipe.difficulty] && (
          <span className={`${styles.diffBadge} ${styles[`diff_${recipe.difficulty}`]}`}>
            {DIFFICULTY_LABEL[recipe.difficulty]}
          </span>
        )}

        <button
          type="button"
          className={`${styles.heartBtn} ${isWishlisted ? styles.heartActive : ''}`}
          onClick={e => { e.stopPropagation(); toggleWishlist(recipe.id) }}
          aria-label={isWishlisted ? 'Видалити з wishlist' : 'Додати до wishlist'}
        >
          <HeartIcon filled={isWishlisted} />
        </button>
      </div>

      {/* ── Info block ── */}
      <div className={styles.info}>
        <div className={styles.titleRow}>
          <h3 className={styles.title}>{recipe.title}</h3>
          {hasOwner && (
            <div className={styles.ownerBadge} title={recipe.ownerName}>
              {recipe.ownerAvatarUrl
                ? <img src={recipe.ownerAvatarUrl} alt={recipe.ownerName} className={styles.ownerAvatar} />
                : <span className={styles.ownerInitial}>{recipe.ownerName![0]}</span>
              }
            </div>
          )}
        </div>
        <div className={styles.meta}>
          {!hideCategory && recipe.category && (
            <span className={styles.categoryPill}>{recipe.category}</span>
          )}
          {recipe.cookTime ? (
            <span className={styles.cookTime}>{formatCookTime(recipe.cookTime)}</span>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default RecipeCard
