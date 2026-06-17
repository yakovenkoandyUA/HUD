import { create } from 'zustand'
import { authFetch } from '../services/api'

export interface BankConnection {
  bank: 'monobank'
  accountName: string
  accountId: string
  lastSync: string | null
  enabled: boolean
}

interface BankState {
  connection: BankConnection | null
  loading: boolean
  syncing: boolean
  importing: boolean

  fetchStatus: () => Promise<void>
  connect: (token: string) => Promise<void>
  disconnect: () => Promise<void>
  sync: () => Promise<{ imported: number }>
  importCsv: (csv: string) => Promise<{ imported: number }>
}

export const useBankStore = create<BankState>((set) => ({
  connection: null,
  loading: false,
  syncing: false,
  importing: false,

  fetchStatus: async () => {
    set({ loading: true })
    try {
      const res = await authFetch('/api/bank/status')
      if (res.ok) {
        const data = await res.json() as BankConnection | null
        set({ connection: data })
      }
    } finally {
      set({ loading: false })
    }
  },

  connect: async (token: string) => {
    const res = await authFetch('/api/bank/connect', {
      method: 'POST',
      body: JSON.stringify({ token }),
    })
    if (!res.ok) {
      const { error } = await res.json() as { error: string }
      throw new Error(error)
    }
    const data = await res.json() as BankConnection
    set({ connection: data })
  },

  disconnect: async () => {
    await authFetch('/api/bank/disconnect', { method: 'DELETE' })
    set({ connection: null })
  },

  sync: async () => {
    set({ syncing: true })
    try {
      const res = await authFetch('/api/bank/sync', { method: 'POST' })
      if (!res.ok) {
        const { error } = await res.json() as { error: string }
        throw new Error(error)
      }
      const data = await res.json() as { imported: number; lastSync: string }
      set(s => s.connection ? { connection: { ...s.connection, lastSync: data.lastSync } } : {})
      return { imported: data.imported }
    } finally {
      set({ syncing: false })
    }
  },

  importCsv: async (csv: string) => {
    set({ importing: true })
    try {
      const res = await authFetch('/api/bank/import-csv', {
        method: 'POST',
        body: JSON.stringify({ csv }),
      })
      if (!res.ok) {
        const { error } = await res.json() as { error: string }
        throw new Error(error)
      }
      return await res.json() as { imported: number }
    } finally {
      set({ importing: false })
    }
  },
}))
