import { Router, Request, Response } from 'express'
import { WaitlistEntry } from '../models/WaitlistEntry'
import { requireAuth } from '../middleware/auth'
import { requireAdmin } from '../middleware/requireAdmin'

const router = Router()

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/

// POST /api/waitlist — public, landing page beta signup form
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { name, email, currentTools, scenario, consent } = req.body as {
    name?: string; email?: string; currentTools?: string; scenario?: string; consent?: boolean
  }

  if (!name?.trim() || !email?.trim() || !consent) {
    res.status(400).json({ error: "Вкажіть ім'я, email і згоду на участь" })
    return
  }
  if (!EMAIL_RE.test(email.trim())) {
    res.status(400).json({ error: 'Невірний формат email' })
    return
  }

  try {
    await WaitlistEntry.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      currentTools: currentTools?.trim() ?? '',
      scenario: scenario?.trim() ?? '',
      consent: true,
    })
    res.status(201).json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Помилка збереження заявки' })
  }
})

// GET /api/waitlist — admin only, list signups
router.get('/', requireAuth, requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  try {
    const entries = await WaitlistEntry.find({}).sort({ createdAt: -1 }).lean()
    res.json(entries.map(e => ({
      id: (e._id as { toString(): string }).toString(),
      name: e.name,
      email: e.email,
      currentTools: e.currentTools,
      scenario: e.scenario,
      createdAt: e.createdAt,
    })))
  } catch {
    res.status(500).json({ error: 'Помилка завантаження списку' })
  }
})

export default router
