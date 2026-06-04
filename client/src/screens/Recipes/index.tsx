import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import RecipeCard from '../../components/recipes/RecipeCard'
import RecipeForm from '../../components/recipes/RecipeForm'
import CategoriesSlider from '../../components/recipes/CategoriesSlider'
import Modal from '../../components/ui/Modal'
import AppHeader from '../../components/AppHeader'
import { useRecipesStore } from '../../store/recipesStore'
import { useUiStore } from '../../store/uiStore'
// import { useSprintStore } from '../../store/sprintStore'
import type { Recipe } from '../../types'
import styles from './Recipes.module.css'

const GHOST_COUNT = 6

// const BackIcon: React.FC = () => (
//   <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
//     <path d="M11 14L6 9l5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
//   </svg>
// )

// const CartIcon: React.FC = () => (
//   <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
//     <path d="M2 2h1.5l1.8 7.5h7l1.5-5H4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
//     <circle cx="6.5" cy="13" r="1" fill="currentColor"/>
//     <circle cx="11.5" cy="13" r="1" fill="currentColor"/>
//   </svg>
// )

const Recipes: React.FC = () => {
  const navigate = useNavigate()
  const { recipes, wishlistIds, fetchRecipes, addRecipe, updateRecipe } = useRecipesStore()
  const { showToast } = useUiStore()
  // const { items: sprintItems } = useSprintStore()
  // const cartCount = sprintItems.filter(it => it.type === 'shopping' && !it.done && it.recipeId).length
  const [showForm, setShowForm] = useState(false)
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null)
  const [tab, setTab] = useState<'all' | 'saved'>('all')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [activeTag, setActiveTag] = useState<string | null>(null)

  const baseRecipes = tab === 'saved'
    ? recipes.filter(r => wishlistIds.includes(r.id))
    : recipes

  const availableTags = [...new Set(baseRecipes.flatMap(r => r.tags ?? []))].sort()

  const visibleRecipes = baseRecipes
    .filter(r => selectedCategory === null || (r.category ?? 'Інше') === selectedCategory)
    .filter(r => activeTag === null || (r.tags ?? []).includes(activeTag))

  useEffect(() => { fetchRecipes() }, [fetchRecipes])

  const handleTabChange = (next: 'all' | 'saved') => {
    setTab(next)
    setSelectedCategory(null)
    setActiveTag(null)
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
  }

  const sectionLabel = selectedCategory ?? (tab === 'saved' ? 'Збережені' : 'Всі рецепти')

  return (
		<div className={styles.screen}>
			<AppHeader />

			<div className={styles.content}>
				{/* ── Tabs ── */}
				<div className={styles.tabs}>
					<button type="button" className={`${styles.tabBtn} ${tab === 'all' ? styles.tabActive : ''}`} onClick={() => handleTabChange('all')}>
						Всі {recipes.length > 0 && <span className={styles.tabCount}>{recipes.length}</span>}
					</button>
					<button type="button" className={`${styles.tabBtn} ${tab === 'saved' ? styles.tabActive : ''}`} onClick={() => handleTabChange('saved')}>
						♡ Збережені {wishlistIds.length > 0 && <span className={styles.tabCount}>{wishlistIds.length}</span>}
					</button>
				</div>

				{/* ── Categories slider ── */}
				{baseRecipes.length > 0 && (
					<div className={styles.sliderWrap}>
						<CategoriesSlider recipes={baseRecipes} selectedCategory={selectedCategory} onSelect={setSelectedCategory} />
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
				{baseRecipes.length > 0 && <p className={styles.sectionLabel}>{sectionLabel}</p>}

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
							<span className={styles.ghostMsg}>{recipes.length === 0 ? 'Додай свій перший рецепт' : tab === 'saved' ? 'Немає збережених' : `Немає рецептів у «${selectedCategory}»`}</span>
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

			{/* ── FAB ── */}
			<button
				type="button"
				className={styles.fab}
				onClick={() => {
					setEditingRecipe(null)
					setShowForm(true)
				}}
				aria-label="Додати рецепт"
			>
				<svg width="22" height="22" viewBox="0 0 22 22" fill="none">
					<path d="M3 11h16M11 3v16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
				</svg>
			</button>

			{/* ── Modals ── */}
			<Modal
				isOpen={showForm}
				onClose={() => {
					setShowForm(false)
					setEditingRecipe(null)
				}}
				title={editingRecipe ? 'Редагувати рецепт' : 'Новий рецепт'}
				draggable
			>
				<RecipeForm
					initial={editingRecipe}
					onSave={handleSave}
					onCancel={() => {
						setShowForm(false)
						setEditingRecipe(null)
					}}
				/>
			</Modal>
		</div>
	)
}

export default Recipes
