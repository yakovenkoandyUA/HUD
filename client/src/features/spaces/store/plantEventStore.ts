import { create } from 'zustand'
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

interface PlantEventStore {
  eventsBySpace: Record<string, PlantEvent[]>
  loading:       boolean

  fetchEvents:   (spaceId: string) => Promise<void>
  createEvent:   (spaceId: string, data: PlantEventInput) => Promise<PlantEvent>
  deleteEvent:   (spaceId: string, eventId: string) => Promise<void>
  updateProfile: (spaceId: string, data: Partial<PlantProfile>) => Promise<PlantProfile>
}

export const usePlantEventStore = create<PlantEventStore>((set) => ({
  eventsBySpace: {},
  loading:       false,

  fetchEvents: async (spaceId) => {
    set({ loading: true })
    try {
      const res = await authFetch(`/api/spaces/${spaceId}/plant/events`)
      if (!res.ok) return
      const events: PlantEvent[] = await res.json()
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
    set(s => ({
      eventsBySpace: {
        ...s.eventsBySpace,
        [spaceId]: [event, ...(s.eventsBySpace[spaceId] ?? [])],
      },
    }))
    return event
  },

  deleteEvent: async (spaceId, eventId) => {
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
}))
