import { create } from 'zustand'
import type { WatchlistItem, WatchlistStatus, MoodProfile } from '@/shared/types'
import { getToken, authFetch, isBackendConfigured } from '@/shared/services/api'

export type SyncStatus = 'local' | 'syncing' | 'synced' | 'error'

interface ApiWatchlistItem {
  _id: string
  tmdbId: number
  title: string
  originalTitle: string
  category: WatchlistItem['category']
  status: WatchlistStatus
  posterPath: string
  backdropPath: string
  overview: string
  year: string
  genres: string[]
  rating: number | null
  seasonReminder: boolean
  reminderDate: string
  authors?: string[]
  pageCount?: number
  thumbnail?: string
  addedAt: string
  currentSeason?: number | null
  currentEpisode?: number | null
  totalEpisodes?: number | null
  totalSeasons?: number | null
  notifyNewEpisode?: boolean
  notifyNewSeason?: boolean
  nextEpisodeDate?: string | null
  nextSeasonDate?: string | null
  watchedEpisodes?: { season: number; episode: number; userId?: string }[]
  userId?: string
  watchTogether?: boolean
  watchedWith?: string[]
  moodProfile?: MoodProfile
}

function fromApi(raw: ApiWatchlistItem): WatchlistItem {
  return {
    id: raw._id,
    tmdbId: raw.tmdbId,
    title: raw.title,
    originalTitle: raw.originalTitle,
    category: raw.category,
    status: raw.status,
    posterPath: raw.posterPath || null,
    backdropPath: raw.backdropPath || null,
    overview: raw.overview,
    year: raw.year,
    genres: raw.genres,
    rating: raw.rating,
    seasonReminder: raw.seasonReminder,
    reminderDate: raw.reminderDate || null,
    addedAt: raw.addedAt,
    currentSeason: raw.currentSeason ?? null,
    currentEpisode: raw.currentEpisode ?? null,
    totalEpisodes: raw.totalEpisodes ?? null,
    totalSeasons: raw.totalSeasons ?? null,
    notifyNewEpisode: raw.notifyNewEpisode ?? false,
    notifyNewSeason: raw.notifyNewSeason ?? false,
    nextEpisodeDate: raw.nextEpisodeDate ?? null,
    nextSeasonDate: raw.nextSeasonDate ?? null,
    watchedEpisodes: (raw.watchedEpisodes ?? []).map(ep => ({
      season: ep.season,
      episode: ep.episode,
      userId: ep.userId ?? raw.userId ?? '',
    })),
    watchTogether: raw.watchTogether ?? false,
    watchedWith: raw.watchedWith ?? [],
    moodProfile: raw.moodProfile,
  }
}

interface WatchlistStore {
  items: WatchlistItem[]
  syncStatus: SyncStatus
  isLoading: boolean

  fetchWatchlist: (filters?: { category?: string; status?: string }) => Promise<void>
  addItem: (item: Omit<WatchlistItem, 'id' | 'addedAt'>) => void
  updateItem: (id: string, updates: Partial<WatchlistItem>) => void
  deleteItem: (id: string) => void
  setStatus: (id: string, status: WatchlistStatus) => void
  setRating: (id: string, rating: number | null) => void
  toggleReminder: (id: string, date?: string) => void
  setSyncStatus: (s: SyncStatus) => void
  reset: () => void
}

// Guards against a slow fetchWatchlist() (called on mount, and again after an
// import) overwriting an item added/edited while it was still in flight with
// stale data — see spacesStore.ts for the same pattern.
let watchlistReqId = 0

export const useWatchlistStore = create<WatchlistStore>()((set, get) => ({
  items: [],
  syncStatus: 'local' as SyncStatus,
  isLoading: true,

  reset: () => set({ items: [], syncStatus: 'local' as SyncStatus, isLoading: true }),

  setSyncStatus: (syncStatus) => set({ syncStatus }),

  fetchWatchlist: async (filters) => {
    if (!getToken() || !isBackendConfigured()) { set({ isLoading: false }); return }
    const reqId = ++watchlistReqId
    set({ syncStatus: 'syncing' })
    try {
      const params = new URLSearchParams()
      if (filters?.category) params.set('category', filters.category)
      if (filters?.status)   params.set('status',   filters.status)
      const qs = params.toString() ? `?${params}` : ''
      const res = await authFetch(`/api/watchlist${qs}`)
      if (!res.ok) throw new Error()
      const data: ApiWatchlistItem[] = await res.json()
      if (reqId !== watchlistReqId) return // a mutation happened while this was in flight — stale, drop it
      set({ items: data.map(fromApi), syncStatus: 'synced' })
    } catch {
      if (reqId === watchlistReqId) set({ syncStatus: 'error' })
    } finally {
      if (reqId === watchlistReqId) set({ isLoading: false })
    }
  },

  addItem: (item) => {
    const local: WatchlistItem = { ...item, id: crypto.randomUUID(), addedAt: new Date().toISOString() }
    watchlistReqId++
    set(s => ({ items: [...s.items, local], syncStatus: 'syncing' }))
    authFetch('/api/watchlist', { method: 'POST', body: JSON.stringify(item) })
      .then(r => {
        if (r.status === 409) return r.json().then((d: { id: string }) => {
          set(s => ({ items: s.items.map(i => i.id === local.id ? { ...i, id: d.id } : i) }))
          return null
        })
        if (!r.ok) throw new Error()
        return r.json()
      })
      .then((created: ApiWatchlistItem | null) => {
        if (!created) return
        set(s => ({
          syncStatus: 'synced',
          items: s.items.map(i => i.id === local.id ? fromApi(created) : i),
        }))
      })
      .catch(() => set({ syncStatus: 'error' }))
  },

  updateItem: (id, updates) => {
    watchlistReqId++
    set(s => ({
      items: s.items.map(i => i.id === id ? { ...i, ...updates } : i),
      syncStatus: 'syncing',
    }))
    authFetch(`/api/watchlist/${id}`, { method: 'PATCH', body: JSON.stringify(updates) })
      .then(r => { if (!r.ok) throw new Error() })
      .then(() => set({ syncStatus: 'synced' }))
      .catch(() => set({ syncStatus: 'error' }))
  },

  deleteItem: (id) => {
    watchlistReqId++
    set(s => ({ items: s.items.filter(i => i.id !== id), syncStatus: 'syncing' }))
    authFetch(`/api/watchlist/${id}`, { method: 'DELETE' })
      .then(() => set({ syncStatus: 'synced' }))
      .catch(() => set({ syncStatus: 'error' }))
  },

  setStatus: (id, status) => get().updateItem(id, { status }),
  setRating: (id, rating) => get().updateItem(id, { rating }),

  toggleReminder: (id, date) => {
    const item = get().items.find(i => i.id === id)
    if (!item) return
    get().updateItem(id, {
      seasonReminder: !item.seasonReminder,
      reminderDate: date ?? item.reminderDate,
    })
  },
}))
