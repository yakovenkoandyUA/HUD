import { Request, Response } from 'express'
import Transaction from '../models/Transaction'

export async function getAll(req: Request, res: Response): Promise<void> {
  const items = await Transaction.find({ userId: req.userId }).sort({ date: -1 }).limit(100)
  res.json(items)
}

export async function create(req: Request, res: Response): Promise<void> {
  const item = await Transaction.create({ ...req.body, userId: req.userId })
  res.status(201).json(item)
}

export async function update(req: Request, res: Response): Promise<void> {
  const item = await Transaction.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    req.body,
    { new: true }
  )
  if (!item) { res.status(404).json({ error: 'Not found' }); return }
  res.json(item)
}

export async function remove(req: Request, res: Response): Promise<void> {
  await Transaction.findOneAndDelete({ _id: req.params.id, userId: req.userId })
  res.status(204).end()
}
