import { Request, Response } from 'express'
import { Space } from '../models/Space'
import { SportEvent } from '../models/SportEvent'

/** GET /api/spaces/:id/sport/profile */
export async function getSportProfile(req: Request, res: Response): Promise<void> {
  try {
    const space = await Space.findOne({ _id: req.params.id, 'members.userId': req.userId })
    if (!space) { res.status(404).json({ error: 'Not found' }); return }
    res.json(space.sportProfile ?? {})
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
}

/** PATCH /api/spaces/:id/sport/profile */
export async function updateSportProfile(req: Request, res: Response): Promise<void> {
  try {
    const space = await Space.findOne({ _id: req.params.id, 'members.userId': req.userId })
    if (!space) { res.status(404).json({ error: 'Not found' }); return }

    const allowed = ['sport', 'level', 'goal', 'photoUrl', 'prs'] as const
    if (!space.sportProfile) {
      space.sportProfile = { sport: '', level: null, goal: '', photoUrl: '', prs: [] }
    }
    allowed.forEach(key => {
      if (req.body[key] !== undefined) (space.sportProfile as unknown as Record<string, unknown>)[key] = req.body[key]
    })
    await space.save()
    res.json(space.sportProfile)
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
}

/** GET /api/spaces/:id/sport/events */
export async function getSportEvents(req: Request, res: Response): Promise<void> {
  try {
    const space = await Space.findOne({ _id: req.params.id, 'members.userId': req.userId })
    if (!space) { res.status(404).json({ error: 'Not found' }); return }

    const { limit } = req.query as { limit?: string }
    const events = await SportEvent.find({ spaceId: req.params.id })
      .sort({ date: -1, createdAt: -1 })
      .limit(limit ? parseInt(limit, 10) : 200)

    res.json(events)
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
}

/** POST /api/spaces/:id/sport/events */
export async function createSportEvent(req: Request, res: Response): Promise<void> {
  try {
    const space = await Space.findOne({ _id: req.params.id, 'members.userId': req.userId })
    if (!space) { res.status(404).json({ error: 'Not found' }); return }

    const { date, title, duration, metrics, notes } = req.body
    const event = await SportEvent.create({
      spaceId:  req.params.id,
      userId:   req.userId,
      date:     date ?? new Date().toISOString().slice(0, 10),
      title:    title  ?? '',
      duration: duration ?? null,
      metrics:  metrics  ?? [],
      notes:    notes    ?? '',
    })
    res.status(201).json(event)
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
}

/** PATCH /api/spaces/:id/sport/events/:eventId */
export async function updateSportEvent(req: Request, res: Response): Promise<void> {
  try {
    const event = await SportEvent.findOne({ _id: req.params.eventId, spaceId: req.params.id })
    if (!event) { res.status(404).json({ error: 'Not found' }); return }

    const allowed = ['date', 'title', 'duration', 'metrics', 'notes'] as const
    allowed.forEach(key => {
      if (req.body[key] !== undefined) (event as unknown as Record<string, unknown>)[key] = req.body[key]
    })
    await event.save()
    res.json(event)
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
}

/** DELETE /api/spaces/:id/sport/events/:eventId */
export async function deleteSportEvent(req: Request, res: Response): Promise<void> {
  try {
    await SportEvent.deleteOne({ _id: req.params.eventId, spaceId: req.params.id })
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
}
