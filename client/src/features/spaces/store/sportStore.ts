import { create } from 'zustand'
import { authFetch } from '@/shared/services/api'
import type { SportProfile } from '@/features/memories/store/spacesStore'

export interface WorkoutMetric {
  name:  string
  value: string
  unit:  string
}

export interface SportEvent {
  _id:      string
  spaceId:  string
  userId:   string
  date:     string
  title:    string
  duration: number | null
  metrics:  WorkoutMetric[]
  notes:    string
  createdAt: string
}

export interface SportEventInput {
  date:      string
  title?:    string
  duration?: number | null
  metrics?:  WorkoutMetric[]
  notes?:    string
}

interface SportStore {
  eventsBySpace: Record<string, SportEvent[]>
  loading:       boolean

  fetchEvents:   (spaceId: string) => Promise<void>
  createEvent:   (spaceId: string, data: SportEventInput) => Promise<SportEvent>
  updateEvent:   (spaceId: string, eventId: string, data: Partial<SportEventInput>) => Promise<void>
  deleteEvent:   (spaceId: string, eventId: string) => Promise<void>
  updateProfile: (spaceId: string, data: Partial<SportProfile>) => Promise<SportProfile>
}

export const useSportStore = create<SportStore>((set) => ({
  eventsBySpace: {},
  loading:       false,

  fetchEvents: async (spaceId) => {
    set({ loading: true })
    try {
      const res = await authFetch(`/api/spaces/${spaceId}/sport/events`)
      if (!res.ok) return
      const data: SportEvent[] = await res.json()
      set(s => ({ eventsBySpace: { ...s.eventsBySpace, [spaceId]: data }, loading: false }))
    } catch {
      set({ loading: false })
    }
  },

  createEvent: async (spaceId, data) => {
    const res = await authFetch(`/api/spaces/${spaceId}/sport/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Create failed')
    const event: SportEvent = await res.json()
    set(s => ({
      eventsBySpace: {
        ...s.eventsBySpace,
        [spaceId]: [event, ...(s.eventsBySpace[spaceId] ?? [])],
      },
    }))
    return event
  },

  updateEvent: async (spaceId, eventId, data) => {
    const res = await authFetch(`/api/spaces/${spaceId}/sport/events/${eventId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) return
    const updated: SportEvent = await res.json()
    set(s => ({
      eventsBySpace: {
        ...s.eventsBySpace,
        [spaceId]: (s.eventsBySpace[spaceId] ?? []).map(e => e._id === eventId ? updated : e),
      },
    }))
  },

  deleteEvent: async (spaceId, eventId) => {
    set(s => ({
      eventsBySpace: {
        ...s.eventsBySpace,
        [spaceId]: (s.eventsBySpace[spaceId] ?? []).filter(e => e._id !== eventId),
      },
    }))
    await authFetch(`/api/spaces/${spaceId}/sport/events/${eventId}`, { method: 'DELETE' })
  },

  updateProfile: async (spaceId, data) => {
    const res = await authFetch(`/api/spaces/${spaceId}/sport/profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Update failed')
    return res.json() as Promise<SportProfile>
  },
}))
