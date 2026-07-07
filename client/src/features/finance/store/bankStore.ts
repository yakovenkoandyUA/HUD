import { create } from 'zustand'
import { authFetch } from '@/shared/services/api'

export interface BankConnection {
  bank: 'monobank'
  accountName: string
  accountId: string
  lastSync: string | null
  enabled: boolean
}

interface BankState {
  connection:   BankConnection | null
  loading:      boolean
  syncing:      boolean
  importing:    boolean
  // OAuth-like Monobank auth flow state
  authPending:        boolean
  authTokenRequestId: string | null
  authAcceptUrl:      string | null

  fetchStatus:    () => Promise<void>
  connect:        (token: string) => Promise<void>
  disconnect:     () => Promise<void>
  sync:           () => Promise<{ imported: number }>
  importCsv:      (csv: string) => Promise<{ imported: number }>
  recategorize:   () => Promise<{ updated: number; skipped: number }>
  initMonoAuth:   () => Promise<void>
  cancelMonoAuth: () => void
  pollMonoAuth:   (tokenRequestId: string) => Promise<boolean>
}

export const useBankStore = create<BankState>((set, get) => ({
  connection:         null,
  loading:            false,
  syncing:            false,
  importing:          false,
  authPending:        false,
  authTokenRequestId: null,
  authAcceptUrl:      null,

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

  recategorize: async () => {
    const res = await authFetch('/api/bank/recategorize', { method: 'POST' })
    if (!res.ok) {
      const { error } = await res.json() as { error: string }
      throw new Error(error)
    }
    return await res.json() as { updated: number; skipped: number }
  },

  initMonoAuth: async () => {
    set({ authPending: true, authTokenRequestId: null, authAcceptUrl: null })
    try {
      const res = await authFetch('/api/bank/mono-auth-init', { method: 'POST' })
      if (!res.ok) {
        const { error } = await res.json() as { error: string }
        throw new Error(error)
      }
      const { tokenRequestId, acceptUrl } = await res.json() as { tokenRequestId: string; acceptUrl: string }
      set({ authTokenRequestId: tokenRequestId, authAcceptUrl: acceptUrl })
    } catch {
      set({ authPending: false })
      throw new Error('Не вдалось ініціювати підключення до Monobank')
    }
  },

  cancelMonoAuth: () => {
    set({ authPending: false, authTokenRequestId: null, authAcceptUrl: null })
  },

  pollMonoAuth: async (tokenRequestId: string) => {
    const res = await authFetch(`/api/bank/mono-auth-status/${tokenRequestId}`)
    if (!res.ok) return false
    const { pending } = await res.json() as { pending: boolean }
    if (!pending) {
      set({ authPending: false, authTokenRequestId: null, authAcceptUrl: null })
      await get().fetchStatus()
      return true
    }
    return false
  },
}))
