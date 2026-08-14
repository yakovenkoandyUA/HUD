import { create } from 'zustand'
import { authFetch } from '@/shared/services/api'
import type { PlanId } from '@/shared/config/plans'

export interface PlanGroupMember {
  id: string
  name: string
  username: string
  avatarUrl: string | null
}

export interface PlanGroupInvite extends PlanGroupMember {
  inviteId: string
}

interface PlanGroupData {
  role: 'payer' | 'member' | 'none'
  plan?: PlanId
  seatsLimit?: number
  seatsUsed?: number
  members: PlanGroupMember[]
  pendingInvites: PlanGroupInvite[]
  receivedInvites: PlanGroupInvite[]
  payer?: PlanGroupMember
}

interface PlanGroupState extends PlanGroupData {
  loading: boolean
  fetchPlanGroup: () => Promise<void>
  invite: (identifier: string) => Promise<void>
  cancelInvite: (inviteId: string) => Promise<void>
  removeMember: (userId: string) => Promise<void>
  leaveGroup: () => Promise<void>
  acceptInvite: (inviteId: string) => Promise<void>
  declineInvite: (inviteId: string) => Promise<void>
}

const EMPTY: PlanGroupData = { role: 'none', members: [], pendingInvites: [], receivedInvites: [] }

export const usePlanGroupStore = create<PlanGroupState>()((set, get) => ({
  ...EMPTY,
  loading: false,

  fetchPlanGroup: async () => {
    set({ loading: true })
    try {
      const res = await authFetch('/api/plan-group')
      if (!res.ok) { set({ loading: false }); return }
      const data = await res.json() as Partial<PlanGroupData>
      set({ ...EMPTY, ...data, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  invite: async (identifier: string) => {
    const res = await authFetch('/api/plan-group/invite', {
      method: 'POST',
      body: JSON.stringify({ identifier }),
    })
    if (!res.ok) {
      const data = await res.json() as { error?: string; code?: string }
      const err = new Error(data.error ?? 'Не вдалося надіслати запрошення') as Error & { code?: string }
      err.code = data.code
      throw err
    }
    await get().fetchPlanGroup()
  },

  cancelInvite: async (inviteId: string) => {
    await authFetch(`/api/plan-group/invite/${inviteId}`, { method: 'DELETE' })
    set(s => ({ pendingInvites: s.pendingInvites.filter(i => i.inviteId !== inviteId) }))
  },

  removeMember: async (userId: string) => {
    await authFetch(`/api/plan-group/member/${userId}`, { method: 'DELETE' })
    set(s => ({ members: s.members.filter(m => m.id !== userId) }))
  },

  leaveGroup: async () => {
    await authFetch('/api/plan-group/leave', { method: 'POST' })
    set({ ...EMPTY })
  },

  acceptInvite: async (inviteId: string) => {
    const res = await authFetch(`/api/plan-group/invite/${inviteId}/accept`, { method: 'POST' })
    if (!res.ok) {
      const data = await res.json() as { error?: string; code?: string }
      const err = new Error(data.error ?? 'Не вдалося прийняти запрошення') as Error & { code?: string }
      err.code = data.code
      throw err
    }
    await get().fetchPlanGroup()
  },

  declineInvite: async (inviteId: string) => {
    await authFetch(`/api/plan-group/invite/${inviteId}/decline`, { method: 'POST' })
    set(s => ({ receivedInvites: s.receivedInvites.filter(i => i.inviteId !== inviteId) }))
  },
}))
