import type { PlanId } from '../models/User'

export type PaidPlanId = 'personal' | 'couple' | 'family'
export type BillingInterval = 'month' | 'year'

// All amounts in kopecks (UAH × 100) — no floats for money
export const PRICES: Record<PaidPlanId, Record<BillingInterval, number>> = {
  personal: { month: 14900, year: 119900 },
  couple:   { month: 24900, year: 199900 },
  family:   { month: 39900, year: 319900 },
}

export const CURRENCY = 'UAH' as const

const PAID_PLANS = new Set<PlanId>(['personal', 'couple', 'family'])
const INTERVALS = new Set<string>(['month', 'year'])

export function getPrice(planId: PaidPlanId, interval: BillingInterval): number {
  return PRICES[planId][interval]
}

export function validatePaidPlan(planId: unknown): planId is PaidPlanId {
  return typeof planId === 'string' && PAID_PLANS.has(planId as PlanId)
}

export function validateBillingInterval(interval: unknown): interval is BillingInterval {
  return typeof interval === 'string' && INTERVALS.has(interval)
}
