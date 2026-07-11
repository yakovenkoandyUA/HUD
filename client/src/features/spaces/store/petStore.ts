import { create } from 'zustand'
import { authFetch } from '@/shared/services/api'
import type { PetProfile } from '@/features/memories/store/spacesStore'

export type PetEventType =
  | 'vet_visit'
  | 'vaccination'
  | 'medication'
  | 'grooming'
  | 'weight'
  | 'note'

export interface PetEvent {
  _id:            string
  spaceId:        string
  userId:         string
  type:           PetEventType
  date:           string
  title:          string
  cost:           number | null
  currency:       'UAH' | 'USD' | 'EUR'
  clinic:         string
  notes:          string
  attachments:    string[]
  nextDue:        string | null
  weight:         number | null
  medicationName: string
  createdAt:      string
}

export interface PetEventInput {
  type:            PetEventType
  date:            string
  title?:          string
  cost?:           number | null
  currency?:       'UAH' | 'USD' | 'EUR'
  clinic?:         string
  notes?:          string
  attachments?:    string[]
  nextDue?:        string | null
  weight?:         number | null
  medicationName?: string
}

interface PetStore {
  eventsBySpace: Record<string, PetEvent[]>
  loading:       boolean

  fetchEvents:   (spaceId: string) => Promise<void>
  createEvent:   (spaceId: string, data: PetEventInput) => Promise<PetEvent>
  updateEvent:   (spaceId: string, eventId: string, data: Partial<PetEventInput>) => Promise<void>
  deleteEvent:   (spaceId: string, eventId: string) => Promise<void>
  updateProfile: (spaceId: string, data: Partial<PetProfile>) => Promise<PetProfile>
}

export const usePetStore = create<PetStore>((set) => ({
  eventsBySpace: {},
  loading:       false,

  fetchEvents: async (spaceId) => {
    set({ loading: true })
    try {
      const res = await authFetch(`/api/spaces/${spaceId}/pet/events`)
      if (!res.ok) return
      const events: PetEvent[] = await res.json()
      set(s => ({ eventsBySpace: { ...s.eventsBySpace, [spaceId]: events } }))
    } finally {
      set({ loading: false })
    }
  },

  createEvent: async (spaceId, data) => {
    const res = await authFetch(`/api/spaces/${spaceId}/pet/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Create failed')
    const event: PetEvent = await res.json()
    set(s => ({
      eventsBySpace: {
        ...s.eventsBySpace,
        [spaceId]: [event, ...(s.eventsBySpace[spaceId] ?? [])],
      },
    }))
    return event
  },

  updateEvent: async (spaceId, eventId, data) => {
    const res = await authFetch(`/api/spaces/${spaceId}/pet/events/${eventId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) return
    const updated: PetEvent = await res.json()
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
    await authFetch(`/api/spaces/${spaceId}/pet/events/${eventId}`, { method: 'DELETE' })
  },

  updateProfile: async (spaceId, data) => {
    const res = await authFetch(`/api/spaces/${spaceId}/pet/profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Update failed')
    return res.json() as Promise<PetProfile>
  },
}))
