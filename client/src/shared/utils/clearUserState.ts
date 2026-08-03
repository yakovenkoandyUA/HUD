import { useStreakStore } from '@/features/finance/store/streakStore'
import { useCategoryStore } from '@/features/finance/store/categoryStore'
import { useFinanceStore } from '@/features/finance/store/financeStore'
import { useGoalsStore } from '@/features/finance/store/goalsStore'
import { useRecipesStore } from '@/features/recipes/store/recipesStore'
import { useSprintStreakStore } from '@/features/sprint/store/sprintStreakStore'
import { useSprintStore } from '@/features/sprint/store/sprintStore'
import { useMemoriesStore } from '@/features/memories/store/memoriesStore'
import { useSpacesStore } from '@/features/memories/store/spacesStore'
import { useWatchlistStore } from '@/features/watchlist/store/watchlistStore'

/**
 * Clears all user-scoped frontend state on account switch (login/register/logout).
 * Call this before setting a new activeProfile to prevent cross-account data leaks
 * (e.g. a fresh account picking up achievement progress computed from a previous
 * account's leftover store data — see AutoUnlockWatcher).
 * Device-scoped preferences (theme, navStyle) are intentionally NOT cleared.
 */
export function clearUserState(): void {
  useFinanceStore.getState().reset()
  useStreakStore.getState().reset()
  useCategoryStore.getState().reset()
  useRecipesStore.getState().reset()
  useSprintStreakStore.getState().reset()
  useSprintStore.getState().clearItems()
  useGoalsStore.getState().reset()
  useMemoriesStore.getState().reset()
  useSpacesStore.getState().reset()
  useWatchlistStore.getState().reset()
}
