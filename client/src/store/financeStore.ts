import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Transaction } from '../types'

interface FinanceState {
  balance: number
  transactions: Transaction[]
  addTopup: (amount: number, description: string) => void
  addExpense: (amount: number, description: string) => void
  deleteTransaction: (id: string) => void
}

export const useFinanceStore = create<FinanceState>()(
  persist(
    (set) => ({
      balance: 0,
      transactions: [],

      addTopup: (amount, description) =>
        set((s) => ({
          balance: s.balance + amount,
          transactions: [
            { id: crypto.randomUUID(), type: 'topup' as const, amount, description, date: new Date().toISOString() },
            ...s.transactions,
          ].slice(0, 100),
        })),

      addExpense: (amount, description) =>
        set((s) => ({
          balance: s.balance - amount,
          transactions: [
            { id: crypto.randomUUID(), type: 'expense' as const, amount, description, date: new Date().toISOString() },
            ...s.transactions,
          ].slice(0, 100),
        })),

      deleteTransaction: (id) =>
        set((s) => {
          const t = s.transactions.find((tx) => tx.id === id)
          if (!t) return s
          const delta = t.type === 'topup' ? -t.amount : t.amount
          return {
            balance: s.balance + delta,
            transactions: s.transactions.filter((tx) => tx.id !== id),
          }
        }),
    }),
    { name: 'hud-finance' }
  )
)
