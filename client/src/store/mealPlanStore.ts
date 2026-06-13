import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Key format: YYYY-MM-DD
export type DayKey = string

interface MealPlanState {
  plan: Record<DayKey, string[]> // recipeId[]
  addToDay: (day: DayKey, recipeId: string) => void
  removeFromDay: (day: DayKey, recipeId: string) => void
  clearDay: (day: DayKey) => void
  clearWeek: (days: DayKey[]) => void
}

export const useMealPlanStore = create<MealPlanState>()(
  persist(
    (set) => ({
      plan: {},

      addToDay: (day, recipeId) => set(s => ({
        plan: {
          ...s.plan,
          [day]: [...(s.plan[day] ?? []).filter(id => id !== recipeId), recipeId],
        },
      })),

      removeFromDay: (day, recipeId) => set(s => ({
        plan: { ...s.plan, [day]: (s.plan[day] ?? []).filter(id => id !== recipeId) },
      })),

      clearDay: (day) => set(s => {
        const next = { ...s.plan }
        delete next[day]
        return { plan: next }
      }),

      clearWeek: (days) => set(s => {
        const next = { ...s.plan }
        days.forEach(d => delete next[d])
        return { plan: next }
      }),
    }),
    { name: 'hud-meal-plan' }
  )
)
