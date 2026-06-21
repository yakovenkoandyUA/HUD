import { create } from 'zustand'
import { authFetch, getToken } from '../services/api'
import type { YearbookReport } from '../types/yearbook'

/**
 * yearbookStore
 * -------------
 * Zustand store для Family Yearbook — backend-backed через /api/yearbook.
 * БЕЗ persist. Звіт кешується на бекенді (MongoDB), не локально.
 */
interface YearbookState {
  report: YearbookReport | null
  loading: boolean
  notGenerated: boolean
  fetchYearbook: (year: number) => Promise<void>
  generateYearbook: (year: number) => Promise<void>
}

export const useYearbookStore = create<YearbookState>()((set) => ({
  report: null,
  loading: false,
  notGenerated: false,

  fetchYearbook: async (year) => {
    if (!getToken()) return
    set({ loading: true, notGenerated: false })
    try {
      const res = await authFetch(`/api/yearbook/${year}`)
      if (res.status === 404) { set({ report: null, loading: false, notGenerated: true }); return }
      if (!res.ok) { set({ loading: false }); return }
      const data = await res.json()
      set({ report: data, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  generateYearbook: async (year) => {
    set({ loading: true })
    try {
      const res = await authFetch(`/api/yearbook/${year}/generate`, { method: 'POST' })
      if (!res.ok) { set({ loading: false }); return }
      const data = await res.json()
      set({ report: data, loading: false, notGenerated: false })
    } catch {
      set({ loading: false })
    }
  },
}))
