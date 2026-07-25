import { Router, Request, Response } from 'express'
import RecurringPayment from '../models/RecurringPayment'
import Transaction from '../models/Transaction'
import Category from '../models/Category'
import { requireAuth } from '../middleware/auth'

const router = Router()
router.use(requireAuth)

router.get('/', async (req: Request, res: Response): Promise<void> => {
  const items = await RecurringPayment.find({ userId: req.userId }).sort({ dayOfMonth: 1 })
  res.json(items)
})

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { name, amount, dayOfMonth, category, currency, amountForeign } = req.body as {
    name?: string; amount?: number; dayOfMonth?: number; category?: string
    currency?: 'UAH' | 'USD' | 'EUR'; amountForeign?: number
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
    currency: currency || 'UAH',
    amountForeign: amountForeign ?? null,
  })
  res.status(201).json(item)
})

router.patch('/:id', async (req: Request, res: Response): Promise<void> => {
  const { name, amount, amountForeign, currency, dayOfMonth, isActive, reminderDays } = req.body as {
    name?: string; amount?: number; amountForeign?: number | null
    currency?: 'UAH' | 'USD' | 'EUR'; dayOfMonth?: number; isActive?: boolean
    reminderDays?: number[]
  }

  const item = await RecurringPayment.findOne({ _id: req.params.id, userId: req.userId })
  if (!item) { res.status(404).json({ error: 'Not found' }); return }

  if (name          !== undefined) item.name          = name.trim()
  if (amount        !== undefined) item.amount        = amount
  if (amountForeign !== undefined) item.amountForeign = amountForeign ?? null
  if (currency      !== undefined) item.currency      = currency
  if (dayOfMonth    !== undefined) item.dayOfMonth    = dayOfMonth
  if (isActive      !== undefined) item.isActive      = isActive
  if (reminderDays  !== undefined) item.reminderDays  = reminderDays

  await item.save()
  res.json(item)
})

router.post('/:id/confirm', async (req: Request, res: Response): Promise<void> => {
  const item = await RecurringPayment.findOne({ _id: req.params.id, userId: req.userId })
  if (!item) { res.status(404).json({ error: 'Not found' }); return }

  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  if (item.lastConfirmedMonth === currentMonth) {
    res.status(409).json({ error: 'Already confirmed this month' }); return
  }

  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  // Find or create "Підписки" category for this user
  let subsCat = await Category.findOne({ userId: req.userId, name: { $regex: /^підписки$/i } })
  if (!subsCat) {
    subsCat = await Category.create({
      userId: req.userId,
      name:   'Підписки',
      icon:   'ti-refresh',
      color:  '#6366f1',
    })
  }

  const transaction = await Transaction.create({
    userId:      req.userId,
    type:        'expense',
    amount:      item.amount,
    category:    subsCat.name,
    categoryId:  (subsCat._id as { toString(): string }).toString(),
    title:       item.name,
    desc:        'Регулярний платіж',
    date:        dateStr,
    recurringId: (item._id as { toString(): string }).toString(),
  })

  item.lastConfirmedMonth = currentMonth
  await item.save()

  res.json({ payment: item, transaction })
})

router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  await RecurringPayment.findOneAndDelete({ _id: req.params.id, userId: req.userId })
  res.status(204).end()
})

export default router
