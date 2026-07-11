import { create } from 'zustand'
import { authFetch } from '@/shared/services/api'
import type { HomeProfile } from '@/features/memories/store/spacesStore'

export type HomeEventType =
  | 'repair'
  | 'payment'
  | 'purchase'
  | 'document'
  | 'inspection'
  | 'note'
  | 'photo'

export interface HomeEvent {
  _id:           string
  spaceId:       string
  userId:        string
  type:          HomeEventType
  date:          string
  title:         string
  cost:          number | null
  currency:      'UAH' | 'USD' | 'EUR'
  vendor:        string
  notes:         string
  attachments:   string[]
  warrantyUntil: string | null
  docType:       string
  docExpiresAt:  string | null
  createdAt:     string
}

export interface HomeEventInput {
  type:           HomeEventType
  date:           string
  title?:         string
  cost?:          number | null
  currency?:      'UAH' | 'USD' | 'EUR'
  vendor?:        string
  notes?:         string
  attachments?:   string[]
  warrantyUntil?: string | null
  docType?:       string
  docExpiresAt?:  string | null
}

interface HomeStore {
  eventsBySpace: Record<string, HomeEvent[]>
  loading:       boolean

  fetchEvents:   (spaceId: string) => Promise<void>
  createEvent:   (spaceId: string, data: HomeEventInput) => Promise<HomeEvent>
  updateEvent:   (spaceId: string, eventId: string, data: Partial<HomeEventInput>) => Promise<void>
  deleteEvent:   (spaceId: string, eventId: string) => Promise<void>
  updateProfile: (spaceId: string, data: Partial<HomeProfile>) => Promise<HomeProfile>
}

export const useHomeStore = create<HomeStore>((set) => ({
  eventsBySpace: {},
  loading:       false,

  fetchEvents: async (spaceId) => {
    set({ loading: true })
    try {
      const res = await authFetch(`/api/spaces/${spaceId}/home/events`)
      if (!res.ok) return
      const events: HomeEvent[] = await res.json()
      set(s => ({ eventsBySpace: { ...s.eventsBySpace, [spaceId]: events } }))
    } finally {
      set({ loading: false })
    }
  },

  createEvent: async (spaceId, data) => {
    const res = await authFetch(`/api/spaces/${spaceId}/home/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Create failed')
    const event: HomeEvent = await res.json()
    set(s => ({
      eventsBySpace: {
        ...s.eventsBySpace,
        [spaceId]: [event, ...(s.eventsBySpace[spaceId] ?? [])],
      },
    }))
    return event
  },

  updateEvent: async (spaceId, eventId, data) => {
    const res = await authFetch(`/api/spaces/${spaceId}/home/events/${eventId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) return
    const updated: HomeEvent = await res.json()
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
    await authFetch(`/api/spaces/${spaceId}/home/events/${eventId}`, { method: 'DELETE' })
  },

  updateProfile: async (spaceId, data) => {
    const res = await authFetch(`/api/spaces/${spaceId}/home/profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Update failed')
    return res.json() as Promise<HomeProfile>
  },
}))
