import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UnifiedTodo, SprintTag, TodoPriority, SprintLabel, ChecklistItem, RepeatConfig } from '../types'
import { getToken, authFetch, isBackendConfigured } from '../services/api'
import { isRecurring } from '../utils/sprint'

const DEFAULT_LABELS: SprintLabel[] = [
  { id: 'default-1', title: '',        color: '#216E4E' },
  { id: 'default-2', title: '',        color: '#7F5F01' },
  { id: 'default-3', title: '',        color: '#A54800' },
  { id: 'default-4', title: '',        color: '#AE2E24' },
  { id: 'default-5', title: 'it-tv',   color: '#AE2E24' },
  { id: 'default-6', title: '',        color: '#9F8FEF' },
  { id: 'default-7', title: 'desktop', color: '#0C66E4' },
  { id: 'default-8', title: 'fly',     color: '#0C66E4' },
]

export const LABEL_COLORS = [
  '#216E4E', '#7F5F01', '#A54800', '#AE2E24', '#352C63',
  '#206A83', '#164555', '#37471F', '#50253F', '#454F59',
  '#4BCE97', '#F5CD47', '#FEA362', '#F87168', '#9F8FEF',
  '#579DFF', '#60C6D2', '#94C748', '#E774BB', '#8590A2',
  '#1F845A', '#E2B203', '#C25100', '#C9372C', '#6E5DC6',
  '#0C66E4', '#227D9B', '#5B7F24', '#AE4787', '#626F86',
]

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

interface ApiChecklist { id: string; title: string; done: boolean }

interface ApiTask {
  _id: string
  title: string
  tag: string
  done: boolean
  weekNumber: number
  year: number
  weekStart?: string
  type?: string
  repeat?: string
  nextDue?: string
  repeatDay?: number
  repeatConfig?: Record<string, unknown>
  repeatStartDate?: string
  completionHistory?: string[]
  reminder?: { amount: number; unit: string } | null
  checklist?: ApiChecklist[]
}

interface ApiTodo {
  _id: string
  title: string
  priority: TodoPriority
  done: boolean
  dueDate: string
  type?: string
  repeat?: string
  nextDue?: string
  repeatDay?: number
  repeatConfig?: Record<string, unknown>
  repeatStartDate?: string
  completionHistory?: string[]
  reminder?: { amount: number; unit: string } | null
  checklist?: ApiChecklist[]
}

// ── Repeat helpers ────────────────────────────────────────────────────────────

