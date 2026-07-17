import { Request, Response } from 'express'
import { Space } from '../models/Space'
import { PetEvent } from '../models/PetEvent'
import { destroyImages, publicIdFromUrl } from '../utils/cloudinary'

/** GET /api/spaces/:id/pet/profile */
export async function getPetProfile(req: Request, res: Response): Promise<void> {
  try {
    const space = await Space.findOne({ _id: req.params.id, 'members.userId': req.userId })
    if (!space) { res.status(404).json({ error: 'Not found' }); return }
    if (space.type !== 'pet') { res.status(400).json({ error: 'Not a pet space' }); return }
    res.json(space.petProfile ?? {})
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
}

/** PATCH /api/spaces/:id/pet/profile */
export async function updatePetProfile(req: Request, res: Response): Promise<void> {
  try {
    const space = await Space.findOne({ _id: req.params.id, 'members.userId': req.userId })
    if (!space) { res.status(404).json({ error: 'Not found' }); return }
    if (space.type !== 'pet') { res.status(400).json({ error: 'Not a pet space' }); return }

    const allowed = ['name', 'species', 'breed', 'birthDate', 'weight', 'photoUrl', 'chipNumber', 'passportNumber', 'foodLog'] as const
    if (!space.petProfile) {
      space.petProfile = { name: '', species: '', breed: '', birthDate: null, weight: null, photoUrl: '', chipNumber: '', passportNumber: '', foodLog: [] }
    }
    allowed.forEach(key => {
      if (req.body[key] !== undefined) (space.petProfile as unknown as Record<string, unknown>)[key] = req.body[key]
    })
    await space.save()
    res.json(space.petProfile)
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
}

/** GET /api/spaces/:id/pet/events */
export async function getPetEvents(req: Request, res: Response): Promise<void> {
  try {
    const space = await Space.findOne({ _id: req.params.id, 'members.userId': req.userId })
    if (!space) { res.status(404).json({ error: 'Not found' }); return }

    const { type, limit } = req.query as { type?: string; limit?: string }
    const filter: Record<string, unknown> = { spaceId: req.params.id }
    if (type) filter.type = type

    const events = await PetEvent.find(filter)
      .sort({ date: -1, createdAt: -1 })
      .limit(limit ? parseInt(limit, 10) : 200)

    res.json(events)
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
}

/** POST /api/spaces/:id/pet/events */
export async function createPetEvent(req: Request, res: Response): Promise<void> {
  try {
    const space = await Space.findOne({ _id: req.params.id, 'members.userId': req.userId })
    if (!space) { res.status(404).json({ error: 'Not found' }); return }
    if (space.type !== 'pet') { res.status(400).json({ error: 'Not a pet space' }); return }

    const { type, date } = req.body as { type?: string; date?: string }
    if (!type || !date) { res.status(400).json({ error: 'type and date are required' }); return }

    const event = await PetEvent.create({
      spaceId:        req.params.id,
      userId:         req.userId,
      type,
      date,
      title:          req.body.title          ?? '',
      cost:           req.body.cost           ?? null,
      currency:       req.body.currency       ?? 'UAH',
      clinic:         req.body.clinic         ?? '',
      notes:          req.body.notes          ?? '',
      attachments:    req.body.attachments    ?? [],
      nextDue:        req.body.nextDue        ?? null,
      weight:         req.body.weight         ?? null,
      medicationName: req.body.medicationName ?? '',
    })

    res.status(201).json(event)
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
}

/** PATCH /api/spaces/:id/pet/events/:eventId */
export async function updatePetEvent(req: Request, res: Response): Promise<void> {
  try {
    const space = await Space.findOne({ _id: req.params.id, 'members.userId': req.userId })
    if (!space) { res.status(404).json({ error: 'Not found' }); return }

    const event = await PetEvent.findOne({ _id: req.params.eventId, spaceId: req.params.id })
    if (!event) { res.status(404).json({ error: 'Event not found' }); return }

    const allowed = ['type','date','title','cost','currency','clinic','notes','attachments','nextDue','weight','medicationName'] as const
    allowed.forEach(key => {
      if (req.body[key] !== undefined) (event as unknown as Record<string, unknown>)[key] = req.body[key]
    })
    await event.save()
    res.json(event)
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
}

/** DELETE /api/spaces/:id/pet/events/:eventId */
export async function deletePetEvent(req: Request, res: Response): Promise<void> {
  try {
    const space = await Space.findOne({ _id: req.params.id, 'members.userId': req.userId })
    if (!space) { res.status(404).json({ error: 'Not found' }); return }

    const event = await PetEvent.findOneAndDelete({ _id: req.params.eventId, spaceId: req.params.id })
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
