import { Request, Response } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

export async function login(req: Request, res: Response): Promise<void> {
  const { password } = req.body as { password?: string }
  if (!password) {
    res.status(400).json({ error: 'Password required' })
    return
  }

  const hash = process.env.ADMIN_PASSWORD_HASH
  if (!hash) {
    res.status(500).json({ error: 'Server not configured' })
    return
  }

  const match = await bcrypt.compare(password, hash)
  if (!match) {
    res.status(401).json({ error: 'Invalid password' })
    return
  }

  const token = jwt.sign(
    { userId: 'admin' },
    process.env.JWT_SECRET!,
    { expiresIn: '365d' }
  )
  res.json({ token })
}

export function me(req: Request, res: Response): void {
  res.json({ userId: req.userId })
}
