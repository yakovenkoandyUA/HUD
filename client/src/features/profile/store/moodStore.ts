import { create } from 'zustand'
import { authFetch } from '@/shared/services/api'
import { useAchievementsStore } from '@/shared/store/achievementsStore'

export interface MoodLog {
  _id:   string
  date:  string  // YYYY-MM-DD
  score: 1 | 2 | 3 | 4 | 5
  note?: string
}

export interface FamilyMoodEntry {
  userId:    string
  name:      string
  avatarUrl: string | null
  score:     1 | 2 | 3 | 4 | 5
  note:      string | null
}

interface MoodStore {
  logs:                    MoodLog[]
  loading:                 boolean
  familyMoods:             FamilyMoodEntry[]
  familyMoodsByDate:       Record<string, FamilyMoodEntry[]>
  fetchLogs:               (from?: string, to?: string) => Promise<void>
  fetchFamilyMoods:        () => Promise<void>
  fetchFamilyMoodsForDate: (date: string) => Promise<void>
  setMood:                 (date: string, score: 1 | 2 | 3 | 4 | 5) => Promise<void>
  setNote:                 (date: string, note: string) => Promise<void>
  deleteMood:              (date: string) => Promise<void>
  todayScore:              () => (1 | 2 | 3 | 4 | 5) | null
  todayNote:               () => string | null
}

function toLocalIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Guards against a slow fetchLogs() overwriting a mood set/edited while it
// was still in flight with stale data — see spacesStore.ts.
let moodReqId = 0

export const useMoodStore = create<MoodStore>((set, get) => ({
  logs:              [],
  loading:           false,
  familyMoods:       [],
  familyMoodsByDate: {},

  fetchLogs: async (from, to) => {
    const reqId = ++moodReqId
    set({ loading: true })
    try {
      const qs = new URLSearchParams()
      if (from) qs.set('from', from)
      if (to)   qs.set('to', to)
      const res = await authFetch(`/api/mood${qs.toString() ? `?${qs}` : ''}`)
      if (!res.ok) return
      const data: MoodLog[] = await res.json()
      if (reqId === moodReqId) set({ logs: data })
    } finally {
      if (reqId === moodReqId) set({ loading: false })
    }
  },

  fetchFamilyMoods: async () => {
    const res = await authFetch('/api/mood/family/today')
    if (!res.ok) return
    const data: FamilyMoodEntry[] = await res.json()
    set({ familyMoods: data })
  },

  fetchFamilyMoodsForDate: async (date) => {
    const res = await authFetch(`/api/mood/family/${date}`)
    if (!res.ok) return
    const data: FamilyMoodEntry[] = await res.json()
    set(s => ({ familyMoodsByDate: { ...s.familyMoodsByDate, [date]: data } }))
  },

  setMood: async (date, score) => {
    moodReqId++
    set(s => ({
      logs: s.logs.some(l => l.date === date)
        ? s.logs.map(l => l.date === date ? { ...l, score } : l)
        : [...s.logs, { _id: `tmp-${date}`, date, score }],
    }))
    useAchievementsStore.getState().unlock('first-mood')
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
      get().fetchLogs()
    }
  },

  setNote: async (date, note) => {
    moodReqId++
    set(s => ({
      logs: s.logs.map(l => l.date === date ? { ...l, note } : l),
    }))
    try {
      await authFetch(`/api/mood/${date}/note`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note }),
      })
    } catch {
      // silent — note is non-critical
    }
  },

  deleteMood: async (date) => {
    moodReqId++
    set(s => ({ logs: s.logs.filter(l => l.date !== date) }))
    await authFetch(`/api/mood/${date}`, { method: 'DELETE' })
  },

  todayScore: () => {
    const today = toLocalIso(new Date())
    return get().logs.find(l => l.date === today)?.score ?? null
  },

  todayNote: () => {
    const today = toLocalIso(new Date())
    return get().logs.find(l => l.date === today)?.note ?? null
  },
}))
