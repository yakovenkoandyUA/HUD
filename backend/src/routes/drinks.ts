import { Router, Request, Response } from 'express'
import { requireAuth } from '../middleware/auth'
import Drink from '../models/Drink'
import Transaction from '../models/Transaction'
import Category from '../models/Category'
import { FamilyLink } from '../models/FamilyLink'
import { User } from '../models/User'

async function getDrinksEnabledFamilyIds(uid: string): Promise<string[]> {
  const links = await FamilyLink.find({ status: 'accepted', $or: [{ requester: uid }, { recipient: uid }] })
  const familyIds = links.map(l => l.requester === uid ? l.recipient : l.requester)
  if (!familyIds.length) return []
  const enabled = await User.find({ _id: { $in: familyIds }, drinksEnabled: true }).select('_id')
  return enabled.map(u => (u._id as { toString(): string }).toString())
}

const router = Router()
router.use(requireAuth)

/** GET /api/drinks — list accessible drinks (own + family with drinksEnabled) */
router.get('/', async (req: Request, res: Response) => {
  const uid = req.userId!
  const familyIds = await getDrinksEnabledFamilyIds(uid)
  const drinks = await Drink.find({
    $or: [{ userId: uid }, { userId: { $in: familyIds } }, { sharedWith: uid }],
  }).sort({ createdAt: -1 })
  res.json(drinks)
})

/** POST /api/drinks — create */
router.post('/', async (req: Request, res: Response) => {
  const uid = req.userId!
  const familyIds = await getDrinksEnabledFamilyIds(uid)
  const drink = await Drink.create({ ...req.body, userId: uid, sharedWith: familyIds })
  res.status(201).json(drink)
})

/** PATCH /api/drinks/:id — update */
router.patch('/:id', async (req: Request, res: Response) => {
  const uid = req.userId!
  const familyIds = await getDrinksEnabledFamilyIds(uid)
  const drink = await Drink.findOne({ _id: req.params.id, $or: [{ userId: uid }, { userId: { $in: familyIds } }, { sharedWith: uid }] })
  if (!drink) return res.status(404).json({ error: 'Not found' }) as unknown as void

  const allowed = ['name', 'brand', 'type', 'country', 'distillery', 'abv', 'photo', 'status', 'price', 'notes', 'flavor', 'sharedWith']
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

/** PATCH /api/drinks/:id/rating — set or clear current user's rating */
router.patch('/:id/rating', async (req: Request, res: Response) => {
  const uid = req.userId!
  const familyIds = await getDrinksEnabledFamilyIds(uid)
  const drink = await Drink.findOne({ _id: req.params.id, $or: [{ userId: uid }, { userId: { $in: familyIds } }, { sharedWith: uid }] })
  if (!drink) return res.status(404).json({ error: 'Not found' }) as unknown as void

  const score = req.body.score as number | null
  const idx = drink.ratings.findIndex(r => r.userId === uid)

  if (score === null || score === undefined) {
    // clear rating
    if (idx !== -1) drink.ratings.splice(idx, 1)
  } else {
    if (idx !== -1) drink.ratings[idx].score = score
    else drink.ratings.push({ userId: uid, score })
  }

  await drink.save()
  res.json(drink)
})

/** POST /api/drinks/:id/tasting — add tasting entry */
router.post('/:id/tasting', async (req: Request, res: Response) => {
  const uid = req.userId!
  const familyIds = await getDrinksEnabledFamilyIds(uid)
  const drink = await Drink.findOne({ _id: req.params.id, $or: [{ userId: uid }, { userId: { $in: familyIds } }, { sharedWith: uid }] })
  if (!drink) return res.status(404).json({ error: 'Not found' }) as unknown as void

  drink.tastings.push({ date: req.body.date, userId: uid, rating: req.body.rating, notes: req.body.notes ?? '', occasion: req.body.occasion ?? '' })
  await drink.save()
  res.json(drink)
})

/** DELETE /api/drinks/:id/tasting/:tastingId */
router.delete('/:id/tasting/:tastingId', async (req: Request, res: Response) => {
  const uid = req.userId!
  const familyIds = await getDrinksEnabledFamilyIds(uid)
  const drink = await Drink.findOne({ _id: req.params.id, $or: [{ userId: uid }, { userId: { $in: familyIds } }, { sharedWith: uid }] })
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

  const familyIds = await getDrinksEnabledFamilyIds(uid)
  const drink = await Drink.findOne({ _id: req.params.id, $or: [{ userId: uid }, { userId: { $in: familyIds } }, { sharedWith: uid }] })
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
