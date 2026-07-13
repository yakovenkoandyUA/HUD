import { create } from 'zustand'
import { useProfileStore } from './profileStore'
import { ACHIEVEMENTS_BY_ID, type Achievement } from '@/shared/data/achievements'
import { ACHIEVEMENT_BY_ID } from '@/features/achievements/data'
import { getLevel, type Level } from '@/features/achievements/levels'

/**
 * achievementsStore
 * -----------------
 * Косметичний шар мотивації — НЕ керує доступом до фіч.
 * `unlock(id)` ідемпотентний: повторний виклик для вже розблокованої
 * ачівки — no-op, тож викликати можна без перевірок "чи це вперше"
 * прямо в місці дії (наприклад, після кожного addTransaction).
 *
 * Якщо unlock підіймає рівень — `pendingLevel` ставиться окремо і показується
 * ПІСЛЯ того як `pending` (картка ачівки) закриється (див. AchievementUnlockedModal).
 */
interface AchievementsState {
  pending: Achievement | null
  pendingLevel: Level | null
  unlock: (id: string) => void
  dismiss: () => void
  dismissLevel: () => void
}

function calcRunes(ids: { id: string }[]): number {
  return ids.reduce((sum, u) => sum + (ACHIEVEMENT_BY_ID[u.id]?.reward ?? 0), 0)
}

export const useAchievementsStore = create<AchievementsState>()((set) => ({
  pending: null,
  pendingLevel: null,

  unlock: (id) => {
    const achievement = ACHIEVEMENTS_BY_ID[id]
    if (!achievement) return

    const { activeProfile, updateProfile } = useProfileStore.getState()
    if (!activeProfile) return
    const before = activeProfile.unlockedAchievements ?? []
    if (before.some(a => a.id === id)) return

    const next = [...before, { id, unlockedAt: new Date().toISOString() }]

    const levelBefore = getLevel(calcRunes(before))
    const levelAfter  = getLevel(calcRunes(next))

    set({
      pending: achievement,
      pendingLevel: levelAfter.level !== levelBefore.level ? levelAfter : null,
    })

    updateProfile({ unlockedAchievements: next }).catch(() => {
      set({ pending: null, pendingLevel: null })
    })
  },

  dismiss: () => set({ pending: null }),
  dismissLevel: () => set({ pendingLevel: null }),
}))
