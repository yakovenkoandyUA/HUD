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

// Guards against a slow fetchYearbook() overwriting a report just generated
// for the SAME key while it was still in flight with stale data — keyed
// per year/period (not a single shared counter) so fetching one period
// doesn't spuriously invalidate an unrelated in-flight fetch/generate for
// another. See spacesStore.ts for the base pattern.
const yearbookReqIds = new Map<string, number>()
function bumpYearbookReqId(key: string): number {
  const next = (yearbookReqIds.get(key) ?? 0) + 1
  yearbookReqIds.set(key, next)
  return next
}

export const useYearbookStore = create<YearbookState>()((set, get) => ({
  reports: {},
  notGenerated: {},
  loading: false,

  getReport: (year, period) => get().reports[cacheKey(year, period)] ?? null,
  isNotGenerated: (year, period) => get().notGenerated[cacheKey(year, period)] ?? false,

  fetchYearbook: async (year, period) => {
    if (!getToken()) return
    const k = cacheKey(year, period)
    const reqId = bumpYearbookReqId(k)
    set({ loading: true })
    try {
      const res = await authFetch(`/api/yearbook/${year}?period=${period}`)
      if (!res.ok) { set({ loading: false }); return }
      const data = await res.json()
      if (reqId !== yearbookReqIds.get(k)) { set({ loading: false }); return } // stale — dropped
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
    const k = cacheKey(year, period)
    bumpYearbookReqId(k)
    set({ loading: true })
    try {
      const res = await authFetch(`/api/yearbook/${year}/generate?period=${period}`, { method: 'POST' })
      if (!res.ok) { set({ loading: false }); return }
      const data: YearbookReport = await res.json()
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
