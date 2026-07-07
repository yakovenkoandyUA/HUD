import { create } from 'zustand'
import { authFetch, getToken } from '@/shared/services/api'
import type { TimelineEvent, TimelineScope } from '../types/timeline'

/**
 * timelineStore
 * -------------
 * Zustand store для Timeline — backend-backed через /api/timeline.
 * БЕЗ persist (дані завжди свіжі з backend, як memoriesStore/watchlistStore).
 */
interface TimelineState {
  events: TimelineEvent[]
  year: number
  scope: TimelineScope
  spaceId: string | null
  loading: boolean
  setYear: (year: number) => void
  setScope: (scope: TimelineScope) => void
  setSpaceId: (id: string | null) => void
  fetchTimeline: () => Promise<void>
}

export const useTimelineStore = create<TimelineState>()((set, get) => ({
  events: [],
  year: new Date().getFullYear(),
  scope: 'all',
  spaceId: null,
  loading: false,

  setYear: (year) => {
    set({ year })
    get().fetchTimeline()
  },

  setScope: (scope) => {
    set({ scope })
    get().fetchTimeline()
  },

  setSpaceId: (spaceId) => {
    set({ spaceId })
    get().fetchTimeline()
  },

  fetchTimeline: async () => {
    if (!getToken()) return
    const { year, scope, spaceId } = get()
    set({ loading: true })
    try {
      const params = new URLSearchParams({ year: String(year), scope })
      if (spaceId) params.set('spaceId', spaceId)
      const res = await authFetch(`/api/timeline?${params}`)
      if (!res.ok) { set({ loading: false }); return }
      const data = await res.json()
      set({ events: data.events ?? [], loading: false })
    } catch {
      set({ loading: false })
    }
  },
}))
