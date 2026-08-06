import { create } from 'zustand'
import { authFetch } from '@/shared/services/api'
import type { VehicleProfile } from '@/features/memories/store/spacesStore'

export type VehicleEventType =
  | 'fuel'
  | 'maintenance'
  | 'repair'
  | 'inspection'
  | 'insurance'
  | 'tire_change'
  | 'document'
  | 'note'

export interface VehicleEvent {
  _id:          string
  spaceId:      string
  userId:       string
  type:         VehicleEventType
  date:         string
  mileage:      number | null
  cost:         number | null
  currency:     'UAH' | 'USD' | 'EUR'
  vendor:       string
  notes:        string
  attachments:  string[]
  liters:       number | null
  fuelType:     string
  docType:      string
  docExpiresAt: string | null
  createdAt:    string
}

export interface VehicleEventInput {
  type:          VehicleEventType
  date:          string
  mileage?:      number | null
  cost?:         number | null
  currency?:     'UAH' | 'USD' | 'EUR'
  vendor?:       string
  notes?:        string
  attachments?:  string[]
  liters?:       number | null
  fuelType?:     string
  docType?:      string
  docExpiresAt?: string | null
}

export interface VehicleStats {
  totalCostMonth:     number
  totalCostYear:      number
  avgFuelConsumption: number | null
  costPerKm:          number | null
  currentMileage:     number | null
  expiringDocs:       { docType: string; docExpiresAt: string }[]
}

interface VehicleStore {
  eventsBySpace: Record<string, VehicleEvent[]>
  statsBySpace:  Record<string, VehicleStats>
  loading:       boolean

  fetchEvents:        (spaceId: string) => Promise<void>
  fetchStats:         (spaceId: string) => Promise<void>
  createEvent:        (spaceId: string, data: VehicleEventInput) => Promise<VehicleEvent>
  updateEvent:        (spaceId: string, eventId: string, data: Partial<VehicleEventInput>) => Promise<void>
  deleteEvent:        (spaceId: string, eventId: string) => Promise<void>
  updateProfile:      (spaceId: string, data: Partial<VehicleProfile>) => Promise<VehicleProfile>
}

// Guards against a slow fetchEvents(spaceId) overwriting an event created/
// edited for that space while it was still in flight with stale data —
// keyed per spaceId so different spaces don't invalidate each other. See
// spacesStore.ts for the base pattern.
const vehicleReqIds = new Map<string, number>()
function bumpVehicleReqId(spaceId: string): number {
  const next = (vehicleReqIds.get(spaceId) ?? 0) + 1
  vehicleReqIds.set(spaceId, next)
  return next
}

export const useVehicleStore = create<VehicleStore>((set, get) => ({
  eventsBySpace: {},
  statsBySpace:  {},
  loading:       false,

  fetchEvents: async (spaceId) => {
    const reqId = bumpVehicleReqId(spaceId)
    set({ loading: true })
    try {
      const res = await authFetch(`/api/spaces/${spaceId}/vehicle/events`)
      if (!res.ok) return
      const events: VehicleEvent[] = await res.json()
      if (reqId !== vehicleReqIds.get(spaceId)) return // stale — dropped
      set(s => ({ eventsBySpace: { ...s.eventsBySpace, [spaceId]: events } }))
    } finally {
      set({ loading: false })
    }
  },

  fetchStats: async (spaceId) => {
    const res = await authFetch(`/api/spaces/${spaceId}/vehicle/stats`)
    if (!res.ok) return
    const stats: VehicleStats = await res.json()
    set(s => ({ statsBySpace: { ...s.statsBySpace, [spaceId]: stats } }))
  },

  createEvent: async (spaceId, data) => {
    const res = await authFetch(`/api/spaces/${spaceId}/vehicle/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Create failed')
    const event: VehicleEvent = await res.json()
    bumpVehicleReqId(spaceId)
    set(s => ({
      eventsBySpace: {
        ...s.eventsBySpace,
        [spaceId]: [event, ...(s.eventsBySpace[spaceId] ?? [])],
      },
    }))
    // refresh stats after new event
    get().fetchStats(spaceId)
    return event
  },

  updateEvent: async (spaceId, eventId, data) => {
    const res = await authFetch(`/api/spaces/${spaceId}/vehicle/events/${eventId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) return
    const updated: VehicleEvent = await res.json()
    bumpVehicleReqId(spaceId)
    set(s => ({
      eventsBySpace: {
        ...s.eventsBySpace,
        [spaceId]: (s.eventsBySpace[spaceId] ?? []).map(e => e._id === eventId ? updated : e),
      },
    }))
    get().fetchStats(spaceId)
  },

  deleteEvent: async (spaceId, eventId) => {
    bumpVehicleReqId(spaceId)
    set(s => ({
      eventsBySpace: {
        ...s.eventsBySpace,
        [spaceId]: (s.eventsBySpace[spaceId] ?? []).filter(e => e._id !== eventId),
      },
    }))
    await authFetch(`/api/spaces/${spaceId}/vehicle/events/${eventId}`, { method: 'DELETE' })
    get().fetchStats(spaceId)
  },

  updateProfile: async (spaceId, data) => {
    const res = await authFetch(`/api/spaces/${spaceId}/vehicle/profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Update failed')
    return res.json() as Promise<VehicleProfile>
  },
}))
