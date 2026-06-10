import { create } from 'zustand'
import { authFetch } from '../services/api'

export interface FamilyMember {
  id: string
  name: string
  username: string
  avatarUrl: string | null
}

export interface FamilyLink {
  linkId: string
  id: string
  name: string
  username: string
  avatarUrl: string | null
}

interface FamilyState {
  accepted: FamilyLink[]
  pendingSent: FamilyLink[]
  pendingReceived: FamilyLink[]
  searchResults: FamilyMember[]
  loading: boolean

  fetchFamily: () => Promise<void>
  searchUsers: (q: string) => Promise<void>
  sendRequest: (targetUserId: string) => Promise<void>
  acceptRequest: (linkId: string) => Promise<void>
  removeLink: (linkId: string) => Promise<void>
  clearSearch: () => void
}

/**
 * familyStore
 * -----------
 * Управління сімейними звʼязками між профілями.
 * Accepted — спільні спогади і watchTogether.
 */
export const useFamilyStore = create<FamilyState>()((set, get) => ({
  accepted: [],
  pendingSent: [],
  pendingReceived: [],
  searchResults: [],
  loading: false,

  fetchFamily: async () => {
    try {
      const res = await authFetch('/api/family')
      if (!res.ok) return
      const data = await res.json() as { accepted: FamilyLink[]; pendingSent: FamilyLink[]; pendingReceived: FamilyLink[] }
      set({ accepted: data.accepted, pendingSent: data.pendingSent, pendingReceived: data.pendingReceived })
    } catch { /* offline */ }
  },

  searchUsers: async (q: string) => {
    if (!q.trim()) { set({ searchResults: [] }); return }
    try {
      const res = await authFetch(`/api/family/search?q=${encodeURIComponent(q)}`)
      if (!res.ok) return
      const data = await res.json() as FamilyMember[]
      set({ searchResults: data })
    } catch { /* noop */ }
  },

  sendRequest: async (targetUserId: string) => {
    const res = await authFetch('/api/family/request', {
      method: 'POST',
      body: JSON.stringify({ targetUserId }),
    })
    if (!res.ok) {
      const data = await res.json() as { error?: string }
      throw new Error(data.error ?? 'Помилка відправки запиту')
    }
    await get().fetchFamily()
  },

  acceptRequest: async (linkId: string) => {
    const res = await authFetch(`/api/family/accept/${linkId}`, { method: 'POST' })
    if (!res.ok) throw new Error('Помилка підтвердження')
    await get().fetchFamily()
  },

  removeLink: async (linkId: string) => {
    await authFetch(`/api/family/${linkId}`, { method: 'DELETE' })
    set(s => ({
      accepted: s.accepted.filter(l => l.linkId !== linkId),
      pendingSent: s.pendingSent.filter(l => l.linkId !== linkId),
      pendingReceived: s.pendingReceived.filter(l => l.linkId !== linkId),
    }))
  },

  clearSearch: () => set({ searchResults: [] }),
}))