function calcNextDue(item: UnifiedTodo, baseDate?: Date): string {
  const base = baseDate ? new Date(baseDate) : new Date(); base.setHours(0, 0, 0, 0)

  if (item.repeatConfig) {
    const { unit, interval, weekDays } = item.repeatConfig

    if (unit === 'week' && weekDays && weekDays.length > 0) {
      const sorted = [...weekDays].sort((a, b) => a - b) // 0=Mon..6=Sun
      // JS getDay(): 0=Sun,1=Mon..6=Sat → convert to 0=Mon..6=Sun
      const todayWd = (base.getDay() + 6) % 7
      // Next selected weekday still remaining this week
      const nextInWeek = sorted.find(d => d > todayWd)
      if (nextInWeek !== undefined) {
        base.setDate(base.getDate() + (nextInWeek - todayWd))
      } else {
        // Last selected day of this active week was just completed;
        // jump to first selected weekday, interval weeks from this week's Monday.
        const thisMonday = new Date(base)
        thisMonday.setDate(base.getDate() - todayWd)
        base.setTime(thisMonday.getTime())
        base.setDate(thisMonday.getDate() + interval * 7 + sorted[0])
      }
      return localDateStr(base)
    }

    if (unit === 'month') {
      base.setMonth(base.getMonth() + interval)
    } else if (unit === 'year') {
      base.setFullYear(base.getFullYear() + interval)
    } else {
      // day or week without weekDays
      base.setDate(base.getDate() + interval * (unit === 'week' ? 7 : 1))
    }
    return localDateStr(base)
  }

  // Legacy simple repeat
  if (item.repeat === 'daily') {
    base.setDate(base.getDate() + 1)
  } else if (item.repeat === 'weekly') {
    base.setDate(base.getDate() + 7)
  } else if (item.repeat === 'monthly') {
    const day = item.repeatDay ?? base.getDate()
    base.setMonth(base.getMonth() + 1)
    base.setDate(day)
  }
  return localDateStr(base)
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

interface ApiLabel { _id: string; title: string; color: string }

interface TodoState {
  items: UnifiedTodo[]
  syncStatus: SyncStatus
  globalLabels: SprintLabel[]

  clearItems: () => void
  fetchItems: () => Promise<void>
  fetchLabels: () => Promise<void>
  addItem: (data: Omit<UnifiedTodo, 'id' | 'createdAt' | 'done'>) => void
  addItems: (dataList: Omit<UnifiedTodo, 'id' | 'createdAt' | 'done'>[]) => void
  toggleItem: (id: string, date?: string) => void
  deleteItem: (id: string) => void
  setSyncStatus: (s: SyncStatus) => void

  setReminder: (id: string, reminder: UnifiedTodo['reminder']) => void

  // Rich card fields — local-only, not synced to backend
  updateTask: (id: string, updates: Partial<UnifiedTodo>) => void
  addChecklistItem: (taskId: string, title: string) => void
  toggleChecklistItem: (taskId: string, itemId: string) => void
  removeChecklistItem: (taskId: string, itemId: string) => void
  addLabel: (taskId: string, label: SprintLabel) => void
  removeLabel: (taskId: string, labelId: string) => void
  addGlobalLabel: (label: SprintLabel) => void
  updateGlobalLabel: (id: string, updates: Partial<SprintLabel>) => void
  deleteGlobalLabel: (id: string) => void
}

export const useSprintStore = create<TodoState>()(
  persist(
    (set, get) => ({
      items: [],
      syncStatus: 'local' as SyncStatus,
      globalLabels: DEFAULT_LABELS,

      clearItems: () => set({ items: [] }),

      setSyncStatus: (syncStatus) => set({ syncStatus }),

      fetchLabels: async () => {
        if (!getToken() || !isBackendConfigured()) return
        try {
          const res = await authFetch('/api/labels')
          if (!res.ok) return
          const data: ApiLabel[] = await res.json()
          if (data.length > 0) {
            set({ globalLabels: data.map(l => ({ id: l._id, title: l.title, color: l.color })) })
          } else {
            // First time: seed default labels to backend
            const seeded = await Promise.all(
              DEFAULT_LABELS.map(l =>
                authFetch('/api/labels', {
                  method: 'POST',
                  body: JSON.stringify({ title: l.title, color: l.color }),
                })
                  .then(r => r.ok ? r.json() : Promise.reject())
                  .then((created: ApiLabel) => ({ id: created._id, title: l.title, color: l.color }))
                  .catch(() => l)
              )
            )
            set({ globalLabels: seeded })
          }
        } catch { /* offline — keep current labels */ }
      },

      setReminder: (id, reminder) => {
        const item = get().items.find(i => i.id === id)
        set(s => ({ items: s.items.map(i => i.id === id ? { ...i, reminder } : i) }))
        if (!item || !getToken() || !isBackendConfigured()) return
        const endpoint = item.type === 'sprint' ? `/api/sprint/tasks/${id}` : `/api/sprint/todos/${id}`
        authFetch(endpoint, { method: 'PATCH', body: JSON.stringify({ reminder: reminder ?? null }) })
          .then(r => { if (!r.ok) throw new Error() })
          .then(() => set({ syncStatus: 'synced' }))
          .catch(() => set({ syncStatus: 'error' }))
      },

      updateTask: (id, updates) =>
        set(s => ({ items: s.items.map(i => i.id === id ? { ...i, ...updates } : i) })),

      addChecklistItem: (taskId, title) => {
        const newItem: ChecklistItem = { id: crypto.randomUUID(), title, done: false }
        let newChecklist: ChecklistItem[] = []
        set(s => {
          const updated = s.items.map(i => {
            if (i.id !== taskId) return i
            newChecklist = [...(i.checklist ?? []), newItem]
            return { ...i, checklist: newChecklist }
          })
          return { items: updated }
        })
        if (!getToken() || !isBackendConfigured()) return
        const item = get().items.find(i => i.id === taskId)
        if (!item) return
        const endpoint = item.type === 'sprint' ? `/api/sprint/tasks/${taskId}` : `/api/sprint/todos/${taskId}`
        authFetch(endpoint, { method: 'PATCH', body: JSON.stringify({ checklist: newChecklist }) }).catch(() => {})
      },

      toggleChecklistItem: (taskId, itemId) => {
        let newChecklist: ChecklistItem[] = []
        set(s => {
          const updated = s.items.map(i => {
            if (i.id !== taskId) return i
            newChecklist = (i.checklist ?? []).map(c => c.id === itemId ? { ...c, done: !c.done } : c)
            return { ...i, checklist: newChecklist }
          })
          return { items: updated }
        })
        if (!getToken() || !isBackendConfigured()) return
        const item = get().items.find(i => i.id === taskId)
        if (!item) return
        const endpoint = item.type === 'sprint' ? `/api/sprint/tasks/${taskId}` : `/api/sprint/todos/${taskId}`
        authFetch(endpoint, { method: 'PATCH', body: JSON.stringify({ checklist: newChecklist }) }).catch(() => {})
      },

      removeChecklistItem: (taskId, itemId) => {
        let newChecklist: ChecklistItem[] = []
        set(s => {
          const updated = s.items.map(i => {
            if (i.id !== taskId) return i
            newChecklist = (i.checklist ?? []).filter(c => c.id !== itemId)
            return { ...i, checklist: newChecklist }
          })
          return { items: updated }
        })
        if (!getToken() || !isBackendConfigured()) return
        const item = get().items.find(i => i.id === taskId)
        if (!item) return
        const endpoint = item.type === 'sprint' ? `/api/sprint/tasks/${taskId}` : `/api/sprint/todos/${taskId}`
        authFetch(endpoint, { method: 'PATCH', body: JSON.stringify({ checklist: newChecklist }) }).catch(() => {})
      },

      addLabel: (taskId, label) =>
        set(s => ({
          items: s.items.map(i => i.id === taskId
            ? { ...i, labels: [...(i.labels ?? []).filter(l => l.id !== label.id), label] }
            : i
          ),
        })),

      removeLabel: (taskId, labelId) =>
        set(s => ({
          items: s.items.map(i => i.id === taskId
            ? { ...i, labels: (i.labels ?? []).filter(l => l.id !== labelId) }
            : i
          ),
        })),

      addGlobalLabel: (label) => {
        const tempId = label.id || crypto.randomUUID()
        const withId = { ...label, id: tempId }
        set(s => ({ globalLabels: [...s.globalLabels, withId] }))
        if (!getToken() || !isBackendConfigured()) return
        authFetch('/api/labels', {
          method: 'POST',
          body: JSON.stringify({ title: label.title, color: label.color }),
        })
          .then(r => r.ok ? r.json() : Promise.reject())
          .then((created: ApiLabel) => set(s => ({
            globalLabels: s.globalLabels.map(l => l.id === tempId ? { ...l, id: created._id } : l),
          })))
          .catch(() => {})
      },

      updateGlobalLabel: (id, updates) => {
        set(s => ({
          globalLabels: s.globalLabels.map(l => l.id === id ? { ...l, ...updates } : l),
          items: s.items.map(i => ({
            ...i,
            labels: (i.labels ?? []).map(l => l.id === id ? { ...l, ...updates } : l),
          })),
        }))
        if (!getToken() || !isBackendConfigured()) return
        authFetch(`/api/labels/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(updates),
        }).catch(() => {})
      },

      deleteGlobalLabel: (id) => {
        set(s => ({
          globalLabels: s.globalLabels.filter(l => l.id !== id),
          items: s.items.map(i => ({ ...i, labels: (i.labels ?? []).filter(l => l.id !== id) })),
        }))
        if (!getToken() || !isBackendConfigured()) return
        authFetch(`/api/labels/${id}`, { method: 'DELETE' }).catch(() => {})
      },

      fetchItems: async () => {
        if (!getToken() || !isBackendConfigured()) return
        set({ syncStatus: 'syncing' })
        // Fetch labels in background alongside tasks
        get().fetchLabels()
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
            type: (t.type as UnifiedTodo['type']) || 'sprint',
            tag: (t.tag as SprintTag) || 'dev',
            weekStart: t.weekStart ?? isoWeekToMonday(t.year, t.weekNumber),
            createdAt: now,
            ...(t.repeat && t.repeat !== 'none' && { repeat: t.repeat as UnifiedTodo['repeat'] }),
            ...(t.nextDue && { nextDue: t.nextDue }),
            ...(t.repeatConfig && { repeatConfig: t.repeatConfig as unknown as RepeatConfig }),
            ...(t.repeatDay !== undefined && { repeatDay: t.repeatDay }),
            ...(t.repeatStartDate && { repeatStartDate: t.repeatStartDate }),
            ...(t.completionHistory?.length && { completionLog: t.completionHistory }),
            ...(t.reminder && { reminder: t.reminder as UnifiedTodo['reminder'] }),
            ...(t.checklist?.length && { checklist: t.checklist as ChecklistItem[] }),
          }))

          const otherItems: UnifiedTodo[] = apiTodos.map(t => ({
            id: t._id, title: t.title, done: t.done,
            type: (t.type as UnifiedTodo['type']) ?? 'shopping',
            priority: t.priority,
            createdAt: now,
            ...(t.repeat && t.repeat !== 'none' && { repeat: t.repeat as UnifiedTodo['repeat'] }),
            ...(t.nextDue && { nextDue: t.nextDue }),
            ...(t.repeatConfig && { repeatConfig: t.repeatConfig as unknown as RepeatConfig }),
            ...(t.repeatDay !== undefined && { repeatDay: t.repeatDay }),
            ...(t.repeatStartDate && { repeatStartDate: t.repeatStartDate }),
            ...(t.completionHistory?.length && { completionLog: t.completionHistory }),
            ...(t.reminder && { reminder: t.reminder as UnifiedTodo['reminder'] }),
            ...(t.checklist?.length && { checklist: t.checklist as ChecklistItem[] }),
          }))

          // Merge API items with existing local-only fields.
          // Backend doesn't store: type distinction (todo vs shopping), repeat, labels, checklist, etc.
          const mergeLocal = (apiItem: UnifiedTodo, existing: UnifiedTodo | undefined): UnifiedTodo => {
            if (!existing) return apiItem
            // Union of backend-synced and any locally-pending completionLog entries
            const mergedLog = Array.from(new Set([
              ...(existing.completionLog ?? []),
              ...(apiItem.completionLog ?? []),
            ]))
            return {
              ...apiItem,
              type:       existing.type,
              ...(existing.checklist      !== undefined && { checklist:      existing.checklist }),
              ...(existing.labels         !== undefined && { labels:         existing.labels }),
              ...(existing.dueDate        !== undefined && { dueDate:        existing.dueDate }),
              ...(existing.description    !== undefined && { description:    existing.description }),
              ...(existing.recipeImageUrl !== undefined && { recipeImageUrl: existing.recipeImageUrl }),
              ...(existing.recipeId       !== undefined && { recipeId:       existing.recipeId }),
              ...(existing.repeat           !== undefined && { repeat:           existing.repeat }),
              ...(existing.nextDue          !== undefined && { nextDue:          existing.nextDue }),
              ...(existing.repeatDay        !== undefined && { repeatDay:        existing.repeatDay }),
              ...(existing.repeatConfig     !== undefined && { repeatConfig:     existing.repeatConfig }),
              ...(existing.repeatStartDate  !== undefined && { repeatStartDate:  existing.repeatStartDate }),
              ...(mergedLog.length && { completionLog: mergedLog }),
            }
          }

          // IDs confirmed by backend — used to identify unconfirmed (tempId) local items
          const backendIds = new Set<string>([
            ...sprintItems.map(i => i.id),
            ...otherItems.map(i => i.id),
          ])

          set(s => ({
            items: sortItems([
              // Preserve unsynced local items (temp UUIDs not yet confirmed by backend, any type).
              // Backend-confirmed items are fully replaced by fresh API data below.
              ...s.items.filter(i => !backendIds.has(i.id)),
              ...sprintItems.map(item => mergeLocal(item,
                s.items.find(i => i.id === item.id) ??
                // tempId race: POST response not yet back, match by title+type to preserve checklist
                s.items.find(i => !backendIds.has(i.id) && i.title === item.title && i.type === item.type)
              )),
              ...otherItems.map(item => mergeLocal(item,
                s.items.find(i => i.id === item.id) ??
                s.items.find(i => !backendIds.has(i.id) && i.title === item.title && i.type === item.type)
              )),
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
            body: JSON.stringify({
              title: item.title, tag: item.tag ?? 'dev', weekNumber: week, year, done: false,
              ...(item.checklist?.length && { checklist: item.checklist }),
            }),
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
            body: JSON.stringify({
              title: item.title,
              type: item.type,
              priority: item.priority ?? 'normal',
              dueDate: '',
              done: false,
              repeat: item.repeat ?? 'none',
              ...(item.checklist?.length && { checklist: item.checklist }),
              ...(item.nextDue && { nextDue: item.nextDue }),
              ...(item.repeatConfig && { repeatConfig: item.repeatConfig }),
              ...(item.repeatDay !== undefined && { repeatDay: item.repeatDay }),
              ...(item.repeatStartDate && { repeatStartDate: item.repeatStartDate }),
            }),
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
                return JSON.stringify({
                  title: item.title, tag: item.tag ?? 'dev', weekNumber: week, year, done: false,
                  ...(item.checklist?.length && { checklist: item.checklist }),
                })
              })()
            : JSON.stringify({
                title: item.title,
                type: item.type,
                priority: item.priority ?? 'normal',
                dueDate: '',
                done: false,
                repeat: item.repeat ?? 'none',
                ...(item.checklist?.length && { checklist: item.checklist }),
                ...(item.nextDue && { nextDue: item.nextDue }),
                ...(item.repeatConfig && { repeatConfig: item.repeatConfig }),
                ...(item.repeatDay !== undefined && { repeatDay: item.repeatDay }),
                ...(item.repeatStartDate && { repeatStartDate: item.repeatStartDate }),
              })
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

      toggleItem: (id, date) => {
        const item = get().items.find(i => i.id === id)
        if (!item) return

        // Recurring task
        if (isRecurring(item) && !item.done) {
          const completionDateStr = date ?? localDateStr(new Date())

          if (item.completionLog?.includes(completionDateStr)) {
            // UNDO: remove that date's entry, restore nextDue to that date
            const newLog = (item.completionLog ?? []).filter(d => d !== completionDateStr)
            set(s => ({ items: s.items.map(i => i.id === id ? { ...i, completionLog: newLog, nextDue: completionDateStr } : i) }))
            if (!getToken() || !isBackendConfigured()) return
            const endpoint = item.type === 'sprint' ? `/api/sprint/tasks/${id}` : `/api/sprint/todos/${id}`
            authFetch(endpoint, { method: 'PATCH', body: JSON.stringify({ nextDue: completionDateStr, done: false, completionHistory: newLog }) })
              .then(r => { if (!r.ok) throw new Error() })
              .then(() => set({ syncStatus: 'synced' }))
              .catch(() => set({ syncStatus: 'error' }))
            return
          }

          // COMPLETE: briefly mark done, then recalculate nextDue after animation
          const newLog = [...(item.completionLog ?? []), completionDateStr]
          set(s => ({ items: s.items.map(i => i.id === id ? { ...i, done: true, completionLog: newLog } : i) }))
          // Capture values now — fetchItems() could overwrite store before 600ms elapses
          const parts = completionDateStr.split('-').map(Number)
          const completionBase = new Date(parts[0], parts[1] - 1, parts[2])
          const nextDue = calcNextDue(item, completionBase)
          const endpoint = item.type === 'sprint' ? `/api/sprint/tasks/${id}` : `/api/sprint/todos/${id}`
          setTimeout(() => {
            set(s => ({ items: s.items.map(i => i.id === id ? { ...i, done: false, nextDue, completionLog: newLog } : i) }))
            if (!getToken() || !isBackendConfigured()) return
            authFetch(endpoint, { method: 'PATCH', body: JSON.stringify({
              nextDue,
              done: false,
              completionHistory: newLog,
            }) })
              .then(r => { if (!r.ok) throw new Error() })
              .then(() => set({ syncStatus: 'synced' }))
              .catch(() => set({ syncStatus: 'error' }))
          }, 600)
          return
        }

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
    {
      name: 'hud-sprint-v2',
      partialize: (s) => ({ items: s.items }),
    }
  )
)
