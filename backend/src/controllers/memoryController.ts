import { Request, Response } from 'express'
import Memory from '../models/Memory'
import { User } from '../models/User'

/** Memories the current user can see: own + tagged (withProfiles) */
function visibleFilter(userId: string, extra: Record<string, unknown> = {}) {
  return {
    $or: [{ userId }, { withProfiles: userId }],
    ...extra,
  }
}

async function ownerMap(items: { userId: string }[], myId: string) {
  const foreignIds = [...new Set(items.map(m => m.userId).filter(uid => uid !== myId))]
  if (foreignIds.length === 0) return new Map<string, { name: string; avatarUrl: string | null }>()
  const owners = await User.find({ _id: { $in: foreignIds } }, { name: 1, avatarUrl: 1 })
  const map = new Map<string, { name: string; avatarUrl: string | null }>()
  owners.forEach(u => {
    map.set((u._id as { toString(): string }).toString(), { name: u.name, avatarUrl: u.avatarUrl })
  })
  return map
}

export async function getAll(req: Request, res: Response): Promise<void> {
  try {
    const filter: Record<string, unknown> = visibleFilter(req.userId!)
    if (req.query.spaceId) filter.spaceId = req.query.spaceId

    const items = await Memory.find(filter).sort({ date: -1 })
    const oMap  = await ownerMap(items, req.userId!)

    const result = items.map(m => {
      const obj = m.toObject()
      if (m.userId !== req.userId) {
        const owner = oMap.get(m.userId)
        return { ...obj, ownerName: owner?.name, ownerAvatarUrl: owner?.avatarUrl ?? null }
      }
      return obj
    })

    res.json(result)
  } catch {
    res.status(500).json({ error: 'Failed to fetch memories' })
  }
}

export async function getRelated(req: Request, res: Response): Promise<void> {
  const current = await Memory.findOne(visibleFilter(req.userId!, { _id: req.params.id }))
  if (!current) { res.status(404).json({ error: 'Not found' }); return }

  const others = await Memory.find(visibleFilter(req.userId!, { _id: { $ne: current._id } }))

  const currentMonth    = current.date.slice(0, 7)
  const currentTags     = new Set((current.tags ?? []).map(t => t.toLowerCase()))
  const currentLocation = (current.location ?? '').trim().toLowerCase()

  const scored = others.map(m => {
    let score = 0
    const tags = (m.tags ?? []).map(t => t.toLowerCase())
    score += tags.filter(t => currentTags.has(t)).length * 3
    if (currentLocation && (m.location ?? '').trim().toLowerCase() === currentLocation) score += 2
    if (currentMonth && m.date.slice(0, 7) === currentMonth) score += 1
    return { m, score }
  })

  const top = scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map(s => s.m)

  const oMap = await ownerMap(top, req.userId!)

  const result = top.map(m => {
    const obj = m.toObject()
    if (m.userId !== req.userId) {
      const owner = oMap.get(m.userId)
      return { ...obj, ownerName: owner?.name, ownerAvatarUrl: owner?.avatarUrl ?? null }
    }
    return obj
  })

  res.json(result)
}

export async function create(req: Request, res: Response): Promise<void> {
  const item = await Memory.create({ ...req.body, userId: req.userId })
  res.status(201).json(item)
}

export async function update(req: Request, res: Response): Promise<void> {
  const item = await Memory.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId! },
    req.body,
    { new: true }
  )
  if (!item) { res.status(404).json({ error: 'Not found' }); return }
  res.json(item)
}

export async function remove(req: Request, res: Response): Promise<void> {
  const item = await Memory.findOneAndDelete({ _id: req.params.id, userId: req.userId! })
  if (!item) { res.status(404).json({ error: 'Not found' }); return }
  res.status(204).end()
}

/** Add photo: owner or tagged member */
export async function addPhoto(req: Request, res: Response): Promise<void> {
  const memory = await Memory.findOne(visibleFilter(req.userId!, { _id: req.params.id }))
  if (!memory) { res.status(404).json({ error: 'Not found' }); return }

  let addedByName = ''
  if (memory.userId !== req.userId!) {
    const contributor = await User.findById(req.userId!, { name: 1 })
    addedByName = contributor?.name ?? ''
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  memory.photos.push({ url: req.body.url, caption: req.body.caption ?? '', addedBy: req.userId!, addedByName } as any)
  await memory.save()
  res.json(memory)
}

/** Delete photo: only memory owner */
export async function deletePhoto(req: Request, res: Response): Promise<void> {
  const memory = await Memory.findOne({ _id: req.params.id, userId: req.userId! })
  if (!memory) { res.status(403).json({ error: 'Forbidden' }); return }

  const photo = memory.photos.find(p => String(p._id) === req.params.photoId)
  if (!photo) { res.status(404).json({ error: 'Photo not found' }); return }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  memory.photos = memory.photos.filter(p => String(p._id) !== req.params.photoId) as any
  await memory.save()
  res.json(memory)
}

/** Update photo caption: only memory owner */
export async function updatePhoto(req: Request, res: Response): Promise<void> {
  const memory = await Memory.findOne({ _id: req.params.id, userId: req.userId! })
  if (!memory) { res.status(403).json({ error: 'Forbidden' }); return }

  const photo = memory.photos.find(p => String(p._id) === req.params.photoId)
  if (!photo) { res.status(404).json({ error: 'Photo not found' }); return }

  if (req.body.caption !== undefined) photo.caption = req.body.caption
  if (req.body.url     !== undefined) photo.url     = req.body.url
  await memory.save()
  res.json(memory)
}
