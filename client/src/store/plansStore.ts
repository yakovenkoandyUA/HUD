import { create } from 'zustand'
import { authFetch, getToken } from '../services/api'

export interface PlanLocation {
  name:    string | null
  address: string | null
  lat:     number | null
  lng:     number | null
}

export interface PlanPhoto {
  _id:       string
  url:       string
  caption:   string
  createdAt: string
}

export interface Plan {
  _id:          string
  userId:       string
  title:        string
  location:     PlanLocation
  withProfiles: string[]
  notes:        string
  photos:       PlanPhoto[]
  status:       'want' | 'planned' | 'visited'
  plannedDate:  string | null
  visitedDate:  string | null
  memoryId:     string | null
  createdAt:    string
  spaceId:      string | null
}

export type PlanInput = Omit<Plan, '_id' | 'userId' | 'createdAt'> & { spaceId?: string | null }

interface PlansStore {
  plans:       Plan[]
  loading:     boolean
  fetchPlans:  () => Promise<void>
  addPlan:     (data: PlanInput) => Promise<void>
  updatePlan:  (id: string, changes: Partial<PlanInput>) => Promise<void>
  deletePlan:  (id: string) => Promise<void>
  addPhoto:    (id: string, url: string, caption?: string) => Promise<void>
}

export const usePlansStore = create<PlansStore>((set, get) => ({
  plans:   [],
  loading: false,

  fetchPlans: async () => {
    if (!getToken()) return
    set({ loading: true })
    try {
      const r = await authFetch('/api/plans')
      if (r.ok) set({ plans: await r.json() })
    } catch { /* silent */ }
    finally { set({ loading: false }) }
  },

  addPlan: async (data) => {
    const tempId = `temp_${Date.now()}`
    const temp: Plan = {
      ...data,
      _id:      tempId,
      userId:   '',
      createdAt: new Date().toISOString(),
    }
    set(s => ({ plans: [temp, ...s.plans] }))
    try {
      const r = await authFetch('/api/plans', {
        method: 'POST',
        body:   JSON.stringify(data),
      })
      if (r.ok) {
        const saved: Plan = await r.json()
        set(s => ({ plans: s.plans.map(p => p._id === tempId ? saved : p) }))
      }
    } catch {
      set(s => ({ plans: s.plans.filter(p => p._id !== tempId) }))
    }
  },

  updatePlan: async (id, changes) => {
    set(s => ({ plans: s.plans.map(p => p._id === id ? { ...p, ...changes } : p) }))
    try {
      await authFetch(`/api/plans/${id}`, {
        method: 'PATCH',
        body:   JSON.stringify(changes),
      })
    } catch {
      get().fetchPlans()
    }
  },

  deletePlan: async (id) => {
    set(s => ({ plans: s.plans.filter(p => p._id !== id) }))
    await authFetch(`/api/plans/${id}`, { method: 'DELETE' })
  },

  addPhoto: async (id, url, caption = '') => {
    try {
      const r = await authFetch(`/api/plans/${id}/photos`, {
        method: 'POST',
        body:   JSON.stringify({ url, caption }),
      })
      if (r.ok) {
        const updated: Plan = await r.json()
        set(s => ({ plans: s.plans.map(p => p._id === id ? updated : p) }))
      }
    } catch { /* silent */ }
  },
}))
