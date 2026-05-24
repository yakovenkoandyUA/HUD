import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UnifiedTodo, SprintTag, TodoPriority } from '../types'
import { getToken, authFetch, isBackendConfigured } from '../services/api'

export type SyncStatus = 'local' | 'syncing' | 'synced' | 'error'

// ── Week helpers ──────────────────────────────────────────────────────────────

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getISOWeekYear(dateStr: string): { week: number; year: number } {
  const [y, mo, dd] = dateStr.split('-').map(Number)
  const d = new Date(y, mo - 1, dd)
  const thursday = new Date(y, mo - 1, dd + (3 - (d.getDay() + 6) % 7))
  const thurYear = thursday.getFullYear()
  const jan4 = new Date(thurYear, 0, 4)
  const week1Mon = new Date(thurYear, 0, 4 - (jan4.getDay() + 6) % 7)
  return {
    week: 1 + Math.round((thursday.getTime() - week1Mon.getTime()) / (7 * 86400000)),
    year: thurYear,
  }
}

function isoWeekToMonday(year: number, week: number): string {
  const jan4 = new Date(year, 0, 4)
  const week1Mon = new Date(year, 0, 4 - (jan4.getDay() + 6) % 7)
  const monday = new Date(week1Mon.getTime() + (week - 1) * 7 * 86400000)
  return localDateStr(monday)
}

export function currentWeekStart(): string {
  const d = new Date()
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - (d.getDay() + 6) % 7)
  return localDateStr(monday)
}

// ── API shapes ────────────────────────────────────────────────────────────────

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

// ── Sort helpers ──────────────────────────────────────────────────────────────

const PRIORITY_ORDER: Record<TodoPriority, number> = { urgent: 0, normal: 1, low: 2 }

function sortItems(items: UnifiedTodo[]): UnifiedTodo[] {
  return [...items].sort((a, b) => {
    if (a.type !== 'sprint' && b.type !== 'sprint') {
      return PRIORITY_ORDER[a.priority ?? 'normal'] - PRIORITY_ORDER[b.priority ?? 'normal']
    }
    return 0
  })
}

// ── Store interface ───────────────────────────────────────────────────────────

interface TodoState {
  items: UnifiedTodo[]
  syncStatus: SyncStatus

  fetchItems: () => Promise<void>
  addItem: (data: Omit<UnifiedTodo, 'id' | 'createdAt' | 'done'>) => void
  addItems: (dataList: Omit<UnifiedTodo, 'id' | 'createdAt' | 'done'>[]) => void
  toggleItem: (id: string) => void
  deleteItem: (id: string) => void
  setSyncStatus: (s: SyncStatus) => void
}

