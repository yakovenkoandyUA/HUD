import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface StreakStore {
  currentStreak: number
  lastCheckedDate: string // 'YYYY-MM-DD'
  checkToday: (todayExpense: number, dailyBudget: number) => void
  reset: () => void
}

function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const useStreakStore = create<StreakStore>()(
  persist(
    (set, get) => ({
      currentStreak: 0,
      lastCheckedDate: '',

      reset: () => set({ currentStreak: 0, lastCheckedDate: '' }),

      checkToday: (todayExpense, dailyBudget) => {
        const today = todayISO()
        if (get().lastCheckedDate === today) return
        set({
          currentStreak: todayExpense <= dailyBudget ? get().currentStreak + 1 : 0,
          lastCheckedDate: today,
        })
      },
    }),
    { name: 'hud-streak-v1' }
  )
)
