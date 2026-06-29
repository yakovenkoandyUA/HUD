import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import RecipeCard from '../../components/recipes/RecipeCard'
import RecipeForm from '../../components/recipes/RecipeForm'
import RecipeGeneratorModal from '../../components/recipes/RecipeGeneratorModal'
import CategoriesSlider from '../../components/recipes/CategoriesSlider'
import IngredientSearchSheet from '../../components/recipes/IngredientSearchSheet'
import Modal from '../../components/ui/Modal'
import AppHeader from '../../components/AppHeader'
import MimirIcon from '../../components/ui/MimirIcon'
import DoodleIllustration from '../../components/ui/DoodleIllustration'
import FabHint from '../../components/ui/FabHint'
import { useRecipesStore } from '../../store/recipesStore'
import { useProfileStore } from '../../store/profileStore'
import { useUiStore } from '../../store/uiStore'
import type { Recipe, RecipeScope } from '../../types'
import styles from './Recipes.module.css'

const GHOST_COUNT = 6

const SCOPE_TABS: { value: RecipeScope; label: string }[] = [
  { value: 'mine',   label: 'МОЄ'        },
  { value: 'family', label: "СІМ'Я"      },
  { value: 'all',    label: 'СПІЛЬНОТА'  },
]

/**
 * Recipes
 * -------
 * Список рецептів з фільтром по scope (МОЄ / СІМ'Я / СПІЛЬНОТА),
 * категоріях, тегах та wishlist.
 */