export const useSprintStore = create<TodoState>()(
  persist(
    (set, get) => ({
      items: [],
      syncStatus: 'local' as SyncStatus,

      setSyncStatus: (syncStatus) => set({ syncStatus }),

      fetchItems: async () => {
        if (!getToken() || !isBackendConfigured()) return
        set({ syncStatus: 'syncing' })
        try {
          const ws = currentWeekStart()
          const { week, year } = getISOWeekYear(ws)
          const [tasksRes, todosRes] = await Promise.all([
            authFetch(`/api/sprint/tasks?week=${week}&year=${year}`),
            authFetch('/api/sprint/todos'),
          ])
          if (!tasksRes.ok || !todosRes.ok) throw new Error()

          const apiTasks: ApiTask[] = await tasksRes.json()
          const apiTodos: ApiTodo[] = await todosRes.json()
          const now = new Date().toISOString()

          const sprintItems: UnifiedTodo[] = apiTasks.map(t => ({
            id: t._id, title: t.title, done: t.done,
            type: 'sprint' as const,
            tag: (t.tag as SprintTag) || 'dev',
            weekStart: isoWeekToMonday(t.year, t.weekNumber),
            createdAt: now,
          }))

          const otherItems: UnifiedTodo[] = apiTodos.map(t => ({
            id: t._id, title: t.title, done: t.done,
            type: 'shopping' as const,
            priority: t.priority,
            createdAt: now,
          }))

          set(s => ({
            items: sortItems([
              ...s.items.filter(i => i.type === 'sprint' && i.weekStart !== ws),
              ...sprintItems,
              ...otherItems,
            ]),
            syncStatus: 'synced',
          }))
        } catch {
          set({ syncStatus: 'error' })
        }
      },

      addItem: (data) => {
        const item: UnifiedTodo = {
          id: crypto.randomUUID(),
          done: false,
          createdAt: new Date().toISOString(),
          ...data,
        }
        set(s => ({
          items: sortItems([...s.items, item]),
          syncStatus: getToken() && isBackendConfigured() ? 'syncing' : 'local',
        }))
        if (!getToken() || !isBackendConfigured()) return

        if (item.type === 'sprint') {
          const ws = item.weekStart ?? currentWeekStart()
          const { week, year } = getISOWeekYear(ws)
          authFetch('/api/sprint/tasks', {
            method: 'POST',
            body: JSON.stringify({ title: item.title, tag: item.tag ?? 'dev', weekNumber: week, year, done: false }),
          })
            .then(r => { if (!r.ok) throw new Error(); return r.json() })
            .then((created: ApiTask) => set(s => ({
              syncStatus: 'synced',
              items: s.items.map(i => i.id === item.id ? { ...i, id: created._id } : i),
            })))
            .catch(() => set({ syncStatus: 'error' }))
        } else {
          authFetch('/api/sprint/todos', {
            method: 'POST',
            body: JSON.stringify({ title: item.title, priority: item.priority ?? 'normal', dueDate: '', done: false }),
          })
            .then(r => { if (!r.ok) throw new Error(); return r.json() })
            .then((created: ApiTodo) => set(s => ({
              syncStatus: 'synced',
              items: s.items.map(i => i.id === item.id ? { ...i, id: created._id } : i),
            })))
            .catch(() => set({ syncStatus: 'error' }))
        }
      },

      addItems: (dataList) => {
        const newItems: UnifiedTodo[] = dataList.map(data => ({
          id: crypto.randomUUID(),
          done: false,
          createdAt: new Date().toISOString(),
          ...data,
        }))
        set(s => ({
          items: sortItems([...s.items, ...newItems]),
          syncStatus: getToken() && isBackendConfigured() ? 'syncing' : 'local',
        }))
        if (!getToken() || !isBackendConfigured()) return

        Promise.all(newItems.map((item, idx) => {
          const body = item.type === 'sprint'
            ? (() => {
                const ws = item.weekStart ?? currentWeekStart()
                const { week, year } = getISOWeekYear(ws)
                return JSON.stringify({ title: item.title, tag: item.tag ?? 'dev', weekNumber: week, year, done: false })
              })()
            : JSON.stringify({ title: item.title, priority: item.priority ?? 'normal', dueDate: '', done: false })
          const endpoint = item.type === 'sprint' ? '/api/sprint/tasks' : '/api/sprint/todos'
          return authFetch(endpoint, { method: 'POST', body })
            .then(r => r.ok ? r.json() : Promise.reject())
            .then((created: ApiTask | ApiTodo) => set(s => ({
              items: s.items.map(i => i.id === newItems[idx].id ? { ...i, id: created._id } : i),
            })))
        }))
          .then(() => set({ syncStatus: 'synced' }))
          .catch(() => set({ syncStatus: 'error' }))
      },

      toggleItem: (id) => {
        const item = get().items.find(i => i.id === id)
        if (!item) return
        const done = !item.done
        set(s => ({
          items: s.items.map(i => i.id === id ? { ...i, done } : i),
          syncStatus: getToken() && isBackendConfigured() ? 'syncing' : 'local',
        }))
        if (!getToken() || !isBackendConfigured()) return
        const endpoint = item.type === 'sprint' ? `/api/sprint/tasks/${id}` : `/api/sprint/todos/${id}`
        authFetch(endpoint, { method: 'PATCH', body: JSON.stringify({ done }) })
          .then(r => { if (!r.ok) throw new Error() })
          .then(() => set({ syncStatus: 'synced' }))
          .catch(() => set({ syncStatus: 'error' }))
      },

      deleteItem: (id) => {
        const item = get().items.find(i => i.id === id)
        set(s => ({
          items: s.items.filter(i => i.id !== id),
          syncStatus: getToken() && isBackendConfigured() ? 'syncing' : 'local',
        }))
        if (!getToken() || !isBackendConfigured() || !item) return
        const endpoint = item.type === 'sprint' ? `/api/sprint/tasks/${id}` : `/api/sprint/todos/${id}`
        authFetch(endpoint, { method: 'DELETE' })
          .then(() => set({ syncStatus: 'synced' }))
          .catch(() => set({ syncStatus: 'error' }))
      },
    }),
    { name: 'hud-sprint-v2' }
  )
)

// ── localStorage migration v1 → v2 ────────────────────────────────────────────

interface LegacySprintState {
  state?: {
    tasks?: { id: string; title: string; category: string; done: boolean; weekStart: string }[]
    todos?: { id: string; title: string; priority: string; done: boolean; dueDate?: string }[]
  }
}

export function migrateLegacySprint(): void {
  const FLAG = 'hud-sprint-v2-migrated'
  if (localStorage.getItem(FLAG)) return
  const raw = localStorage.getItem('hud-sprint')
  if (!raw) { localStorage.setItem(FLAG, '1'); return }

  try {
    const parsed = JSON.parse(raw) as LegacySprintState
    const oldTasks = parsed?.state?.tasks ?? []
    const oldTodos = parsed?.state?.todos ?? []
    const now = new Date().toISOString()

    const newItems: UnifiedTodo[] = [
      ...oldTasks.map(t => ({
        id: t.id, title: t.title, done: t.done,
        type: 'sprint' as const,
        tag: t.category as SprintTag,
        weekStart: t.weekStart,
        createdAt: now,
      })),
      ...oldTodos.map(t => ({
        id: t.id, title: t.title, done: t.done,
        type: 'shopping' as const,
        priority: t.priority as TodoPriority,
        createdAt: now,
      })),
    ]

    if (newItems.length > 0) {
      const existing = useSprintStore.getState().items
      const existingIds = new Set(existing.map(i => i.id))
      const toAdd = newItems.filter(i => !existingIds.has(i.id))
      if (toAdd.length > 0) {
        useSprintStore.setState(s => ({ items: [...s.items, ...toAdd] }))
      }
    }
  } catch { /* silent */ }

  localStorage.setItem(FLAG, '1')
}
