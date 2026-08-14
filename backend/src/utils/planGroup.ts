import { User, type IUser, type PlanId } from '../models/User'

export const PLAN_RANK: Record<PlanId, number> = { free: 0, personal: 1, couple: 2, family: 3 }

export type GroupPlanId = 'couple' | 'family'

export const GROUP_SEATS: Record<GroupPlanId, number> = { couple: 2, family: 5 }

export function isGroupPlan(planId: PlanId): planId is GroupPlanId {
  return planId === 'couple' || planId === 'family'
}

export function isOwnPlanActive(user: Pick<IUser, 'subscriptionStatus' | 'planExpiresAt'>): boolean {
  if (user.subscriptionStatus === 'active' || user.subscriptionStatus === 'trialing') return true
  if (user.planExpiresAt && user.planExpiresAt.getTime() > Date.now()) return true
  return false
}

export interface EffectivePlan {
  plan: PlanId
  source: 'own' | 'group'
  payerName?: string
}

/**
 * Resolves the plan a user should actually get: their own paid plan, or (if
 * higher-ranked and still active) the plan of the payer whose group they joined.
 * Self-healing — no membership cleanup needed when a payer's subscription lapses.
 */
export async function resolveEffectivePlan(user: IUser): Promise<EffectivePlan> {
  const ownPlan: PlanId = isOwnPlanActive(user) ? user.plan : 'free'
  if (!user.planGroupPayerId) return { plan: ownPlan, source: 'own' }

  const payer = await User.findById(user.planGroupPayerId).select('name plan subscriptionStatus planExpiresAt').lean()
  if (!payer) return { plan: ownPlan, source: 'own' }

  const payerPlan: PlanId = isOwnPlanActive(payer) ? payer.plan : 'free'
  if (PLAN_RANK[payerPlan] > PLAN_RANK[ownPlan]) {
    return { plan: payerPlan, source: 'group', payerName: payer.name }
  }
  return { plan: ownPlan, source: 'own' }
}
