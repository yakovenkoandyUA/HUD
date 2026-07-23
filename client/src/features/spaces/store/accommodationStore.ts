import { create } from 'zustand'
import { authFetch } from '@/shared/services/api'

export interface Accommodation {
  _id:         string
  spaceId:     string
  name:        string
  address:     string
  checkIn:     string
  checkOut:    string
  bookingCode: string
  contactInfo: string
  link:        string
  price:       number | null
  currency:    'UAH' | 'USD' | 'EUR'
  notes:       string
  createdAt:   string
}

interface AccommodationStore {
  items:  Record<string, Accommodation[]>
  load:   (spaceId: string) => Promise<void>
  create: (spaceId: string, data: Partial<Accommodation>) => Promise<Accommodation>
  update: (spaceId: string, itemId: string, data: Partial<Accommodation>) => Promise<Accommodation>
  remove: (spaceId: string, itemId: string) => Promise<void>
}

export const useAccommodationStore = create<AccommodationStore>((set) => ({
  items: {},

  load: async (spaceId) => {
    const res = await authFetch(`/api/spaces/${spaceId}/accommodations`)
    if (!res.ok) return
    const data = await res.json() as Accommodation[]
    set(s => ({ items: { ...s.items, [spaceId]: data } }))
  },

  create: async (spaceId, data) => {
    const res = await authFetch(`/api/spaces/${spaceId}/accommodations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Create failed')
    const item = await res.json() as Accommodation
    set(s => ({
      items: {
        ...s.items,
        [spaceId]: [...(s.items[spaceId] ?? []), item],
      },
    }))
    return item
  },

  update: async (spaceId, itemId, data) => {
    const res = await authFetch(`/api/spaces/${spaceId}/accommodations/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Update failed')
    const updated = await res.json() as Accommodation
    set(s => ({
      items: {
        ...s.items,
        [spaceId]: (s.items[spaceId] ?? []).map(i => i._id === itemId ? updated : i),
      },
    }))
    return updated
  },

  remove: async (spaceId, itemId) => {
    const res = await authFetch(`/api/spaces/${spaceId}/accommodations/${itemId}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Delete failed')
    set(s => ({
      items: {
        ...s.items,
        [spaceId]: (s.items[spaceId] ?? []).filter(i => i._id !== itemId),
      },
    }))
  },
}))
