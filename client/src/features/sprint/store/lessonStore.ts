import { create } from 'zustand'
import { authFetch, getToken } from '@/shared/services/api'
import type { Lesson, LessonStatus } from '@/shared/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toLesson(d: Record<string, any>): Lesson {
  return {
    id:          d._id,
    title:       d.title,
    description: d.desc ?? '',
    notes:       d.sessionNotes ?? '',
    status:      d.status,
    date:        d.date ?? '',
  }
}

interface LessonState {
  lessons: Lesson[]
  fetchLessons: () => Promise<void>
  addLesson: (title: string, description: string, date: string) => Promise<void>
  updateLesson: (id: string, patch: Partial<Omit<Lesson, 'id'>>) => Promise<void>
  deleteLesson: (id: string) => Promise<void>
  setStatus: (id: string, status: LessonStatus) => Promise<void>
}

export const useLessonStore = create<LessonState>()((set) => ({
  lessons: [],

  fetchLessons: async () => {
    if (!getToken()) return
    const res = await authFetch('/api/lessons')
    if (!res.ok) return
    const data = await res.json()
    set({ lessons: data.map(toLesson) })
  },

  addLesson: async (title, description, date) => {
    const tempId = crypto.randomUUID()
    set(s => ({
      lessons: [{ id: tempId, title, description, notes: '', status: 'planned', date }, ...s.lessons],
    }))
    const res = await authFetch('/api/lessons', {
      method: 'POST',
      body: JSON.stringify({ title, desc: description, date }),
    })
    if (!res.ok) {
      set(s => ({ lessons: s.lessons.filter(l => l.id !== tempId) }))
      return
    }
    const item = await res.json()
    set(s => ({ lessons: s.lessons.map(l => l.id === tempId ? toLesson(item) : l) }))
  },

  updateLesson: async (id, patch) => {
    set(s => ({ lessons: s.lessons.map(l => l.id === id ? { ...l, ...patch } : l) }))
    const body: Record<string, unknown> = {}
    if (patch.title !== undefined)       body.title        = patch.title
    if (patch.description !== undefined) body.desc         = patch.description
    if (patch.notes !== undefined)       body.sessionNotes = patch.notes
    if (patch.status !== undefined)      body.status       = patch.status
    if (patch.date !== undefined)        body.date         = patch.date
    const res = await authFetch(`/api/lessons/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
    if (res.ok) {
      const item = await res.json()
      set(s => ({ lessons: s.lessons.map(l => l.id === id ? toLesson(item) : l) }))
    }
  },

  deleteLesson: async (id) => {
    set(s => ({ lessons: s.lessons.filter(l => l.id !== id) }))
    await authFetch(`/api/lessons/${id}`, { method: 'DELETE' })
  },

  setStatus: async (id, status) => {
    set(s => ({ lessons: s.lessons.map(l => l.id === id ? { ...l, status } : l) }))
    const res = await authFetch(`/api/lessons/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      const item = await res.json()
      set(s => ({ lessons: s.lessons.map(l => l.id === id ? toLesson(item) : l) }))
    }
  },
}))
