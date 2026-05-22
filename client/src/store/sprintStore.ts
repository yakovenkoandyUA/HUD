import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SprintTask, TodoItem, TodoPriority } from '../types'
import { getToken, authFetch, isBackendConfigured } from '../services/api'

export type SyncStatus = 'local' | 'syncing' | 'synced' | 'error'

// ── Week number helpers ──────────────────────────────────────────────────────

function getISOWeekYear(dateStr: string): { week: number; year: number } {
  const d = new Date(dateStr)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7)
  const jan4 = new Date(d.getFullYear(), 0, 4)
  return {
    week: 1 + Math.round(((d.getTime() - jan4.getTime()) / 86400000 - 3 + (jan4.getDay() + 6) % 7) / 7),
    year: d.getFullYear(),
  }
}

function isoWeekToMonday(year: number, week: number): string {
  const jan4 = new Date(year, 0, 4)
  const monday = new Date(jan4.getTime() + ((week - 1) * 7 - (jan4.getDay() + 6) % 7) * 86400000)
  return monday.toISOString().slice(0, 10)
}

function currentWeekStart(): string {
  const d = new Date()
  const day = d.getDay()
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1))
  return d.toISOString().slice(0, 10)
}

// ── API shapes ───────────────────────────────────────────────────────────────

interface ApiTask {
  _id: string
  title: string
  tag: string
  done: boolean
  weekNumber: number
  year: number
}

interface ApiTodo {
  _id: string
  title: string
  priority: TodoPriority
  done: boolean
  dueDate: string
}

function taskFromApi(raw: ApiTask): SprintTask {
  return {
    id: raw._id,
    title: raw.title,
    category: (raw.tag as SprintTask['category']) || 'dev',
    done: raw.done,
    weekStart: isoWeekToMonday(raw.year, raw.weekNumber),
  }
}

function todoFromApi(raw: ApiTodo): TodoItem {
  return {
    id: raw._id,
    title: raw.title,
    priority: raw.priority,
    done: raw.done,
    dueDate: raw.dueDate || undefined,
  }
}

// ── Store ────────────────────────────────────────────────────────────────────

interface SprintState {
  tasks: SprintTask[]
  todos: TodoItem[]
  syncStatus: SyncStatus

  fetchTasks: (week?: number, year?: number) => Promise<void>
  fetchTodos: () => Promise<void>
  addTask: (title: string, category: SprintTask['category']) => void
  toggleTask: (id: string) => void
  deleteTask: (id: string) => void
  addTodo: (title: string, priority: TodoPriority, dueDate?: string) => void
  addTodos: (items: { title: string; priority: TodoPriority }[]) => void
  updateTodo: (id: string, data: Partial<Pick<TodoItem, 'done' | 'priority' | 'title'>>) => void
  toggleTodo: (id: string) => void
  deleteTodo: (id: string) => void
  setSyncStatus: (s: SyncStatus) => void
}

const PRIORITY_ORDER: Record<TodoPriority, number> = { urgent: 0, normal: 1, low: 2 }

