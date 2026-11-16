import { create } from 'zustand'
import type { Transaction, WalletId } from '@/shared/types'
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
  walletId?: WalletId
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
    ...(tx.walletId === 'mono' ? { walletId: 'mono' } : {}),
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
    walletId: raw.walletId === 'mono' ? 'mono' : 'sense',
  }
}

function calcBalance(txs: Transaction[]): number {
  return txs.reduce((sum, t) => (t.type === 'topup' ? sum + t.amount : sum - t.amount), 0)
}

/**
 * `transactions` / `balance` always mean the MAIN (Sense) wallet — every existing consumer
 * (BalanceHero, daily budget, forecast, reports) keeps working untouched.
 * Mono lives separately in `monoTransactions` and never affects `balance`.
 */
interface FinanceState {
  balance: number
  transactions: Transaction[]
  monoTransactions: Transaction[]
  syncStatus: SyncStatus

  fetchTransactions: (month?: string) => Promise<void>
  addTopup: (amount: number, description: string, incomeCategory?: string, spaceId?: string | null, walletId?: WalletId) => void
  addExpense: (amount: number, description: string, category?: string, tripMemoryId?: string | null, spaceId?: string | null, subcategory?: string | null, date?: string, walletId?: WalletId) => void
  deleteTransaction: (id: string) => void
  renameTransaction: (id: string, title: string | undefined) => void
  patchTransaction: (id: string, patch: Partial<Pick<Transaction, 'description' | 'amount' | 'title'>>) => Promise<void>
  tagTripExpenses: (ids: string[], tripMemoryId: string) => void
  setSyncStatus: (s: SyncStatus) => void
  reset: () => void
}

const cached = readCache()

// Guards against a slow fetchTransactions() (called on mount from both
// Dashboard and the Finance page) overwriting a transaction added/edited
// while it was still in flight with stale data — see spacesStore.ts for
// the same pattern.
let financeReqId = 0

