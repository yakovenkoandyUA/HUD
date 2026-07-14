import { create } from 'zustand'
import type { UnifiedTodo, SprintTag, TodoPriority, SprintLabel, ChecklistItem, RepeatConfig } from '@/shared/types'
import { getToken, authFetch, isBackendConfigured } from '@/shared/services/api'
import { isRecurring, calcStreak } from '../utils/sprint'
import { useAchievementsStore } from '@/shared/store/achievementsStore'

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
  tag?: string
  done: boolean
  weekNumber?: number
  year?: number
  weekStart?: string
  type?: string
  priority?: string
  category?: string | null
  labels?: string[]
  dueDate?: string | null
  dueTime?: string | null
  description?: string
  order?: number
  repeat?: string
  nextDue?: string
  repeatDay?: number
  repeatConfig?: Record<string, unknown>
  repeatStartDate?: string
  completionHistory?: string[]
  reminder?: { amount: number; unit: string } | null
  checklist?: ApiChecklist[]
  isPinned?: boolean
  assignedTo?: string[]
  ownerName?: string
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | null
  createdAt?: string
}

// ── Repeat helpers ────────────────────────────────────────────────────────────

function calcNextDue(item: UnifiedTodo, baseDate?: Date): string {
  const base = baseDate ? new Date(baseDate) : new Date(); base.setHours(0, 0, 0, 0)

  if (item.repeatConfig) {
    const { unit, interval, weekDays } = item.repeatConfig

    if (unit === 'week' && weekDays && weekDays.length > 0) {
      const sorted = [...weekDays].sort((a, b) => a - b)
      const todayWd = (base.getDay() + 6) % 7
      const nextInWeek = sorted.find(d => d > todayWd)
      if (nextInWeek !== undefined) {
        base.setDate(base.getDate() + (nextInWeek - todayWd))
      } else {
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
      base.setDate(base.getDate() + interval * (unit === 'week' ? 7 : 1))
    }
    return localDateStr(base)
  }

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
  trashItems: UnifiedTodo[]
  loading: boolean
  syncStatus: SyncStatus
  globalLabels: SprintLabel[]

  clearItems: () => void
  fetchItems: () => Promise<void>
  fetchTrash: () => Promise<void>
  fetchLabels: () => Promise<void>
  migrateFromLocalStorage: () => Promise<void>
  addItem: (data: Omit<UnifiedTodo, 'id' | 'createdAt' | 'done'>, rollbackImagePublicIds?: string[]) => void
  addItems: (dataList: Omit<UnifiedTodo, 'id' | 'createdAt' | 'done'>[]) => void
  toggleItem: (id: string, date?: string) => void
  deleteItem: (id: string) => void
  restoreItem: (id: string) => void
  purgeItem: (id: string) => void
  setSyncStatus: (s: SyncStatus) => void
  setReminder: (id: string, reminder: UnifiedTodo['reminder']) => void
  updateTask: (id: string, updates: Partial<UnifiedTodo>) => void
  addChecklistItem: (taskId: string, title: string) => void
  toggleChecklistItem: (taskId: string, itemId: string) => void
  removeChecklistItem: (taskId: string, itemId: string) => void
  updateChecklist: (taskId: string, newList: ChecklistItem[]) => void
  addLabel: (taskId: string, label: SprintLabel) => void
  removeLabel: (taskId: string, labelId: string) => void
  addGlobalLabel: (label: SprintLabel) => void
  updateGlobalLabel: (id: string, updates: Partial<SprintLabel>) => void
  deleteGlobalLabel: (id: string) => void
  pinItem: (id: string) => void
}

// ── Helper: build POST/PATCH body from UnifiedTodo ───────────────────────────

function taskBody(item: Partial<UnifiedTodo> & { type?: string }): Record<string, unknown> {
  const labelIds = (item.labels ?? []).map((l: SprintLabel) => l.id)
  return {
    ...(item.title !== undefined    && { title:       item.title }),
    ...(item.done  !== undefined    && { done:        item.done }),
    ...(item.type  !== undefined    && { type:        item.type }),
    ...(item.priority !== undefined && { priority:    item.priority }),
    ...(item.dueDate  !== undefined && { dueDate:     item.dueDate ?? null }),
    ...(item.dueTime  !== undefined && { dueTime:     item.dueTime ?? null }),
    ...(item.description !== undefined && { description: item.description }),
    ...(item.category !== undefined && { category:   item.category ?? null }),
    ...(labelIds.length             && { labels:      labelIds }),
    ...(item.checklist !== undefined && { checklist:  item.checklist }),
    ...(item.reminder !== undefined && { reminder:    item.reminder ?? null }),
    ...(item.isPinned   !== undefined && { isPinned:   item.isPinned }),
    ...(item.assignedTo !== undefined && { assignedTo: item.assignedTo }),
    ...(item.timeOfDay  !== undefined && { timeOfDay:  item.timeOfDay }),
    ...(item.repeat && item.repeat !== 'none' && {
      repeat:          item.repeat,
      nextDue:         item.nextDue,
      repeatConfig:    item.repeatConfig,
      repeatDay:       item.repeatDay,
      repeatStartDate: item.repeatStartDate,
    }),
    ...(item.imageUrls?.length      && { imageUrls:      item.imageUrls }),
    ...(item.imagePublicIds?.length && { imagePublicIds: item.imagePublicIds }),
  }
}

export const useSprintStore = create<TodoState>((set, get) => ({
  items:        [],
  trashItems:   [],
  loading:      false,
  syncStatus:   'local' as SyncStatus,
  globalLabels: DEFAULT_LABELS,

  clearItems: () => set({ items: [] }),
  setSyncStatus: (syncStatus) => set({ syncStatus }),

  // ── Labels ──────────────────────────────────────────────────────────────────

  fetchLabels: async () => {
    if (!getToken() || !isBackendConfigured()) return
    try {
      const res = await authFetch('/api/labels')
      if (!res.ok) return
      const data: ApiLabel[] = await res.json()
      if (data.length > 0) {
        set({ globalLabels: data.map(l => ({ id: l._id, title: l.title, color: l.color })) })
      } else {
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

  // ── Fetch all tasks ──────────────────────────────────────────────────────────

  fetchItems: async () => {
    if (!getToken() || !isBackendConfigured()) return
    set({ loading: true, syncStatus: 'syncing' })
    await get().fetchLabels()

    try {
      const r = await authFetch('/api/sprint/tasks')
      if (!r.ok) throw new Error()

      const data: ApiTask[] = await r.json()
      const { globalLabels } = get()
      const now = new Date().toISOString()

      const mapped: UnifiedTodo[] = data.map(t => {
        const labelObjs = (t.labels ?? [])
          .map(id => globalLabels.find(l => l.id === id))
          .filter((l): l is SprintLabel => l !== undefined)

        return {
          id:        t._id,
          title:     t.title,
          done:      t.done,
          type:      (t.type as UnifiedTodo['type']) || 'sprint',
          tag:       (t.tag as SprintTag) || undefined,
          priority:  (t.priority as TodoPriority) || undefined,
          weekStart: t.weekStart ?? (t.weekNumber ? isoWeekToMonday(t.year ?? 0, t.weekNumber) : undefined),
          createdAt: t.createdAt ?? now,
          ...(t.dueDate     && { dueDate:     t.dueDate }),
          ...(t.dueTime     && { dueTime:     t.dueTime }),
          ...(t.description && { description: t.description }),
          ...(t.category    && { category:    t.category }),
          ...(labelObjs.length && { labels:   labelObjs }),
          ...(t.checklist?.length && { checklist: t.checklist as ChecklistItem[] }),
          ...(t.reminder    && { reminder:    t.reminder as UnifiedTodo['reminder'] }),
          ...(t.repeat && t.repeat !== 'none' && { repeat: t.repeat as UnifiedTodo['repeat'] }),
          ...(t.nextDue     && { nextDue:     t.nextDue }),
          ...(t.repeatConfig && { repeatConfig: t.repeatConfig as unknown as RepeatConfig }),
          ...(t.repeatDay !== undefined && { repeatDay: t.repeatDay }),
          ...(t.repeatStartDate && { repeatStartDate: t.repeatStartDate }),
          ...(t.completionHistory?.length && { completionLog: t.completionHistory }),
          ...(t.isPinned    && { isPinned:    t.isPinned }),
          ...(t.assignedTo?.length && { assignedTo: t.assignedTo }),
          ...(t.ownerName   && { ownerName:   t.ownerName }),
          ...((t as { assigneeNames?: string[] }).assigneeNames?.length && { assigneeNames: (t as { assigneeNames?: string[] }).assigneeNames }),
          ...(t.timeOfDay !== undefined && { timeOfDay: t.timeOfDay }),
        }
      })

      set({ items: sortItems(mapped), loading: false, syncStatus: 'synced' })
    } catch {
      set({ loading: false, syncStatus: 'error' })
    }
  },

  // ── Trash ─────────────────────────────────────────────────────────────────

  fetchTrash: async () => {
    if (!getToken() || !isBackendConfigured()) return
    try {
      const r = await authFetch('/api/sprint/tasks/trash')
      if (!r.ok) return
      const data: ApiTask[] = await r.json()
      const { globalLabels } = get()
      const mapped: UnifiedTodo[] = data.map(t => {
        const labelObjs = (t.labels ?? [])
          .map(id => globalLabels.find(l => l.id === id))
          .filter((l): l is SprintLabel => l !== undefined)
        return {
          id:        t._id,
          title:     t.title,
          done:      t.done,
          type:      (t.type as UnifiedTodo['type']) || 'todo',
          createdAt: t.createdAt ?? new Date().toISOString(),
          ...(labelObjs.length && { labels: labelObjs }),
          ...(t.dueDate && { dueDate: t.dueDate }),
          deletedAt: (t as unknown as { deletedAt?: string }).deletedAt,
        }
      })
      set({ trashItems: mapped })
    } catch { /* offline */ }
  },

  restoreItem: (id) => {
    const item = get().trashItems.find(i => i.id === id)
    if (!item) return
    set(s => ({
      trashItems: s.trashItems.filter(i => i.id !== id),
      items: sortItems([...s.items, { ...item, deletedAt: undefined }]),
    }))
    if (!getToken() || !isBackendConfigured()) return
    authFetch(`/api/sprint/tasks/${id}/restore`, { method: 'POST' })
      .catch(() => get().fetchTrash())
  },

  purgeItem: (id) => {
    set(s => ({ trashItems: s.trashItems.filter(i => i.id !== id) }))
    if (!getToken() || !isBackendConfigured()) return
    authFetch(`/api/sprint/tasks/${id}/purge`, { method: 'DELETE' }).catch(() => {})
  },

  // ── Migration from localStorage ───────────────────────────────────────────

  migrateFromLocalStorage: async () => {
    const stored = localStorage.getItem('hud-sprint-v2')
    if (!stored) return

    let items: UnifiedTodo[] = []
    try {
      const parsed = JSON.parse(stored)
      items = parsed?.state?.items ?? []
    } catch {
      localStorage.removeItem('hud-sprint-v2')
      return
    }

    if (!items.length) {
      localStorage.removeItem('hud-sprint-v2')
      return
    }

    if (!getToken() || !isBackendConfigured()) return

    for (const item of items) {
      const body: Record<string, unknown> = {
        ...taskBody(item),
        title: item.title,
        type:  item.type ?? 'todo',
        done:  item.done ?? false,
        ...(item.completionLog?.length && { completionHistory: item.completionLog }),
      }
      if (item.type === 'sprint') {
        const ws = item.weekStart ?? currentWeekStart()
        const { week, year } = getISOWeekYear(ws)
        body.tag        = item.tag ?? 'dev'
        body.weekNumber = week
        body.year       = year
        body.weekStart  = ws
      }
      await authFetch('/api/sprint/tasks', {
        method: 'POST',
        body: JSON.stringify(body),
      }).catch(() => {})
    }

    localStorage.removeItem('hud-sprint-v2')
  },

  // ── Add item ─────────────────────────────────────────────────────────────────

  addItem: (data, rollbackImagePublicIds) => {
    const item: UnifiedTodo = {
      id: crypto.randomUUID(),
      done: false,
      createdAt: new Date().toISOString(),
      ...data,
    }
    set(s => ({ items: sortItems([...s.items, item]) }))
    if (!getToken() || !isBackendConfigured()) return

    const body: Record<string, unknown> = {
      ...taskBody(item),
      title: item.title,
      type:  item.type,
      done:  false,
    }
    if (item.type === 'sprint') {
      const ws = item.weekStart ?? currentWeekStart()
      const { week, year } = getISOWeekYear(ws)
      body.tag        = item.tag ?? 'dev'
      body.weekNumber = week
      body.year       = year
      body.weekStart  = ws
    }

    authFetch('/api/sprint/tasks', {
      method: 'POST',
      body: JSON.stringify(body),
    })
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then((created: { _id: string }) => set(s => ({
        items: s.items.map(i => i.id === item.id ? { ...i, id: created._id } : i),
      })))
      .catch(() => {
        if (rollbackImagePublicIds?.length) {
          authFetch('/api/sprint/images/rollback', {
            method: 'POST',
            body: JSON.stringify({ publicIds: rollbackImagePublicIds }),
          }).catch(() => {})
        }
        get().fetchItems()
      })
  },

  addItems: (dataList) => {
    const newItems: UnifiedTodo[] = dataList.map(data => ({
      id: crypto.randomUUID(),
      done: false,
      createdAt: new Date().toISOString(),
      ...data,
    }))
    set(s => ({ items: sortItems([...s.items, ...newItems]) }))
    if (!getToken() || !isBackendConfigured()) return

    Promise.all(newItems.map((item, idx) => {
      const body: Record<string, unknown> = {
        ...taskBody(item),
        title: item.title,
        type:  item.type,
        done:  false,
      }
      if (item.type === 'sprint') {
        const ws = item.weekStart ?? currentWeekStart()
        const { week, year } = getISOWeekYear(ws)
        body.tag = item.tag ?? 'dev'
        body.weekNumber = week
        body.year = year
        body.weekStart = ws
      }
      return authFetch('/api/sprint/tasks', { method: 'POST', body: JSON.stringify(body) })
        .then(r => r.ok ? r.json() : Promise.reject())
        .then((created: { _id: string }) => set(s => ({
          items: s.items.map(i => i.id === newItems[idx].id ? { ...i, id: created._id } : i),
        })))
    })).catch(() => {})
  },

  // ── Update item (rich fields + backend sync) ──────────────────────────────

  updateTask: (id, updates) => {
    set(s => ({ items: s.items.map(i => i.id === id ? { ...i, ...updates } : i) }))
    if (!getToken() || !isBackendConfigured()) return

    // undefined → null: JSON.stringify strips undefined, so fields like dueDate/dueTime
    // that are intentionally cleared would never reach the backend otherwise
    const body: Record<string, unknown> = {}
    for (const key of Object.keys(updates as Record<string, unknown>)) {
      const val = (updates as Record<string, unknown>)[key]
      body[key] = val === undefined ? null : val
    }
    if (updates.labels !== undefined) {
      body.labels = (updates.labels ?? []).map(l => l.id)
    }
    authFetch(`/api/sprint/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }).catch(() => get().fetchItems())
  },

  // ── Checklist ─────────────────────────────────────────────────────────────

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
    authFetch(`/api/sprint/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify({ checklist: newChecklist }),
    }).catch(() => {})
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
    authFetch(`/api/sprint/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify({ checklist: newChecklist }),
    }).catch(() => {})
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
    authFetch(`/api/sprint/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify({ checklist: newChecklist }),
    }).catch(() => {})
  },

  updateChecklist: (taskId, newList) => {
    set(s => ({
      items: s.items.map(i => i.id === taskId ? { ...i, checklist: newList } : i)
    }))
    if (!getToken() || !isBackendConfigured()) return
    authFetch(`/api/sprint/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify({ checklist: newList }),
    }).catch(() => {})
  },

  // ── Labels on tasks ───────────────────────────────────────────────────────

  addLabel: (taskId, label) => {
    let newLabels: SprintLabel[] = []
    set(s => {
      const updated = s.items.map(i => {
        if (i.id !== taskId) return i
        newLabels = [...(i.labels ?? []).filter(l => l.id !== label.id), label]
        return { ...i, labels: newLabels }
      })
      return { items: updated }
    })
    if (!getToken() || !isBackendConfigured()) return
    authFetch(`/api/sprint/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify({ labels: newLabels.map(l => l.id) }),
    }).catch(() => {})
  },

  removeLabel: (taskId, labelId) => {
    let newLabels: SprintLabel[] = []
    set(s => {
      const updated = s.items.map(i => {
        if (i.id !== taskId) return i
        newLabels = (i.labels ?? []).filter(l => l.id !== labelId)
        return { ...i, labels: newLabels }
      })
      return { items: updated }
    })
    if (!getToken() || !isBackendConfigured()) return
    authFetch(`/api/sprint/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify({ labels: newLabels.map(l => l.id) }),
    }).catch(() => {})
  },

  // ── Global labels ─────────────────────────────────────────────────────────

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

  // ── Reminder ──────────────────────────────────────────────────────────────

  setReminder: (id, reminder) => {
    set(s => ({ items: s.items.map(i => i.id === id ? { ...i, reminder } : i) }))
    if (!getToken() || !isBackendConfigured()) return
    authFetch(`/api/sprint/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ reminder: reminder ?? null }),
    }).catch(() => {})
  },

  // ── Toggle ────────────────────────────────────────────────────────────────

  toggleItem: (id, date) => {
    const item = get().items.find(i => i.id === id)
    if (!item) return

    if (isRecurring(item) && !item.done) {
      const completionDateStr = date ?? localDateStr(new Date())

      if (item.completionLog?.includes(completionDateStr)) {
        const newLog = (item.completionLog ?? []).filter(d => d !== completionDateStr)
        set(s => ({ items: s.items.map(i => i.id === id ? { ...i, completionLog: newLog, nextDue: completionDateStr } : i) }))
        if (!getToken() || !isBackendConfigured()) return
        authFetch(`/api/sprint/tasks/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ nextDue: completionDateStr, done: false, completionHistory: newLog }),
        }).catch(() => {})
        return
      }

      const newLog = [...(item.completionLog ?? []), completionDateStr]
      set(s => ({ items: s.items.map(i => i.id === id ? { ...i, done: true, completionLog: newLog } : i) }))
      if (calcStreak({ ...item, completionLog: newLog }) >= 7) {
        useAchievementsStore.getState().unlock('streak-7')
      }
      const parts = completionDateStr.split('-').map(Number)
      const completionBase = new Date(parts[0], parts[1] - 1, parts[2])
      const nextDue = calcNextDue(item, completionBase)
      setTimeout(() => {
        set(s => ({ items: s.items.map(i => i.id === id ? { ...i, done: false, nextDue, completionLog: newLog } : i) }))
        if (!getToken() || !isBackendConfigured()) return
        authFetch(`/api/sprint/tasks/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ nextDue, done: false, completionHistory: newLog }),
        }).catch(() => {})
      }, 600)
      return
    }

    const done = !item.done
    set(s => ({ items: s.items.map(i => i.id === id ? { ...i, done } : i) }))
    if (!getToken() || !isBackendConfigured()) return
    authFetch(`/api/sprint/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ done }),
    }).catch(() => {})
  },

  // ── Pin ──────────────────────────────────────────────────────────────────

  pinItem: (id) => {
    const current = get().items.find(i => i.id === id)
    const newPinned = !(current?.isPinned ?? false)
    set(s => ({
      items: s.items.map(i => ({
        ...i,
        isPinned: i.id === id ? newPinned : (newPinned ? false : i.isPinned),
      }))
    }))
    if (!getToken() || !isBackendConfigured()) return
    authFetch(`/api/sprint/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isPinned: newPinned }),
    }).catch(() => {})
  },

  // ── Delete ────────────────────────────────────────────────────────────────

  deleteItem: (id) => {
    set(s => ({ items: s.items.filter(i => i.id !== id) }))
    if (!getToken() || !isBackendConfigured()) return
    authFetch(`/api/sprint/tasks/${id}`, { method: 'DELETE' }).catch(() => {})
  },
}))
