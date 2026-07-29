import { Request, Response } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { OAuth2Client } from 'google-auth-library'
import { Resend } from 'resend'
import { User } from '../models/User'
import { RefreshToken } from '../models/RefreshToken'
import { FamilyLink } from '../models/FamilyLink'
import { seedCategoriesForUser } from '../scripts/seedCategories'
import { validateEmailDomain } from '../utils/emailValidation'

const CLIENT_URL = process.env.CLIENT_URL ?? 'https://hud-murex.vercel.app'

async function sendVerificationEmail(email: string, token: string, name: string): Promise<void> {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const link = `${CLIENT_URL}/verify?token=${token}`
  await resend.emails.send({
    from: 'MIMIR <noreply@mimir-hud.tech>',
    to: email,
    subject: 'Підтвердіть ваш email — MIMIR',
    html: `<!DOCTYPE html>
<html lang="uk">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0e0e0e;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0e0e0e;padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#161616;border:1px solid #2a2a2a;border-radius:2px;overflow:hidden;box-shadow:0 24px 64px rgba(0,0,0,0.5);">

        <!-- Accent bar -->
        <tr>
          <td style="height:4px;background:linear-gradient(90deg,#7a6022,#c9a84c,#f0d98c,#c9a84c,#7a6022);font-size:0;line-height:0;">&nbsp;</td>
        </tr>

        <!-- Header -->
        <tr>
          <td style="background:radial-gradient(ellipse at center,#1c1813 0%,#111 70%);padding:36px 40px 30px;text-align:center;">
            <img src="${CLIENT_URL}/icons/icon-192.png" width="56" height="56" alt="MIMIR" style="display:block;margin:0 auto 16px;border-radius:12px;border:1px solid #c9a84c;">
            <div style="font-size:28px;letter-spacing:8px;color:#c9a84c;font-weight:700;font-family:Georgia,serif;">MIMIR</div>
            <div style="font-size:10px;letter-spacing:4px;color:#666;margin-top:6px;text-transform:uppercase;">Heads Up Display</div>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px 40px 32px;">
            <p style="margin:0 0 8px;font-size:13px;letter-spacing:2px;color:#c9a84c;text-transform:uppercase;">◆ Верифікація email</p>
            <p style="margin:0 0 24px;font-size:22px;color:#e8e0d0;line-height:1.4;">Привіт, ${name}!</p>
            <p style="margin:0 0 32px;font-size:14px;color:#888;line-height:1.7;">
              Для завершення реєстрації в <strong style="color:#c9a84c;">MIMIR</strong> підтвердіть вашу електронну адресу. Натисніть кнопку нижче — посилання дійсне <strong style="color:#e8e0d0;">24 години</strong>.
            </p>

            <!-- CTA Button -->
            <table cellpadding="0" cellspacing="0" style="margin:0 auto 32px;">
              <tr>
                <td style="background:linear-gradient(135deg,#e0c172,#c9a84c);border-radius:2px;box-shadow:0 8px 24px rgba(201,168,76,0.25);">
                  <a href="${link}" style="display:block;padding:14px 40px;font-size:12px;letter-spacing:3px;color:#0e0e0e;text-decoration:none;font-weight:700;text-transform:uppercase;font-family:Georgia,serif;">
                    ПІДТВЕРДИТИ EMAIL
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:0;font-size:11px;color:#444;line-height:1.6;word-break:break-all;">
              Або скопіюйте посилання вручну:<br>
              <a href="${link}" style="color:#666;">${link}</a>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="border-top:1px solid #1e1e1e;padding:20px 40px;text-align:center;">
            <p style="margin:0;font-size:11px;color:#444;letter-spacing:1px;">
              DRINK DEEP &nbsp;◆&nbsp; mimir-hud.tech
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
  })
}

async function sendPasswordResetEmail(email: string, token: string, name: string): Promise<void> {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const link = `${CLIENT_URL}/reset-password?token=${token}`
  await resend.emails.send({
    from: 'MIMIR <noreply@mimir-hud.tech>',
    to: email,
    subject: 'Відновлення пароля — MIMIR',
    html: `<!DOCTYPE html>
<html lang="uk">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0e0e0e;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0e0e0e;padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#161616;border:1px solid #2a2a2a;border-radius:2px;overflow:hidden;box-shadow:0 24px 64px rgba(0,0,0,0.5);">

        <!-- Accent bar -->
        <tr>
          <td style="height:4px;background:linear-gradient(90deg,#7a6022,#c9a84c,#f0d98c,#c9a84c,#7a6022);font-size:0;line-height:0;">&nbsp;</td>
        </tr>

        <!-- Header -->
        <tr>
          <td style="background:radial-gradient(ellipse at center,#1c1813 0%,#111 70%);padding:36px 40px 30px;text-align:center;">
            <img src="${CLIENT_URL}/icons/icon-192.png" width="56" height="56" alt="MIMIR" style="display:block;margin:0 auto 16px;border-radius:12px;border:1px solid #c9a84c;">
            <div style="font-size:28px;letter-spacing:8px;color:#c9a84c;font-weight:700;font-family:Georgia,serif;">MIMIR</div>
            <div style="font-size:10px;letter-spacing:4px;color:#666;margin-top:6px;text-transform:uppercase;">Heads Up Display</div>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px 40px 32px;">
            <p style="margin:0 0 8px;font-size:13px;letter-spacing:2px;color:#c9a84c;text-transform:uppercase;">◆ Відновлення пароля</p>
            <p style="margin:0 0 24px;font-size:22px;color:#e8e0d0;line-height:1.4;">Привіт, ${name}!</p>
            <p style="margin:0 0 32px;font-size:14px;color:#888;line-height:1.7;">
              Хтось (сподіваємось, ви) запросив відновлення пароля для акаунту <strong style="color:#c9a84c;">MIMIR</strong>. Натисніть кнопку нижче, щоб встановити новий пароль — посилання дійсне <strong style="color:#e8e0d0;">1 годину</strong>. Якщо це були не ви — просто ігноруйте цей лист.
            </p>

            <!-- CTA Button -->
            <table cellpadding="0" cellspacing="0" style="margin:0 auto 32px;">
              <tr>
                <td style="background:linear-gradient(135deg,#e0c172,#c9a84c);border-radius:2px;box-shadow:0 8px 24px rgba(201,168,76,0.25);">
                  <a href="${link}" style="display:block;padding:14px 40px;font-size:12px;letter-spacing:3px;color:#0e0e0e;text-decoration:none;font-weight:700;text-transform:uppercase;font-family:Georgia,serif;">
                    ВІДНОВИТИ ПАРОЛЬ
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:0;font-size:11px;color:#444;line-height:1.6;word-break:break-all;">
              Або скопіюйте посилання вручну:<br>
              <a href="${link}" style="color:#666;">${link}</a>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="border-top:1px solid #1e1e1e;padding:20px 40px;text-align:center;">
            <p style="margin:0;font-size:11px;color:#444;letter-spacing:1px;">
              DRINK DEEP &nbsp;◆&nbsp; mimir-hud.tech
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
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
  f1Enabled:      user.f1Enabled ?? false,
  drinksEnabled:  user.drinksEnabled ?? false,
  salaryDay:         user.salaryDay ?? 1,
  monthlySpendLimit: user.monthlySpendLimit ?? null,
  city:           user.city ?? '',
  morningStart:   user.morningStart   ?? 6,
  afternoonStart: user.afternoonStart ?? 12,
  eveningStart:   user.eveningStart   ?? 18,
  hasPIN: !!user.pinHash,
  isVerified: user.isVerified ?? false,
  reportStyle: user.reportStyle ?? 'standard',
  mediaEnabledTabs: user.mediaEnabledTabs?.length ? user.mediaEnabledTabs : ['movie', 'series', 'anime', 'game'],
  sprintTutorialSeen: user.sprintTutorialSeen ?? false,
  weekdayLongPressTutorialSeen: user.weekdayLongPressTutorialSeen ?? false,
  swipeDismissTutorialSeen: user.swipeDismissTutorialSeen ?? false,
  sprintTutorialShownCount: user.sprintTutorialShownCount ?? 0,
  weekdayLongPressShownCount: user.weekdayLongPressShownCount ?? 0,
  swipeDismissShownCount: user.swipeDismissShownCount ?? 0,
  unlockedAchievements: (user.unlockedAchievements ?? []).map(a => ({
    id: a.id,
    unlockedAt: a.unlockedAt.toISOString(),
  })),
  // ?? true — existing users without the field should skip onboarding
  onboardingCompleted: user.onboardingCompleted ?? true,
  mimirSeenHints: user.mimirSeenHints ?? [],
  plan: user.plan ?? 'free',
  subscriptionStatus: user.subscriptionStatus ?? 'none',
})

const COOKIE_NAME = 'rt'
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000

function signAccessToken(userId: string, role: string): string {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET!, { expiresIn: '15m' })
}

