import type { Request, Response, NextFunction } from 'express'
import { User } from '../models/User'
import { resolveEffectivePlan } from '../utils/planGroup'

/**
 * Loads the full User document for routes that need entitlement checks.
 * Attaches it to req.user, plus req.user.effectivePlan (own plan, or the
 * plan-group payer's plan if higher-ranked — see utils/planGroup.ts).
 * Must run after requireAuth (which sets req.userId).
 * Do not apply globally — use only on routes that need plan/feature checks.
 */
export async function loadUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await User.findById(req.userId)
    if (!user) {
      res.status(401).json({ error: 'User not found' })
      return
    }
    if (user.planGroupPayerId) {
      const resolved = await resolveEffectivePlan(user)
      // Plain property, not a mongoose .set() — must never be tracked as a
      // modified path or it could get persisted to the wrong user on .save().
      ;(user as unknown as { effectivePlan?: string }).effectivePlan = resolved.plan
    }
    req.user = user
    next()
  } catch {
    res.status(500).json({ error: 'Failed to load user' })
  }
}