const Recipes: React.FC = () => {
  const navigate = useNavigate()
  const { recipes, scope, wishlistIds, fetchRecipes, setScope, addRecipe, updateRecipe } = useRecipesStore()
  const { activeProfile } = useProfileStore()
  const { showToast } = useUiStore()

  const [showForm, setShowForm]           = useState(false)
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null)
  const [showGenerator, setShowGenerator] = useState(false)
  const [prefillData, setPrefillData]     = useState<Partial<Omit<Recipe, 'id'>> | null>(null)
  const [savedOnly, setSavedOnly]         = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [showIngredientSearch, setShowIngredientSearch] = useState(false)

  useEffect(() => { fetchRecipes() }, [fetchRecipes])

  const handleScopeChange = (next: RecipeScope) => {
    setSavedOnly(false)
    setSelectedCategory(null)
    setScope(next)
  }

  const handleSavedToggle = () => {
    setSavedOnly(v => !v)
    setSelectedCategory(null)
  }

  const baseRecipes = savedOnly
    ? recipes.filter(r => wishlistIds.includes(r.id))
    : recipes

  const visibleRecipes = baseRecipes
    .filter(r => selectedCategory === null || (r.category ?? 'Інше') === selectedCategory)

  const handleRandom = () => {
    if (visibleRecipes.length === 0) return
    const r = visibleRecipes[Math.floor(Math.random() * visibleRecipes.length)]
    navigate(`/recipes/${r.id}`)
  }

  const handleSave = (data: Omit<Recipe, 'id'>) => {
    if (editingRecipe) {
      updateRecipe(editingRecipe.id, data)
      showToast('Рецепт оновлено', 'success')
    } else {
      addRecipe(data)
      showToast('Рецепт додано', 'success')
    }
    setShowForm(false)
    setEditingRecipe(null)
    setPrefillData(null)
  }

  const handleGenerated = (data: Partial<Omit<Recipe, 'id'>>) => {
    setPrefillData(data)
    setShowGenerator(false)
    setEditingRecipe(null)
    setShowForm(true)
  }

  const emptyMsg = recipes.length === 0
    ? scope === 'mine'   ? 'Додай свій перший рецепт'
    : scope === 'family' ? 'У сімейній книзі ще порожньо'
    :                      'Спільнота поки мовчить'
    : savedOnly ? 'Немає збережених'
    : selectedCategory ? `Немає рецептів у «${selectedCategory}»`
    : 'Нічого не знайдено'

  return (
    <div className={styles.screen}>
      <AppHeader />

      <div className={styles.content}>
        {/* ── Scope tabs ── */}
        <div className={styles.scopeRow}>
          <div className={styles.tabs}>
            {SCOPE_TABS.map(t => (
              <button
                key={t.value}
                type="button"
                className={`${styles.tabBtn} ${scope === t.value && !savedOnly ? styles.tabActive : ''}`}
                onClick={() => handleScopeChange(t.value)}
              >
                {t.label}
                {t.value === scope && recipes.length > 0 && !savedOnly && (
                  <span className={styles.tabCount}>{recipes.length}</span>
                )}
              </button>
            ))}
          </div>
          <div className={styles.scopeActions}>
            {visibleRecipes.length > 1 && (
              <button
                type="button"
                className={styles.randomBtn}
                onClick={handleRandom}
                aria-label="Що приготувати?"
                title="Що приготувати?"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>
                </svg>
              </button>
            )}
            <button
              type="button"
              className={`${styles.savedBtn} ${savedOnly ? styles.savedBtnActive : ''}`}
              onClick={handleSavedToggle}
              aria-label="Збережені"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M8 13.5S2 9.5 2 5.5a3.5 3.5 0 0 1 6-2.45A3.5 3.5 0 0 1 14 5.5c0 4-6 8-6 8Z"
                  stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"
                  fill={savedOnly ? 'currentColor' : 'none'}
                />
              </svg>
              {wishlistIds.length > 0 && <span className={styles.savedCount}>{wishlistIds.length}</span>}
            </button>
          </div>
        </div>

        {/* ── Categories slider ── */}
        {baseRecipes.length > 0 && (
          <div className={styles.sliderWrap}>
            <CategoriesSlider
              recipes={baseRecipes}
              selectedCategory={selectedCategory}
              onSelect={setSelectedCategory}
            />
          </div>
        )}


        {/* ── Section label ── */}
        {baseRecipes.length > 0 && (
          <p className={styles.sectionLabel}>
            {selectedCategory ?? (savedOnly ? 'Збережені' : SCOPE_TABS.find(t => t.value === scope)?.label)}
          </p>
        )}

        {/* ── Grid ── */}
        {visibleRecipes.length === 0 ? (
          <div className={styles.ghostGrid}>
            {Array.from({ length: GHOST_COUNT }).map((_, i) => (
              <div key={i} className={styles.ghostCard}>
                <div className={styles.ghostPhoto} />
                <div className={styles.ghostLine} />
                <div className={styles.ghostLineShort} />
              </div>
            ))}
            <div className={styles.ghostOverlay}>
              <DoodleIllustration variant="recipes" size={88} />
              <span className={styles.ghostMsg}>{emptyMsg}</span>
            </div>
          </div>
        ) : (
          <div className={styles.recipeGrid}>
            {visibleRecipes.map((r) => (
              <RecipeCard
                key={r.id}
                recipe={r}
                onClick={() => navigate(`/recipes/${r.id}`)}
                hideCategory={selectedCategory !== null}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── FABs ── */}
      {recipes.length === 0 && <FabHint storageKey="recipes" text="Додай перший рецепт" />}
      <div className={styles.fabGroup}>
        <button
          type="button"
          className={styles.fabAi}
          onClick={() => navigate('/recipes/planner')}
          aria-label="Планер страв"
          title="Планер страв"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.7"/>
            <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
            <path d="M8 15h2M11 15h2M14 15h2M8 18h2M11 18h2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
          </svg>
        </button>
        <button
          type="button"
          className={styles.fabAi}
          onClick={() => setShowIngredientSearch(true)}
          aria-label="Що є вдома?"
          title="Що є вдома?"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
            <path d="M3 6h18M3 12h12M3 18h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            <circle cx="19" cy="17" r="3.5" stroke="currentColor" strokeWidth="1.6"/>
            <path d="M21.5 19.5L23 21" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
        </button>
        <button
          type="button"
          className={styles.fabAi}
          onClick={() => {
            if (!activeProfile?.isVerified) { showToast('Підтвердіть email для AI-генератора рецептів', 'error'); return }
            setShowGenerator(true)
          }}
          aria-label="Згенерувати рецепт"
        >
          <MimirIcon size={18} />
        </button>
        <button
          type="button"
          className={styles.fab}
          onClick={() => { setEditingRecipe(null); setPrefillData(null); setShowForm(true) }}
          aria-label="Додати рецепт"
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M3 11h16M11 3v16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <IngredientSearchSheet
        recipes={recipes}
        isOpen={showIngredientSearch}
        onClose={() => setShowIngredientSearch(false)}
        onSelect={id => navigate(`/recipes/${id}`)}
      />

      <Modal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditingRecipe(null); setPrefillData(null) }}
        draggable
      >
        <RecipeForm
          initial={(prefillData ?? editingRecipe) as Recipe | null}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditingRecipe(null); setPrefillData(null) }}
        />
      </Modal>

      <Modal
        isOpen={showGenerator}
        onClose={() => setShowGenerator(false)}
        title="МІМІР: згенерувати рецепт"
        draggable
      >
        <RecipeGeneratorModal
          onGenerated={handleGenerated}
          onCancel={() => setShowGenerator(false)}
        />
      </Modal>
    </div>
  )
}

export default Recipes
