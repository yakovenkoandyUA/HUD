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

// Guards against a slow fetchCategories() (called on mount from WalletTab,
// ExpenseForm, ExpenseChart, and TransactionList) overwriting a category
// toggled while it was still in flight with stale data — see spacesStore.ts
// for the same pattern.
let categoryReqId = 0

export const useCategoryStore = create<CategoryState>()(
  persist(
    (set, get) => ({
      categories: [],
      loading: false,
      categoryUsage: {},

      fetchCategories: async () => {
        if (get().loading) return
        const reqId = ++categoryReqId
        set({ loading: true })
        try {
          const res = await authFetch('/api/categories')
          if (res.ok) {
            const data: Category[] = await res.json()
            if (reqId === categoryReqId) set({ categories: data })
          }
        } catch { /* offline */ } finally {
          if (reqId === categoryReqId) set({ loading: false })
        }
      },

      addCategory: (cat: Category) => {
        categoryReqId++
        set(s => ({ categories: [...s.categories, cat] }))
      },

      removeCategory: (id: string) => {
        categoryReqId++
        set(s => ({ categories: s.categories.filter(c => c._id !== id) }))
      },

      toggleActive: async (id: string) => {
        const cat = get().categories.find(c => c._id === id)
        if (!cat) return
        const next = !cat.isActive
        categoryReqId++
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
