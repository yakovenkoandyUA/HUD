import { Router, Request, Response } from 'express'
import { requireAuth } from '../middleware/auth'
import { User } from '../models/User'

const router = Router()
router.use(requireAuth)

// POST /api/feedback
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { message, imageUrl, page } = req.body as {
    message: string
    imageUrl?: string
    page?: string
  }

  if (!message?.trim()) {
    res.status(400).json({ error: 'Message required' })
    return
  }

  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  if (!token || !chatId) {
    res.status(503).json({ error: 'Feedback not configured' })
    return
  }

  const user = await User.findById(req.userId).select('name username email').lean()
  const who = user
    ? `${user.name} (@${user.username ?? user.email})`
    : req.userId

  const lines = [
    `📬 *Новий фідбек — MIMIR*`,
    `👤 ${who}`,
    page ? `📍 ${page}` : '',
    ``,
    message.trim(),
  ].filter(Boolean)

  const text = lines.join('\n')

  try {
    if (imageUrl) {
      const r = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          photo: imageUrl,
          caption: text,
          parse_mode: 'Markdown',
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
          parse_mode: 'Markdown',
        }),
      })
      if (!r.ok) throw new Error(await r.text())
    }
    res.json({ success: true })
  } catch (err) {
    console.error('Telegram feedback error:', err)
    res.status(500).json({ error: 'Failed to send feedback' })
  }
})

export default router
