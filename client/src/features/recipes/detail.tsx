import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useRecipesStore } from '@/features/recipes/store/recipesStore'
import { useProfileStore } from '@/shared/store/profileStore'
import { useUiStore } from '@/shared/store/uiStore'
import { useSprintStore } from '@/features/sprint/store/sprintStore'
import RecipeForm from './components/recipes/RecipeForm'
import ChefChatSheet from './components/recipes/ChefChatSheet'
import Modal from '@/shared/components/ui/Modal'
import IngredientIcon from '@/shared/components/ui/IngredientIcon'
import type { Recipe } from '@/shared/types'
import { normalizeIngredient } from './utils/normalizeIngredient'
import { useAchievementsStore } from '@/shared/store/achievementsStore'
import { useCanUseFeature } from '@/shared/hooks/usePlan'
import styles from './RecipeDetail.module.css'

/**
 * RecipeDetailScreen
 * ------------------
 * Детальна сторінка рецепту з hero-фото, метаданими, stepper порцій та wishlist.
 *
 * Props: none — id береться з useParams
 */

const DIFFICULTY_LABELS = { easy: 'Легкий', medium: 'Середній', hard: 'Важкий' }

const METHOD_EMOJI: Record<string, string> = {
  'Смаження': '🍳', 'Варіння': '🫧', 'Тушкування': '🫕', 'Запікання': '🔥',
  'Гриль': '🥩', 'На парі': '💨', 'Без термообробки': '🥗', 'Заморожування': '🧊',
}

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

const ChefIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M4 7a2.3 2.3 0 0 1 .6-4.4 2.3 2.3 0 0 1 4.3-1.4 2.3 2.3 0 0 1 4.3 1.4A2.3 2.3 0 0 1 12 7"
      stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
    <path d="M4 7h8v2.5H4V7z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
    <path d="M4.5 9.5L5 14h6l.5-4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const UtensilsIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M5 2v3.5" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round"/>
    <path d="M7 2v3.5" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round"/>
    <path d="M5 5.5c0 .8.45 1.4 1 1.4s1-.6 1-1.4" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round"/>
    <path d="M6 6.9V14" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round"/>
    <path d="M11 2c0 0 2 1.5 2 3.8V7h-2" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M11 7V14" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round"/>
  </svg>
)

// const ShareIcon: React.FC = () => (
//   <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
//     <path d="M10 2l4 4-4 4M14 6H6a4 4 0 0 0-4 4v1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
//   </svg>
// )



function scaleAmount(amount: string, factor: number): string {
  if (!amount) return ''
  const n = parseFloat(amount.replace(',', '.'))
  if (isNaN(n)) return amount
  const scaled = n * factor
  return scaled % 1 === 0 ? String(Math.round(scaled)) : scaled.toFixed(1)
}

const RecipeDetailScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { recipes, wishlistIds, cookStats, toggleWishlist, updateRecipe, deleteRecipe, logCook, fetchCookStats } = useRecipesStore()
  const { activeProfile } = useProfileStore()
  const { showToast } = useUiStore()
  const canUseChef = useCanUseFeature('aiChefChat')
  const { addItem: addSprintItem, items: sprintItems } = useSprintStore()

  const recipe = recipes.find(r => r.id === id)
  const defaultServings = recipe?.servings ?? 2
  const servings = defaultServings
  const [showEdit, setShowEdit] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showAddConfirm, setShowAddConfirm] = useState(false)
  const [cookLogged, setCookLogged] = useState(false)
  const [showChef, setShowChef] = useState(false)

  const stat = id ? cookStats[id] : undefined
  const [activeTab, setActiveTab] = useState<'ingredients' | 'instructions'>('ingredients')
  const [checkedSteps, setCheckedSteps] = useState<Set<number>>(new Set())

  useEffect(() => { fetchCookStats() }, [fetchCookStats])

  const toggleStep = (i: number) =>
    setCheckedSteps(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })

  const handleLogCook = async () => {
    if (!id) return
    await logCook(id)
    useAchievementsStore.getState().unlock('first-recipe-cooked')
    setCookLogged(true)
    showToast('Записано! Смачного 🍽', 'success')
  }

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
      checklist:     recipe.ingredients.map(raw => {
        const ing = normalizeIngredient(raw)
        const label = [ing.amount, ing.unit, ing.name].filter(Boolean).join(' ')
        return { id: crypto.randomUUID(), title: label || String(raw), done: false }
      }),
    })
    showToast(`«${recipe.title}» додано до покупок`, 'success')
    navigate('/sprint', { state: { filterType: 'shopping' } })
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
          {recipe.isOwn !== false && (
            <div className={styles.heroActions}>
              <button type="button" className={styles.editBtn} onClick={() => setShowEdit(true)} aria-label="Редагувати">
                <EditIcon />
              </button>
              <button type="button" className={`${styles.editBtn} ${confirmDelete ? styles.editBtnDanger : ''}`} onClick={() => setConfirmDelete(true)} aria-label="Видалити">
                <TrashIcon />
              </button>
            </div>
          )}
          <div className={styles.authorRow}>
            <div className={styles.authorInfo}>
              {recipe.isOwn === false && recipe.ownerAvatarUrl ? (
                <img src={recipe.ownerAvatarUrl} alt={recipe.ownerName} className={styles.authorAvatar} />
              ) : recipe.isOwn === false ? (
                <span className={styles.authorInitial}>{recipe.ownerName?.[0]?.toUpperCase() ?? '?'}</span>
              ) : activeProfile?.avatarUrl ? (
                <img src={activeProfile.avatarUrl} alt={activeProfile.name} className={styles.authorAvatar} />
              ) : (
                <span className={styles.authorInitial}>{activeProfile?.name?.[0]?.toUpperCase() ?? 'A'}</span>
              )}
              <span className={styles.authorName}>
                {recipe.isOwn === false ? (recipe.ownerName ?? 'Автор') : (activeProfile?.name ?? 'Автор')}
              </span>
            </div>
            <div className={styles.heroMeta}>
              {recipe.cookTime && (
                <span className={styles.heroMetaChip}>⏱ {recipe.cookTime} хв</span>
              )}
              {recipe.difficulty && (
                <span className={`${styles.heroMetaChip} ${
                  recipe.difficulty === 'easy'   ? styles.heroMetaChipEasy :
                  recipe.difficulty === 'medium' ? styles.heroMetaChipMedium :
                  styles.heroMetaChipHard
                }`}>{DIFFICULTY_LABELS[recipe.difficulty]}</span>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.noHero}>
          <button type="button" className={styles.backBtnDark} onClick={() => navigate('/recipes')}>
            <BackIcon />
          </button>
          {recipe.isOwn !== false && (
            <div className={styles.noHeroActions}>
              <button type="button" className={styles.editBtnDark} onClick={() => setShowEdit(true)} aria-label="Редагувати">
                <EditIcon />
              </button>
              <button type="button" className={`${styles.editBtnDark} ${confirmDelete ? styles.editBtnDarkDanger : ''}`} onClick={() => setConfirmDelete(true)} aria-label="Видалити">
                <TrashIcon />
              </button>
            </div>
          )}
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
          {(!recipe.imageUrl || recipe.calories) && (
            <div className={styles.metaRow}>
              {!recipe.imageUrl && recipe.cookTime && (
                <span className={styles.metaItem}>⏱ {recipe.cookTime} хв</span>
              )}
              {recipe.calories && (
                <span className={styles.metaItem}>🔥 {recipe.calories} ккал</span>
              )}
              {!recipe.imageUrl && recipe.difficulty && (
                <span className={`${styles.metaItem} ${
                  recipe.difficulty === 'easy'   ? styles.metaItemEasy :
                  recipe.difficulty === 'medium' ? styles.metaItemMedium :
                  styles.metaItemHard
                }`}>{DIFFICULTY_LABELS[recipe.difficulty]}</span>
              )}
            </div>
          )}
        </div>

        {/* Action bar */}
        <div className={styles.actionBar}>
          <button
            type="button"
            className={`${styles.actionBtn} ${isWishlisted ? styles.actionBtnActive : ''}`}
            onClick={() => { if (id) toggleWishlist(id); }}
            aria-label={isWishlisted ? 'Видалити з wishlist' : 'Додати до wishlist'}
          >
            <span className={`${styles.heartWrap} ${isWishlisted ? styles.heartActive : ''}`}>
              <HeartIcon filled={isWishlisted} />
            </span>
          </button>
          <button
            type="button"
            className={styles.actionBtn}
            onClick={() => {
              if (!activeProfile?.isVerified) { showToast('Підтвердіть email для AI-шефа', 'error'); return }
              if (!canUseChef) { navigate('/profile?tab=plan'); return }
              setShowChef(true)
            }}
            aria-label="AI шеф-асистент"
          >
            <ChefIcon />
          </button>
          <button
            type="button"
            className={`${styles.actionBtn} ${styles.actionBtnSplit} ${alreadyInList ? styles.actionBtnActive : ''}`}
            onClick={handleAddToShopping}
            aria-label={alreadyInList ? 'Вже у покупках' : 'Додати до покупок'}
          >
            <ShoppingIcon />
            {alreadyInList ? 'У покупках' : 'До покупок'}
          </button>
          <button
            type="button"
            className={`${styles.actionBtnPrimary} ${styles.actionBtn} ${styles.actionBtnSplit} ${cookLogged ? styles.actionBtnPrimaryDone : ''}`}
            onClick={handleLogCook}
            disabled={cookLogged}
          >
            <UtensilsIcon />
            {cookLogged ? 'Записано!' : stat ? `Готував ${stat.count}×` : 'Приготував'}
          </button>
        </div>

        {/* Cook stats */}
        {stat && !cookLogged && (
          <p className={styles.cookStatLine}>
            Готував {stat.count} раз{stat.count === 1 ? '' : 'и'} · востаннє{' '}
            {new Date(stat.lastCooked).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' })}
          </p>
        )}

        {/* Cooking method */}
        {recipe.cookingMethod && recipe.cookingMethod.length > 0 && (
          <div className={styles.toolsSection}>
            <p className={styles.sectionTitle}>Спосіб готування</p>
            <div className={styles.toolsList}>
              {recipe.cookingMethod.map((m, i) => (
                <span key={i} className={`${styles.toolChip} ${styles.methodChip}`}>
                  {METHOD_EMOJI[m] ? `${METHOD_EMOJI[m]} ` : ''}{m}
                </span>
              ))}
            </div>
          </div>
        )}


        {/* ── Tabs ── */}
        {(recipe.ingredients.length > 0 || recipe.instructions?.length || recipe.steps) && (
          <>
            <div className={styles.tabBar}>
              <button
                type="button"
                className={`${styles.tabBtn} ${activeTab === 'ingredients' ? styles.tabBtnActive : ''}`}
                onClick={() => setActiveTab('ingredients')}
              >
                Складові
              </button>
              <button
                type="button"
                className={`${styles.tabBtn} ${activeTab === 'instructions' ? styles.tabBtnActive : ''}`}
                onClick={() => setActiveTab('instructions')}
              >
                Приготування
              </button>
            </div>

            {/* Ingredients tab */}
            {activeTab === 'ingredients' && recipe.ingredients.length > 0 && (
              <div className={styles.section}>
                <ul className={styles.ingredientList}>
                  {recipe.ingredients.map((raw, i) => {
                    const ing = normalizeIngredient(raw)
                    const scaledAmount = factor === 1 ? ing.amount : scaleAmount(ing.amount, factor)
                    return (
                      <li key={i} className={styles.ingredientItem}>
                        <IngredientIcon ingredient={ing.name} size={38} />
                        <span className={styles.ingredientName}>{ing.name}</span>
                        {(scaledAmount || ing.unit) && (
                          <span className={styles.ingredientAmount}>
                            {scaledAmount}{ing.unit ? ' ' + ing.unit : ''}
                          </span>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}

            {/* Instructions tab */}
            {activeTab === 'instructions' && (() => {
              const steps = recipe.instructions?.length
                ? recipe.instructions
                : recipe.steps?.trim()
                  ? recipe.steps.split('\n').filter(Boolean)
                  : []
              if (!steps.length) return (
                <div className={styles.section}>
                  <p className={styles.description}>Кроки не вказані</p>
                </div>
              )
              const firstUnchecked = steps.findIndex((_, i) => !checkedSteps.has(i))
              const allDone = checkedSteps.size === steps.length
              return (
                <div className={styles.section}>
                  {/* Progress */}
                  <div className={styles.stepsHeader}>
                    <span className={`${styles.stepsCounter} ${allDone ? styles.stepsCounterDone : ''}`}>
                      {allDone ? '✓ Всі кроки виконано' : `${checkedSteps.size} / ${steps.length} кроків`}
                    </span>
                    {checkedSteps.size > 0 && (
                      <button type="button" className={styles.resetStepsBtn} onClick={() => setCheckedSteps(new Set())}>
                        Скинути
                      </button>
                    )}
                  </div>
                  <div className={styles.stepsProgressBar}>
                    <div className={styles.stepsProgressFill} style={{ width: `${(checkedSteps.size / steps.length) * 100}%` }} />
                  </div>
                  <div className={styles.stepChecklist}>
                    {steps.map((step, i) => {
                      const isDone = checkedSteps.has(i)
                      const isNext = i === firstUnchecked
                      return (
                        <div
                          key={i}
                          className={`${styles.stepItem} ${isDone ? styles.stepItemDone : ''}`}
                          onClick={() => toggleStep(i)}
                          role="checkbox"
                          aria-checked={isDone}
                          tabIndex={0}
                          onKeyDown={e => e.key === ' ' && toggleStep(i)}
                        >
                          {i < steps.length - 1 && (
                            <div className={`${styles.stepLine} ${isDone ? styles.stepLineDone : ''}`} />
                          )}
                          <div className={`${styles.stepCircle} ${isDone ? styles.stepCircleDone : isNext ? styles.stepCircleNext : ''}`}>
                            {isDone ? (
                              <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
                                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            ) : (
                              <svg className={styles.stepCircleGhost} width="14" height="14" viewBox="0 0 12 12" fill="none">
                                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </div>
                          <p className={styles.stepText}>{step}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })()}
          </>
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

      <ChefChatSheet
        isOpen={showChef}
        onClose={() => setShowChef(false)}
        recipe={recipe}
      />
    </div>
  )
}

export default RecipeDetailScreen