export const useFinanceStore = create<FinanceState>()((set, get) => {
  /** Optimistically adds `tx`, POSTs it, then reconciles with the server copy (or rolls back). */
  const addTransaction = (tx: Transaction, extraBody: object): void => {
    const mono = tx.walletId === 'mono'
    const delta = tx.type === 'topup' ? tx.amount : -tx.amount
    financeReqId++
    set(s => {
      if (mono) return { monoTransactions: [tx, ...s.monoTransactions], syncStatus: 'syncing' as SyncStatus }
      const transactions = [tx, ...s.transactions].slice(0, 200)
      const balance = s.balance + delta
      writeCache(transactions, balance)
      return { balance, transactions, syncStatus: 'syncing' as SyncStatus }
    })
    authFetch('/api/transactions', { method: 'POST', body: JSON.stringify({ ...toApiBody(tx), ...extraBody }) })
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then((created: ApiTransaction) => {
        financeReqId++
        set(s => {
          // A fetchTransactions() may have raced in and already replaced the list
          // (without this optimistic entry, since the POST hadn't committed yet) —
          // re-insert from the server response instead of silently dropping it.
          const list = mono ? s.monoTransactions : s.transactions
          const exists = list.some(t => t.id === tx.id)
          const next = exists
            ? list.map(t => t.id === tx.id ? { ...t, id: created._id } : t)
            : [fromApi(created), ...list.filter(t => t.id !== created._id)]
          if (mono) return { monoTransactions: next, syncStatus: 'synced' as SyncStatus }
          const balance = exists ? s.balance : calcBalance(next)
          writeCache(next, balance)
          return { balance, syncStatus: 'synced' as SyncStatus, transactions: next }
        })
      })
      .catch(() => {
        financeReqId++
        set(s => {
          if (mono) return { monoTransactions: s.monoTransactions.filter(t => t.id !== tx.id), syncStatus: 'error' as SyncStatus }
          const transactions = s.transactions.filter(t => t.id !== tx.id)
          const balance = s.balance - delta
          writeCache(transactions, balance)
          return { balance, transactions, syncStatus: 'error' as SyncStatus }
        })
      })
  }

  return {
    balance: cached?.balance ?? 0,
    transactions: cached?.transactions ?? [],
    monoTransactions: [],
    syncStatus: 'local' as SyncStatus,

    reset: () => {
      sessionStorage.removeItem(CACHE_KEY)
      set({ transactions: [], monoTransactions: [], balance: 0, syncStatus: 'local' })
    },

    setSyncStatus: (syncStatus) => set({ syncStatus }),

    fetchTransactions: async (month) => {
      if (!getToken() || !isBackendConfigured()) return
      const reqId = ++financeReqId
      set({ syncStatus: 'syncing' })
      try {
        const url = month ? `/api/transactions?month=${month}` : '/api/transactions'
        const res = await authFetch(url)
        if (!res.ok) throw new Error()
        const data: ApiTransaction[] = await res.json()
        if (reqId !== financeReqId) return // a mutation happened while this was in flight — stale, drop it
        const all = data.map(fromApi)
        const transactions = all.filter(t => t.walletId !== 'mono')
        const monoTransactions = all.filter(t => t.walletId === 'mono')
        const balance = calcBalance(transactions)
        set({ transactions, monoTransactions, balance, syncStatus: 'synced' })
        // кешуємо тільки дефолтний запит (не фільтрований по місяцю)
        if (!month) writeCache(transactions, balance)
      } catch {
        if (reqId === financeReqId) set({ syncStatus: 'error' })
      }
    },

    addTopup: (amount, description, incomeCategory, spaceId, walletId) => {
      const tx: Transaction = {
        id: crypto.randomUUID(),
        type: 'topup',
        amount,
        description,
        incomeCategory: incomeCategory ?? null,
        spaceId: spaceId ?? null,
        date: new Date().toISOString(),
        walletId: walletId ?? 'sense',
      }
      addTransaction(tx, { spaceId: spaceId ?? null })
    },

    addExpense: (amount, description, category, tripMemoryId, spaceId, subcategory, date, walletId) => {
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
        walletId: walletId ?? 'sense',
      }
      addTransaction(tx, { tripMemoryId: tx.tripMemoryId, spaceId: spaceId ?? null })
    },

    renameTransaction: (id, title) => {
      financeReqId++
      set(s => {
        const transactions = s.transactions.map(t => t.id === id ? { ...t, title } : t)
        const monoTransactions = s.monoTransactions.map(t => t.id === id ? { ...t, title } : t)
        writeCache(transactions, s.balance)
        return { transactions, monoTransactions }
      })
    },

    patchTransaction: async (id, patch) => {
      const s = get()
      const tx = s.transactions.find(t => t.id === id) ?? s.monoTransactions.find(t => t.id === id)
      if (!tx) return
      const mono = tx.walletId === 'mono'
      const prevAmount = tx.amount
      const nextAmount = patch.amount ?? prevAmount
      // Mono edits never touch the main balance
      const delta = mono ? 0 : tx.type === 'topup'
        ? nextAmount - prevAmount
        : prevAmount - nextAmount
      const prev = { description: tx.description, amount: tx.amount, title: tx.title }
      const apply = (p: object, d: number) => set(s2 => {
        const transactions = mono ? s2.transactions : s2.transactions.map(t => t.id === id ? { ...t, ...p } : t)
        const monoTransactions = mono ? s2.monoTransactions.map(t => t.id === id ? { ...t, ...p } : t) : s2.monoTransactions
        const balance = s2.balance + d
        if (!mono) writeCache(transactions, balance)
        return { balance, transactions, monoTransactions }
      })
      financeReqId++
      apply(patch, delta)
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
        financeReqId++
        apply(prev, -delta)
      }
    },

    tagTripExpenses: (ids, tripMemoryId) => {
      financeReqId++
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
      const tx = s.transactions.find(t => t.id === id) ?? s.monoTransactions.find(t => t.id === id)
      if (!tx) return
      const mono = tx.walletId === 'mono'
      const delta = mono ? 0 : tx.type === 'topup' ? -tx.amount : tx.amount
      financeReqId++
      if (mono) {
        set({ monoTransactions: s.monoTransactions.filter(t => t.id !== id), syncStatus: 'syncing' })
      } else {
        const transactions = s.transactions.filter(t => t.id !== id)
        const balance = s.balance + delta
        writeCache(transactions, balance)
        set({ balance, transactions, syncStatus: 'syncing' })
      }
      authFetch(`/api/transactions/${id}`, { method: 'DELETE' })
        .then(r => { if (!r.ok) throw new Error() })
        .then(() => set({ syncStatus: 'synced' }))
        .catch(() => {
          financeReqId++
          const byDateDesc = (a: Transaction, b: Transaction) => new Date(b.date).getTime() - new Date(a.date).getTime()
          set(s2 => {
            if (mono) return { monoTransactions: [tx, ...s2.monoTransactions].sort(byDateDesc), syncStatus: 'error' as SyncStatus }
            const restored = [tx, ...s2.transactions].sort(byDateDesc)
            const restoredBalance = s2.balance - delta
            writeCache(restored, restoredBalance)
            return { balance: restoredBalance, transactions: restored, syncStatus: 'error' as SyncStatus }
          })
        })
    },
  }
})
