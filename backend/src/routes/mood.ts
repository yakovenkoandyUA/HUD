import { Router, Request, Response } from 'express'
import { requireAuth } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { moodSchema } from '../validation/schemas'
import MoodLog from '../models/MoodLog'
import { getAcceptedFamilyIds } from '../controllers/familyController'
import { User } from '../models/User'

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

// GET /api/mood/family/today — today's mood of accepted family members
router.get('/family/today', async (req: Request, res: Response): Promise<void> => {
  const familyIds = await getAcceptedFamilyIds(req.userId!)
  if (familyIds.length === 0) { res.json([]); return }

  const today = new Date().toISOString().slice(0, 10)
  const [logs, users] = await Promise.all([
    MoodLog.find({ userId: { $in: familyIds }, date: today }),
    User.find({ _id: { $in: familyIds } }).select('name username avatarUrl'),
  ])

  const result = logs.map(log => {
    const user = users.find(u => u._id.toString() === log.userId)
    return {
      userId:    log.userId,
      name:      user?.name || user?.username || '?',
      avatarUrl: (user as { avatarUrl?: string })?.avatarUrl ?? null,
      score:     log.score,
      note:      log.note ?? null,
    }
  })

  res.json(result)
})

// PUT /api/mood/:date  { score: 1-5, note?: string }  — upsert
router.put('/:date', validate(moodSchema), async (req: Request, res: Response): Promise<void> => {
  const { date } = req.params
  const { score, note } = req.body as { score: number; note?: string }

  const setFields: Record<string, unknown> = { score }
  if (note !== undefined) setFields.note = note

  const log = await MoodLog.findOneAndUpdate(
    { userId: req.userId, date },
    { $set: setFields, $setOnInsert: { userId: req.userId, date } },
    { upsert: true, new: true }
  )
  res.json(log)
})

// PATCH /api/mood/:date/note  { note: string }  — update note only
router.patch('/:date/note', async (req: Request, res: Response): Promise<void> => {
  const { date } = req.params
  const { note } = req.body as { note: string }

  const log = await MoodLog.findOneAndUpdate(
    { userId: req.userId, date },
    { $set: { note: note ?? '' } },
    { new: true }
  )
  if (!log) { res.status(404).json({ error: 'No mood for this date' }); return }
  res.json(log)
})

// DELETE /api/mood/:date
router.delete('/:date', async (req: Request, res: Response): Promise<void> => {
  await MoodLog.deleteOne({ userId: req.userId, date: req.params.date })
  res.json({ success: true })
})

export default router
