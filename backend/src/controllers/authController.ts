import { Request, Response } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { User } from '../models/User'

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
    { userId: 'admin', role: 'admin' },
    process.env.JWT_SECRET!,
    { expiresIn: '365d' }
  )
  res.json({ token })
}

export function verify(req: Request, res: Response): void {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ valid: false })
    return
  }
  try {
    const payload = jwt.verify(
      header.slice(7),
      process.env.JWT_SECRET!
    ) as { userId: string }
    res.json({ valid: true, userId: payload.userId })
  } catch {
    res.status(401).json({ valid: false })
  }
}

export function me(req: Request, res: Response): void {
  res.json({ userId: req.userId, role: req.userRole })
}

/** GET /auth/profiles — public list of all profiles */
export async function getProfiles(req: Request, res: Response): Promise<void> {
  try {
    const users = await User.find({}, { name: 1, username: 1, avatarUrl: 1, role: 1 }).sort({ name: 1 })
    res.json(users.map(u => ({
      id: (u._id as { toString(): string }).toString(),
      name: u.name,
      username: u.username,
      avatarUrl: u.avatarUrl,
      role: u.role,
    })))
  } catch {
    res.status(500).json({ error: 'Failed to fetch profiles' })
  }
}

/** POST /auth/select — pick a profile, receive JWT (no password) */
export async function selectProfile(req: Request, res: Response): Promise<void> {
  const { username } = req.body as { username?: string }
  if (!username) {
    res.status(400).json({ error: 'username required' })
    return
  }

  try {
    const user = await User.findOne({ username })
    if (!user) {
      res.status(404).json({ error: 'Profile not found' })
      return
    }

    const token = jwt.sign(
      { userId: (user._id as { toString(): string }).toString(), role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '30d' }
    )

    res.json({
      token,
      user: {
        id: (user._id as { toString(): string }).toString(),
        name: user.name,
        username: user.username,
        avatarUrl: user.avatarUrl,
        role: user.role,
      },
    })
  } catch {
    res.status(500).json({ error: 'Failed to select profile' })
  }
}

/** PATCH /auth/me — update name and/or avatar for active user */
export async function updateMe(req: Request, res: Response): Promise<void> {
  const { avatarUrl, name } = req.body as { avatarUrl?: string; name?: string }
  if (!avatarUrl && !name) {
    res.status(400).json({ error: 'avatarUrl or name required' })
    return
  }

  try {
    const update: Record<string, string> = {}
    if (avatarUrl) update.avatarUrl = avatarUrl
    if (name?.trim()) update.name = name.trim()
    await User.findByIdAndUpdate(req.userId, update)
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Failed to update profile' })
  }
}