async function issueRefreshToken(userId: string): Promise<string> {
  const raw = crypto.randomBytes(40).toString('hex')
  const tokenHash = crypto.createHash('sha256').update(raw).digest('hex')
  await RefreshToken.create({ userId, tokenHash, expiresAt: new Date(Date.now() + REFRESH_TTL_MS) })
  return raw
}

function setRefreshCookie(res: Response, raw: string): void {
  res.cookie(COOKIE_NAME, raw, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: REFRESH_TTL_MS,
    path: '/',
  })
}

async function sendAuthResponse(res: Response, userId: string, role: string, user: ReturnType<typeof USER_PUBLIC_FIELDS>, status = 200): Promise<void> {
  const [accessToken, refreshRaw] = await Promise.all([
    Promise.resolve(signAccessToken(userId, role)),
    issueRefreshToken(userId),
  ])
  setRefreshCookie(res, refreshRaw)
  // Include refreshToken in body so clients behind SW (cross-origin cookie issue) can store it
  res.status(status).json({ token: accessToken, user, refreshToken: refreshRaw })
}

// ── Email auth ────────────────────────────────────────────────────────────────

/** POST /auth/register — { email, password, name, username } → JWT + user
 *  If username exists but has no passwordHash → claims the existing account.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/
const USERNAME_RE = /^[a-z0-9_]{3,20}$/

export async function register(req: Request, res: Response): Promise<void> {
  const { email, password, name, username } = req.body as {
    email?: string; password?: string; name?: string; username?: string
  }

  if (!email || !password || !name || !username) {
    res.status(400).json({ error: "Заповніть ім'я, нікнейм, email і пароль" })
    return
  }
  if (!EMAIL_RE.test(email.trim())) {
    res.status(400).json({ error: 'Невірний формат email' })
    return
  }

  const domainError = await validateEmailDomain(email.trim())
  if (domainError) {
    res.status(400).json({ error: domainError })
    return
  }

  if (!USERNAME_RE.test(username.trim().toLowerCase())) {
    res.status(400).json({ error: 'Нікнейм: 3-20 символів, тільки латиниця, цифри і "_"' })
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
      const migrationToken = crypto.randomBytes(32).toString('hex')
      user.verificationToken = migrationToken
      if (!user.name || user.name === user.username) user.name = name.trim()
      await user.save()
      sendVerificationEmail(normalEmail, migrationToken, user.name).catch(() => {})
    } else {
      const verificationToken = crypto.randomBytes(32).toString('hex')
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
      sendVerificationEmail(normalEmail, verificationToken, name.trim()).catch(() => {})
    }

    const userId = (user._id as { toString(): string }).toString()
    await sendAuthResponse(res, userId, user.role, USER_PUBLIC_FIELDS(user), 201)
  } catch (err) {
    if (err instanceof Error && err.name === 'ValidationError') {
      res.status(400).json({ error: 'Некоректні дані реєстрації' })
      return
    }
    res.status(500).json({ error: 'Помилка реєстрації' })
  }
}

/** POST /auth/login — { username, password } → JWT + user */
export async function loginEmail(req: Request, res: Response): Promise<void> {
  const { username, password } = req.body as { username?: string; password?: string }
  if (!username || !password) {
    res.status(400).json({ error: 'Вкажіть нікнейм і пароль' })
    return
  }

  try {
    const user = await User.findOne({ username: username.toLowerCase().trim() })
    if (!user?.passwordHash) {
      res.status(401).json({ error: 'Неправильний нікнейм або пароль' })
      return
    }

    const match = await bcrypt.compare(password, user.passwordHash)
    if (!match) {
      res.status(401).json({ error: 'Неправильний нікнейм або пароль' })
      return
    }

    if (user.accountStatus === 'deletion_requested' || user.accountStatus === 'deleted') {
      res.status(403).json({ error: 'Цей акаунт позначений для видалення. Зверніться до підтримки.' })
      return
    }

    const userId = (user._id as { toString(): string }).toString()
    await sendAuthResponse(res, userId, user.role, USER_PUBLIC_FIELDS(user))
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
    await sendAuthResponse(res, userId, user.role, USER_PUBLIC_FIELDS(user))
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
    const userId = (user._id as { toString(): string }).toString()
    await sendAuthResponse(res, userId, user.role, USER_PUBLIC_FIELDS(user))
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

// ── Password reset ─────────────────────────────────────────────────────────────

/** POST /auth/forgot-password — { email } → sends reset link if account exists (always 200, no email enumeration) */
export async function forgotPassword(req: Request, res: Response): Promise<void> {
  const { email } = req.body as { email?: string }
  if (!email) {
    res.status(400).json({ error: 'email required' })
    return
  }
  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() })
    if (user?.passwordHash) {
      const resetToken = crypto.randomBytes(32).toString('hex')
      user.resetPasswordToken = resetToken
      user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000)
      await user.save()
      if (process.env.RESEND_API_KEY) {
        sendPasswordResetEmail(user.email!, resetToken, user.name).catch(() => {})
      }
    }
    // Same response whether or not the account exists — prevents email enumeration
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Помилка відправки листа' })
  }
}

