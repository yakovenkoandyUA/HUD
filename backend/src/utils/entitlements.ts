import type { Request, Response, NextFunction } from 'express'
import { PLANS, type Feature, type PlanLimits } from '../config/plans'
import type { IUser } from '../models/User'
import UsageCounter from '../models/UsageCounter'

export function isBillingEnforcementEnabled(): boolean {
  return process.env.BILLING_ENABLED === 'true'
}

export function getUserPlan(user: IUser) {
  return (user as unknown as { effectivePlan?: IUser['plan'] }).effectivePlan ?? user.plan ?? 'free'
}

export function getPlanConfig(user: IUser) {
  return PLANS[getUserPlan(user)]
}

export function getPlanLimits(user: IUser): PlanLimits {
  return getPlanConfig(user).limits
}

export function canUseFeature(user: IUser, feature: Feature): boolean {
  return getPlanConfig(user).features[feature]
}

/**
 * Throws 403 if billing is enabled and the user's plan doesn't include this feature.
 * No-op when BILLING_ENABLED !== "true".
 */
export function assertFeature(user: IUser, feature: Feature): void {
  if (!isBillingEnforcementEnabled()) return
  if (user.role === 'admin') return
  if (!canUseFeature(user, feature)) {
    const err = new Error('Plan upgrade required') as Error & { status: number; code: string; feature: string }
    err.status = 403
    err.code = 'PLAN_GATE'
    err.feature = feature
    throw err
  }
}

/**
 * Express middleware factory — calls next(err) with PLAN_GATE error when billing
 * is enabled and the user's plan doesn't include the feature.
 * Requires loadUser to run before this middleware (so req.user is populated).
 */
export function requireFeature(feature: Feature) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      assertFeature(req.user!, feature)
      next()
    } catch (err) {
      next(err)
    }
  }
}

/**
 * Throws 403 if billing is enabled and the user has hit their monthly quota for usageKey,
 * otherwise increments the counter for the current calendar month.
 * No-op when BILLING_ENABLED !== "true" or limit === -1 (unlimited).
 */
export async function assertAndTrackMonthlyUsage(
  user: IUser,
  usageKey: string,
  limitKey: keyof PlanLimits,
): Promise<void> {
  if (!isBillingEnforcementEnabled()) return
  if (user.role === 'admin') return
  const limit = getPlanLimits(user)[limitKey]
  if (limit === -1) return

  const month = new Date().toISOString().slice(0, 7)
  const userId = (user._id as { toString(): string }).toString()
  const existing = await UsageCounter.findOne({ userId, key: usageKey, month })
  if ((existing?.count ?? 0) >= limit) {
    const err = new Error(`Monthly limit reached: ${usageKey}`) as Error & { status: number; code: string; limitKey: string; limit: number }
    err.status = 403
    err.code = 'PLAN_LIMIT'
    err.limitKey = limitKey
    err.limit = limit
    throw err
  }

  await UsageCounter.findOneAndUpdate(
    { userId, key: usageKey, month },
    { $inc: { count: 1 } },
    { upsert: true },
  )
}

/**
 * Throws 403 if billing is enabled and the user has hit the limit for limitKey.
 * Passes through if limit === -1 (unlimited) or BILLING_ENABLED !== "true".
 */
export function assertLimit(user: IUser, limitKey: keyof PlanLimits, currentCount: number): void {
  if (!isBillingEnforcementEnabled()) return
  if (user.role === 'admin') return
  const limit = getPlanLimits(user)[limitKey]
  if (limit !== -1 && currentCount >= limit) {
    const err = new Error(`Limit reached: ${limitKey}`) as Error & { status: number; code: string; limitKey: string; limit: number }
    err.status = 403
    err.code = 'PLAN_LIMIT'
    err.limitKey = limitKey
    err.limit = limit
    throw err
  }
}
