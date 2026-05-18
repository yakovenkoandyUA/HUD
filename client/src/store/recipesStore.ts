import { create } from 'zustand'
import { persist } from 'zustand/middleware'
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

interface RecipesState {
  recipes: Recipe[]
  mealOfWeek: Meal | null
  mealWeekKey: string
  mealLoading: boolean
  mealError: boolean
  addRecipe: (data: Omit<Recipe, 'id'>) => void
  updateRecipe: (id: string, data: Partial<Omit<Recipe, 'id'>>) => void
  deleteRecipe: (id: string) => void
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

      addRecipe: (data) =>
        set((s) => ({
          recipes: [{ id: crypto.randomUUID(), ...data }, ...s.recipes],
        })),

      updateRecipe: (id, data) =>
        set((s) => ({
          recipes: s.recipes.map((r) => (r.id === id ? { ...r, ...data } : r)),
        })),

      deleteRecipe: (id) =>
        set((s) => ({ recipes: s.recipes.filter((r) => r.id !== id) })),

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
        recipes: s.recipes,
        mealOfWeek: s.mealOfWeek,
        mealWeekKey: s.mealWeekKey,
      }),
    }
  )
)
