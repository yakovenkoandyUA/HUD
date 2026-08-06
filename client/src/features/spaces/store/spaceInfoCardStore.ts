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

// Guards against a slow load(spaceId) overwriting a card created/edited for
// that space while it was still in flight with stale data — keyed per
// spaceId. See spacesStore.ts for the base pattern.
const infoCardReqIds = new Map<string, number>()
function bumpInfoCardReqId(spaceId: string): number {
  const next = (infoCardReqIds.get(spaceId) ?? 0) + 1
  infoCardReqIds.set(spaceId, next)
  return next
}

export const useSpaceInfoCardStore = create<SpaceInfoCardStore>((set) => ({
  cards: {},

  load: async (spaceId) => {
    const reqId = bumpInfoCardReqId(spaceId)
    const res = await authFetch(`/api/spaces/${spaceId}/info-cards`)
    if (!res.ok) return
    const data = await res.json() as SpaceInfoCard[]
    if (reqId !== infoCardReqIds.get(spaceId)) return // stale — dropped
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
    bumpInfoCardReqId(spaceId)
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
    bumpInfoCardReqId(spaceId)
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
    bumpInfoCardReqId(spaceId)
    set(s => ({
      cards: {
        ...s.cards,
        [spaceId]: (s.cards[spaceId] ?? []).filter(c => c._id !== cardId),
      },
    }))
  },
}))