/** POST /auth/reset-password — { token, newPassword } → sets new password and logs in */
export async function resetPassword(req: Request, res: Response): Promise<void> {
  const { token, newPassword } = req.body as { token?: string; newPassword?: string }
  if (!token || !newPassword) {
    res.status(400).json({ error: 'token and newPassword required' })
    return
  }
  if (newPassword.length < 6) {
    res.status(400).json({ error: 'Пароль мінімум 6 символів' })
    return
  }
  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    })
    if (!user) {
      res.status(400).json({ error: 'Невалідне або прострочене посилання' })
      return
    }
    user.passwordHash = await bcrypt.hash(newPassword, 10)
    user.resetPasswordToken = null
    user.resetPasswordExpires = null
    await user.save()
    const userId = (user._id as { toString(): string }).toString()
    await sendAuthResponse(res, userId, user.role, USER_PUBLIC_FIELDS(user))
  } catch {
    res.status(500).json({ error: 'Помилка відновлення пароля' })
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


/** GET /auth/admin/users — admin-only list of all registered users with plan + family groups */
export async function getAllUsers(req: Request, res: Response): Promise<void> {
  try {
    const users = await User.find(
      {},
      { name: 1, username: 1, email: 1, role: 1, avatarUrl: 1, createdAt: 1, plan: 1, subscriptionStatus: 1, planExpiresAt: 1, f1Enabled: 1, drinksEnabled: 1 },
    ).sort({ createdAt: -1 })

    const links = await FamilyLink.find({ status: 'accepted' }, { requester: 1, recipient: 1 })
    const familyMap = new Map<string, string[]>()
    for (const link of links) {
      const a = link.requester.toString()
      const b = link.recipient.toString()
      if (!familyMap.has(a)) familyMap.set(a, [])
      if (!familyMap.has(b)) familyMap.set(b, [])
      familyMap.get(a)!.push(b)
      familyMap.get(b)!.push(a)
    }

    res.json(users.map(u => {
      const id = (u._id as { toString(): string }).toString()
      return {
        id,
        name: u.name,
        username: u.username,
        email: u.email ?? null,
        role: u.role,
        avatarUrl: u.avatarUrl ?? null,
        createdAt: u.createdAt,
        plan: u.plan ?? 'free',
        subscriptionStatus: u.subscriptionStatus ?? 'none',
        planExpiresAt: u.planExpiresAt ?? null,
        f1Enabled: u.f1Enabled ?? false,
        drinksEnabled: u.drinksEnabled ?? false,
        familyIds: familyMap.get(id) ?? [],
      }
    }))
  } catch {
    res.status(500).json({ error: 'Failed to fetch users' })
  }
}

/** PATCH /auth/admin/users/:id/plan — set plan + subscriptionStatus manually; or add months to planExpiresAt */
export async function adminSetPlan(req: Request, res: Response): Promise<void> {
  const { plan, subscriptionStatus, months } = req.body as { plan?: string; subscriptionStatus?: string; months?: number }
  const validPlans = ['free', 'personal', 'couple', 'family']
  const validStatuses = ['none', 'trialing', 'active', 'past_due', 'canceled']
  if (plan && !validPlans.includes(plan)) { res.status(400).json({ error: 'Invalid plan' }); return }
  if (subscriptionStatus && !validStatuses.includes(subscriptionStatus)) { res.status(400).json({ error: 'Invalid status' }); return }
  if (months !== undefined && (typeof months !== 'number' || months < 1 || months > 24)) {
    res.status(400).json({ error: 'months must be 1–24' }); return
  }
  try {
    const user = await User.findById(req.params.id)
    if (!user) { res.status(404).json({ error: 'Not found' }); return }
    if (plan) user.plan = plan as 'free' | 'personal' | 'couple' | 'family'
    if (subscriptionStatus) user.subscriptionStatus = subscriptionStatus as 'none' | 'trialing' | 'active' | 'past_due' | 'canceled'
    if (months !== undefined) {
      const now = new Date()
      const base = user.planExpiresAt && user.planExpiresAt > now ? user.planExpiresAt : now
      const next = new Date(base)
      next.setMonth(next.getMonth() + months)
      user.planExpiresAt = next
      user.planExpiryWarningSentAt = null  // reset warning so admin gets notified again
    }
    if (plan === 'free') {
      user.planExpiresAt = null
      user.planExpiryWarningSentAt = null
    }
    await user.save()
    res.json({
      id: req.params.id,
      plan: user.plan,
      subscriptionStatus: user.subscriptionStatus,
      planExpiresAt: user.planExpiresAt ?? null,
    })
  } catch {
    res.status(500).json({ error: 'Failed to update plan' })
  }
}

/** DELETE /auth/admin/users/:id — hard-delete user (admin only) */
export async function adminDeleteUser(req: Request, res: Response): Promise<void> {
  if (req.params.id === req.userId) { res.status(400).json({ error: 'Cannot delete yourself' }); return }
  try {
    const user = await User.findByIdAndDelete(req.params.id)
    if (!user) { res.status(404).json({ error: 'Not found' }); return }
    await RefreshToken.deleteMany({ userId: req.params.id })
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Failed to delete user' })
  }
}


/** PATCH /auth/admin/users/:id/flags — toggle f1Enabled / drinksEnabled */
export async function adminToggleFlag(req: Request, res: Response): Promise<void> {
  const allowed = ['f1Enabled', 'drinksEnabled']
  const updates: Record<string, boolean> = {}
  for (const key of allowed) {
    if (typeof req.body[key] === 'boolean') updates[key] = req.body[key]
  }
  if (Object.keys(updates).length === 0) { res.status(400).json({ error: 'No valid flags' }); return }
  try {
    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true })
    if (!user) { res.status(404).json({ error: 'Not found' }); return }
    res.json({ id: req.params.id, f1Enabled: user.f1Enabled, drinksEnabled: user.drinksEnabled })
  } catch {
    res.status(500).json({ error: 'Failed to update flags' })
  }
}

