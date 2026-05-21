import { Request, Response } from 'express'
import Lesson from '../models/Lesson'

export async function getAll(req: Request, res: Response): Promise<void> {
  const items = await Lesson.find({ userId: req.userId }).sort({ createdAt: -1 })
  res.json(items)
}

export async function create(req: Request, res: Response): Promise<void> {
  const item = await Lesson.create({ ...req.body, userId: req.userId })
  res.status(201).json(item)
}

export async function update(req: Request, res: Response): Promise<void> {
  const item = await Lesson.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    req.body,
    { new: true }
  )
  if (!item) { res.status(404).json({ error: 'Not found' }); return }
  res.json(item)
}

export async function remove(req: Request, res: Response): Promise<void> {
  await Lesson.findOneAndDelete({ _id: req.params.id, userId: req.userId })
  res.status(204).end()
}
