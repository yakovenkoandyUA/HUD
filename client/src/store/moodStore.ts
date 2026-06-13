import { create } from 'zustand'
import { authFetch } from '../services/api'

export interface MoodLog {
  _id:    string
  date:   string  // YYYY-MM-DD
  score:  1 | 2 | 3 | 4 | 5
}

interface MoodStore {
  logs:        MoodLog[]
  loading:     boolean
  fetchLogs:   (from?: string, to?: string) => Promise<void>
  setMood:     (date: string, score: 1 | 2 | 3 | 4 | 5) => Promise<void>
  deleteMood:  (date: string) => Promise<void>
  todayScore:  () => (1 | 2 | 3 | 4 | 5) | null
}

function toIso(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export const useMoodStore = create<MoodStore>((set, get) => ({
  logs:    [],
  loading: false,

  fetchLogs: async (from, to) => {
    set({ loading: true })
    try {
      const qs = new URLSearchParams()
      if (from) qs.set('from', from)
      if (to)   qs.set('to', to)
      const res = await authFetch(`/api/mood${qs.toString() ? `?${qs}` : ''}`)
      if (!res.ok) return
      const data: MoodLog[] = await res.json()
      set({ logs: data })
    } finally {
      set({ loading: false })
    }
  },

  setMood: async (date, score) => {
    // optimistic
    set(s => ({
      logs: s.logs.some(l => l.date === date)
        ? s.logs.map(l => l.date === date ? { ...l, score } : l)
        : [...s.logs, { _id: `tmp-${date}`, date, score }],
    }))
    try {
      const res = await authFetch(`/api/mood/${date}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score }),
      })
      if (res.ok) {
        const updated: MoodLog = await res.json()
        set(s => ({ logs: s.logs.map(l => l.date === date ? updated : l) }))
      }
    } catch {
      // rollback
      get().fetchLogs()
    }
  },

  deleteMood: async (date) => {
    set(s => ({ logs: s.logs.filter(l => l.date !== date) }))
    await authFetch(`/api/mood/${date}`, { method: 'DELETE' })
  },

  todayScore: () => {
    const today = toIso(new Date())
    return get().logs.find(l => l.date === today)?.score ?? null
  },
}))
