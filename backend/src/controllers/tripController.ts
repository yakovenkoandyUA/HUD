import { Request, Response } from 'express'
import { Space } from '../models/Space'

/** GET /api/spaces/:id/trip/profile */
export async function getTripProfile(req: Request, res: Response): Promise<void> {
  try {
    const space = await Space.findOne({ _id: req.params.id, 'members.userId': req.userId })
    if (!space) { res.status(404).json({ error: 'Not found' }); return }
    if (space.type !== 'trip') { res.status(400).json({ error: 'Not a trip space' }); return }
    res.json(space.tripProfile ?? {})
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
}

/** PATCH /api/spaces/:id/trip/profile */
export async function updateTripProfile(req: Request, res: Response): Promise<void> {
  try {
    const space = await Space.findOne({ _id: req.params.id, 'members.userId': req.userId })
    if (!space) { res.status(404).json({ error: 'Not found' }); return }
    if (space.type !== 'trip') { res.status(400).json({ error: 'Not a trip space' }); return }

    const allowed = ['destination', 'startDate', 'endDate', 'travelers', 'status'] as const
    if (!space.tripProfile) {
      space.tripProfile = { destination: '', startDate: null, endDate: null, travelers: null, status: 'planning' }
    }
    allowed.forEach(key => {
      if (req.body[key] !== undefined) (space.tripProfile as unknown as Record<string, unknown>)[key] = req.body[key]
    })
    await space.save()
    res.json(space.tripProfile)
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
}
