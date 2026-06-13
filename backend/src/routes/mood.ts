import { Router, Request, Response } from 'express'
import { requireAuth } from '../middleware/auth'
import MoodLog from '../models/MoodLog'

const router = Router()
router.use(requireAuth)

// GET /api/mood?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const { from, to } = req.query as { from?: string; to?: string }
  const filter: Record<string, unknown> = { userId: req.userId }
  if (from || to) {
    filter.date = {
      ...(from ? { $gte: from } : {}),
      ...(to   ? { $lte: to   } : {}),
    }
  }
  const logs = await MoodLog.find(filter).sort({ date: -1 })
  res.json(logs)
})

// PUT /api/mood/:date  { score: 1-5 }  — upsert
router.put('/:date', async (req: Request, res: Response): Promise<void> => {
  const { date } = req.params
  const { score } = req.body as { score: number }
  if (!score || score < 1 || score > 5) {
    res.status(400).json({ error: 'score must be 1–5' })
    return
  }
  const log = await MoodLog.findOneAndUpdate(
    { userId: req.userId, date },
    { userId: req.userId, date, score },
    { upsert: true, new: true }
  )
  res.json(log)
})

// DELETE /api/mood/:date
router.delete('/:date', async (req: Request, res: Response): Promise<void> => {
  await MoodLog.deleteOne({ userId: req.userId, date: req.params.date })
  res.json({ success: true })
})

export default router
