import React, { useState } from 'react'
import type { Recipe } from '@/shared/types'
import { useRecipesStore } from '@/features/recipes/store/recipesStore'
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

/* ── Category fallback icons (stroke, currentColor) ── */
const IconPot: React.FC = () => (
  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 11h14M5 11c0 5.5 2.5 7 7 7s7-1.5 7-7"/>
    <path d="M9 11V8h6v3"/>
    <path d="M10 7V5.5M14 7V5.5"/>
    <path d="M2 11h2M20 11h2"/>
  </svg>
)
const IconBowl: React.FC = () => (
  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 13c0-4 3.5-6 8-6s8 2 8 6c0 3-2.5 5-8 5S4 16 4 13z"/>
    <path d="M4 13h16"/>
    <path d="M10 9l-1-3M14 9l1-3"/>
  </svg>
)
const IconPlate: React.FC = () => (
  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="14" r="6"/>
    <path d="M7 4v4.5M5 4v3.5a2 2 0 0 0 4 0V4"/>
    <path d="M17 4v11M15 4v3a2 2 0 0 0 4 0V4"/>
  </svg>
)
const IconRice: React.FC = () => (
  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 11c0-3 2.5-5 6-5s6 2 6 5c0 1-.4 2-1 2.5H7C6.4 13 6 12 6 11z"/>
    <path d="M4 13.5h16M6 13.5v3a6 3 0 0 0 12 0v-3"/>
  </svg>
)
const IconNoodles: React.FC = () => (
  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M7 7c1.5-2 5-2 5 0s3.5 2 5 0"/>
    <path d="M5 12c2-3 5-3 7 0s5 3 7 0"/>
    <path d="M7 17c1.5-2 5-2 5 0s3.5 2 5 0"/>
    <path d="M4 19h16"/>
  </svg>
)
const IconMeat: React.FC = () => (
  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M8.5 13.5a5.5 5.5 0 0 1 7-7l3 3a5.5 5.5 0 0 1-7 7z"/>
    <path d="M14.5 6.5L19 4l-2.5 4.5"/>
    <circle cx="10.5" cy="13.5" r="1.5"/>
  </svg>
)
const IconFish: React.FC = () => (
  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 12c4-6 14-6 18 0-4 6-14 6-18 0z"/>
    <path d="M18 12l3-3v6l-3-3z"/>
    <circle cx="8" cy="11" r="1" fill="currentColor"/>
  </svg>
)
const IconFork: React.FC = () => (
  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M8 3v5M8 8c0 2 1.5 3 4 3s4-1 4-3V3M12 11v10"/>
  </svg>
)
const IconCake: React.FC = () => (
  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="14" width="18" height="6" rx="1"/>
    <path d="M3 14l3-6h12l3 6"/>
    <path d="M7 14v-3M12 14V8M17 14v-3"/>
    <path d="M12 8V5M10.5 5a1.5 1.5 0 0 1 3 0"/>
  </svg>
)
const IconBread: React.FC = () => (
  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 15a5 5 0 0 1 4-5h4a5 5 0 0 1 4 5c0 2-1 3-2.5 3H8.5C7 18 6 17 6 15z"/>
    <path d="M7 11V9a5 5 0 0 1 10 0v2"/>
  </svg>
)
const IconGlass: React.FC = () => (
  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M7 4h10l-1.5 11a2 2 0 0 1-2 1.5H10.5a2 2 0 0 1-2-1.5L7 4z"/>
    <path d="M7 9h10"/>
    <path d="M9 19.5h6"/>
  </svg>
)
const IconSpoon: React.FC = () => (
  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3a4 4 0 0 1 4 4c0 2.5-1.5 4-4 4.5V21"/>
    <path d="M12 11.5C9.5 11 8 9.5 8 7a4 4 0 0 1 4-4"/>
  </svg>
)

const CATEGORY_ICON_MAP: Array<[string[], React.FC]> = [
  [['Супи', 'Суп'],                     IconPot],
  [['Салати', 'Салат'],                 IconBowl],
  [['Основні'],                         IconPlate],
  [['Гарніри', 'Гарнір'],              IconRice],
  [['Паста'],                            IconNoodles],
  [['М\'ясо', 'Мясо'],                  IconMeat],
  [['Риба'],                             IconFish],
  [['Закуски', 'Закуска'],              IconFork],
  [['Десерти', 'Десерт'],               IconCake],
  [['Випічка'],                          IconBread],
  [['Напої', 'Напій'],                  IconGlass],
]

function getCategoryIcon(category?: string): React.FC {
  if (!category) return IconSpoon
  const lower = category.toLowerCase()
  for (const [keys, Icon] of CATEGORY_ICON_MAP) {
    if (keys.some(k => lower.includes(k.toLowerCase()))) return Icon
  }
  return IconSpoon
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

const SparkleIcon: React.FC = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2c0 0 1.4 6 4.5 9S22 14 22 14s-5.4 1.4-8.5 4.5S12 22 12 22s-1.4-5.4-4.5-8.5S2 12 2 12s5.4-1.4 8.5-4.5S12 2 12 2z"/>
  </svg>
)

const AI_OWNER_NAME = 'MIMIR AI'

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
  const isAiOwner = hasOwner && recipe.ownerName === AI_OWNER_NAME
  const FallbackIcon = getCategoryIcon(recipe.category)

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
            <FallbackIcon />
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
            isAiOwner ? (
              <div className={styles.ownerAiBadge} title={AI_OWNER_NAME}>
                <SparkleIcon />
              </div>
            ) : (
              <div className={styles.ownerBadge} title={recipe.ownerName}>
                {recipe.ownerAvatarUrl
                  ? <img src={recipe.ownerAvatarUrl} alt={recipe.ownerName} className={styles.ownerAvatar} />
                  : <span className={styles.ownerInitial}>{recipe.ownerName![0]}</span>
                }
              </div>
            )
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
