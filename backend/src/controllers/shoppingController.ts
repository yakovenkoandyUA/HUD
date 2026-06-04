import { Request, Response } from 'express'
import ShoppingItem from '../models/ShoppingItem'

export async function getItems(req: Request, res: Response): Promise<void> {
  const items = await ShoppingItem.find({ userId: req.userId }).sort({ createdAt: 1 })
  res.json(items)
}

export async function createItem(req: Request, res: Response): Promise<void> {
  const item = await ShoppingItem.create({ ...req.body, userId: req.userId })
  res.status(201).json(item)
}

export async function updateItem(req: Request, res: Response): Promise<void> {
  const item = await ShoppingItem.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    req.body,
    { new: true }
  )
  if (!item) { res.status(404).json({ error: 'Not found' }); return }
  res.json(item)
}

export async function removeItem(req: Request, res: Response): Promise<void> {
  await ShoppingItem.findOneAndDelete({ _id: req.params.id, userId: req.userId })
  res.status(204).end()
}

export async function clearItems(req: Request, res: Response): Promise<void> {
  const filter: Record<string, unknown> = { userId: req.userId }
  if (req.query.checked === '1') filter.checked = true
  await ShoppingItem.deleteMany(filter)
  res.status(204).end()
}
