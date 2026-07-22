import { create } from 'zustand'
import type { Transaction } from '@/shared/types'
import { getToken, authFetch, isBackendConfigured } from '@/shared/services/api'

export type SyncStatus = 'local' | 'syncing' | 'synced' | 'error'

interface ApiTransaction {
  _id: string
  type: 'income' | 'expense'
  amount: number
  desc: string
  title?: string
  category: string
  date: string
  createdAt?: string
  recurringId?: string | null
  incomeCategory?: string | null
  tripMemoryId?: string | null
  spaceId?: string | null
  subcategory?: string | null
}

const CACHE_KEY = 'hud-finance-v1'

interface FinanceCache {
  transactions: Transaction[]
  balance: number
}

function readCache(): FinanceCache | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    return raw ? (JSON.parse(raw) as FinanceCache) : null
  } catch { return null }
}

function writeCache(transactions: Transaction[], balance: number): void {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ transactions, balance }))
  } catch {}
}

function toApiBody(tx: Transaction): object {
  return {
    type: tx.type === 'topup' ? 'income' : 'expense',
    amount: tx.amount,
    desc: tx.description,
    category: tx.category ?? '',
    date: tx.date.slice(0, 10),
    ...(tx.incomeCategory !== undefined ? { incomeCategory: tx.incomeCategory } : {}),
    ...(tx.subcategory ? { subcategory: tx.subcategory } : {}),
  }
}

function fromApi(raw: ApiTransaction): Transaction {
  return {
    id: raw._id,
    type: raw.type === 'income' ? 'topup' : 'expense',
    amount: raw.amount,
    description: raw.desc,
    title: raw.title || undefined,
    category: raw.category || undefined,
    incomeCategory: raw.incomeCategory ?? null,
    date: raw.date,
    createdAt: raw.createdAt,
    recurringId: raw.recurringId ?? null,
    tripMemoryId: raw.tripMemoryId ?? null,
    spaceId: raw.spaceId ?? null,
    subcategory: raw.subcategory ?? null,
  }
}

function calcBalance(txs: Transaction[]): number {
  return txs.reduce((sum, t) => (t.type === 'topup' ? sum + t.amount : sum - t.amount), 0)
}

interface FinanceState {
  balance: number
  transactions: Transaction[]
  syncStatus: SyncStatus

  fetchTransactions: (month?: string) => Promise<void>
  addTopup: (amount: number, description: string, incomeCategory?: string, spaceId?: string | null) => void
  addExpense: (amount: number, description: string, category?: string, tripMemoryId?: string | null, spaceId?: string | null, subcategory?: string | null, date?: string) => void
  deleteTransaction: (id: string) => void
  renameTransaction: (id: string, title: string | undefined) => void
  patchTransaction: (id: string, patch: Partial<Pick<Transaction, 'description' | 'amount' | 'title'>>) => Promise<void>
  tagTripExpenses: (ids: string[], tripMemoryId: string) => void
  setSyncStatus: (s: SyncStatus) => void
  reset: () => void
}

const cached = readCache()

