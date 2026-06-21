import { Request, Response, NextFunction } from 'express'
import { User } from '../models/User'

export async function requireVerified(req: Request, res: Response, next: NextFunction): Promise<void> {
  const user = await User.findById(req.userId)
  if (!user?.isVerified) {
    res.status(403).json({ error: 'Email verification required' })
    return
  }
  next()
}
