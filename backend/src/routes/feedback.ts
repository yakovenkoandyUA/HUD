import { Router, Request, Response } from 'express'
import { requireAuth } from '../middleware/auth'
import { requireAdmin } from '../middleware/requireAdmin'
import { User } from '../models/User'
import { Feedback } from '../models/Feedback'
import { sendPushToUser } from '../services/webpush'

const router = Router()
router.use(requireAuth)

// POST /api/feedback
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { message, imageUrls } = req.body as {
    message: string
    imageUrls?: string[]
  }

  if (!message?.trim()) {
    res.status(400).json({ error: 'Message required' })
    return
  }

  const photos = (imageUrls ?? []).filter(Boolean).slice(0, 3)

  const user = await User.findById(req.userId).select('name username email').lean()

  await Feedback.create({
    userId:    req.userId,
    message:   message.trim(),
    imageUrls: photos,
  })

  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  if (!token || !chatId) {
    // Still saved to DB even without Telegram configured — admin can see it in-app
    res.json({ success: true })
    return
  }

  const who = user
    ? `${user.name} (@${user.username ?? user.email})`
    : req.userId

  const lines = [
    `📬 Новий фідбек — MIMIR`,
    `👤 ${who}`,
    ``,
    message.trim(),
  ].filter(Boolean)

  const text = lines.join('\n')

  try {
    if (photos.length > 1) {
      const r = await fetch(`https://api.telegram.org/bot${token}/sendMediaGroup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          media: photos.map((url, i) => ({
            type: 'photo',
            media: url,
            ...(i === 0 ? { caption: text } : {}),
          })),
        }),
      })
      if (!r.ok) throw new Error(await r.text())
    } else if (photos.length === 1) {
      const r = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          photo: photos[0],
          caption: text,
        }),
      })
      if (!r.ok) throw new Error(await r.text())
    } else {
      const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
        }),
      })
      if (!r.ok) throw new Error(await r.text())
    }
    res.json({ success: true })
  } catch (err) {
    console.error('Telegram feedback error:', err)
    // Already saved to DB — don't fail the request just because Telegram notify failed
    res.json({ success: true })
  }
})

// GET /api/feedback/mine — own feedback history with admin replies, newest first
router.get('/mine', async (req: Request, res: Response): Promise<void> => {
  const entries = await Feedback.find({ userId: req.userId }).sort({ createdAt: -1 }).limit(50).lean()
  res.json(entries.map(e => ({
    id:         (e._id as { toString(): string }).toString(),
    message:    e.message,
    imageUrls:  e.imageUrls?.length ? e.imageUrls : (e.imageUrl ? [e.imageUrl] : []),
    status:     e.status,
    adminReply: e.adminReply,
    repliedAt:  e.repliedAt,
    createdAt:  e.createdAt,
  })))
})

// GET /api/feedback — admin only, newest first
router.get('/', requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  const entries = await Feedback.find().sort({ createdAt: -1 }).limit(200).lean()
  const userIds = [...new Set(entries.map(e => e.userId))]
  const users = await User.find({ _id: { $in: userIds } }).select('name username avatarUrl').lean()
  const userMap = new Map(users.map(u => [(u._id as { toString(): string }).toString(), u]))

  res.json(entries.map(e => {
    const u = userMap.get(e.userId)
    return {
      id:         (e._id as { toString(): string }).toString(),
      userName:   u?.name ?? 'Хтось',
      userAvatar: u?.avatarUrl ?? null,
      message:    e.message,
      imageUrls:  e.imageUrls?.length ? e.imageUrls : (e.imageUrl ? [e.imageUrl] : []),
      status:     e.status,
      adminReply: e.adminReply,
      repliedAt:  e.repliedAt,
      createdAt:  e.createdAt,
    }
  }))
})

// PATCH /api/feedback/:id/reply — admin only, replies + notifies the user via push
router.patch('/:id/reply', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { reply } = req.body as { reply?: string }
  if (!reply?.trim()) { res.status(400).json({ error: 'Reply required' }); return }

  const entry = await Feedback.findById(req.params.id)
  if (!entry) { res.status(404).json({ error: 'Not found' }); return }

  entry.adminReply = reply.trim()
  entry.status = 'resolved'
  entry.repliedAt = new Date()
  await entry.save()

  sendPushToUser(entry.userId, {
    title: 'Відповідь на твій фідбек',
    body:  reply.trim(),
    url:   '/profile',
  }).catch(() => { /* push optional */ })

  res.json({ success: true })
})

export default router
