import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authFetch } from '@/shared/services/api'
import type { PlantProfile } from '@/features/memories/store/spacesStore'

export type PlantEventType = 'watering' | 'fertilizing' | 'repotting' | 'pruning' | 'treatment' | 'note'

export interface PlantEvent {
  _id:       string
  spaceId:   string
  userId:    string
  type:      PlantEventType
  date:      string
  notes:     string
  createdAt: string
}

export interface PlantEventInput {
  type:   PlantEventType
  date:   string
  notes?: string
}

export interface HealthIssue {
  name:        string
  probability: number
  treatment?:  string
}

export interface HealthResult {
  checkedAt:         string
  isHealthy:         boolean
  healthProbability: number
  issues:            HealthIssue[]
}

interface PlantEventStore {
  eventsBySpace:      Record<string, PlantEvent[]>
  healthChecksBySpace: Record<string, HealthResult>
  loading:            boolean

  fetchEvents:     (spaceId: string) => Promise<void>
  createEvent:     (spaceId: string, data: PlantEventInput) => Promise<PlantEvent>
  updateEvent:     (spaceId: string, eventId: string, data: Partial<PlantEventInput>) => Promise<void>
  deleteEvent:     (spaceId: string, eventId: string) => Promise<void>
  updateProfile:   (spaceId: string, data: Partial<PlantProfile>) => Promise<PlantProfile>
  saveHealthCheck: (spaceId: string, result: HealthResult) => void
}

// Guards against a slow fetchEvents(spaceId) overwriting an event created/
// edited for that space while it was still in flight with stale data —
// keyed per spaceId. See spacesStore.ts for the base pattern.
const plantEventReqIds = new Map<string, number>()
function bumpPlantEventReqId(spaceId: string): number {
  const next = (plantEventReqIds.get(spaceId) ?? 0) + 1
  plantEventReqIds.set(spaceId, next)
  return next
}

export const usePlantEventStore = create<PlantEventStore>()(
  persist(
    (set) => ({
  eventsBySpace:       {},
  healthChecksBySpace: {},
  loading:             false,

  fetchEvents: async (spaceId) => {
    const reqId = bumpPlantEventReqId(spaceId)
    set({ loading: true })
    try {
      const res = await authFetch(`/api/spaces/${spaceId}/plant/events`)
      if (!res.ok) return
      const events: PlantEvent[] = await res.json()
      if (reqId !== plantEventReqIds.get(spaceId)) return // stale — dropped
      set(s => ({ eventsBySpace: { ...s.eventsBySpace, [spaceId]: events } }))
    } finally {
      set({ loading: false })
    }
  },

  createEvent: async (spaceId, data) => {
    const res = await authFetch(`/api/spaces/${spaceId}/plant/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Create failed')
    const event: PlantEvent = await res.json()
    bumpPlantEventReqId(spaceId)
    set(s => ({
      eventsBySpace: {
        ...s.eventsBySpace,
        [spaceId]: [event, ...(s.eventsBySpace[spaceId] ?? [])],
      },
    }))
    return event
  },

  updateEvent: async (spaceId, eventId, data) => {
    const res = await authFetch(`/api/spaces/${spaceId}/plant/events/${eventId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) return
    const updated: PlantEvent = await res.json()
    bumpPlantEventReqId(spaceId)
    set(s => ({
      eventsBySpace: {
        ...s.eventsBySpace,
        [spaceId]: (s.eventsBySpace[spaceId] ?? []).map(e => e._id === eventId ? updated : e),
      },
    }))
  },

  deleteEvent: async (spaceId, eventId) => {
    bumpPlantEventReqId(spaceId)
    set(s => ({
      eventsBySpace: {
        ...s.eventsBySpace,
        [spaceId]: (s.eventsBySpace[spaceId] ?? []).filter(e => e._id !== eventId),
      },
    }))
    await authFetch(`/api/spaces/${spaceId}/plant/events/${eventId}`, { method: 'DELETE' })
  },

  updateProfile: async (spaceId, data) => {
    const res = await authFetch(`/api/spaces/${spaceId}/plant/profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Update failed')
    return res.json() as Promise<PlantProfile>
  },

  saveHealthCheck: (spaceId, result) => {
    set(s => ({ healthChecksBySpace: { ...s.healthChecksBySpace, [spaceId]: result } }))
  },
}),
    {
      name: 'plant-health-storage',
      partialize: (s) => ({ healthChecksBySpace: s.healthChecksBySpace }),
    }
  )
)
