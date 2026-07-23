import { Request, Response } from 'express'
import { Space } from '../models/Space'
import { Accommodation } from '../models/Accommodation'

/** GET /api/spaces/:id/accommodations */
export async function getAccommodations(req: Request, res: Response): Promise<void> {
  try {
    const space = await Space.findOne({ _id: req.params.id, 'members.userId': req.userId })
    if (!space) { res.status(404).json({ error: 'Not found' }); return }

    const items = await Accommodation.find({ spaceId: req.params.id }).sort({ checkIn: 1 })
    res.json(items)
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
}

/** POST /api/spaces/:id/accommodations */
export async function createAccommodation(req: Request, res: Response): Promise<void> {
  try {
    const space = await Space.findOne({ _id: req.params.id, 'members.userId': req.userId })
    if (!space) { res.status(404).json({ error: 'Not found' }); return }
    if (space.type !== 'trip') { res.status(400).json({ error: 'Not a trip space' }); return }

    const { name } = req.body as { name?: string }
    if (!name) { res.status(400).json({ error: 'name is required' }); return }

    const item = await Accommodation.create({
      spaceId:     req.params.id,
      userId:      req.userId,
      name,
      address:     req.body.address     ?? '',
      checkIn:     req.body.checkIn     ?? '',
      checkOut:    req.body.checkOut    ?? '',
      bookingCode: req.body.bookingCode ?? '',
      contactInfo: req.body.contactInfo ?? '',
      link:        req.body.link        ?? '',
      price:       req.body.price       ?? null,
      currency:    req.body.currency    ?? 'UAH',
      notes:       req.body.notes       ?? '',
    })

    res.status(201).json(item)
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
}

/** PATCH /api/spaces/:id/accommodations/:itemId */
export async function updateAccommodation(req: Request, res: Response): Promise<void> {
  try {
    const space = await Space.findOne({ _id: req.params.id, 'members.userId': req.userId })
    if (!space) { res.status(404).json({ error: 'Not found' }); return }

    const item = await Accommodation.findOne({ _id: req.params.itemId, spaceId: req.params.id })
    if (!item) { res.status(404).json({ error: 'Accommodation not found' }); return }

    const allowed = ['name','address','checkIn','checkOut','bookingCode','contactInfo','link','price','currency','notes'] as const
    allowed.forEach(key => {
      if (req.body[key] !== undefined) (item as unknown as Record<string, unknown>)[key] = req.body[key]
    })
    await item.save()
    res.json(item)
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
}

/** DELETE /api/spaces/:id/accommodations/:itemId */
export async function deleteAccommodation(req: Request, res: Response): Promise<void> {
  try {
    const space = await Space.findOne({ _id: req.params.id, 'members.userId': req.userId })
    if (!space) { res.status(404).json({ error: 'Not found' }); return }

    const item = await Accommodation.findOneAndDelete({ _id: req.params.itemId, spaceId: req.params.id })
    if (!item) { res.status(404).json({ error: 'Accommodation not found' }); return }

    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
}
