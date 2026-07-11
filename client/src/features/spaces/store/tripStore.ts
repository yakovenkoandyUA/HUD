import { create } from 'zustand'
import { authFetch } from '@/shared/services/api'
import type { TripProfile } from '@/features/memories/store/spacesStore'

interface TripStore {
  updateProfile: (spaceId: string, data: Partial<TripProfile>) => Promise<TripProfile>
}

export const useTripStore = create<TripStore>(() => ({
  updateProfile: async (spaceId, data) => {
    const res = await authFetch(`/api/spaces/${spaceId}/trip/profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Update failed')
    return res.json() as Promise<TripProfile>
  },
}))
