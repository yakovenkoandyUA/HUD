import { create } from 'zustand'
import { authFetch } from '@/shared/services/api'
import { useAchievementsStore } from '@/shared/store/achievementsStore'

export interface Note {
  _id: string
  text: string
  spaceId?: string | null
  createdAt: string
  updatedAt: string
}

interface NotesState {
  notes: Note[]
  loading: boolean
  fetchNotes: () => Promise<void>
  addNote: (text: string, spaceId?: string | null) => Promise<void>
  updateNote: (id: string, text: string) => Promise<void>
  deleteNote: (id: string) => Promise<void>
}

export const useNotesStore = create<NotesState>()((set, get) => ({
  notes: [],
  loading: false,

  fetchNotes: async () => {
    set({ loading: true })
    try {
      const res = await authFetch('/api/notes')
      if (!res.ok) return
      const data: Note[] = await res.json()
      set({ notes: data })
    } finally {
      set({ loading: false })
    }
  },

  addNote: async (text: string, spaceId?: string | null) => {
    const tempId = `temp-${Date.now()}`
    const optimistic: Note = { _id: tempId, text, spaceId: spaceId ?? null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    set(s => ({ notes: [optimistic, ...s.notes] }))
    useAchievementsStore.getState().unlock('first-note')
    try {
      const res = await authFetch('/api/notes', { method: 'POST', body: JSON.stringify({ text, spaceId: spaceId ?? null }) })
      if (!res.ok) { set(s => ({ notes: s.notes.filter(n => n._id !== tempId) })); return }
      const created: Note = await res.json()
      set(s => ({ notes: s.notes.map(n => n._id === tempId ? created : n) }))
    } catch {
      set(s => ({ notes: s.notes.filter(n => n._id !== tempId) }))
    }
  },

  updateNote: async (id: string, text: string) => {
    const prev = get().notes.find(n => n._id === id)
    set(s => ({ notes: s.notes.map(n => n._id === id ? { ...n, text } : n) }))
    try {
      const res = await authFetch(`/api/notes/${id}`, { method: 'PATCH', body: JSON.stringify({ text }) })
      if (!res.ok && prev) set(s => ({ notes: s.notes.map(n => n._id === id ? prev : n) }))
    } catch {
      if (prev) set(s => ({ notes: s.notes.map(n => n._id === id ? prev : n) }))
    }
  },

  deleteNote: async (id: string) => {
    const prev = get().notes
    set(s => ({ notes: s.notes.filter(n => n._id !== id) }))
    try {
      const res = await authFetch(`/api/notes/${id}`, { method: 'DELETE' })
      if (!res.ok) set({ notes: prev })
    } catch {
      set({ notes: prev })
    }
  },
}))
