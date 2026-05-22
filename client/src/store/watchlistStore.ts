import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { WatchlistItem, WatchlistStatus } from '../types'
import { getToken, authFetch, isBackendConfigured } from '../services/api'

export type SyncStatus = 'local' | 'syncing' | 'synced' | 'error'

// ── API shape → frontend type ────────────────────────────────────────────────

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
    authors: raw.authors,
    pageCount: raw.pageCount,
    thumbnail: raw.thumbnail,
    addedAt: raw.addedAt,
  }
}

// ── Store ────────────────────────────────────────────────────────────────────

interface WatchlistStore {
  items: WatchlistItem[]
  syncStatus: SyncStatus

  fetchWatchlist: (filters?: { category?: string; status?: string }) => Promise<void>
  addItem: (item: Omit<WatchlistItem, 'id' | 'addedAt'>) => void
  updateItem: (id: string, updates: Partial<WatchlistItem>) => void
  deleteItem: (id: string) => void
  setStatus: (id: string, status: WatchlistStatus) => void
  setRating: (id: string, rating: number | null) => void
  toggleReminder: (id: string, date?: string) => void
  setSyncStatus: (s: SyncStatus) => void
}

export const useWatchlistStore = create<WatchlistStore>()(
  persist(
    (set, get) => ({
      items: [],
      syncStatus: 'local' as SyncStatus,

      setSyncStatus: (syncStatus) => set({ syncStatus }),

      fetchWatchlist: async (filters) => {
        if (!getToken() || !isBackendConfigured()) return
        set({ syncStatus: 'syncing' })
        try {
          const params = new URLSearchParams()
          if (filters?.category) params.set('category', filters.category)
          if (filters?.status)   params.set('status',   filters.status)
          const qs = params.toString() ? `?${params}` : ''
          const res = await authFetch(`/api/watchlist${qs}`)
          if (!res.ok) throw new Error()
          const data: ApiWatchlistItem[] = await res.json()
          set({ items: data.map(fromApi), syncStatus: 'synced' })
        } catch {
          set({ syncStatus: 'error' })
        }
      },

      addItem: (item) => {
        const local: WatchlistItem = { ...item, id: crypto.randomUUID(), addedAt: new Date().toISOString() }
        set(s => ({ items: [...s.items, local], syncStatus: getToken() && isBackendConfigured() ? 'syncing' : 'local' }))
        if (!getToken() || !isBackendConfigured()) return
        authFetch('/api/watchlist', { method: 'POST', body: JSON.stringify(item) })
          .then(r => {
            if (r.status === 409) return r.json().then((d: { id: string }) => {
              // Already exists in DB — replace local UUID with real id
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
        set(s => ({
          items: s.items.map(i => i.id === id ? { ...i, ...updates } : i),
          syncStatus: getToken() && isBackendConfigured() ? 'syncing' : 'local',
        }))
        if (!getToken() || !isBackendConfigured()) return
        authFetch(`/api/watchlist/${id}`, { method: 'PATCH', body: JSON.stringify(updates) })
          .then(r => { if (!r.ok) throw new Error() })
          .then(() => set({ syncStatus: 'synced' }))
          .catch(() => set({ syncStatus: 'error' }))
      },

      deleteItem: (id) => {
        set(s => ({ items: s.items.filter(i => i.id !== id), syncStatus: getToken() && isBackendConfigured() ? 'syncing' : 'local' }))
        if (!getToken() || !isBackendConfigured()) return
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
    }),
    { name: 'hud-watchlist' }
  )
)
