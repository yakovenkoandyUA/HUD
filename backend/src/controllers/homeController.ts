import { Request, Response } from 'express'
import { Space } from '../models/Space'
import { HomeEvent } from '../models/HomeEvent'
import { destroyImages, publicIdFromUrl } from '../utils/cloudinary'

/** GET /api/spaces/:id/home/profile */
export async function getHomeProfile(req: Request, res: Response): Promise<void> {
  try {
    const space = await Space.findOne({ _id: req.params.id, 'members.userId': req.userId })
    if (!space) { res.status(404).json({ error: 'Not found' }); return }
    if (space.type !== 'home') { res.status(400).json({ error: 'Not a home space' }); return }
    res.json(space.homeProfile ?? {})
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
}

/** PATCH /api/spaces/:id/home/profile */
export async function updateHomeProfile(req: Request, res: Response): Promise<void> {
  try {
    const space = await Space.findOne({ _id: req.params.id, 'members.userId': req.userId })
    if (!space) { res.status(404).json({ error: 'Not found' }); return }
    if (space.type !== 'home') { res.status(400).json({ error: 'Not a home space' }); return }

    const allowed = ['addressLabel', 'ownershipType', 'area', 'floor', 'moveInDate', 'photoUrl'] as const
    if (!space.homeProfile) {
      space.homeProfile = { addressLabel: '', ownershipType: 'rent', area: null, floor: null, moveInDate: null, photoUrl: '' }
    }
    allowed.forEach(key => {
      if (req.body[key] !== undefined) (space.homeProfile as unknown as Record<string, unknown>)[key] = req.body[key]
    })
    await space.save()
    res.json(space.homeProfile)
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
}

/** GET /api/spaces/:id/home/events */
export async function getHomeEvents(req: Request, res: Response): Promise<void> {
  try {
    const space = await Space.findOne({ _id: req.params.id, 'members.userId': req.userId })
    if (!space) { res.status(404).json({ error: 'Not found' }); return }

    const { type, limit } = req.query as { type?: string; limit?: string }
    const filter: Record<string, unknown> = { spaceId: req.params.id }
    if (type) filter.type = type

    const events = await HomeEvent.find(filter)
      .sort({ date: -1, createdAt: -1 })
      .limit(limit ? parseInt(limit, 10) : 200)

    res.json(events)
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
}

/** POST /api/spaces/:id/home/events */
export async function createHomeEvent(req: Request, res: Response): Promise<void> {
  try {
    const space = await Space.findOne({ _id: req.params.id, 'members.userId': req.userId })
    if (!space) { res.status(404).json({ error: 'Not found' }); return }
    if (space.type !== 'home') { res.status(400).json({ error: 'Not a home space' }); return }

    const { type, date } = req.body as { type?: string; date?: string }
    if (!type || !date) { res.status(400).json({ error: 'type and date are required' }); return }

    const event = await HomeEvent.create({
      spaceId:       req.params.id,
      userId:        req.userId,
      type,
      date,
      title:         req.body.title         ?? '',
      cost:          req.body.cost          ?? null,
      currency:      req.body.currency      ?? 'UAH',
      vendor:        req.body.vendor        ?? '',
      notes:         req.body.notes         ?? '',
      attachments:   req.body.attachments   ?? [],
      warrantyUntil: req.body.warrantyUntil ?? null,
      docType:       req.body.docType       ?? '',
      docExpiresAt:  req.body.docExpiresAt  ?? null,
    })

    res.status(201).json(event)
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
}

/** PATCH /api/spaces/:id/home/events/:eventId */
export async function updateHomeEvent(req: Request, res: Response): Promise<void> {
  try {
    const space = await Space.findOne({ _id: req.params.id, 'members.userId': req.userId })
    if (!space) { res.status(404).json({ error: 'Not found' }); return }

    const event = await HomeEvent.findOne({ _id: req.params.eventId, spaceId: req.params.id })
    if (!event) { res.status(404).json({ error: 'Event not found' }); return }

    const allowed = ['type','date','title','cost','currency','vendor','notes','attachments','warrantyUntil','docType','docExpiresAt'] as const
    allowed.forEach(key => {
      if (req.body[key] !== undefined) (event as unknown as Record<string, unknown>)[key] = req.body[key]
    })
    await event.save()
    res.json(event)
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
}

/** DELETE /api/spaces/:id/home/events/:eventId */
export async function deleteHomeEvent(req: Request, res: Response): Promise<void> {
  try {
    const space = await Space.findOne({ _id: req.params.id, 'members.userId': req.userId })
    if (!space) { res.status(404).json({ error: 'Not found' }); return }

    const event = await HomeEvent.findOneAndDelete({ _id: req.params.eventId, spaceId: req.params.id })
    if (!event) { res.status(404).json({ error: 'Event not found' }); return }

    if (event.attachments?.length) {
      const ids = event.attachments.map(publicIdFromUrl).filter(Boolean) as string[]
      destroyImages(ids).catch(() => {})
    }

    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
}
