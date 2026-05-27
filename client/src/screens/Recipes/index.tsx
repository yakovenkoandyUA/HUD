import React, { useEffect, useState } from 'react'
import TopBar from '../../components/layout/TopBar'
import MealBanner from '../../components/recipes/MealBanner'
import MealDetail from '../../components/recipes/MealDetail'
import RecipeCard from '../../components/recipes/RecipeCard'
import RecipeForm from '../../components/recipes/RecipeForm'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import { useRecipesStore } from '../../store/recipesStore'
import { useUiStore } from '../../store/uiStore'
import type { Recipe } from '../../types'
import styles from './Recipes.module.css'

const GHOST_TITLES = ['Паста карбонара', 'Курка теріякі', 'Грецький салат']

const Recipes: React.FC = () => {
  const { mealOfWeek, mealLoading, mealError, recipes, fetchMealOfWeek, fetchRecipes, addRecipe, updateRecipe, deleteRecipe } = useRecipesStore()
  const { showToast } = useUiStore()
  const [showMealDetail, setShowMealDetail] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null)

  useEffect(() => { fetchMealOfWeek(); fetchRecipes() }, [fetchMealOfWeek, fetchRecipes])

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
  }

  const handleEdit = (recipe: Recipe) => {
    setEditingRecipe(recipe)
    setShowForm(true)
  }

  const handleDelete = (id: string) => {
    deleteRecipe(id)
    showToast('Рецепт видалено', 'info')
  }

  const handleRefresh = () => {
    useRecipesStore.setState({ mealWeekKey: '' })
    fetchMealOfWeek()
  }

  return (
    <div className={styles.screen}>
      <TopBar title="Рецепти" />

      <div className={styles.content}>

        {/* ── Meal of the week ── */}
        {mealLoading && (
          <div className={styles.loadingWrap}>
            <div className={styles.spinner} />
            <p className={styles.loadingText}>Завантаження блюда...</p>
          </div>
        )}
        {mealError && !mealLoading && (
          <div className={styles.errorWrap}>
            <p className={styles.errorText}>Не вдалось завантажити блюдо</p>
            <Button onClick={handleRefresh}>Спробувати знову</Button>
          </div>
        )}
        {mealOfWeek && !mealLoading && (
          <MealBanner
            meal={mealOfWeek}
            onView={() => setShowMealDetail(true)}
            onRefresh={handleRefresh}
          />
        )}

        {/* ── My recipes section ── */}
        <div className={styles.sectionHead}>
          <span className={styles.sectionTitle}>Мої рецепти</span>
          {recipes.length > 0 && (
            <span className={styles.sectionCount}>{recipes.length}</span>
          )}
        </div>

        {recipes.length === 0 ? (
          <div className={styles.ghostWrap}>
            {GHOST_TITLES.map((title) => (
              <div key={title} className={styles.ghostCard}>
                <div className={styles.ghostImg} />
                <div className={styles.ghostBody}>
                  <div className={styles.ghostTitle}>{title}</div>
                  <div className={styles.ghostLine} />
                  <div className={styles.ghostLine} style={{ width: '60%' }} />
                </div>
              </div>
            ))}
            <div className={styles.ghostOverlay}>
              <span className={styles.ghostMsg}>Додай свій перший рецепт</span>
            </div>
          </div>
        ) : (
          <div className={styles.recipeList}>
            {recipes.map((r) => (
              <RecipeCard
                key={r.id}
                recipe={r}
                onEdit={() => handleEdit(r)}
                onDelete={() => handleDelete(r.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── FAB ── */}
      <button
        type="button"
        className={styles.fab}
        onClick={() => { setEditingRecipe(null); setShowForm(true) }}
        aria-label="Додати рецепт"
      >
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path d="M3 11h16M11 3v16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>

      {/* ── Modals ── */}
      {mealOfWeek && (
        <Modal isOpen={showMealDetail} onClose={() => setShowMealDetail(false)} title={mealOfWeek.name}>
          <MealDetail meal={mealOfWeek} />
        </Modal>
      )}
      <Modal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditingRecipe(null) }}
        title={editingRecipe ? 'Редагувати рецепт' : 'Новий рецепт'}
      >
        <RecipeForm
          initial={editingRecipe}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditingRecipe(null) }}
        />
      </Modal>
    </div>
  )
}

export default Recipes
