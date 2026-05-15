import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Lesson, LessonStatus } from '../types'

interface LessonState {
  lessons: Lesson[]
  addLesson: (title: string, description: string, date: string) => void
  updateLesson: (id: string, patch: Partial<Omit<Lesson, 'id'>>) => void
  deleteLesson: (id: string) => void
  setStatus: (id: string, status: LessonStatus) => void
}

export const useLessonStore = create<LessonState>()(
  persist(
    (set) => ({
      lessons: [],

      addLesson: (title, description, date) =>
        set((s) => ({
          lessons: [
            ...s.lessons,
            { id: crypto.randomUUID(), title, description, notes: '', status: 'planned', date },
          ],
        })),

      updateLesson: (id, patch) =>
        set((s) => ({
          lessons: s.lessons.map((l) => (l.id === id ? { ...l, ...patch } : l)),
        })),

      deleteLesson: (id) =>
        set((s) => ({ lessons: s.lessons.filter((l) => l.id !== id) })),

      setStatus: (id, status) =>
        set((s) => ({
          lessons: s.lessons.map((l) => (l.id === id ? { ...l, status } : l)),
        })),
    }),
    { name: 'hud-lessons' }
  )
)