export const useSprintStore = create<SprintState>()(
  persist(
    (set, get) => ({
      tasks: [],
      todos: [],
      syncStatus: 'local' as SyncStatus,

      setSyncStatus: (syncStatus) => set({ syncStatus }),

      fetchTasks: async (week, year) => {
        if (!getToken() || !isBackendConfigured()) return
        set({ syncStatus: 'syncing' })
        try {
          const ws = week !== undefined && year !== undefined
            ? `?week=${week}&year=${year}`
            : (() => { const { week: w, year: y } = getISOWeekYear(currentWeekStart()); return `?week=${w}&year=${y}` })()
          const res = await authFetch(`/api/sprint/tasks${ws}`)
          if (!res.ok) throw new Error()
          const data: ApiTask[] = await res.json()
          const fetched = data.map(taskFromApi)
          // Merge: keep tasks from other weeks, replace current week
          const ws2 = week !== undefined && year !== undefined
            ? isoWeekToMonday(year, week)
            : currentWeekStart()
          set(s => ({
            tasks: [...s.tasks.filter(t => t.weekStart !== ws2), ...fetched],
            syncStatus: 'synced',
          }))
        } catch {
          set({ syncStatus: 'error' })
        }
      },

      fetchTodos: async () => {
        if (!getToken() || !isBackendConfigured()) return
        set({ syncStatus: 'syncing' })
        try {
          const res = await authFetch('/api/sprint/todos')
          if (!res.ok) throw new Error()
          const data: ApiTodo[] = await res.json()
          set({
            todos: data.map(todoFromApi).sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]),
            syncStatus: 'synced',
          })
        } catch {
          set({ syncStatus: 'error' })
        }
      },

      addTask: (title, category) => {
        const ws = currentWeekStart()
        const task: SprintTask = { id: crypto.randomUUID(), title, category, done: false, weekStart: ws }
        set(s => ({ tasks: [...s.tasks, task], syncStatus: getToken() && isBackendConfigured() ? 'syncing' : 'local' }))
        if (!getToken() || !isBackendConfigured()) return
        const { week, year } = getISOWeekYear(ws)
        authFetch('/api/sprint/tasks', {
          method: 'POST',
          body: JSON.stringify({ title, tag: category, weekNumber: week, year, done: false }),
        })
          .then(r => { if (!r.ok) throw new Error(); return r.json() })
          .then((created: ApiTask) => {
            set(s => ({
              syncStatus: 'synced',
              tasks: s.tasks.map(t => t.id === task.id ? { ...t, id: created._id } : t),
            }))
          })
          .catch(() => set({ syncStatus: 'error' }))
      },

      toggleTask: (id) => {
        const task = get().tasks.find(t => t.id === id)
        if (!task) return
        const done = !task.done
        set(s => ({ tasks: s.tasks.map(t => t.id === id ? { ...t, done } : t), syncStatus: getToken() && isBackendConfigured() ? 'syncing' : 'local' }))
        if (!getToken() || !isBackendConfigured()) return
        authFetch(`/api/sprint/tasks/${id}`, { method: 'PATCH', body: JSON.stringify({ done }) })
          .then(r => { if (!r.ok) throw new Error() })
          .then(() => set({ syncStatus: 'synced' }))
          .catch(() => set({ syncStatus: 'error' }))
      },

      deleteTask: (id) => {
        set(s => ({ tasks: s.tasks.filter(t => t.id !== id), syncStatus: getToken() && isBackendConfigured() ? 'syncing' : 'local' }))
        if (!getToken() || !isBackendConfigured()) return
        authFetch(`/api/sprint/tasks/${id}`, { method: 'DELETE' })
          .then(() => set({ syncStatus: 'synced' }))
          .catch(() => set({ syncStatus: 'error' }))
      },

      addTodo: (title, priority, dueDate) => {
        const todo: TodoItem = { id: crypto.randomUUID(), title, priority, done: false, dueDate }
        set(s => ({
          todos: [...s.todos, todo].sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]),
          syncStatus: getToken() && isBackendConfigured() ? 'syncing' : 'local',
        }))
        if (!getToken() || !isBackendConfigured()) return
        authFetch('/api/sprint/todos', {
          method: 'POST',
          body: JSON.stringify({ title, priority, dueDate: dueDate ?? '', done: false }),
        })
          .then(r => { if (!r.ok) throw new Error(); return r.json() })
          .then((created: ApiTodo) => {
            set(s => ({
              syncStatus: 'synced',
              todos: s.todos.map(t => t.id === todo.id ? { ...t, id: created._id } : t),
            }))
          })
          .catch(() => set({ syncStatus: 'error' }))
      },

      addTodos: (items) => {
        const newTodos: TodoItem[] = items.map(item => ({
          id: crypto.randomUUID(), title: item.title, priority: item.priority, done: false,
        }))
        set(s => ({
          todos: [...s.todos, ...newTodos].sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]),
          syncStatus: getToken() && isBackendConfigured() ? 'syncing' : 'local',
        }))
        if (!getToken() || !isBackendConfigured()) return
        Promise.all(
          newTodos.map((todo, i) =>
            authFetch('/api/sprint/todos', {
              method: 'POST',
              body: JSON.stringify({ title: todo.title, priority: todo.priority, dueDate: '', done: false }),
            })
              .then(r => r.ok ? r.json() : Promise.reject())
              .then((created: ApiTodo) => {
                set(s => ({
                  todos: s.todos.map(t => t.id === newTodos[i].id ? { ...t, id: created._id } : t),
                }))
              })
          )
        )
          .then(() => set({ syncStatus: 'synced' }))
          .catch(() => set({ syncStatus: 'error' }))
      },

      updateTodo: (id, data) => {
        set(s => ({
          todos: s.todos.map(t => t.id === id ? { ...t, ...data } : t)
            .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]),
          syncStatus: getToken() && isBackendConfigured() ? 'syncing' : 'local',
        }))
        if (!getToken() || !isBackendConfigured()) return
        authFetch(`/api/sprint/todos/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
          .then(r => { if (!r.ok) throw new Error() })
          .then(() => set({ syncStatus: 'synced' }))
          .catch(() => set({ syncStatus: 'error' }))
      },

      toggleTodo: (id) => {
        const todo = get().todos.find(t => t.id === id)
        if (!todo) return
        get().updateTodo(id, { done: !todo.done })
      },

      deleteTodo: (id) => {
        set(s => ({ todos: s.todos.filter(t => t.id !== id), syncStatus: getToken() && isBackendConfigured() ? 'syncing' : 'local' }))
        if (!getToken() || !isBackendConfigured()) return
        authFetch(`/api/sprint/todos/${id}`, { method: 'DELETE' })
          .then(() => set({ syncStatus: 'synced' }))
          .catch(() => set({ syncStatus: 'error' }))
      },
    }),
    { name: 'hud-sprint' }
  )
)
