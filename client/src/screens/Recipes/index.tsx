import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import RecipeCard from '../../components/recipes/RecipeCard'
import RecipeForm from '../../components/recipes/RecipeForm'
import RecipeGeneratorModal from '../../components/recipes/RecipeGeneratorModal'
import CategoriesSlider from '../../components/recipes/CategoriesSlider'
import Modal from '../../components/ui/Modal'
import AppHeader from '../../components/AppHeader'
import { useRecipesStore } from '../../store/recipesStore'
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
  const { showToast } = useUiStore()

  const [showForm, setShowForm]           = useState(false)
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null)
  const [showGenerator, setShowGenerator] = useState(false)
  const [prefillData, setPrefillData]     = useState<Partial<Omit<Recipe, 'id'>> | null>(null)
  const [savedOnly, setSavedOnly]         = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [activeTag, setActiveTag]     = useState<string | null>(null)

  useEffect(() => { fetchRecipes() }, [fetchRecipes])

  const handleScopeChange = (next: RecipeScope) => {
    setSavedOnly(false)
    setSelectedCategory(null)
    setActiveTag(null)
    setScope(next)
  }

  const handleSavedToggle = () => {
    setSavedOnly(v => !v)
    setSelectedCategory(null)
    setActiveTag(null)
  }

  const baseRecipes = savedOnly
    ? recipes.filter(r => wishlistIds.includes(r.id))
    : recipes

  const availableTags = [...new Set(baseRecipes.flatMap(r => r.tags ?? []))].sort()

  const visibleRecipes = baseRecipes
    .filter(r => selectedCategory === null || (r.category ?? 'Інше') === selectedCategory)
    .filter(r => activeTag === null || (r.tags ?? []).includes(activeTag))

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

        {/* ── Tags filter ── */}
        {availableTags.length > 0 && (
          <div className={styles.tagsFilter}>
            {availableTags.map(tag => (
              <button
                key={tag}
                type="button"
                className={`${styles.tagChip} ${activeTag === tag ? styles.tagChipActive : ''}`}
                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              >
                {tag}
              </button>
            ))}
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
              <span className={styles.ghostMsg}>{emptyMsg}</span>
            </div>
          </div>
        ) : (
          <div className={styles.recipeGrid}>
            {visibleRecipes.map(r => (
              <RecipeCard key={r.id} recipe={r} onClick={() => navigate(`/recipes/${r.id}`)} />
            ))}
          </div>
        )}
      </div>

      {/* ── FABs ── */}
      <div className={styles.fabGroup}>
        <button
          type="button"
          className={styles.fabAi}
          onClick={() => setShowGenerator(true)}
          aria-label="Згенерувати рецепт"
        >
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41"
              stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
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

      <Modal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditingRecipe(null); setPrefillData(null) }}
        title={editingRecipe ? 'Редагувати рецепт' : prefillData ? '✨ AI рецепт' : 'Новий рецепт'}
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
        title="✨ Згенерувати рецепт"
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
