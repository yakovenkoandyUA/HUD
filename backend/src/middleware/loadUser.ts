import type { Request, Response, NextFunction } from 'express'
import { User } from '../models/User'

/**
 * Loads the full User document for routes that need entitlement checks.
 * Attaches it to req.user.
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
    req.user = user
    next()
  } catch {
    res.status(500).json({ error: 'Failed to load user' })
  }
}