/** PATCH /auth/me — update name, avatar, f1Enabled, salaryDay, username for active user */
export async function updateMe(req: Request, res: Response): Promise<void> {
  const { avatarUrl, name, f1Enabled, salaryDay, monthlySpendLimit, username, city, morningStart, afternoonStart, eveningStart, reportStyle, mediaEnabledTabs, unlockedAchievements, sprintTutorialSeen, weekdayLongPressTutorialSeen, swipeDismissTutorialSeen, sprintTutorialShownCount, weekdayLongPressShownCount, swipeDismissShownCount, onboardingCompleted, mimirSeenHints } = req.body as {
    avatarUrl?: string; name?: string; f1Enabled?: boolean; salaryDay?: number; monthlySpendLimit?: number | null; username?: string
    city?: string; morningStart?: number; afternoonStart?: number; eveningStart?: number; reportStyle?: string
    mediaEnabledTabs?: string[]; unlockedAchievements?: ({ id: string } | string)[]; sprintTutorialSeen?: boolean
    weekdayLongPressTutorialSeen?: boolean; swipeDismissTutorialSeen?: boolean
    sprintTutorialShownCount?: number; weekdayLongPressShownCount?: number; swipeDismissShownCount?: number
    onboardingCompleted?: boolean; mimirSeenHints?: string[]
  }
  if (!avatarUrl && !name && f1Enabled === undefined && salaryDay === undefined && monthlySpendLimit === undefined && !username &&
      city === undefined && morningStart === undefined && afternoonStart === undefined && eveningStart === undefined &&
      reportStyle === undefined && mediaEnabledTabs === undefined && unlockedAchievements === undefined &&
      sprintTutorialSeen === undefined && weekdayLongPressTutorialSeen === undefined && swipeDismissTutorialSeen === undefined &&
      sprintTutorialShownCount === undefined && weekdayLongPressShownCount === undefined && swipeDismissShownCount === undefined &&
      onboardingCompleted === undefined && mimirSeenHints === undefined) {
    res.status(400).json({ error: 'At least one field required' })
    return
  }

  try {
    const update: Record<string, unknown> = {}
    if (avatarUrl) update.avatarUrl = avatarUrl
    if (name?.trim()) update.name = name.trim()
    if (f1Enabled !== undefined) update.f1Enabled = f1Enabled
    if (salaryDay !== undefined) {
      const day = Math.round(salaryDay)
      if (day < 1 || day > 31) { res.status(400).json({ error: 'salaryDay must be 1–31' }); return }
      update.salaryDay = day
    }
    if (monthlySpendLimit !== undefined) {
      update.monthlySpendLimit = monthlySpendLimit === null ? null : Math.max(0, Math.round(monthlySpendLimit))
    }
    if (username?.trim()) {
      const slug = username.trim().toLowerCase()
      const exists = await User.findOne({ username: slug, _id: { $ne: req.userId } })
      if (exists) { res.status(409).json({ error: 'Username already taken' }); return }
      update.username = slug
    }
    if (city !== undefined) update.city = city.trim()
    if (morningStart !== undefined)   update.morningStart   = Math.max(0, Math.min(23, Math.round(morningStart)))
    if (afternoonStart !== undefined) update.afternoonStart = Math.max(0, Math.min(23, Math.round(afternoonStart)))
    if (eveningStart !== undefined)   update.eveningStart   = Math.max(0, Math.min(23, Math.round(eveningStart)))
    const VALID_STYLES = ['standard', 'coach', 'yoda', 'kozak', 'motivator', 'accountant']
    if (reportStyle !== undefined && VALID_STYLES.includes(reportStyle)) update.reportStyle = reportStyle
    const VALID_MEDIA_TABS = ['movie', 'series', 'anime', 'game', 'book']
    if (Array.isArray(mediaEnabledTabs)) {
      update.mediaEnabledTabs = mediaEnabledTabs.filter(t => VALID_MEDIA_TABS.includes(t))
    }
    if (sprintTutorialSeen !== undefined) update.sprintTutorialSeen = sprintTutorialSeen
    if (weekdayLongPressTutorialSeen !== undefined) update.weekdayLongPressTutorialSeen = weekdayLongPressTutorialSeen
    if (swipeDismissTutorialSeen !== undefined) update.swipeDismissTutorialSeen = swipeDismissTutorialSeen
    if (sprintTutorialShownCount !== undefined) update.sprintTutorialShownCount = sprintTutorialShownCount
    if (weekdayLongPressShownCount !== undefined) update.weekdayLongPressShownCount = weekdayLongPressShownCount
    if (swipeDismissShownCount !== undefined) update.swipeDismissShownCount = swipeDismissShownCount
    if (onboardingCompleted !== undefined) update.onboardingCompleted = onboardingCompleted
    if (Array.isArray(mimirSeenHints)) {
      update.mimirSeenHints = [...new Set(mimirSeenHints.filter(h => typeof h === 'string' && h.length <= 64))].slice(0, 200)
    }
    if (Array.isArray(unlockedAchievements)) {
      const incomingIds = unlockedAchievements
        .map(a => (typeof a === 'string' ? a : a?.id))
        .filter((id): id is string => typeof id === 'string' && id.length > 0 && id.length <= 64)
      const current = await User.findById(req.userId, { unlockedAchievements: 1 })
      const existingDates = new Map((current?.unlockedAchievements ?? []).map(a => [a.id, a.unlockedAt]))
      update.unlockedAchievements = [...new Set(incomingIds)].slice(0, 100).map(id => ({
        id,
        unlockedAt: existingDates.get(id) ?? new Date(),
      }))
    }
    await User.findByIdAndUpdate(req.userId, update)
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Failed to update profile' })
  }
}

