import { create } from 'zustand'
import { authFetch, getToken } from '../services/api'

export type DayKey = string

interface MealPlanState {
  plan: Record<DayKey, string[]>
  loading: boolean
  fetchPlan: () => Promise<void>
  addToDay: (day: DayKey, recipeId: string) => Promise<void>
  removeFromDay: (day: DayKey, recipeId: string) => Promise<void>
  clearWeek: (days: DayKey[]) => Promise<void>
  copyWeekToNext: (weekKeys: DayKey[]) => Promise<void>
}

async function persistPlan(plan: Record<DayKey, string[]>) {
  await authFetch('/api/meal-plan', {
    method: 'PUT',
    body: JSON.stringify({ plan }),
  })
}

export const useMealPlanStore = create<MealPlanState>((set, get) => ({
  plan: {},
  loading: false,

  fetchPlan: async () => {
    if (!getToken()) return
    set({ loading: true })
    try {
      const res = await authFetch('/api/meal-plan')
      if (res.ok) {
        const data = await res.json() as { plan: Record<DayKey, string[]> }
        set({ plan: data.plan })
      }
    } finally {
      set({ loading: false })
    }
  },

  addToDay: async (day, recipeId) => {
    const prev = get().plan
    const dayIds = prev[day] ?? []
    if (dayIds.includes(recipeId)) return
    const next = { ...prev, [day]: [...dayIds, recipeId] }
    set({ plan: next })
    await persistPlan(next)
  },

  removeFromDay: async (day, recipeId) => {
    const prev = get().plan
    const next = { ...prev, [day]: (prev[day] ?? []).filter(id => id !== recipeId) }
    set({ plan: next })
    await persistPlan(next)
  },

  clearWeek: async (days) => {
    const prev = get().plan
    const next = { ...prev }
    days.forEach(d => delete next[d])
    set({ plan: next })
    await persistPlan(next)
  },

  copyWeekToNext: async (weekKeys) => {
    const prev = get().plan
    const next = { ...prev }
    weekKeys.forEach(key => {
      const ids = prev[key]
      if (!ids?.length) return
      const d = new Date(key)
      d.setDate(d.getDate() + 7)
      const nextKey = d.toISOString().slice(0, 10)
      next[nextKey] = [...ids]
    })
    set({ plan: next })
    await persistPlan(next)
  },
}))
