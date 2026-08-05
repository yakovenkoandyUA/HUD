import { create } from 'zustand'
import { authFetch } from '@/shared/services/api'

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
  relationshipType: string | null
}

interface FamilyState {
  accepted: FamilyLink[]
  pendingSent: FamilyLink[]
  pendingReceived: FamilyLink[]
  searchResults: FamilyMember[]
  loading: boolean

  fetchFamily: () => Promise<void>
  searchUsers: (q: string) => Promise<void>
  sendRequest: (targetUserId: string, relationshipType: string) => Promise<void>
  acceptRequest: (linkId: string) => Promise<void>
  removeLink: (linkId: string) => Promise<void>
  clearSearch: () => void
}

// Guards against a slow fetchFamily() (called on mount from 10+ components —
// spaces, profile, SpacesTab, FamilyTab, MeFamily, recipes, sprint modals,
// memories, watchlist) overwriting a link removed while it was still in
// flight with stale data — see spacesStore.ts for the same pattern.
let familyReqId = 0

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
    const reqId = ++familyReqId
    try {
      const res = await authFetch('/api/family')
      if (!res.ok) return
      const data = await res.json() as { accepted: FamilyLink[]; pendingSent: FamilyLink[]; pendingReceived: FamilyLink[] }
      if (reqId !== familyReqId) return // a mutation happened while this was in flight — stale, drop it
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

  sendRequest: async (targetUserId: string, relationshipType: string) => {
    const res = await authFetch('/api/family/request', {
      method: 'POST',
      body: JSON.stringify({ targetUserId, relationshipType }),
    })
    if (!res.ok) {
      const data = await res.json() as { error?: string; code?: string }
      const err = new Error(data.error ?? 'Помилка відправки запиту') as Error & { code?: string }
      err.code = data.code
      throw err
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
    familyReqId++
    set(s => ({
      accepted: s.accepted.filter(l => l.linkId !== linkId),
      pendingSent: s.pendingSent.filter(l => l.linkId !== linkId),
      pendingReceived: s.pendingReceived.filter(l => l.linkId !== linkId),
    }))
  },

  clearSearch: () => set({ searchResults: [] }),
}))
