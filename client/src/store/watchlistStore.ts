import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { WatchlistItem, WatchlistStatus } from '../types'

interface WatchlistStore {
  items: WatchlistItem[]
  addItem: (item: Omit<WatchlistItem, 'id' | 'addedAt'>) => void
  updateItem: (id: string, updates: Partial<WatchlistItem>) => void
  deleteItem: (id: string) => void
  setStatus: (id: string, status: WatchlistStatus) => void
  setRating: (id: string, rating: number | null) => void
  toggleReminder: (id: string, date?: string) => void
}

export const useWatchlistStore = create<WatchlistStore>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item) =>
        set((s) => ({
          items: [
            ...s.items,
            { ...item, id: crypto.randomUUID(), addedAt: new Date().toISOString() },
          ],
        })),
      updateItem: (id, updates) =>
        set((s) => ({
          items: s.items.map((i) => (i.id === id ? { ...i, ...updates } : i)),
        })),
      deleteItem: (id) =>
        set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      setStatus: (id, status) =>
        set((s) => ({
          items: s.items.map((i) => (i.id === id ? { ...i, status } : i)),
        })),
      setRating: (id, rating) =>
        set((s) => ({
          items: s.items.map((i) => (i.id === id ? { ...i, rating } : i)),
        })),
      toggleReminder: (id, date) =>
        set((s) => ({
          items: s.items.map((i) =>
            i.id === id
              ? { ...i, seasonReminder: !i.seasonReminder, reminderDate: date ?? i.reminderDate }
              : i
          ),
        })),
    }),
    { name: 'hud-watchlist' }
  )
)
