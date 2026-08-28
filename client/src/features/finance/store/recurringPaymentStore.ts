import { create } from 'zustand'
import { authFetch } from '@/shared/services/api'

export type RecurringCurrency = 'UAH' | 'USD' | 'EUR'

export interface RecurringPayment {
  _id: string
  name: string
  amount: number
  amountForeign?: number | null
  currency?: RecurringCurrency
  dayOfMonth: number
  category: string
  isActive: boolean
  reminderDays?: number[]
  lastConfirmedMonth?: string
}

const CACHE_KEY = 'hud-recurring-v1'
const CACHE_TTL = 5 * 60 * 1000

function readCache(): RecurringPayment[] | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const { data, ts } = JSON.parse(raw)
    if (Date.now() - ts > CACHE_TTL) return null
    return data
  } catch { return null }
}

function writeCache(data: RecurringPayment[]): void {
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() })) } catch { /* quota */ }
}

interface RecurringPaymentState {
  payments: RecurringPayment[]
  loading:  boolean

  fetchPayments:  () => Promise<void>
  setPayments:    (payments: RecurringPayment[]) => void
  updatePayment:  (id: string, patch: Partial<RecurringPayment>) => void
}

export const useRecurringPaymentStore = create<RecurringPaymentState>((set, get) => ({
  payments: readCache() ?? [],
  loading:  readCache() === null,

  fetchPayments: async () => {
    try {
      const r = await authFetch('/api/recurring')
      if (r.ok) {
        const data: RecurringPayment[] = await r.json()
        set({ payments: data })
        writeCache(data)
      }
    } catch { /* silent */ } finally {
      set({ loading: false })
    }
  },

  setPayments: (payments) => {
    set({ payments })
    writeCache(payments)
  },

  updatePayment: (id, patch) => {
    const updated = get().payments.map(p => p._id === id ? { ...p, ...patch } : p)
    set({ payments: updated })
    writeCache(updated)
  },
}))
