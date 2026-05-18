import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Goal } from '../types'

interface GoalsState {
  goals: Goal[]
  addGoal: (title: string, targetAmount: number) => void
  contribute: (id: string, amount: number) => void
  deleteGoal: (id: string) => void
}

export const useGoalsStore = create<GoalsState>()(
  persist(
    (set) => ({
      goals: [],

      addGoal: (title, targetAmount) =>
        set((s) => ({
          goals: [
            ...s.goals,
            { id: crypto.randomUUID(), title, targetAmount, savedAmount: 0 },
          ],
        })),

      contribute: (id, amount) =>
        set((s) => ({
          goals: s.goals.map((g) =>
            g.id === id
              ? { ...g, savedAmount: Math.min(g.savedAmount + amount, g.targetAmount) }
              : g
          ),
        })),

      deleteGoal: (id) =>
        set((s) => ({ goals: s.goals.filter((g) => g.id !== id) })),
    }),
    { name: 'hud-goals' }
  )
)
