import { create } from 'zustand'
import { authFetch } from '@/shared/services/api'
import type { Drink, DrinkFormState, DrinkRating, Tasting } from '../types'
import { DEFAULT_FLAVOR } from '../types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toDrink(d: Record<string, unknown>): Drink {
  return {
    _id:        d._id as string,
    name:       d.name as string,
    brand:      (d.brand as string) ?? '',
    type:       (d.type as Drink['type']) ?? 'other',
    country:    (d.country as string) ?? '',
    distillery: (d.distillery as string) ?? '',
    abv:        (d.abv as number | null) ?? null,
    photo:      (d.photo as string) ?? '',
    status:     (d.status as Drink['status']) ?? 'wishlist',
    price:      (d.price as number | null) ?? null,
    ratings:    ((d.ratings as DrinkRating[]) ?? []),
    notes:      (d.notes as string) ?? '',
    flavor:     (d.flavor as Drink['flavor']) ?? { ...DEFAULT_FLAVOR },
    tastings:   ((d.tastings as Tasting[]) ?? []),
    userId:     (d.userId as string) ?? '',
    sharedWith: (d.sharedWith as string[]) ?? [],
    createdAt:  (d.createdAt as string) ?? '',
    updatedAt:  (d.updatedAt as string) ?? '',
  }
}

interface DrinksState {
  drinks: Drink[]
  isLoading: boolean
  fetchDrinks: () => Promise<void>
  addDrink: (form: DrinkFormState) => Promise<Drink>
  updateDrink: (id: string, patch: Partial<DrinkFormState>) => Promise<void>
  deleteDrink: (id: string) => Promise<void>
  rateDrink: (id: string, score: number | null) => Promise<void>
  addTasting: (drinkId: string, tasting: Omit<Tasting, '_id' | 'userId'>) => Promise<void>
  deleteTasting: (drinkId: string, tastingId: string) => Promise<void>
  buyDrink: (drinkId: string, amount: number, date: string, note?: string) => Promise<void>
}

// Guards against a slow fetchDrinks() (called on mount from the drinks page,
// its dashboard preview card, and CellarSpaceView) overwriting a drink
// added/edited/rated while it was still in flight with stale data — see
// spacesStore.ts for the same pattern.
let drinksReqId = 0

export const useDrinksStore = create<DrinksState>((set, get) => ({
  drinks: [],
  isLoading: false,

  fetchDrinks: async () => {
    const reqId = ++drinksReqId
    set({ isLoading: true })
    try {
      const res = await authFetch('/api/drinks')
      const data = await res.json() as Record<string, unknown>[]
      if (reqId !== drinksReqId) return // a mutation happened while this was in flight — stale, drop it
      set({ drinks: data.map(toDrink) })
    } finally {
      if (reqId === drinksReqId) set({ isLoading: false })
    }
  },

  addDrink: async (form) => {
    const payload = {
      ...form,
      abv:   form.abv   ? parseFloat(form.abv)   : null,
      price: form.price ? parseFloat(form.price) : null,
    }
    const res = await authFetch('/api/drinks', { method: 'POST', body: JSON.stringify(payload) })
    const raw = await res.json() as Record<string, unknown>
    const drink = toDrink(raw)
    drinksReqId++
    set(s => ({ drinks: [drink, ...s.drinks] }))
    return drink
  },

  updateDrink: async (id, patch) => {
    const payload: Record<string, unknown> = { ...patch }
    if (patch.abv !== undefined)   payload.abv   = patch.abv   ? parseFloat(patch.abv)   : null
    if (patch.price !== undefined) payload.price = patch.price ? parseFloat(patch.price) : null

    drinksReqId++
    set(s => ({ drinks: s.drinks.map(d => d._id === id ? { ...d, ...payload } as Drink : d) }))
    const res = await authFetch(`/api/drinks/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
    const raw = await res.json() as Record<string, unknown>
    set(s => ({ drinks: s.drinks.map(d => d._id === id ? toDrink(raw) : d) }))
  },

  deleteDrink: async (id) => {
    drinksReqId++
    set(s => ({ drinks: s.drinks.filter(d => d._id !== id) }))
    await authFetch(`/api/drinks/${id}`, { method: 'DELETE' })
  },

  rateDrink: async (id, score) => {
    const res = await authFetch(`/api/drinks/${id}/rating`, {
      method: 'PATCH',
      body: JSON.stringify({ score }),
    })
    if (!res.ok) return
    const raw = await res.json() as Record<string, unknown>
    if (!raw._id) return
    const updated = toDrink(raw)
    drinksReqId++
    set(s => ({ drinks: s.drinks.map(d => d._id === id ? updated : d) }))
  },

  addTasting: async (drinkId, tasting) => {
    const res = await authFetch(`/api/drinks/${drinkId}/tasting`, { method: 'POST', body: JSON.stringify(tasting) })
    const raw = await res.json() as Record<string, unknown>
    drinksReqId++
    set(s => ({ drinks: s.drinks.map(d => d._id === drinkId ? toDrink(raw) : d) }))
  },

  deleteTasting: async (drinkId, tastingId) => {
    drinksReqId++
    set(s => ({
      drinks: s.drinks.map(d => d._id === drinkId
        ? { ...d, tastings: d.tastings.filter(t => t._id !== tastingId) }
        : d
      ),
    }))
    const res = await authFetch(`/api/drinks/${drinkId}/tasting/${tastingId}`, { method: 'DELETE' })
    const raw = await res.json() as Record<string, unknown>
    set(s => ({ drinks: s.drinks.map(d => d._id === drinkId ? toDrink(raw) : d) }))
  },

  buyDrink: async (drinkId, amount, date, note) => {
    await authFetch(`/api/drinks/${drinkId}/buy`, {
      method: 'POST',
      body: JSON.stringify({ amount, date, note }),
    })
    await get().fetchDrinks()
  },
}))
