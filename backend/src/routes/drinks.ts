import { Router, Request, Response } from 'express'
import { requireAuth } from '../middleware/auth'
import Drink from '../models/Drink'
import Transaction from '../models/Transaction'
import Category from '../models/Category'

const router = Router()
router.use(requireAuth)

/** GET /api/drinks — list accessible drinks (own + sharedWith) */
router.get('/', async (req: Request, res: Response) => {
  const uid = req.userId!
  const drinks = await Drink.find({
    $or: [{ userId: uid }, { sharedWith: uid }],
  }).sort({ createdAt: -1 })
  res.json(drinks)
})

/** POST /api/drinks — create */
router.post('/', async (req: Request, res: Response) => {
  const drink = await Drink.create({ ...req.body, userId: req.userId })
  res.status(201).json(drink)
})

/** PATCH /api/drinks/:id — update */
router.patch('/:id', async (req: Request, res: Response) => {
  const uid = req.userId!
  const drink = await Drink.findOne({ _id: req.params.id, $or: [{ userId: uid }, { sharedWith: uid }] })
  if (!drink) return res.status(404).json({ error: 'Not found' }) as unknown as void

  const allowed = ['name', 'brand', 'type', 'country', 'distillery', 'abv', 'photo', 'status', 'price', 'rating', 'notes', 'flavor', 'sharedWith']
  allowed.forEach(key => {
    if (req.body[key] !== undefined) (drink as unknown as Record<string, unknown>)[key] = req.body[key]
  })
  await drink.save()
  res.json(drink)
})

/** DELETE /api/drinks/:id */
router.delete('/:id', async (req: Request, res: Response) => {
  const uid = req.userId!
  const drink = await Drink.findOne({ _id: req.params.id, userId: uid })
  if (!drink) return res.status(404).json({ error: 'Not found' }) as unknown as void
  await drink.deleteOne()
  res.json({ ok: true })
})

/** POST /api/drinks/:id/tasting — add tasting entry */
router.post('/:id/tasting', async (req: Request, res: Response) => {
  const uid = req.userId!
  const drink = await Drink.findOne({ _id: req.params.id, $or: [{ userId: uid }, { sharedWith: uid }] })
  if (!drink) return res.status(404).json({ error: 'Not found' }) as unknown as void

  drink.tastings.push({ date: req.body.date, userId: uid, rating: req.body.rating, notes: req.body.notes ?? '', occasion: req.body.occasion ?? '' })
  await drink.save()
  res.json(drink)
})

/** DELETE /api/drinks/:id/tasting/:tastingId */
router.delete('/:id/tasting/:tastingId', async (req: Request, res: Response) => {
  const uid = req.userId!
  const drink = await Drink.findOne({ _id: req.params.id, $or: [{ userId: uid }, { sharedWith: uid }] })
  if (!drink) return res.status(404).json({ error: 'Not found' }) as unknown as void

  drink.tastings = drink.tastings.filter(t => t._id?.toString() !== req.params.tastingId) as typeof drink.tastings
  await drink.save()
  res.json(drink)
})

/** POST /api/drinks/:id/buy — log purchase to finance */
router.post('/:id/buy', async (req: Request, res: Response) => {
  const uid = req.userId!
  const { amount, date, note } = req.body as { amount: number; date: string; note?: string }
  if (!amount || !date) return res.status(400).json({ error: 'amount and date required' }) as unknown as void

  const drink = await Drink.findOne({ _id: req.params.id, $or: [{ userId: uid }, { sharedWith: uid }] })
  if (!drink) return res.status(404).json({ error: 'Not found' }) as unknown as void

  // find or create Алкоголь category
  let cat = await Category.findOne({ userId: uid, name: 'Алкоголь' })
  if (!cat) {
    cat = await Category.create({ userId: uid, name: 'Алкоголь', icon: 'ti-bottle', color: '#8b5cf6', isDefault: false, isActive: true })
  }

  const tx = await Transaction.create({
    userId: uid,
    type: 'expense',
    amount,
    date,
    categoryId: cat._id,
    desc: note ?? drink.name,
    source: 'manual',
  })

  // update price on the drink record
  drink.price = amount
  await drink.save()

  res.status(201).json({ transaction: tx, drink })
})

export default router
