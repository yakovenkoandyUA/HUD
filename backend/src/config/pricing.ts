import type { PlanId } from '../models/User'

export type PaidPlanId = 'personal' | 'couple' | 'family'
export type BillingInterval = 'month' | 'year'

// All amounts in kopecks (UAH × 100) — no floats for money
export const PRICES: Record<PaidPlanId, Record<BillingInterval, number>> = {
  personal: { month: 19900, year: 159600 },
  couple:   { month: 29900, year: 238800 },
  family:   { month: 44900, year: 358800 },
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
