import { Router, Request, Response } from 'express'
import RecurringPayment from '../models/RecurringPayment'
import { requireAuth } from '../middleware/auth'

const router = Router()
router.use(requireAuth)

router.get('/', async (req: Request, res: Response): Promise<void> => {
  const items = await RecurringPayment.find({ userId: req.userId }).sort({ dayOfMonth: 1 })
  res.json(items)
})

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { name, amount, dayOfMonth, category } = req.body as {
    name?: string; amount?: number; dayOfMonth?: number; category?: string
  }
  if (!name?.trim() || !amount || !dayOfMonth) {
    res.status(400).json({ error: 'name, amount and dayOfMonth are required' }); return
  }
  const item = await RecurringPayment.create({
    userId: req.userId,
    name: name.trim(),
    amount,
    dayOfMonth,
    category: category?.trim() || 'Інше',
  })
  res.status(201).json(item)
})

router.patch('/:id', async (req: Request, res: Response): Promise<void> => {
  const item = await RecurringPayment.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    req.body,
    { new: true }
  )
  if (!item) { res.status(404).json({ error: 'Not found' }); return }
  res.json(item)
})

router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  await RecurringPayment.findOneAndDelete({ _id: req.params.id, userId: req.userId })
  res.status(204).end()
})

export default router
