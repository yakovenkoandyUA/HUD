import { Request, Response } from 'express'
import Label from '../models/Label'

export async function getLabels(req: Request, res: Response): Promise<void> {
  const items = await Label.find({ userId: req.userId }).sort({ createdAt: 1 })
  res.json(items)
}

export async function createLabel(req: Request, res: Response): Promise<void> {
  const item = await Label.create({ ...req.body, userId: req.userId })
  res.status(201).json(item)
}

export async function updateLabel(req: Request, res: Response): Promise<void> {
  const item = await Label.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    req.body,
    { new: true }
  )
  if (!item) { res.status(404).json({ error: 'Not found' }); return }
  res.json(item)
}

export async function removeLabel(req: Request, res: Response): Promise<void> {
  await Label.findOneAndDelete({ _id: req.params.id, userId: req.userId })
  res.status(204).end()
}
