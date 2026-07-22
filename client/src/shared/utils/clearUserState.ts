import { useStreakStore } from '@/features/finance/store/streakStore'
import { useCategoryStore } from '@/features/finance/store/categoryStore'
import { useFinanceStore } from '@/features/finance/store/financeStore'
import { useRecipesStore } from '@/features/recipes/store/recipesStore'
import { useSprintStreakStore } from '@/features/sprint/store/sprintStreakStore'
import { useSprintStore } from '@/features/sprint/store/sprintStore'

/**
 * Clears all user-scoped frontend state on logout.
 * Call this before redirecting to login to prevent cross-account data leaks.
 * Device-scoped preferences (theme, navStyle) are intentionally NOT cleared.
 */
export function clearUserState(): void {
  useFinanceStore.getState().reset()
  useStreakStore.getState().reset()
  useCategoryStore.getState().reset()
  useRecipesStore.getState().reset()
  useSprintStreakStore.getState().reset()
  useSprintStore.getState().clearItems()
}
