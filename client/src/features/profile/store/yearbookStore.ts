import { create } from 'zustand'
import { authFetch, getToken } from '@/shared/services/api'
import type { YearbookReport, YearbookPeriod } from '../types/yearbook'

/**
 * yearbookStore
 * -------------
 * Zustand store для Yearbook — backend-backed через /api/yearbook.
 * БЕЗ persist. Звіти кешуються на бекенді (MongoDB).
 * In-memory кеш по `${year}-${period}` для уникнення зайвих запитів.
 * 404 → `notGenerated[key] = true`
 */
interface YearbookState {
  reports: Record<string, YearbookReport>
  notGenerated: Record<string, boolean>
  loading: boolean
  getReport: (year: number, period: YearbookPeriod) => YearbookReport | null
  isNotGenerated: (year: number, period: YearbookPeriod) => boolean
  fetchYearbook: (year: number, period: YearbookPeriod) => Promise<void>
  generateYearbook: (year: number, period: YearbookPeriod) => Promise<void>
}

const cacheKey = (year: number, period: YearbookPeriod) => `${year}-${period}`

export const useYearbookStore = create<YearbookState>()((set, get) => ({
  reports: {},
  notGenerated: {},
  loading: false,

  getReport: (year, period) => get().reports[cacheKey(year, period)] ?? null,
  isNotGenerated: (year, period) => get().notGenerated[cacheKey(year, period)] ?? false,

  fetchYearbook: async (year, period) => {
    if (!getToken()) return
    set({ loading: true })
    try {
      const res = await authFetch(`/api/yearbook/${year}?period=${period}`)
      if (!res.ok) { set({ loading: false }); return }
      const data = await res.json()
      const k = cacheKey(year, period)
      if (data.notGenerated) {
        set(s => ({ loading: false, notGenerated: { ...s.notGenerated, [k]: true } }))
        return
      }
      set(s => ({
        reports: { ...s.reports, [k]: data as YearbookReport },
        notGenerated: { ...s.notGenerated, [k]: false },
        loading: false,
      }))
    } catch {
      set({ loading: false })
    }
  },

  generateYearbook: async (year, period) => {
    set({ loading: true })
    try {
      const res = await authFetch(`/api/yearbook/${year}/generate?period=${period}`, { method: 'POST' })
      if (!res.ok) { set({ loading: false }); return }
      const data: YearbookReport = await res.json()
      const k = cacheKey(year, period)
      set(s => ({
        reports: { ...s.reports, [k]: data },
        notGenerated: { ...s.notGenerated, [k]: false },
        loading: false,
      }))
    } catch {
      set({ loading: false })
    }
  },
}))
