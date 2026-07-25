import { Request, Response } from 'express'
import { Space } from '../models/Space'
import { SpaceInfoCard } from '../models/SpaceInfoCard'

/** GET /api/spaces/:id/info-cards */
export async function getInfoCards(req: Request, res: Response): Promise<void> {
  try {
    const space = await Space.findOne({ _id: req.params.id, 'members.userId': req.userId })
    if (!space) { res.status(404).json({ error: 'Not found' }); return }

    const cards = await SpaceInfoCard.find({ spaceId: req.params.id }).sort({ order: 1, createdAt: 1 })
    res.json(cards)
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
}

/** POST /api/spaces/:id/info-cards */
export async function createInfoCard(req: Request, res: Response): Promise<void> {
  try {
    const space = await Space.findOne({ _id: req.params.id, 'members.userId': req.userId })
    if (!space) { res.status(404).json({ error: 'Not found' }); return }

    const { label, value } = req.body as { label?: string; value?: string }
    if (!label || !value) { res.status(400).json({ error: 'label and value are required' }); return }

    const maxOrderDoc = await SpaceInfoCard.findOne({ spaceId: req.params.id }).sort({ order: -1 })
    const order = maxOrderDoc ? maxOrderDoc.order + 1 : 0

    const card = await SpaceInfoCard.create({
      spaceId:  req.params.id,
      userId:   req.userId,
      iconType: req.body.iconType ?? 'text',
      label:    label.trim(),
      value:    value.trim(),
      order,
    })

    res.status(201).json(card)
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
}

/** PATCH /api/spaces/:id/info-cards/:cardId */
export async function updateInfoCard(req: Request, res: Response): Promise<void> {
  try {
    const space = await Space.findOne({ _id: req.params.id, 'members.userId': req.userId })
    if (!space) { res.status(404).json({ error: 'Not found' }); return }

    const card = await SpaceInfoCard.findOne({ _id: req.params.cardId, spaceId: req.params.id })
    if (!card) { res.status(404).json({ error: 'Card not found' }); return }

    const allowed = ['iconType', 'label', 'value', 'order'] as const
    allowed.forEach(key => {
      if (req.body[key] !== undefined) (card as unknown as Record<string, unknown>)[key] = req.body[key]
    })
    await card.save()
    res.json(card)
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
}

/** DELETE /api/spaces/:id/info-cards/:cardId */
export async function deleteInfoCard(req: Request, res: Response): Promise<void> {
  try {
    const space = await Space.findOne({ _id: req.params.id, 'members.userId': req.userId })
    if (!space) { res.status(404).json({ error: 'Not found' }); return }

    const card = await SpaceInfoCard.findOneAndDelete({ _id: req.params.cardId, spaceId: req.params.id })
    if (!card) { res.status(404).json({ error: 'Card not found' }); return }

    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
}
