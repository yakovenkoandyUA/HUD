import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useRecipesStore } from '../../store/recipesStore'
import { useProfileStore } from '../../store/profileStore'
import { useUiStore } from '../../store/uiStore'
import { useSprintStore } from '../../store/sprintStore'
import RecipeForm from '../../components/recipes/RecipeForm'
import Modal from '../../components/ui/Modal'
import type { Recipe } from '../../types'
import styles from './RecipeDetail.module.css'

/**
 * RecipeDetailScreen
 * ------------------
 * Детальна сторінка рецепту з hero-фото, метаданими, stepper порцій та wishlist.
 *
 * Props: none — id береться з useParams
 */

const DIFFICULTY_LABELS = { easy: 'Легкий', medium: 'Середній', hard: 'Важкий' }

const BackIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <path d="M11 14L6 9l5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const EditIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M11 2.5l2.5 2.5L5 13.5H2.5V11L11 2.5z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const TrashIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M2.5 4h11M6 4V2.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V4M4 4l.9 9h6.2L12 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const HeartIcon: React.FC<{ filled: boolean }> = ({ filled }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill={filled ? 'currentColor' : 'none'} aria-hidden="true">
    <path d="M8 14s-6-3.5-6-7.5A3.5 3.5 0 0 1 8 4a3.5 3.5 0 0 1 6 2.5C14 10.5 8 14 8 14z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const ShoppingIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M3 4h10l-1.5 7H4.5L3 4z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
    <path d="M5.5 4V3a2.5 2.5 0 0 1 5 0v1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
)

// const ShareIcon: React.FC = () => (
//   <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
//     <path d="M10 2l4 4-4 4M14 6H6a4 4 0 0 0-4 4v1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
//   </svg>
// )

const TimerIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <circle cx="7" cy="8" r="5" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M7 5.5V8l1.5 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <path d="M5.5 1.5h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
)

function parseEquipment(str: string): { emoji: string; name: string; count: number | null } {
  const countMatch = str.match(/^(\d+)[x×]\s*/)
  const count = countMatch ? parseInt(countMatch[1]) : null
  const rest = countMatch ? str.slice(countMatch[0].length).trim() : str.trim()
  const parts = rest.split(/\s+/)
  const emoji = parts[0] ?? '🍴'
  const name = parts.slice(1).join(' ') || emoji
  return { emoji, name, count }
}

function parseIngredientStr(str: string): { amount: string; name: string } {
  const m = str.match(/^(\d+(?:[.,]\d+)?\s*(?:[а-яА-Яa-zA-Z]+\.?)?\s*)(.+)$/)
  if (!m) return { amount: '', name: str }
  return { amount: m[1].trim(), name: m[2].trim() }
}

function scaleIngredientStr(str: string, factor: number): { amount: string; name: string } {
  const m = str.match(/^(\d+(?:[.,]\d+)?)(\s*[а-яА-Яa-zA-Z]*\.?\s*)(.+)$/)
  if (!m) return { amount: '', name: str }
  const scaled = parseFloat(m[1].replace(',', '.')) * factor
  const formatted = scaled % 1 === 0 ? String(Math.round(scaled)) : scaled.toFixed(1)
  return { amount: formatted + m[2].trim(), name: m[3].trim() }
}

const RecipeDetailScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { recipes, wishlistIds, toggleWishlist, updateRecipe, deleteRecipe } = useRecipesStore()
  const { activeProfile } = useProfileStore()
  const { showToast } = useUiStore()
  const { addItem: addSprintItem, items: sprintItems } = useSprintStore()

  const recipe = recipes.find(r => r.id === id)
  const defaultServings = recipe?.servings ?? 2
  const [servings, setServings] = useState(defaultServings)
  const [showEdit, setShowEdit] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showAddConfirm, setShowAddConfirm] = useState(false)

  const handleEdit = (data: Omit<Recipe, 'id'>) => {
    if (!id) return
    updateRecipe(id, data)
    showToast('Рецепт оновлено', 'success')
    setShowEdit(false)
  }

  const handleDelete = () => {
    if (!id) return
    deleteRecipe(id)
    navigate('/recipes')
  }

  const isWishlisted = id ? wishlistIds.includes(id) : false
  const factor = servings / defaultServings

  const alreadyInList = recipe
    ? sprintItems.some(it => it.type === 'shopping' && it.recipeId === recipe.id && !it.done)
    : false

  const doAddToShopping = () => {
    if (!recipe) return
    addSprintItem({
      type:          'shopping',
      title:         recipe.title,
      recipeId:      recipe.id,
      recipeImageUrl: recipe.imageUrl,
      checklist:     recipe.ingredients.map(ing => ({
        id:    crypto.randomUUID(),
        title: ing,
        done:  false,
      })),
    })
    showToast(`«${recipe.title}» додано до квестів`, 'success')
    navigate('/sprint')
  }

  const handleAddToShopping = () => {
    if (!recipe) return
    if (alreadyInList) { setShowAddConfirm(true); return }
    doAddToShopping()
  }

  if (!recipe) {
    return (
      <div className={styles.screen}>
        <div className={styles.notFound}>
          <button type="button" className={styles.backBtnPlain} onClick={() => navigate('/recipes')}>
            <BackIcon /> Назад
          </button>
          <p>Рецепт не знайдено</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.screen}>

      {/* ── Hero ── */}
      {recipe.imageUrl ? (
        <div className={styles.hero}>
          <img src={recipe.imageUrl} alt={recipe.title} className={styles.heroImg} />
          <div className={styles.heroGradient} />
          <button type="button" className={styles.backBtn} onClick={() => navigate('/recipes')}>
            <BackIcon />
          </button>
          <div className={styles.heroActions}>
            <button type="button" className={styles.editBtn} onClick={() => setShowEdit(true)} aria-label="Редагувати">
              <EditIcon />
            </button>
            <button type="button" className={`${styles.editBtn} ${confirmDelete ? styles.editBtnDanger : ''}`} onClick={() => setConfirmDelete(true)} aria-label="Видалити">
              <TrashIcon />
            </button>
          </div>
          <div className={styles.authorRow}>
            {activeProfile?.avatarUrl ? (
              <img src={activeProfile.avatarUrl} alt={activeProfile.name} className={styles.authorAvatar} />
            ) : (
              <span className={styles.authorInitial}>
                {activeProfile?.name?.[0]?.toUpperCase() ?? 'A'}
              </span>
            )}
            <span className={styles.authorName}>{activeProfile?.name ?? 'Автор'}</span>
          </div>
        </div>
      ) : (
        <div className={styles.noHero}>
          <button type="button" className={styles.backBtnDark} onClick={() => navigate('/recipes')}>
            <BackIcon />
          </button>
          <div className={styles.noHeroActions}>
            <button type="button" className={styles.editBtnDark} onClick={() => setShowEdit(true)} aria-label="Редагувати">
              <EditIcon />
            </button>
            <button type="button" className={`${styles.editBtnDark} ${confirmDelete ? styles.editBtnDarkDanger : ''}`} onClick={() => setConfirmDelete(true)} aria-label="Видалити">
              <TrashIcon />
            </button>
          </div>
        </div>
      )}

      {/* ── Content ── */}
      <div className={styles.content}>

        {/* ── Delete confirm bar ── */}
        {confirmDelete && (
          <div className={styles.deleteBar}>
            <span className={styles.deleteBarMsg}>Видалити рецепт?</span>
            <button type="button" className={styles.deleteBarYes} onClick={handleDelete}>Так</button>
            <button type="button" className={styles.deleteBarNo} onClick={() => setConfirmDelete(false)}>Ні</button>
          </div>
        )}

        {/* ── Add-again confirm bar ── */}
        {showAddConfirm && (
          <div className={styles.deleteBar}>
            <span className={styles.deleteBarMsg}>Вже у квестах. Додати ще раз?</span>
            <button type="button" className={styles.deleteBarYes} onClick={() => { setShowAddConfirm(false); doAddToShopping() }}>Так</button>
            <button type="button" className={styles.deleteBarNo} onClick={() => setShowAddConfirm(false)}>Ні</button>
          </div>
        )}

        {/* Title + meta */}
        <div className={styles.titleBlock}>
          <h1 className={styles.title}>{recipe.title}</h1>
          {!recipe.imageUrl && activeProfile && (
            <div className={styles.authorRowInline}>
              {activeProfile.avatarUrl ? (
                <img src={activeProfile.avatarUrl} alt={activeProfile.name} className={styles.authorAvatarSm} />
              ) : (
                <span className={styles.authorInitialSm}>
                  {activeProfile.name[0].toUpperCase()}
                </span>
              )}
              <span className={styles.authorNameDark}>{activeProfile.name}</span>
            </div>
          )}
          <div className={styles.meta}>
            {recipe.calories && (
              <span className={styles.metaItem}>{recipe.calories} ккал/100г</span>
            )}
            {recipe.calories && recipe.difficulty && <span className={styles.metaDot} />}
            {recipe.difficulty && (
              <span className={styles.metaItem}>{DIFFICULTY_LABELS[recipe.difficulty]}</span>
            )}
          </div>
        </div>

        {/* Action bar */}
        <div className={styles.actionBar}>
          <button
            type="button"
            className={`${styles.actionBtn} ${isWishlisted ? styles.actionBtnActive : ''}`}
            onClick={() => { if (id) toggleWishlist(id); }}
          >
            <span className={`${styles.heartWrap} ${isWishlisted ? styles.heartActive : ''}`}>
              <HeartIcon filled={isWishlisted} />
            </span>
            Wishlist
          </button>
          <button
            type="button"
            className={`${styles.actionBtn} ${alreadyInList ? styles.actionBtnActive : ''}`}
            onClick={handleAddToShopping}
          >
            <ShoppingIcon />
            {alreadyInList ? 'У списку' : 'Покупки'}
          </button>
          {/* <button
            type="button"
            className={styles.actionBtn}
            onClick={() => showToast('Поділитись — незабаром', 'info')}
          >
            <ShareIcon />
            Поділитись
          </button> */}
        </div>

        {/* Cook time */}
        {recipe.cookTime && (
          <div className={styles.cookTimePill}>
            <TimerIcon />
            <span className={styles.cookTimeValue}>{recipe.cookTime} хв</span>
            <span className={styles.cookTimeSep}>·</span>
            <span className={styles.cookTimeLabel}>Готування</span>
          </div>
        )}

        {/* Equipment */}
        {recipe.equipment && recipe.equipment.length > 0 && (
          <div className={styles.section}>
            <p className={styles.sectionTitle}>Техніка та інструменти</p>
            <div className={styles.equipmentScroll}>
              {recipe.equipment.map((eq, i) => {
                const { emoji, name, count } = parseEquipment(eq)
                return (
                  <div key={i} className={styles.equipmentCard}>
                    {count !== null && count > 1 && (
                      <span className={styles.equipmentBadge}>{count} шт</span>
                    )}
                    <span className={styles.equipmentEmoji}>{emoji}</span>
                    <span className={styles.equipmentName}>{name}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Description / steps */}
        {recipe.steps && (
          <div className={styles.section}>
            <p className={styles.sectionTitle}>Опис рецепту</p>
            <p className={styles.description}>{recipe.steps}</p>
          </div>
        )}

        {/* Ingredients */}
        {recipe.ingredients.length > 0 && (
          <div className={styles.section}>
            <div className={styles.servingsRow}>
              <p className={styles.sectionTitle}>Складові</p>
              <div className={styles.stepper}>
                <button
                  type="button"
                  className={styles.stepperBtn}
                  onClick={() => setServings(s => Math.max(1, s - 1))}
                  aria-label="Менше порцій"
                >−</button>
                <span className={styles.stepperValue}>{servings}</span>
                <button
                  type="button"
                  className={styles.stepperBtn}
                  onClick={() => setServings(s => s + 1)}
                  aria-label="Більше порцій"
                >+</button>
              </div>
            </div>
            <ul className={styles.ingredientList}>
              {recipe.ingredients.map((ing, i) => {
                const { amount, name } = factor === 1
                  ? parseIngredientStr(ing)
                  : scaleIngredientStr(ing, factor)
                return (
                  <li key={i} className={styles.ingredientItem}>
                    <span className={styles.ingredientName}>{name || ing}</span>
                    {amount && <span className={styles.ingredientAmount}>{amount}</span>}
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        <div className={styles.bottomPad} />
      </div>

      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Редагувати рецепт" draggable>
        <RecipeForm
          initial={recipe}
          onSave={handleEdit}
          onCancel={() => setShowEdit(false)}
        />
      </Modal>
    </div>
  )
}

export default RecipeDetailScreen
