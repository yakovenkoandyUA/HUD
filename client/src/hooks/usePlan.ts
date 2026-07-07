import { useProfileStore } from '../store/profileStore'
import { PLANS, type Feature, type PlanLimits } from '../config/plans'

/**
 * Returns current user's plan config with helper methods.
 * Falls back to "free" if plan field is missing (legacy users, unauthenticated).
 */
export function usePlan() {
  const profile = useProfileStore(s => s.activeProfile)
  const planId = profile?.plan ?? 'free'
  const config = PLANS[planId]

  return {
    plan: planId,
    label: config.label,
    limits: config.limits,
    subscriptionStatus: profile?.subscriptionStatus ?? 'none',
    can: (feature: Feature): boolean => config.features[feature],
    isAtLimit: (limitKey: keyof PlanLimits, count: number): boolean => {
      const limit = config.limits[limitKey]
      return limit !== -1 && count >= limit
    },
  }
}

/** Convenience hook for a single feature check. */
export function useCanUseFeature(feature: Feature): boolean {
  const { can } = usePlan()
  return can(feature)
}
