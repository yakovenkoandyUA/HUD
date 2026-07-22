import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * sprintStreakStore
 * ----------------
 * Tracks ISO dates (YYYY-MM-DD) on which the user completed at least one sprint task.
 * Used by useAchievementProgress to compute consecutive-day streaks for
 * seven-days-fire and three-day-chain achievements.
 */
interface SprintStreakState {
  doneDates: string[]
  recordToday: () => void
  reset: () => void
}

export const useSprintStreakStore = create<SprintStreakState>()(
  persist(
    (set, get) => ({
      doneDates: [],
      reset: () => set({ doneDates: [] }),

      recordToday: () => {
        const today = new Date().toISOString().slice(0, 10)
        if (!get().doneDates.includes(today)) {
          set(s => ({ doneDates: [...s.doneDates, today] }))
        }
      },
    }),
    { name: 'sprint-streak-storage' }
  )
)
