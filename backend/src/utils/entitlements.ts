import type { Request, Response, NextFunction } from 'express'
import { PLANS, type Feature, type PlanLimits } from '../config/plans'
import type { IUser } from '../models/User'

export function isBillingEnforcementEnabled(): boolean {
  return process.env.BILLING_ENABLED === 'true'
}

export function getUserPlan(user: IUser) {
  return user.plan ?? 'free'
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
 * Throws 403 if billing is enabled and the user has hit the limit for limitKey.
 * Passes through if limit === -1 (unlimited) or BILLING_ENABLED !== "true".
 */
export function assertLimit(user: IUser, limitKey: keyof PlanLimits, currentCount: number): void {
  if (!isBillingEnforcementEnabled()) return
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
