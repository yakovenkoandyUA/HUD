import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authFetch, getToken } from '../services/api'
import type { Recipe } from '../types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toRecipe(d: Record<string, any>): Recipe {
  return {
    id:          d._id,
    title:       d.title,
    ingredients: d.ingredients ?? [],
    steps:       d.steps ?? '',
    imageUrl:    d.imageUrl ?? undefined,
    category:    d.category ?? undefined,
    calories:    d.calories ?? undefined,
    difficulty:  d.difficulty ?? undefined,
    cookTime:    d.cookTime ?? undefined,
    servings:    d.servings ?? undefined,
    equipment:   d.equipment?.length ? d.equipment : undefined,
  }
}

interface RecipesState {
  recipes: Recipe[]
  wishlistIds: string[]
  fetchRecipes: () => Promise<void>
  addRecipe: (data: Omit<Recipe, 'id'>) => Promise<void>
  updateRecipe: (id: string, data: Partial<Omit<Recipe, 'id'>>) => Promise<void>
  deleteRecipe: (id: string) => Promise<void>
  toggleWishlist: (id: string) => void
}

export const useRecipesStore = create<RecipesState>()(
  persist(
    (set) => ({
      recipes: [],
      wishlistIds: [],

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
        // Keep the data we sent (includes category etc.) — just swap tempId for real _id
        const realId = (item._id ?? item.id) as string
        set(s => ({ recipes: s.recipes.map(r => r.id === tempId ? { ...data, id: realId } : r) }))
      },

      updateRecipe: async (id, data) => {
        set(s => ({ recipes: s.recipes.map(r => r.id === id ? { ...r, ...data } : r) }))
        await authFetch(`/api/recipes/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        })
      },

      deleteRecipe: async (id) => {
        set(s => ({
          recipes: s.recipes.filter(r => r.id !== id),
          wishlistIds: s.wishlistIds.filter(wid => wid !== id),
        }))
        await authFetch(`/api/recipes/${id}`, { method: 'DELETE' })
      },

      toggleWishlist: (id) => {
        set(s => ({
          wishlistIds: s.wishlistIds.includes(id)
            ? s.wishlistIds.filter(wid => wid !== id)
            : [...s.wishlistIds, id],
        }))
      },
    }),
    {
      name: 'hud-recipes',
      partialize: (s) => ({ wishlistIds: s.wishlistIds }),
    }
  )
)
