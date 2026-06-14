import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useRecipesStore } from '../../store/recipesStore'
import { useProfileStore } from '../../store/profileStore'
import { useUiStore } from '../../store/uiStore'
import { useSprintStore } from '../../store/sprintStore'
import RecipeForm from '../../components/recipes/RecipeForm'
import Modal from '../../components/ui/Modal'
import IngredientIcon from '../../components/ui/IngredientIcon'
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
  const { recipes, wishlistIds, cookStats, toggleWishlist, updateRecipe, deleteRecipe, logCook, fetchCookStats } = useRecipesStore()
  const { activeProfile } = useProfileStore()
  const { showToast } = useUiStore()
  const { addItem: addSprintItem, items: sprintItems } = useSprintStore()

  const recipe = recipes.find(r => r.id === id)
  const defaultServings = recipe?.servings ?? 2
  const [servings, setServings] = useState(defaultServings)
  const [showEdit, setShowEdit] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showAddConfirm, setShowAddConfirm] = useState(false)
  const [cookLogged, setCookLogged] = useState(false)

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
          <div className={styles.metaRow}>
            {recipe.cookTime && (
              <>
                <span className={styles.metaItem}>{recipe.cookTime} хв</span>
                {(recipe.calories || recipe.difficulty) && <span className={styles.metaDot} />}
              </>
            )}
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
          <button
            type="button"
            className={`${styles.actionBtn} ${cookLogged ? styles.actionBtnActive : ''}`}
            onClick={handleLogCook}
            disabled={cookLogged}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C8 2 5 5.5 5 9c0 2.5 1 4.5 2.5 6L12 22l4.5-7C18 13.5 19 11.5 19 9c0-3.5-3-7-7-7z"
                stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"
                fill={cookLogged ? 'currentColor' : 'none'}/>
            </svg>
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

        {/* Equipment */}
        {recipe.equipment && recipe.equipment.length > 0 && (
          <div className={styles.toolsSection}>
            <p className={styles.sectionTitle}>Техніка та інструменти</p>
            <div className={styles.toolsList}>
              {recipe.equipment.map((eq, i) => (
                <span key={i} className={styles.toolChip}>{eq}</span>
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
                        <IngredientIcon ingredient={name || ing} size={38} />
                        <span className={styles.ingredientName}>{name || ing}</span>
                        {amount && <span className={styles.ingredientAmount}>{amount}</span>}
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
              return (
                <div className={styles.section}>
                  <div className={styles.stepChecklist}>
                    {steps.map((step, i) => (
                      <div
                        key={i}
                        className={`${styles.stepItem} ${checkedSteps.has(i) ? styles.stepItemDone : ''}`}
                        onClick={() => toggleStep(i)}
                        role="checkbox"
                        aria-checked={checkedSteps.has(i)}
                        tabIndex={0}
                        onKeyDown={e => e.key === ' ' && toggleStep(i)}
                      >
                        {/* Vertical line */}
                        {i < steps.length - 1 && <div className={styles.stepLine} />}
                        {/* Number / check circle */}
                        <div className={`${styles.stepCircle} ${checkedSteps.has(i) ? styles.stepCircleDone : ''}`}>
                          {checkedSteps.has(i) ? (
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          ) : (
                            <span>{i + 1}</span>
                          )}
                        </div>
                        <p className={styles.stepText}>{step}</p>
                      </div>
                    ))}
                  </div>
                  {checkedSteps.size > 0 && (
                    <button
                      type="button"
                      className={styles.resetStepsBtn}
                      onClick={() => setCheckedSteps(new Set())}
                    >
                      Скинути прогрес
                    </button>
                  )}
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
    </div>
  )
}

export default RecipeDetailScreen