/** POST /auth/refresh — reads httpOnly cookie OR body.refreshToken (SW cross-origin fallback) */
export async function refresh(req: Request, res: Response): Promise<void> {
  const raw = req.cookies?.[COOKIE_NAME] ?? (req.body as { refreshToken?: string })?.refreshToken
  if (!raw) { res.status(401).json({ error: 'No refresh token' }); return }

  try {
    const tokenHash = crypto.createHash('sha256').update(raw).digest('hex')
    const stored = await RefreshToken.findOne({ tokenHash, expiresAt: { $gt: new Date() } })
    if (!stored) { res.status(401).json({ error: 'Invalid or expired refresh token' }); return }

    const user = await User.findById(stored.userId)
    if (!user) { res.status(401).json({ error: 'User not found' }); return }

    if (user.accountStatus === 'deletion_requested' || user.accountStatus === 'deleted') {
      await stored.deleteOne()
      res.clearCookie('rt', { httpOnly: true, secure: true, sameSite: 'none', path: '/' })
      res.status(403).json({ error: 'Акаунт позначений для видалення.' })
      return
    }

    // Rotate: delete old, issue new
    await stored.deleteOne()
    const userId = (user._id as { toString(): string }).toString()
    const [accessToken, refreshRaw] = await Promise.all([
      Promise.resolve(signAccessToken(userId, user.role)),
      issueRefreshToken(userId),
    ])
    setRefreshCookie(res, refreshRaw)
    res.json({ token: accessToken, user: USER_PUBLIC_FIELDS(user), refreshToken: refreshRaw })
  } catch {
    res.status(500).json({ error: 'Refresh failed' })
  }
}

