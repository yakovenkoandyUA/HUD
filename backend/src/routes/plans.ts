import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import Plan from '../models/Plan'

const router = Router()

router.get('/', requireAuth, async (req, res) => {
  const filter: Record<string, unknown> = { userId: req.userId }
  if (req.query.spaceId) filter.spaceId = req.query.spaceId
  const plans = await Plan.find(filter).sort({ createdAt: -1 })
  res.json(plans)
})

router.post('/', requireAuth, async (req, res) => {
  const plan = await Plan.create({ userId: req.userId, ...req.body })
  res.status(201).json(plan)
})

router.patch('/:id', requireAuth, async (req, res) => {
  const plan = await Plan.findOne({ _id: req.params.id, userId: req.userId })
  if (!plan) { res.status(404).json({ error: 'Not found' }); return }
  const allowed = [
    'title', 'location', 'withProfiles', 'notes',
    'photos', 'status', 'plannedDate', 'visitedDate', 'memoryId', 'spaceId',
  ]
  allowed.forEach(k => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (req.body[k] !== undefined) (plan as any)[k] = req.body[k]
  })
  await plan.save()
  res.json(plan)
})

router.delete('/:id', requireAuth, async (req, res) => {
  await Plan.findOneAndDelete({ _id: req.params.id, userId: req.userId })
  res.status(204).end()
})

router.post('/:id/photos', requireAuth, async (req, res) => {
  const plan = await Plan.findOne({ _id: req.params.id, userId: req.userId })
  if (!plan) { res.status(404).json({ error: 'Not found' }); return }
  plan.photos.push({ url: req.body.url, caption: req.body.caption ?? '', createdAt: new Date() })
  await plan.save()
  res.json(plan)
})

export default router
