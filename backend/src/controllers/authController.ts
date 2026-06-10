import { Request, Response } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { OAuth2Client } from 'google-auth-library'
import { Resend } from 'resend'
import { User } from '../models/User'
import { seedCategoriesForUser } from '../scripts/seedCategories'

const resend = new Resend(process.env.RESEND_API_KEY)
const CLIENT_URL = process.env.CLIENT_URL ?? 'https://hud-murex.vercel.app'

async function sendVerificationEmail(email: string, token: string, name: string): Promise<void> {
  const link = `${CLIENT_URL}/verify?token=${token}`
  await resend.emails.send({
    from: 'MIMIR <noreply@mimir.app>',
    to: email,
    subject: 'Підтвердіть ваш email — MIMIR',
    html: `<p>Привіт, ${name}!</p>
<p>Натисніть посилання нижче, щоб підтвердити вашу адресу:</p>
<p><a href="${link}">${link}</a></p>
<p>Посилання дійсне 24 години.</p>`,
  })
}

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

const USER_PUBLIC_FIELDS = (user: InstanceType<typeof User>) => ({
  id: (user._id as { toString(): string }).toString(),
  name: user.name,
  username: user.username,
  email: user.email,
  avatarUrl: user.avatarUrl,
  role: user.role,
  f1Enabled: user.f1Enabled ?? false,
  hasPIN: !!user.pinHash,
  isVerified: user.isVerified ?? false,
})

function signToken(userId: string, role: string): string {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET!, { expiresIn: '30d' })
}

// ── Email auth ────────────────────────────────────────────────────────────────

/** POST /auth/register — { email, password, name, username } → JWT + user
 *  If username exists but has no passwordHash → claims the existing account.
 */
export async function register(req: Request, res: Response): Promise<void> {
  const { email, password, name, username } = req.body as {
    email?: string; password?: string; name?: string; username?: string
  }

  if (!email || !password || !name || !username) {
    res.status(400).json({ error: 'email, password, name, username required' })
    return
  }
  if (password.length < 6) {
    res.status(400).json({ error: 'Пароль мінімум 6 символів' })
    return
  }

  try {
    const normalEmail = email.toLowerCase().trim()

    const emailExists = await User.findOne({ email: normalEmail })
    if (emailExists) {
      res.status(409).json({ error: 'Цей email вже використовується' })
      return
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const verificationToken = crypto.randomBytes(32).toString('hex')
    let user = await User.findOne({ username: username.trim() })

    if (user) {
      if (user.passwordHash) {
        res.status(409).json({ error: 'Цей логін вже зайнятий' })
        return
      }
      // Claim existing account (migration)
      user.email = normalEmail
      user.passwordHash = passwordHash
      user.isVerified = false
      user.verificationToken = verificationToken
      if (!user.name || user.name === user.username) user.name = name.trim()
      await user.save()
    } else {
      user = await User.create({
        name: name.trim(),
        username: username.trim().toLowerCase(),
        email: normalEmail,
        passwordHash,
        role: 'user',
        f1Enabled: false,
        isVerified: false,
        verificationToken,
      })
      const userId = (user._id as { toString(): string }).toString()
      await seedCategoriesForUser(userId)
    }

    // Send verification email (fire-and-forget — don't block registration)
    if (process.env.RESEND_API_KEY) {
      sendVerificationEmail(normalEmail, verificationToken, name.trim()).catch(() => {})
    }

    const userId = (user._id as { toString(): string }).toString()
    res.status(201).json({ token: signToken(userId, user.role), user: USER_PUBLIC_FIELDS(user) })
  } catch {
    res.status(500).json({ error: 'Помилка реєстрації' })
  }
}

/** POST /auth/login — { email, password } → JWT + user */
export async function loginEmail(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as { email?: string; password?: string }
  if (!email || !password) {
    res.status(400).json({ error: 'email and password required' })
    return
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() })
    if (!user?.passwordHash) {
      res.status(401).json({ error: 'Неправильний email або пароль' })
      return
    }

    const match = await bcrypt.compare(password, user.passwordHash)
    if (!match) {
      res.status(401).json({ error: 'Неправильний email або пароль' })
      return
    }

    const userId = (user._id as { toString(): string }).toString()
    res.json({ token: signToken(userId, user.role), user: USER_PUBLIC_FIELDS(user) })
  } catch {
    res.status(500).json({ error: 'Помилка входу' })
  }
}

// ── PIN ───────────────────────────────────────────────────────────────────────

/** PATCH /auth/pin — { pin: string (4 digits) } — set or change PIN */
export async function setPin(req: Request, res: Response): Promise<void> {
  const { pin } = req.body as { pin?: string }
  if (!pin || !/^\d{4}$/.test(pin)) {
    res.status(400).json({ error: 'PIN має бути 4 цифри' })
    return
  }

  try {
    const pinHash = await bcrypt.hash(pin, 10)
    await User.findByIdAndUpdate(req.userId, { pinHash })
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Помилка збереження PIN' })
  }
}

/** DELETE /auth/pin — remove PIN */
export async function removePin(req: Request, res: Response): Promise<void> {
  try {
    await User.findByIdAndUpdate(req.userId, { $unset: { pinHash: '' } })
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Помилка видалення PIN' })
  }
}

/** POST /auth/pin/verify — { pin } — verify PIN for unlock */
export async function verifyPin(req: Request, res: Response): Promise<void> {
  const { pin } = req.body as { pin?: string }
  if (!pin) {
    res.status(400).json({ error: 'pin required' })
    return
  }

  try {
    const user = await User.findById(req.userId)
    if (!user?.pinHash) {
      res.status(404).json({ error: 'PIN не встановлено' })
      return
    }

    const match = await bcrypt.compare(pin, user.pinHash)
    if (!match) {
      res.status(401).json({ error: 'Неправильний PIN' })
      return
    }

    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Помилка перевірки PIN' })
  }
}

