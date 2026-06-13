import { Request, Response } from 'express'
import WatchlistItem from '../models/WatchlistItem'
import { getAcceptedFamilyIds } from './familyController'

export async function getAll(req: Request, res: Response): Promise<void> {
  const { category, status } = req.query as { category?: string; status?: string }
  try {
    const familyIds = await getAcceptedFamilyIds(req.userId!)
    const baseFilter: Record<string, unknown> = {}
    if (category) baseFilter.category = category
    if (status)   baseFilter.status   = status

    const items = await WatchlistItem.find({
      ...baseFilter,
      $or: [
        { userId: req.userId },
        { userId: { $in: familyIds }, watchedWith: req.userId },
      ],
    }).sort({ addedAt: -1 })

    res.json(items)
  } catch {
    res.status(500).json({ error: 'Failed to fetch watchlist' })
  }
}

export async function create(req: Request, res: Response): Promise<void> {
  const { tmdbId, category } = req.body as { tmdbId?: number; category?: string }

  // Duplicate check per user only
  if (tmdbId && tmdbId !== 0) {
    const existing = await WatchlistItem.findOne({ tmdbId, category, userId: req.userId })
    if (existing) {
      res.status(409).json({ error: 'Already in watchlist', id: existing._id })
      return
    }
  }

  const item = await WatchlistItem.create({ ...req.body, userId: req.userId })
  res.status(201).json(item)
}

export async function update(req: Request, res: Response): Promise<void> {
  const item = await WatchlistItem.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    req.body,
    { new: true }
  )
  if (!item) { res.status(404).json({ error: 'Not found' }); return }
  res.json(item)
}

export async function remove(req: Request, res: Response): Promise<void> {
  const item = await WatchlistItem.findOneAndDelete({ _id: req.params.id, userId: req.userId })
  if (!item) { res.status(404).json({ error: 'Not found' }); return }
  res.status(204).end()
}
