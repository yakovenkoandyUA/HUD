import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authFetch } from '@/shared/services/api'
import type { Category } from '@/shared/types'

/**
 * categoryStore
 * -------------
 * Кешує категорії витрат з бекенду. Без persist — дані завжди свіжі.
 * categoryUsage persisted локально — сортує категорії за частотою використання.
 * Використовується в ExpenseForm, ExpenseChart, TransactionList, ProfilePage.
 */

interface CategoryState {
  categories: Category[]
  loading: boolean
  categoryUsage: Record<string, number>
  fetchCategories: () => Promise<void>
  addCategory: (cat: Category) => void
  removeCategory: (id: string) => void
  toggleActive: (id: string) => Promise<void>
  trackCategoryUsage: (id: string) => void
  reset: () => void
}

export const useCategoryStore = create<CategoryState>()(
  persist(
    (set, get) => ({
      categories: [],
      loading: false,
      categoryUsage: {},

      fetchCategories: async () => {
        if (get().loading) return
        set({ loading: true })
        try {
          const res = await authFetch('/api/categories')
          if (res.ok) {
            const data: Category[] = await res.json()
            set({ categories: data })
          }
        } catch { /* offline */ } finally {
          set({ loading: false })
        }
      },

      addCategory: (cat: Category) => {
        set(s => ({ categories: [...s.categories, cat] }))
      },

      removeCategory: (id: string) => {
        set(s => ({ categories: s.categories.filter(c => c._id !== id) }))
      },

      toggleActive: async (id: string) => {
        const cat = get().categories.find(c => c._id === id)
        if (!cat) return
        const next = !cat.isActive
        set(s => ({ categories: s.categories.map(c => c._id === id ? { ...c, isActive: next } : c) }))
        try {
          await authFetch(`/api/categories/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ isActive: next }),
          })
        } catch {
          set(s => ({ categories: s.categories.map(c => c._id === id ? { ...c, isActive: cat.isActive } : c) }))
        }
      },

      reset: () => set({ categoryUsage: {} }),

      trackCategoryUsage: (id: string) => {
        set(s => ({
          categoryUsage: { ...s.categoryUsage, [id]: (s.categoryUsage[id] ?? 0) + 1 },
        }))
      },
    }),
    {
      name: 'category-usage-storage',
      partialize: (s) => ({ categoryUsage: s.categoryUsage }),
    },
  ),
)
