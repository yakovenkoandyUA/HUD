import { create } from 'zustand'
import type { Transaction } from '../types'
import { getToken, authFetch, isBackendConfigured } from '../services/api'

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
    date: raw.date,
    createdAt: raw.createdAt,
    recurringId: raw.recurringId ?? null,
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
  addTopup: (amount: number, description: string) => void
  addExpense: (amount: number, description: string, category?: string) => void
  deleteTransaction: (id: string) => void
  renameTransaction: (id: string, title: string | undefined) => void
  patchTransaction: (id: string, patch: Partial<Pick<Transaction, 'description' | 'amount' | 'title'>>) => void
  setSyncStatus: (s: SyncStatus) => void
}

const cached = readCache()

export const useFinanceStore = create<FinanceState>()((set, get) => ({
  balance: cached?.balance ?? 0,
  transactions: cached?.transactions ?? [],
  syncStatus: 'local' as SyncStatus,

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

  addTopup: (amount, description) => {
    const tx: Transaction = {
      id: crypto.randomUUID(),
      type: 'topup',
      amount,
      description,
      date: new Date().toISOString(),
    }
    set(s => {
      const transactions = [tx, ...s.transactions].slice(0, 200)
      const balance = s.balance + amount
      writeCache(transactions, balance)
      return { balance, transactions, syncStatus: 'syncing' }
    })
    authFetch('/api/transactions', { method: 'POST', body: JSON.stringify(toApiBody(tx)) })
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

  addExpense: (amount, description, category) => {
    const tx: Transaction = {
      id: crypto.randomUUID(),
      type: 'expense',
      amount,
      description,
      category,
      date: new Date().toISOString(),
    }
    set(s => {
      const transactions = [tx, ...s.transactions].slice(0, 200)
      const balance = s.balance - amount
      writeCache(transactions, balance)
      return { balance, transactions, syncStatus: 'syncing' }
    })
    authFetch('/api/transactions', { method: 'POST', body: JSON.stringify(toApiBody(tx)) })
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

  patchTransaction: (id, patch) => {
    const s = get()
    const tx = s.transactions.find(t => t.id === id)
    if (!tx) return
    const prevAmount = tx.amount
    const nextAmount = patch.amount ?? prevAmount
    const delta = tx.type === 'topup'
      ? nextAmount - prevAmount
      : prevAmount - nextAmount
    set(s2 => {
      const transactions = s2.transactions.map(t => t.id === id ? { ...t, ...patch } : t)
      const balance = s2.balance + delta
      writeCache(transactions, balance)
      return { balance, transactions }
    })
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
