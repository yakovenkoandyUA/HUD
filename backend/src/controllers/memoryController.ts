import { Request, Response } from 'express'
import Memory from '../models/Memory'

export async function getAll(req: Request, res: Response): Promise<void> {
  const items = await Memory.find({ userId: req.userId }).sort({ date: -1 })
  res.json(items)
}

export async function create(req: Request, res: Response): Promise<void> {
  const item = await Memory.create({ ...req.body, userId: req.userId })
  res.status(201).json(item)
}

export async function update(req: Request, res: Response): Promise<void> {
  const item = await Memory.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    req.body,
    { new: true }
  )
  if (!item) { res.status(404).json({ error: 'Not found' }); return }
  res.json(item)
}

export async function remove(req: Request, res: Response): Promise<void> {
  await Memory.findOneAndDelete({ _id: req.params.id, userId: req.userId })
  res.status(204).end()
}

export async function addPhoto(req: Request, res: Response): Promise<void> {
  const memory = await Memory.findOne({ _id: req.params.id, userId: req.userId })
  if (!memory) { res.status(404).json({ error: 'Not found' }); return }
  memory.photos.push({ url: req.body.url, caption: req.body.caption ?? '' } as any)
  await memory.save()
  res.json(memory)
}

export async function deletePhoto(req: Request, res: Response): Promise<void> {
  const memory = await Memory.findOne({ _id: req.params.id, userId: req.userId })
  if (!memory) { res.status(404).json({ error: 'Not found' }); return }
  memory.photos = memory.photos.filter(p => String(p._id) !== req.params.photoId) as any
  await memory.save()
  res.json(memory)
}

export async function updatePhoto(req: Request, res: Response): Promise<void> {
  const memory = await Memory.findOne({ _id: req.params.id, userId: req.userId })
  if (!memory) { res.status(404).json({ error: 'Not found' }); return }
  const photo = memory.photos.find(p => String(p._id) === req.params.photoId)
  if (!photo) { res.status(404).json({ error: 'Photo not found' }); return }
  if (req.body.caption !== undefined) photo.caption = req.body.caption
  if (req.body.url !== undefined) photo.url = req.body.url
  await memory.save()
  res.json(memory)
}
