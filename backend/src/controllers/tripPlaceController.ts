import { Request, Response } from 'express'
import { Space } from '../models/Space'
import { TripPlace } from '../models/TripPlace'

/** GET /api/spaces/:id/places */
export async function getTripPlaces(req: Request, res: Response): Promise<void> {
  try {
    const space = await Space.findOne({ _id: req.params.id, 'members.userId': req.userId })
    if (!space) { res.status(404).json({ error: 'Not found' }); return }

    const places = await TripPlace.find({ spaceId: req.params.id }).sort({ createdAt: -1 })
    res.json(places)
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
}

/** POST /api/spaces/:id/places */
export async function createTripPlace(req: Request, res: Response): Promise<void> {
  try {
    const space = await Space.findOne({ _id: req.params.id, 'members.userId': req.userId })
    if (!space) { res.status(404).json({ error: 'Not found' }); return }
    if (space.type !== 'trip') { res.status(400).json({ error: 'Not a trip space' }); return }

    const { name } = req.body as { name?: string }
    if (!name) { res.status(400).json({ error: 'name is required' }); return }

    const place = await TripPlace.create({
      spaceId:   req.params.id,
      userId:    req.userId,
      name,
      category:  req.body.category  ?? 'other',
      address:   req.body.address   ?? '',
      notes:     req.body.notes     ?? '',
      visitDate: req.body.visitDate ?? '',
    })

    res.status(201).json(place)
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
}

/** PATCH /api/spaces/:id/places/:placeId */
export async function updateTripPlace(req: Request, res: Response): Promise<void> {
  try {
    const space = await Space.findOne({ _id: req.params.id, 'members.userId': req.userId })
    if (!space) { res.status(404).json({ error: 'Not found' }); return }

    const place = await TripPlace.findOne({ _id: req.params.placeId, spaceId: req.params.id })
    if (!place) { res.status(404).json({ error: 'Place not found' }); return }

    const allowed = ['name','category','address','notes','visitDate'] as const
    allowed.forEach(key => {
      if (req.body[key] !== undefined) (place as unknown as Record<string, unknown>)[key] = req.body[key]
    })
    await place.save()
    res.json(place)
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
}

/** DELETE /api/spaces/:id/places/:placeId */
export async function deleteTripPlace(req: Request, res: Response): Promise<void> {
  try {
    const space = await Space.findOne({ _id: req.params.id, 'members.userId': req.userId })
    if (!space) { res.status(404).json({ error: 'Not found' }); return }

    const place = await TripPlace.findOneAndDelete({ _id: req.params.placeId, spaceId: req.params.id })
    if (!place) { res.status(404).json({ error: 'Place not found' }); return }

    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
}
