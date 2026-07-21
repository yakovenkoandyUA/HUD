import { create } from 'zustand'
import { useProfileStore } from './profileStore'
import { ACHIEVEMENTS_BY_ID, type Achievement } from '@/shared/data/achievements'
import { ACHIEVEMENT_BY_ID } from '@/features/achievements/data'
import type { AchievementCategory } from '@/features/achievements/types'
import { getLevel, type Level } from '@/features/achievements/levels'
import { getMimirHistory } from '@/shared/utils/mimirHistory'
import type { DoodleVariant } from '@/shared/components/ui/DoodleIllustration'

const CATEGORY_COLORS: Record<AchievementCategory, string> = {
  memory:    'var(--negative)',
  spaces:    'var(--accent)',
  finance:   'var(--accent)',
  sprint:    'var(--gold)',
  watchlist: 'var(--orange, var(--accent))',
}

const CATEGORY_ILLUSTRATIONS: Record<AchievementCategory, DoodleVariant> = {
  memory:    'memories',
  spaces:    'memories',
  finance:   'finance',
  sprint:    'sprint',
  watchlist: 'watchlist',
}

const CATEGORY_ROUTES: Record<AchievementCategory, string> = {
  memory:    '/memories',
  spaces:    '/memories',
  finance:   '/finance',
  sprint:    '/sprint',
  watchlist: '/watchlist',
}

/** Resolve display Achievement from either catalog */
function resolveAchievement(id: string): Achievement | null {
  const basic = ACHIEVEMENTS_BY_ID[id]
  if (basic) return basic
  const rich = ACHIEVEMENT_BY_ID[id]
  if (!rich) return null
  return {
    id,
    title: rich.title,
    description: rich.description,
    hint: rich.description,
    route: CATEGORY_ROUTES[rich.category],
    color: CATEGORY_COLORS[rich.category],
    illustration: CATEGORY_ILLUSTRATIONS[rich.category],
  }
}

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
  mimirAchievementDialogue: { id: 'achievement_first' | 'achievement_rare'; achievementId: string } | null
  unlock: (id: string) => void
  dismiss: () => void
  dismissLevel: () => void
  clearMimirAchievementDialogue: () => void
}

function calcRunes(ids: { id: string }[]): number {
  return ids.reduce((sum, u) => sum + (ACHIEVEMENT_BY_ID[u.id]?.reward ?? 0), 0)
}

export const useAchievementsStore = create<AchievementsState>()((set) => ({
  pending: null,
  pendingLevel: null,
  mimirAchievementDialogue: null,

  unlock: (id) => {
    const achievement = resolveAchievement(id)
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

    // Queue a Mimir dialogue after the achievement toast clears (handled by MimirAchievementLayer)
    const userId = activeProfile.id ?? ''
    if (userId) {
      const h = getMimirHistory(userId)
      const def = ACHIEVEMENT_BY_ID[id]
      const rarity = def?.rarity
      const isRare = rarity === 'stone' || rarity === 'root' || rarity === 'well'
      const isFirst = before.length === 0 && !h.achievementFirstShown

      if (isRare && !h.shownRareAchievementIds.includes(id)) {
        set({ mimirAchievementDialogue: { id: 'achievement_rare', achievementId: id } })
      } else if (isFirst) {
        set({ mimirAchievementDialogue: { id: 'achievement_first', achievementId: id } })
      }
    }

    updateProfile({ unlockedAchievements: next }).catch(() => {
      set({ pending: null, pendingLevel: null, mimirAchievementDialogue: null })
    })
  },

  dismiss: () => set({ pending: null }),
  dismissLevel: () => set({ pendingLevel: null }),
  clearMimirAchievementDialogue: () => set({ mimirAchievementDialogue: null }),
}))