export const useFinanceStore = create<FinanceState>()((set, get) => ({
  balance: cached?.balance ?? 0,
  transactions: cached?.transactions ?? [],
  syncStatus: 'local' as SyncStatus,

  reset: () => {
    sessionStorage.removeItem(CACHE_KEY)
    set({ transactions: [], balance: 0, syncStatus: 'local' })
  },

  setSyncStatus: (syncStatus) => set({ syncStatus }),

  fetchTransactions: async (month) => {
    if (!getToken() || !isBackendConfigured()) return
    set({ syncStatus: 'syncing' })
    try {
      const url = month ? `/api/transactions?month=${month}` : '/api/transactions'
      const res = await authFetch(url)
      if (!res.ok) throw new Error()
      const data: ApiTransaction[] = await res.json()
      const transactions = data.map(fromApi)
      const balance = calcBalance(transactions)
      set({ transactions, balance, syncStatus: 'synced' })
      // кешуємо тільки дефолтний запит (не фільтрований по місяцю)
      if (!month) writeCache(transactions, balance)
    } catch {
      set({ syncStatus: 'error' })
    }
  },

  addTopup: (amount, description, incomeCategory, spaceId) => {
    const tx: Transaction = {
      id: crypto.randomUUID(),
      type: 'topup',
      amount,
      description,
      incomeCategory: incomeCategory ?? null,
      spaceId: spaceId ?? null,
      date: new Date().toISOString(),
    }
    set(s => {
      const transactions = [tx, ...s.transactions].slice(0, 200)
      const balance = s.balance + amount
      writeCache(transactions, balance)
      return { balance, transactions, syncStatus: 'syncing' }
    })
    authFetch('/api/transactions', { method: 'POST', body: JSON.stringify({ ...toApiBody(tx), spaceId: spaceId ?? null }) })
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then((created: ApiTransaction) => {
        set(s => {
          const transactions = s.transactions.map(t => t.id === tx.id ? { ...t, id: created._id } : t)
          writeCache(transactions, s.balance)
          return { syncStatus: 'synced', transactions }
        })
      })
      .catch(() => set({ syncStatus: 'error' }))
  },

  addExpense: (amount, description, category, tripMemoryId, spaceId, subcategory, date) => {
    const tx: Transaction = {
      id: crypto.randomUUID(),
      type: 'expense',
      amount,
      description,
      category,
      date: date ? `${date}T12:00:00.000Z` : new Date().toISOString(),
      tripMemoryId: tripMemoryId ?? null,
      spaceId: spaceId ?? null,
      subcategory: subcategory ?? null,
    }
    set(s => {
      const transactions = [tx, ...s.transactions].slice(0, 200)
      const balance = s.balance - amount
      writeCache(transactions, balance)
      return { balance, transactions, syncStatus: 'syncing' }
    })
    authFetch('/api/transactions', { method: 'POST', body: JSON.stringify({ ...toApiBody(tx), tripMemoryId: tx.tripMemoryId, spaceId: spaceId ?? null }) })
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then((created: ApiTransaction) => {
        set(s => {
          const transactions = s.transactions.map(t => t.id === tx.id ? { ...t, id: created._id } : t)
          writeCache(transactions, s.balance)
          return { syncStatus: 'synced', transactions }
        })
      })
      .catch(() => set({ syncStatus: 'error' }))
  },

  renameTransaction: (id, title) =>
    set(s => {
      const transactions = s.transactions.map(t => t.id === id ? { ...t, title } : t)
      writeCache(transactions, s.balance)
      return { transactions }
    }),

  patchTransaction: async (id, patch) => {
    const s = get()
    const tx = s.transactions.find(t => t.id === id)
    if (!tx) return
    const prevAmount = tx.amount
    const nextAmount = patch.amount ?? prevAmount
    const delta = tx.type === 'topup'
      ? nextAmount - prevAmount
      : prevAmount - nextAmount
    const prev = { description: tx.description, amount: tx.amount, title: tx.title }
    set(s2 => {
      const transactions = s2.transactions.map(t => t.id === id ? { ...t, ...patch } : t)
      const balance = s2.balance + delta
      writeCache(transactions, balance)
      return { balance, transactions }
    })
    try {
      const body: Record<string, unknown> = {}
      if (patch.description !== undefined) body.desc = patch.description
      if (patch.amount      !== undefined) body.amount = patch.amount
      if (patch.title       !== undefined) body.title = patch.title
      const res = await authFetch(`/api/transactions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('patch failed')
    } catch {
      const rollbackDelta = -(delta)
      set(s2 => {
        const transactions = s2.transactions.map(t => t.id === id ? { ...t, ...prev } : t)
        const balance = s2.balance + rollbackDelta
        writeCache(transactions, balance)
        return { balance, transactions }
      })
    }
  },

  tagTripExpenses: (ids, tripMemoryId) => {
    set(s => {
      const transactions = s.transactions.map(t =>
        ids.includes(t.id) ? { ...t, tripMemoryId } : t
      )
      writeCache(transactions, s.balance)
      return { transactions }
    })
    ids.forEach(id =>
      authFetch(`/api/transactions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ tripMemoryId }),
      }).catch(() => {})
    )
  },

  deleteTransaction: (id) => {
    const s = get()
    const tx = s.transactions.find(t => t.id === id)
    if (!tx) return
    const delta = tx.type === 'topup' ? -tx.amount : tx.amount
    const transactions = s.transactions.filter(t => t.id !== id)
    const balance = s.balance + delta
    writeCache(transactions, balance)
    set({ balance, transactions, syncStatus: 'syncing' })
    authFetch(`/api/transactions/${id}`, { method: 'DELETE' })
      .then(() => set({ syncStatus: 'synced' }))
      .catch(() => set({ syncStatus: 'error' }))
  },
}))
