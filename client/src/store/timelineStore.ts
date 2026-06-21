import { create } from 'zustand'
import { authFetch, getToken } from '../services/api'
import type { TimelineEvent, TimelineScope } from '../types/timeline'

/**
 * timelineStore
 * -------------
 * Zustand store для Family Timeline — backend-backed через /api/timeline.
 * БЕЗ persist (дані завжди свіжі з backend, як memoriesStore/watchlistStore).
 */
interface TimelineState {
  events: TimelineEvent[]
  year: number
  scope: TimelineScope
  loading: boolean
  setYear: (year: number) => void
  setScope: (scope: TimelineScope) => void
  fetchTimeline: () => Promise<void>
}

export const useTimelineStore = create<TimelineState>()((set, get) => ({
  events: [],
  year: new Date().getFullYear(),
  scope: 'all',
  loading: false,

  setYear: (year) => {
    set({ year })
    get().fetchTimeline()
  },

  setScope: (scope) => {
    set({ scope })
    get().fetchTimeline()
  },

  fetchTimeline: async () => {
    if (!getToken()) return
    const { year, scope } = get()
    set({ loading: true })
    try {
      const res = await authFetch(`/api/timeline?year=${year}&scope=${scope}`)
      if (!res.ok) { set({ loading: false }); return }
      const data = await res.json()
      set({ events: data.events ?? [], loading: false })
    } catch {
      set({ loading: false })
    }
  },
}))
