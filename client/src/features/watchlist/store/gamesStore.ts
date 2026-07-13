import { create } from 'zustand'
import type { GameItem, GameStatus } from '@/shared/types'
import { authFetch, getToken, isBackendConfigured } from '@/shared/services/api'

interface ApiGame {
  _id: string
  rawgId: number
  title: string
  coverUrl: string
  backgroundUrl: string
  platforms: string[]
  status: GameStatus
  platinum: boolean
  rating: number | null
  genres: string[]
  releaseDate: string
  metacritic: number | null
  notes: string
  hoursPlayed: number | null
  completedAt: string | null
  addedAt: string
}

function fromApi(raw: ApiGame): GameItem {
  return {
    id:            raw._id,
    rawgId:        raw.rawgId,
    title:         raw.title,
    coverUrl:      raw.coverUrl,
    backgroundUrl: raw.backgroundUrl,
    platforms:     raw.platforms,
    status:        raw.status,
    platinum:      raw.platinum,
    rating:        raw.rating,
    genres:        raw.genres,
    releaseDate:   raw.releaseDate,
    metacritic:    raw.metacritic,
    notes:         raw.notes,
    hoursPlayed:   raw.hoursPlayed,
    completedAt:   raw.completedAt,
    addedAt:       raw.addedAt,
  }
}

interface GamesStore {
  items: GameItem[]
  loading: boolean

  fetchGames: () => Promise<void>
  addGame: (game: Omit<GameItem, 'id' | 'addedAt'>) => void
  updateGame: (id: string, updates: Partial<GameItem>) => void
  deleteGame: (id: string) => void
}

export const useGamesStore = create<GamesStore>()((set, get) => ({
  items:   [],
  loading: true,

  fetchGames: async () => {
    if (!getToken() || !isBackendConfigured()) { set({ loading: false }); return }
    set({ loading: true })
    try {
      const res = await authFetch('/api/games')
      if (!res.ok) throw new Error()
      const data: ApiGame[] = await res.json()
      set({ items: data.map(fromApi) })
    } catch {
      // silent
    } finally {
      set({ loading: false })
    }
  },

  addGame: (game) => {
    const local: GameItem = { ...game, id: crypto.randomUUID(), addedAt: new Date().toISOString() }
    set(s => ({ items: [local, ...s.items] }))
    authFetch('/api/games', { method: 'POST', body: JSON.stringify(game) })
      .then(r => {
        if (r.status === 409) return r.json().then((d: { id: string }) => {
          set(s => ({ items: s.items.map(i => i.id === local.id ? { ...i, id: d.id } : i) }))
          return null
        })
        if (!r.ok) throw new Error()
        return r.json()
      })
      .then((created: ApiGame | null) => {
        if (!created) return
        set(s => ({ items: s.items.map(i => i.id === local.id ? fromApi(created) : i) }))
      })
      .catch(() => set(s => ({ items: s.items.filter(i => i.id !== local.id) })))
  },

  updateGame: (id, updates) => {
    set(s => ({ items: s.items.map(i => i.id === id ? { ...i, ...updates } : i) }))
    authFetch(`/api/games/${id}`, { method: 'PATCH', body: JSON.stringify(updates) })
      .catch(() => get().fetchGames())
  },

  deleteGame: (id) => {
    set(s => ({ items: s.items.filter(i => i.id !== id) }))
    authFetch(`/api/games/${id}`, { method: 'DELETE' }).catch(() => get().fetchGames())
  },
}))
