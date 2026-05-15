import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SprintTask } from '../types'

interface SprintState {
  tasks: SprintTask[]
  addTask: (title: string, category: SprintTask['category']) => void
  toggleTask: (id: string) => void
  deleteTask: (id: string) => void
}

function weekStart(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().slice(0, 10)
}

export const useSprintStore = create<SprintState>()(
  persist(
    (set) => ({
      tasks: [],

      addTask: (title, category) =>
        set((s) => ({
          tasks: [
            ...s.tasks,
            { id: crypto.randomUUID(), title, category, done: false, weekStart: weekStart() },
          ],
        })),

      toggleTask: (id) =>
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
        })),

      deleteTask: (id) =>
        set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
    }),
    { name: 'hud-sprint' }
  )
)
