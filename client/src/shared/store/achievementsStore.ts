import { create } from 'zustand'
import { useProfileStore } from './profileStore'
import { ACHIEVEMENTS_BY_ID, type Achievement } from '@/shared/data/achievements'
import { getRank, type Rank } from '@/shared/data/ranks'

/**
 * achievementsStore
 * -----------------
 * Косметичний шар мотивації — НЕ керує доступом до фіч.
 * `unlock(id)` ідемпотентний: повторний виклик для вже розблокованої
 * ачівки — no-op, тож викликати можна без перевірок "чи це вперше"
 * прямо в місці дії (наприклад, після кожного addTransaction).
 *
 * Якщо unlock підіймає ранг — `pendingRank` ставиться окремо і показується
 * ПІСЛЯ того як `pending` (картка ачівки) закриється (див. AchievementUnlockedModal).
 */
interface AchievementsState {
  pending: Achievement | null
  pendingRank: Rank | null
  unlock: (id: string) => void
  dismiss: () => void
  dismissRank: () => void
}

export const useAchievementsStore = create<AchievementsState>()((set) => ({
  pending: null,
  pendingRank: null,

  unlock: (id) => {
    const achievement = ACHIEVEMENTS_BY_ID[id]
    if (!achievement) return

    const { activeProfile, updateProfile } = useProfileStore.getState()
    if (!activeProfile) return
    const before = activeProfile.unlockedAchievements ?? []
    if (before.some(a => a.id === id)) return

    const next = [...before, { id, unlockedAt: new Date().toISOString() }]

    const rankBefore = getRank(before.length)
    const rankAfter  = getRank(next.length)

    set({
      pending: achievement,
      pendingRank: rankAfter.id !== rankBefore.id ? rankAfter : null,
    })

    updateProfile({ unlockedAchievements: next }).catch(() => {
      set({ pending: null, pendingRank: null })
    })
  },

  dismiss: () => set({ pending: null }),
  dismissRank: () => set({ pendingRank: null }),
}))
