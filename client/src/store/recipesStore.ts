import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authFetch, getToken } from '../services/api'
import type { Recipe, RecipeScope } from '../types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toRecipe(d: Record<string, any>): Recipe {
  return {
    id:             d._id,
    title:          d.title,
    ingredients:    d.ingredients ?? [],
    steps:          d.steps ?? '',
    imageUrl:       d.imageUrl ?? undefined,
    category:       d.category ?? undefined,
    calories:       d.calories ?? undefined,
    difficulty:     d.difficulty ?? undefined,
    cookTime:       d.cookTime ?? undefined,
    servings:       d.servings ?? undefined,
    equipment:      d.equipment?.length ? d.equipment : undefined,
    tags:           d.tags?.length ? d.tags : undefined,
    ownerName:      d.ownerName ?? undefined,
    ownerAvatarUrl: d.ownerAvatarUrl ?? undefined,
    isOwn:          d.isOwn ?? true,
  }
}

export interface CookStat { count: number; lastCooked: string }

interface RecipesState {
  recipes: Recipe[]
  scope: RecipeScope
  wishlistIds: string[]
  cookStats: Record<string, CookStat>
  fetchRecipes: (scope?: RecipeScope) => Promise<void>
  fetchCookStats: () => Promise<void>
  logCook: (id: string) => Promise<void>
  setScope: (scope: RecipeScope) => void
  addRecipe: (data: Omit<Recipe, 'id'>) => Promise<void>
  updateRecipe: (id: string, data: Partial<Omit<Recipe, 'id'>>) => Promise<void>
  deleteRecipe: (id: string) => Promise<void>
  toggleWishlist: (id: string) => void
}

export const useRecipesStore = create<RecipesState>()(
  persist(
    (set, get) => ({
      recipes: [],
      scope: 'mine',
      wishlistIds: [],
      cookStats: {},

      setScope: (scope) => {
        set({ scope })
        get().fetchRecipes(scope)
      },

      fetchRecipes: async (scope) => {
        if (!getToken()) return
        const s = scope ?? get().scope
        const res = await authFetch(`/api/recipes?scope=${s}`)
        if (!res.ok) return
        const data = await res.json()
        // For 'mine' scope backend returns plain docs without isOwn — inject it
        const recipes = data.map((d: Record<string, unknown>) =>
          toRecipe(s === 'mine' ? { ...d, isOwn: true } : d)
        )
        set({ recipes, scope: s })
      },

      addRecipe: async (data) => {
        const tempId = crypto.randomUUID()
        set(s => ({ recipes: [{ id: tempId, ...data, isOwn: true }, ...s.recipes] }))
        const res = await authFetch('/api/recipes', {
          method: 'POST',
          body: JSON.stringify({ ...data, isPersonal: true }),
        })
        if (!res.ok) {
          set(s => ({ recipes: s.recipes.filter(r => r.id !== tempId) }))
          return
        }
        const item = await res.json()
        const realId = (item._id ?? item.id) as string
        set(s => ({ recipes: s.recipes.map(r => r.id === tempId ? { ...data, id: realId, isOwn: true } : r) }))
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

      fetchCookStats: async () => {
        if (!getToken()) return
        const res = await authFetch('/api/recipes/cook-stats')
        if (!res.ok) return
        const stats = await res.json() as Record<string, CookStat>
        set({ cookStats: stats })
      },

      logCook: async (id) => {
        const now = new Date().toISOString()
        set(s => ({
          cookStats: {
            ...s.cookStats,
            [id]: { count: (s.cookStats[id]?.count ?? 0) + 1, lastCooked: now },
          },
        }))
        await authFetch(`/api/recipes/${id}/cook`, { method: 'POST' })
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