// ── Google OAuth ─────────────────────────────────────────────────────────────

async function uniqueUsername(base: string): Promise<string> {
  const clean = base.replace(/[^a-z0-9]/g, '').slice(0, 20) || 'user'
  let candidate = clean
  let suffix = 1
  while (await User.exists({ username: candidate })) {
    candidate = `${clean}${suffix++}`
  }
  return candidate
}

/** POST /auth/google — { credential: Google ID token } → JWT + user */
export async function googleAuth(req: Request, res: Response): Promise<void> {
  const { credential } = req.body as { credential?: string }
  if (!credential) {
    res.status(400).json({ error: 'credential required' })
    return
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    })
    const payload = ticket.getPayload()
    if (!payload?.email) {
      res.status(400).json({ error: 'Invalid Google token' })
      return
    }

    const email = payload.email.toLowerCase()
    let user = await User.findOne({ email })

    if (!user) {
      const username = await uniqueUsername(email.split('@')[0])
      user = await User.create({
        name: payload.name ?? username,
        username,
        email,
        avatarUrl: payload.picture ?? null,
        role: 'user',
        f1Enabled: false,
      })
      const userId = (user._id as { toString(): string }).toString()
      await seedCategoriesForUser(userId)
    } else if (!user.avatarUrl && payload.picture) {
      user.avatarUrl = payload.picture
      await user.save()
    }

    const userId = (user._id as { toString(): string }).toString()
    res.json({ token: signToken(userId, user.role), user: USER_PUBLIC_FIELDS(user) })
  } catch {
    res.status(401).json({ error: 'Invalid Google token' })
  }
}

// ── Email verification ────────────────────────────────────────────────────────

/** POST /auth/verify-email — { token } → marks isVerified = true */
export async function verifyEmail(req: Request, res: Response): Promise<void> {
  const { token } = req.body as { token?: string }
  if (!token) {
    res.status(400).json({ error: 'token required' })
    return
  }
  try {
    const user = await User.findOne({ verificationToken: token })
    if (!user) {
      res.status(400).json({ error: 'Невалідне або прострочене посилання' })
      return
    }
    user.isVerified = true
    user.verificationToken = null
    await user.save()
    res.json({ ok: true, user: USER_PUBLIC_FIELDS(user) })
  } catch {
    res.status(500).json({ error: 'Помилка верифікації' })
  }
}

/** POST /auth/resend-verification — resends email for current user */
export async function resendVerification(req: Request, res: Response): Promise<void> {
  try {
    const user = await User.findById(req.userId)
    if (!user) { res.status(404).json({ error: 'User not found' }); return }
    if (user.isVerified) { res.status(400).json({ error: 'Email вже підтверджено' }); return }
    if (!user.email) { res.status(400).json({ error: 'Email не знайдено' }); return }

    const verificationToken = crypto.randomBytes(32).toString('hex')
    user.verificationToken = verificationToken
    await user.save()

    if (process.env.RESEND_API_KEY) {
      await sendVerificationEmail(user.email, verificationToken, user.name)
    }
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Помилка відправки листа' })
  }
}

// ── Legacy / multi-profile ────────────────────────────────────────────────────

export function verify(req: Request, res: Response): void {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ valid: false })
    return
  }
  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET!) as { userId: string }
    res.json({ valid: true, userId: payload.userId })
  } catch {
    res.status(401).json({ valid: false })
  }
}

export async function me(req: Request, res: Response): Promise<void> {
  try {
    const user = await User.findById(req.userId)
    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }
    res.json({ ...USER_PUBLIC_FIELDS(user), userId: req.userId, role: req.userRole })
  } catch {
    res.status(500).json({ error: 'Failed to fetch user' })
  }
}

/** GET /auth/profiles — public list of all profiles */
export async function getProfiles(req: Request, res: Response): Promise<void> {
  try {
    const users = await User.find({}, { name: 1, username: 1, avatarUrl: 1, role: 1, f1Enabled: 1 }).sort({ name: 1 })
    res.json(users.map(u => ({
      id: (u._id as { toString(): string }).toString(),
      name: u.name,
      username: u.username,
      avatarUrl: u.avatarUrl,
      role: u.role,
      f1Enabled: u.f1Enabled ?? false,
    })))
  } catch {
    res.status(500).json({ error: 'Failed to fetch profiles' })
  }
}

/** POST /auth/select — pick a profile, receive JWT (no password) — legacy */
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

    const userId = (user._id as { toString(): string }).toString()
    await seedCategoriesForUser(userId)

    res.json({ token: signToken(userId, user.role), user: USER_PUBLIC_FIELDS(user) })
  } catch {
    res.status(500).json({ error: 'Failed to select profile' })
  }
}

/** PATCH /auth/me — update name, avatar, f1Enabled for active user */
export async function updateMe(req: Request, res: Response): Promise<void> {
  const { avatarUrl, name, f1Enabled } = req.body as { avatarUrl?: string; name?: string; f1Enabled?: boolean }
  if (!avatarUrl && !name && f1Enabled === undefined) {
    res.status(400).json({ error: 'avatarUrl, name, or f1Enabled required' })
    return
  }

  try {
    const update: Record<string, unknown> = {}
    if (avatarUrl) update.avatarUrl = avatarUrl
    if (name?.trim()) update.name = name.trim()
    if (f1Enabled !== undefined) update.f1Enabled = f1Enabled
    await User.findByIdAndUpdate(req.userId, update)
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Failed to update profile' })
  }
}
