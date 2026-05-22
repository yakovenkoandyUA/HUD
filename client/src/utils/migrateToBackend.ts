import { authFetch, getToken, isBackendConfigured } from '../services/api'
import type { Transaction, SprintTask, TodoItem, WatchlistItem } from '../types'

const MIGRATED_KEY = 'hud_migrated_transactions_v1'

interface LocalFinanceState {
  state?: { transactions?: Transaction[] }
}

export async function migrateTransactionsToBackend(): Promise<void> {
  if (localStorage.getItem(MIGRATED_KEY)) return
  if (!getToken() || !isBackendConfigured()) return

  let transactions: Transaction[] = []
  try {
    const raw = localStorage.getItem('hud-finance')
    if (!raw) { localStorage.setItem(MIGRATED_KEY, '1'); return }
    const parsed = JSON.parse(raw) as LocalFinanceState
    transactions = parsed?.state?.transactions ?? []
  } catch {
    return
  }

  if (transactions.length === 0) {
    localStorage.setItem(MIGRATED_KEY, '1')
    return
  }

  // Push each transaction, skip on error (don't block the app)
  let migrated = 0
  for (const tx of transactions) {
    try {
      const res = await authFetch('/api/transactions', {
        method: 'POST',
        body: JSON.stringify({
          type: tx.type === 'topup' ? 'income' : 'expense',
          amount: tx.amount,
          desc: tx.description,
          category: tx.category ?? '',
          date: tx.date.slice(0, 10),
        }),
      })
      if (res.ok) migrated++
    } catch {
      // network error — stop migration, will retry next session
      return
    }
  }

  if (migrated === transactions.length) {
    localStorage.setItem(MIGRATED_KEY, '1')
    console.log(`[HUD] Migrated ${migrated} transactions to backend`)
  }
}

// ── Sprint & Todos ───────────────────────────────────────────────────────────

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

interface LocalSprintState {
  state?: { tasks?: SprintTask[]; todos?: TodoItem[] }
}

export async function migrateSprintToBackend(): Promise<void> {
  if (localStorage.getItem('hud_migrated_sprint')) return
  if (!getToken() || !isBackendConfigured()) return

  let tasks: SprintTask[] = []
  let todos: TodoItem[] = []
  try {
    const raw = localStorage.getItem('hud-sprint')
    if (!raw) { localStorage.setItem('hud_migrated_sprint', '1'); return }
    const parsed = JSON.parse(raw) as LocalSprintState
    tasks = parsed?.state?.tasks ?? []
    todos = parsed?.state?.todos ?? []
  } catch { return }

  let ok = true

  for (const task of tasks) {
    try {
      const { week, year } = getISOWeekYear(task.weekStart)
      const res = await authFetch('/api/sprint/tasks', {
        method: 'POST',
        body: JSON.stringify({ title: task.title, tag: task.category, done: task.done, weekNumber: week, year }),
      })
      if (!res.ok) ok = false
    } catch { return }
  }

  for (const todo of todos) {
    try {
      const res = await authFetch('/api/sprint/todos', {
        method: 'POST',
        body: JSON.stringify({ title: todo.title, priority: todo.priority, done: todo.done, dueDate: todo.dueDate ?? '' }),
      })
      if (!res.ok) ok = false
    } catch { return }
  }

  if (ok) {
    localStorage.setItem('hud_migrated_sprint', '1')
    console.log(`[HUD] Migrated ${tasks.length} tasks + ${todos.length} todos`)
  }
}

// ── Watchlist ────────────────────────────────────────────────────────────────

interface LocalWatchlistState {
  state?: { items?: WatchlistItem[] }
}

export async function migrateWatchlistToBackend(): Promise<void> {
  if (localStorage.getItem('hud_migrated_watchlist')) return
  if (!getToken() || !isBackendConfigured()) return

  let items: WatchlistItem[] = []
  try {
    const raw = localStorage.getItem('hud-watchlist')
    if (!raw) { localStorage.setItem('hud_migrated_watchlist', '1'); return }
    const parsed = JSON.parse(raw) as LocalWatchlistState
    items = parsed?.state?.items ?? []
  } catch { return }

  if (items.length === 0) { localStorage.setItem('hud_migrated_watchlist', '1'); return }

  let migrated = 0
  for (const item of items) {
    try {
      const res = await authFetch('/api/watchlist', {
        method: 'POST',
        body: JSON.stringify({
          tmdbId: item.tmdbId,
          title: item.title,
          originalTitle: item.originalTitle,
          category: item.category,
          status: item.status,
          posterPath: item.posterPath ?? '',
          backdropPath: item.backdropPath ?? '',
          overview: item.overview,
          year: item.year,
          genres: item.genres,
          rating: item.rating,
          seasonReminder: item.seasonReminder,
          reminderDate: item.reminderDate ?? '',
          authors: item.authors ?? [],
          pageCount: item.pageCount ?? 0,
          thumbnail: item.thumbnail ?? '',
          addedAt: item.addedAt,
        }),
      })
      // 409 = already exists from a previous partial migration — count as ok
      if (res.ok || res.status === 409) migrated++
    } catch { return }
  }

  if (migrated === items.length) {
    localStorage.setItem('hud_migrated_watchlist', '1')
    console.log(`[HUD] Migrated ${migrated} watchlist items`)
  }
}
