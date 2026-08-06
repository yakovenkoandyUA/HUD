import { create } from 'zustand'
import { authFetch } from '@/shared/services/api'

export type TicketTransport = 'plane' | 'train' | 'bus' | 'ferry' | 'car'
export type TicketStatus    = 'planned' | 'confirmed' | 'cancelled' | 'used'

export interface Ticket {
  _id:           string
  spaceId:       string
  transport:     TicketTransport
  from:          string
  to:            string
  date:          string
  departureTime: string
  arrivalTime:   string
  carrier:       string
  flightNumber:  string
  seat:          string
  bookingCode:   string
  price:         number | null
  currency:      'UAH' | 'USD' | 'EUR'
  status:        TicketStatus
  createdAt:     string
}

interface TicketStore {
  tickets:    Record<string, Ticket[]>
  load:       (spaceId: string) => Promise<void>
  create:     (spaceId: string, data: Partial<Ticket>) => Promise<Ticket>
  update:     (spaceId: string, ticketId: string, data: Partial<Ticket>) => Promise<Ticket>
  remove:     (spaceId: string, ticketId: string) => Promise<void>
}

// Guards against a slow load(spaceId) overwriting a ticket created/edited
// for that space while it was still in flight with stale data — keyed per
// spaceId. See spacesStore.ts for the base pattern.
const ticketReqIds = new Map<string, number>()
function bumpTicketReqId(spaceId: string): number {
  const next = (ticketReqIds.get(spaceId) ?? 0) + 1
  ticketReqIds.set(spaceId, next)
  return next
}

export const useTicketStore = create<TicketStore>((set) => ({
  tickets: {},

  load: async (spaceId) => {
    const reqId = bumpTicketReqId(spaceId)
    const res = await authFetch(`/api/spaces/${spaceId}/tickets`)
    if (!res.ok) return
    const data = await res.json() as Ticket[]
    if (reqId !== ticketReqIds.get(spaceId)) return // stale — dropped
    set(s => ({ tickets: { ...s.tickets, [spaceId]: data } }))
  },

  create: async (spaceId, data) => {
    const res = await authFetch(`/api/spaces/${spaceId}/tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Create failed')
    const ticket = await res.json() as Ticket
    bumpTicketReqId(spaceId)
    set(s => ({
      tickets: {
        ...s.tickets,
        [spaceId]: [...(s.tickets[spaceId] ?? []), ticket].sort((a, b) =>
          a.date < b.date ? -1 : a.date > b.date ? 1 : 0
        ),
      },
    }))
    return ticket
  },

  update: async (spaceId, ticketId, data) => {
    const res = await authFetch(`/api/spaces/${spaceId}/tickets/${ticketId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Update failed')
    const updated = await res.json() as Ticket
    bumpTicketReqId(spaceId)
    set(s => ({
      tickets: {
        ...s.tickets,
        [spaceId]: (s.tickets[spaceId] ?? []).map(t => t._id === ticketId ? updated : t),
      },
    }))
    return updated
  },

  remove: async (spaceId, ticketId) => {
    const res = await authFetch(`/api/spaces/${spaceId}/tickets/${ticketId}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Delete failed')
    bumpTicketReqId(spaceId)
    set(s => ({
      tickets: {
        ...s.tickets,
        [spaceId]: (s.tickets[spaceId] ?? []).filter(t => t._id !== ticketId),
      },
    }))
  },
}))
