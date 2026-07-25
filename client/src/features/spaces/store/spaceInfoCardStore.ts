import { create } from 'zustand'
import { authFetch } from '@/shared/services/api'

export type InfoCardIconType = 'link' | 'phone' | 'address' | 'email' | 'text' | 'wifi' | 'code'

export interface SpaceInfoCard {
  _id:      string
  spaceId:  string
  iconType: InfoCardIconType
  label:    string
  value:    string
  order:    number
  createdAt: string
}

interface SpaceInfoCardStore {
  cards: Record<string, SpaceInfoCard[]>
  load:   (spaceId: string) => Promise<void>
  create: (spaceId: string, data: Pick<SpaceInfoCard, 'iconType' | 'label' | 'value'>) => Promise<SpaceInfoCard>
  update: (spaceId: string, cardId: string, data: Partial<Pick<SpaceInfoCard, 'iconType' | 'label' | 'value' | 'order'>>) => Promise<SpaceInfoCard>
  remove: (spaceId: string, cardId: string) => Promise<void>
}

export const useSpaceInfoCardStore = create<SpaceInfoCardStore>((set) => ({
  cards: {},

  load: async (spaceId) => {
    const res = await authFetch(`/api/spaces/${spaceId}/info-cards`)
    if (!res.ok) return
    const data = await res.json() as SpaceInfoCard[]
    set(s => ({ cards: { ...s.cards, [spaceId]: data } }))
  },

  create: async (spaceId, data) => {
    const res = await authFetch(`/api/spaces/${spaceId}/info-cards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Create failed')
    const card = await res.json() as SpaceInfoCard
    set(s => ({
      cards: {
        ...s.cards,
        [spaceId]: [...(s.cards[spaceId] ?? []), card],
      },
    }))
    return card
  },

  update: async (spaceId, cardId, data) => {
    const res = await authFetch(`/api/spaces/${spaceId}/info-cards/${cardId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Update failed')
    const updated = await res.json() as SpaceInfoCard
    set(s => ({
      cards: {
        ...s.cards,
        [spaceId]: (s.cards[spaceId] ?? []).map(c => c._id === cardId ? updated : c),
      },
    }))
    return updated
  },

  remove: async (spaceId, cardId) => {
    const res = await authFetch(`/api/spaces/${spaceId}/info-cards/${cardId}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Delete failed')
    set(s => ({
      cards: {
        ...s.cards,
        [spaceId]: (s.cards[spaceId] ?? []).filter(c => c._id !== cardId),
      },
    }))
  },
}))
