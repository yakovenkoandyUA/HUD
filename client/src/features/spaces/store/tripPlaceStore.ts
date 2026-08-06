import { create } from 'zustand'
import { authFetch } from '@/shared/services/api'

export type TripPlaceCategory = 'museum' | 'restaurant' | 'cafe' | 'park' | 'shop' | 'viewpoint' | 'hotel' | 'other'

export interface TripPlace {
  _id:       string
  spaceId:   string
  name:      string
  category:  TripPlaceCategory
  address:   string
  notes:     string
  visitDate: string
  createdAt: string
}

interface TripPlaceStore {
  places: Record<string, TripPlace[]>
  load:   (spaceId: string) => Promise<void>
  create: (spaceId: string, data: Partial<TripPlace>) => Promise<TripPlace>
  update: (spaceId: string, placeId: string, data: Partial<TripPlace>) => Promise<TripPlace>
  remove: (spaceId: string, placeId: string) => Promise<void>
}

// Guards against a slow load(spaceId) overwriting a place created/edited
// for that space while it was still in flight with stale data — keyed per
// spaceId. See spacesStore.ts for the base pattern.
const tripPlaceReqIds = new Map<string, number>()
function bumpTripPlaceReqId(spaceId: string): number {
  const next = (tripPlaceReqIds.get(spaceId) ?? 0) + 1
  tripPlaceReqIds.set(spaceId, next)
  return next
}

export const useTripPlaceStore = create<TripPlaceStore>((set) => ({
  places: {},

  load: async (spaceId) => {
    const reqId = bumpTripPlaceReqId(spaceId)
    const res = await authFetch(`/api/spaces/${spaceId}/places`)
    if (!res.ok) return
    const data = await res.json() as TripPlace[]
    if (reqId !== tripPlaceReqIds.get(spaceId)) return // stale — dropped
    set(s => ({ places: { ...s.places, [spaceId]: data } }))
  },

  create: async (spaceId, data) => {
    const res = await authFetch(`/api/spaces/${spaceId}/places`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Create failed')
    const place = await res.json() as TripPlace
    bumpTripPlaceReqId(spaceId)
    set(s => ({
      places: {
        ...s.places,
        [spaceId]: [place, ...(s.places[spaceId] ?? [])],
      },
    }))
    return place
  },

  update: async (spaceId, placeId, data) => {
    const res = await authFetch(`/api/spaces/${spaceId}/places/${placeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Update failed')
    const updated = await res.json() as TripPlace
    bumpTripPlaceReqId(spaceId)
    set(s => ({
      places: {
        ...s.places,
        [spaceId]: (s.places[spaceId] ?? []).map(p => p._id === placeId ? updated : p),
      },
    }))
    return updated
  },

  remove: async (spaceId, placeId) => {
    const res = await authFetch(`/api/spaces/${spaceId}/places/${placeId}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Delete failed')
    bumpTripPlaceReqId(spaceId)
    set(s => ({
      places: {
        ...s.places,
        [spaceId]: (s.places[spaceId] ?? []).filter(p => p._id !== placeId),
      },
    }))
  },
}))
