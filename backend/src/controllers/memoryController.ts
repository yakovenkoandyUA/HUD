import { Request, Response } from 'express'
import Memory from '../models/Memory'
import { User } from '../models/User'
import { getAcceptedFamilyIds } from './familyController'

export async function getAll(req: Request, res: Response): Promise<void> {
  try {
    const familyIds = await getAcceptedFamilyIds(req.userId!)
    const allUserIds = [req.userId!, ...familyIds]

    const items = await Memory.find({ userId: { $in: allUserIds } }).sort({ date: -1 })

    // Attach owner info for family memories
    let ownerMap = new Map<string, { name: string; avatarUrl: string | null }>()
    if (familyIds.length > 0) {
      const owners = await User.find({ _id: { $in: familyIds } }, { name: 1, avatarUrl: 1 })
      owners.forEach(u => {
        ownerMap.set((u._id as { toString(): string }).toString(), { name: u.name, avatarUrl: u.avatarUrl })
      })
    }

    const result = items.map(m => {
      const obj = m.toObject()
      if (m.userId !== req.userId) {
        const owner = ownerMap.get(m.userId)
        return { ...obj, ownerName: owner?.name, ownerAvatarUrl: owner?.avatarUrl ?? null }
      }
      return obj
    })

    res.json(result)
  } catch {
    res.status(500).json({ error: 'Failed to fetch memories' })
  }
}

export async function create(req: Request, res: Response): Promise<void> {
  const item = await Memory.create({ ...req.body, userId: req.userId })
  res.status(201).json(item)
}

export async function update(req: Request, res: Response): Promise<void> {
  const familyIds = await getAcceptedFamilyIds(req.userId!)
  const item = await Memory.findOneAndUpdate(
    { _id: req.params.id, userId: { $in: [req.userId!, ...familyIds] } },
    req.body,
    { new: true }
  )
  if (!item) { res.status(404).json({ error: 'Not found' }); return }
  res.json(item)
}

export async function remove(req: Request, res: Response): Promise<void> {
  const familyIds = await getAcceptedFamilyIds(req.userId!)
  const item = await Memory.findOneAndDelete({ _id: req.params.id, userId: { $in: [req.userId!, ...familyIds] } })
  if (!item) { res.status(404).json({ error: 'Not found' }); return }
  res.status(204).end()
}

export async function addPhoto(req: Request, res: Response): Promise<void> {
  const familyIds = await getAcceptedFamilyIds(req.userId!)
  const memory = await Memory.findOne({ _id: req.params.id, userId: { $in: [req.userId!, ...familyIds] } })
  if (!memory) { res.status(404).json({ error: 'Not found' }); return }
  memory.photos.push({ url: req.body.url, caption: req.body.caption ?? '' } as any)
  await memory.save()
  res.json(memory)
}

export async function deletePhoto(req: Request, res: Response): Promise<void> {
  const familyIds = await getAcceptedFamilyIds(req.userId!)
  const memory = await Memory.findOne({ _id: req.params.id, userId: { $in: [req.userId!, ...familyIds] } })
  if (!memory) { res.status(404).json({ error: 'Not found' }); return }
  memory.photos = memory.photos.filter(p => String(p._id) !== req.params.photoId) as any
  await memory.save()
  res.json(memory)
}

export async function updatePhoto(req: Request, res: Response): Promise<void> {
  const familyIds = await getAcceptedFamilyIds(req.userId!)
  const memory = await Memory.findOne({ _id: req.params.id, userId: { $in: [req.userId!, ...familyIds] } })
  if (!memory) { res.status(404).json({ error: 'Not found' }); return }
  const photo = memory.photos.find(p => String(p._id) === req.params.photoId)
  if (!photo) { res.status(404).json({ error: 'Photo not found' }); return }
  if (req.body.caption !== undefined) photo.caption = req.body.caption
  if (req.body.url !== undefined) photo.url = req.body.url
  await memory.save()
  res.json(memory)
}
