import { Request, Response } from 'express'
import { Space } from '../models/Space'
import { PlantEvent } from '../models/PlantEvent'

/** GET /api/spaces/:id/plant/profile */
export async function getPlantProfile(req: Request, res: Response): Promise<void> {
  try {
    const space = await Space.findOne({ _id: req.params.id, 'members.userId': req.userId })
    if (!space) { res.status(404).json({ error: 'Not found' }); return }
    if (space.type !== 'plant') { res.status(400).json({ error: 'Not a plant space' }); return }
    res.json(space.plantProfile ?? {})
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
}

/** PATCH /api/spaces/:id/plant/profile */
export async function updatePlantProfile(req: Request, res: Response): Promise<void> {
  try {
    const space = await Space.findOne({ _id: req.params.id, 'members.userId': req.userId })
    if (!space) { res.status(404).json({ error: 'Not found' }); return }
    if (space.type !== 'plant') { res.status(400).json({ error: 'Not a plant space' }); return }

    const allowed = [
      'commonName', 'species', 'location', 'acquiredDate',
      'wateringIntervalDays', 'lastWateredAt', 'lastFertilizedAt',
      'sunlight', 'photoUrl', 'toxicToPets', 'careNotes',
    ] as const

    if (!space.plantProfile) {
      space.plantProfile = {
        commonName: '', species: '', location: '', acquiredDate: null,
        wateringIntervalDays: null, lastWateredAt: null, lastFertilizedAt: null,
        sunlight: null, photoUrl: '', toxicToPets: null, careNotes: '',
      }
    }
    allowed.forEach(key => {
      if (req.body[key] !== undefined) (space.plantProfile as unknown as Record<string, unknown>)[key] = req.body[key]
    })
    await space.save()
    res.json(space.plantProfile)
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
}

/** GET /api/spaces/:id/plant/events */
export async function getPlantEvents(req: Request, res: Response): Promise<void> {
  try {
    const space = await Space.findOne({ _id: req.params.id, 'members.userId': req.userId })
    if (!space) { res.status(404).json({ error: 'Not found' }); return }

    const { type, limit } = req.query as { type?: string; limit?: string }
    const filter: Record<string, unknown> = { spaceId: req.params.id }
    if (type) filter.type = type

    const events = await PlantEvent.find(filter)
      .sort({ date: -1, createdAt: -1 })
      .limit(limit ? parseInt(limit, 10) : 200)

    res.json(events)
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
}

/** POST /api/spaces/:id/plant/events */
export async function createPlantEvent(req: Request, res: Response): Promise<void> {
  try {
    const space = await Space.findOne({ _id: req.params.id, 'members.userId': req.userId })
    if (!space) { res.status(404).json({ error: 'Not found' }); return }
    if (space.type !== 'plant') { res.status(400).json({ error: 'Not a plant space' }); return }

    const { type, date } = req.body as { type?: string; date?: string }
    if (!type || !date) { res.status(400).json({ error: 'type and date are required' }); return }

    const event = await PlantEvent.create({
      spaceId: req.params.id,
      userId:  req.userId,
      type,
      date,
      notes:   req.body.notes ?? '',
    })

    // Update lastWateredAt / lastFertilizedAt in profile on the fly
    if (type === 'watering' || type === 'fertilizing') {
      if (!space.plantProfile) {
        space.plantProfile = {
          commonName: '', species: '', location: '', acquiredDate: null,
          wateringIntervalDays: null, lastWateredAt: null, lastFertilizedAt: null,
          sunlight: null, photoUrl: '', toxicToPets: null, careNotes: '',
        }
      }
      if (type === 'watering')    space.plantProfile.lastWateredAt    = date
      if (type === 'fertilizing') space.plantProfile.lastFertilizedAt = date
      await space.save()
    }

    res.status(201).json(event)
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
}

/** DELETE /api/spaces/:id/plant/events/:eventId */
export async function deletePlantEvent(req: Request, res: Response): Promise<void> {
  try {
    const space = await Space.findOne({ _id: req.params.id, 'members.userId': req.userId })
    if (!space) { res.status(404).json({ error: 'Not found' }); return }

    const event = await PlantEvent.findOneAndDelete({ _id: req.params.eventId, spaceId: req.params.id })
    if (!event) { res.status(404).json({ error: 'Event not found' }); return }

    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
}
