import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authFetch, getToken } from '../services/api'
import type { Recipe, Meal, MealIngredient } from '../types'

function getWeekKey(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d.getFullYear(), d.getMonth(), diff)
  return monday.toISOString().split('T')[0]
}

function parseMeal(raw: Record<string, string>): Meal {
  const ingredients: MealIngredient[] = []
  for (let i = 1; i <= 20; i++) {
    const name = raw[`strIngredient${i}`]
    const measure = raw[`strMeasure${i}`]
    if (name && name.trim()) {
      ingredients.push({ name: name.trim(), measure: (measure || '').trim() })
    }
  }
  return {
    id: raw.idMeal,
    name: raw.strMeal,
    category: raw.strCategory || '',
    area: raw.strArea || '',
    instructions: raw.strInstructions || '',
    thumb: raw.strMealThumb || '',
    ingredients,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toRecipe(d: Record<string, any>): Recipe {
  return {
    id:          d._id,
    title:       d.title,
    ingredients: d.ingredients ?? [],
    steps:       d.steps ?? '',
    imageUrl:    d.imageUrl ?? undefined,
  }
}

interface RecipesState {
  recipes: Recipe[]
  mealOfWeek: Meal | null
  mealWeekKey: string
  mealLoading: boolean
  mealError: boolean
  fetchRecipes: () => Promise<void>
  addRecipe: (data: Omit<Recipe, 'id'>) => Promise<void>
  updateRecipe: (id: string, data: Partial<Omit<Recipe, 'id'>>) => Promise<void>
  deleteRecipe: (id: string) => Promise<void>
  fetchMealOfWeek: () => Promise<void>
}

export const useRecipesStore = create<RecipesState>()(
  persist(
    (set, get) => ({
      recipes: [],
      mealOfWeek: null,
      mealWeekKey: '',
      mealLoading: false,
      mealError: false,

      fetchRecipes: async () => {
        if (!getToken()) return
        const res = await authFetch('/api/recipes')
        if (!res.ok) return
        const data = await res.json()
        set({ recipes: data.map(toRecipe) })
      },

      addRecipe: async (data) => {
        const tempId = crypto.randomUUID()
        set(s => ({ recipes: [{ id: tempId, ...data }, ...s.recipes] }))
        const res = await authFetch('/api/recipes', {
          method: 'POST',
          body: JSON.stringify({ ...data, isPersonal: true }),
        })
        if (!res.ok) {
          set(s => ({ recipes: s.recipes.filter(r => r.id !== tempId) }))
          return
        }
        const item = await res.json()
        set(s => ({ recipes: s.recipes.map(r => r.id === tempId ? toRecipe(item) : r) }))
      },

      updateRecipe: async (id, data) => {
        set(s => ({ recipes: s.recipes.map(r => r.id === id ? { ...r, ...data } : r) }))
        const res = await authFetch(`/api/recipes/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        })
        if (res.ok) {
          const item = await res.json()
          set(s => ({ recipes: s.recipes.map(r => r.id === id ? toRecipe(item) : r) }))
        }
      },

      deleteRecipe: async (id) => {
        set(s => ({ recipes: s.recipes.filter(r => r.id !== id) }))
        await authFetch(`/api/recipes/${id}`, { method: 'DELETE' })
      },

      fetchMealOfWeek: async () => {
        const weekKey = getWeekKey()
        if (get().mealWeekKey === weekKey && get().mealOfWeek) return
        set({ mealLoading: true, mealError: false })
        try {
          const res = await fetch('https://www.themealdb.com/api/json/v1/1/random.php')
          const json = await res.json()
          const meal = parseMeal(json.meals[0])
          set({ mealOfWeek: meal, mealWeekKey: weekKey, mealLoading: false })
        } catch {
          set({ mealLoading: false, mealError: true })
        }
      },
    }),
    {
      name: 'hud-recipes',
      partialize: (s) => ({
        mealOfWeek:  s.mealOfWeek,
        mealWeekKey: s.mealWeekKey,
      }),
    }
  )
)
