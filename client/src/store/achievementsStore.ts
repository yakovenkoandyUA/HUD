import { create } from 'zustand'
import { useProfileStore } from './profileStore'
import { ACHIEVEMENTS_BY_ID, type Achievement } from '../data/achievements'

/**
 * achievementsStore
 * -----------------
 * Косметичний шар мотивації — НЕ керує доступом до фіч.
 * `unlock(id)` ідемпотентний: повторний виклик для вже розблокованої
 * ачівки — no-op, тож викликати можна без перевірок "чи це вперше"
 * прямо в місці дії (наприклад, після кожного addTransaction).
 */
interface AchievementsState {
  pending: Achievement | null
  unlock: (id: string) => void
  dismiss: () => void
}

export const useAchievementsStore = create<AchievementsState>()((set) => ({
  pending: null,

  unlock: (id) => {
    const achievement = ACHIEVEMENTS_BY_ID[id]
    if (!achievement) return

    const { activeProfile, updateProfile } = useProfileStore.getState()
    if (!activeProfile) return
    if (activeProfile.unlockedAchievements?.some(a => a.id === id)) return

    const next = [...(activeProfile.unlockedAchievements ?? []), { id, unlockedAt: new Date().toISOString() }]
    updateProfile({ unlockedAchievements: next }).catch(() => {})

    set({ pending: achievement })
  },

  dismiss: () => set({ pending: null }),
}))
