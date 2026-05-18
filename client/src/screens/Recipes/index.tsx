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

type Tab = 'meal' | 'my'

const Recipes: React.FC = () => {
  const { mealOfWeek, mealLoading, mealError, recipes, fetchMealOfWeek, addRecipe, updateRecipe, deleteRecipe } = useRecipesStore()
  const { showToast } = useUiStore()
  const [tab, setTab] = useState<Tab>('meal')
  const [showMealDetail, setShowMealDetail] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null)

  useEffect(() => { fetchMealOfWeek() }, [fetchMealOfWeek])

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

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === 'meal' ? styles.active : ''}`} onClick={() => setTab('meal')}>
          Блюдо тижня
        </button>
        <button className={`${styles.tab} ${tab === 'my' ? styles.active : ''}`} onClick={() => setTab('my')}>
          Мої рецепти
        </button>
      </div>

      <div className={styles.content}>
        {tab === 'meal' && (
          <>
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
            <div className={styles.weekHint}>
              <span className={styles.weekLabel}>Оновлюється щотижня</span>
            </div>
          </>
        )}

        {tab === 'my' && (
          <>
            <Button fullWidth onClick={() => { setEditingRecipe(null); setShowForm(true) }}>
              Додати рецепт
            </Button>
            {recipes.length === 0 ? (
              <div className={styles.empty}>
                <p className={styles.emptyTitle}>Рецептів ще немає</p>
                <p className={styles.emptyHint}>Додай свій перший рецепт</p>
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
          </>
        )}
      </div>

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