/** POST /auth/logout — clears refresh token cookie + DB record */
export async function logout(req: Request, res: Response): Promise<void> {
  const raw = req.cookies?.[COOKIE_NAME] ?? (req.body as { refreshToken?: string })?.refreshToken
  if (raw) {
    const tokenHash = crypto.createHash('sha256').update(raw).digest('hex')
    await RefreshToken.deleteOne({ tokenHash }).catch(() => {})
  }
  res.clearCookie(COOKIE_NAME, { httpOnly: true, secure: true, sameSite: 'none', path: '/' })
  res.json({ ok: true })
}

/** POST /auth/change-password — { currentPassword, newPassword } */
export async function changePassword(req: Request, res: Response): Promise<void> {
  const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string }
  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: 'currentPassword and newPassword required' })
    return
  }
  if (newPassword.length < 6) {
    res.status(400).json({ error: 'New password must be at least 6 characters' })
    return
  }
  try {
    const user = await User.findById(req.userId)
    if (!user || !user.passwordHash) {
      res.status(400).json({ error: 'Password auth not available for this account' })
      return
    }
    const match = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!match) { res.status(401).json({ error: 'Current password is incorrect' }); return }
    user.passwordHash = await bcrypt.hash(newPassword, 10)
    await user.save()
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Failed to change password' })
  }
}
