import { Request, Response } from 'express'
import Category from '../models/Category'

export async function getAll(req: Request, res: Response): Promise<void> {
  const items = await Category.find({ userId: req.userId }).sort({ createdAt: 1 })
  res.json(items)
}

export async function create(req: Request, res: Response): Promise<void> {
  const { name } = req.body
  if (!name?.trim()) { res.status(400).json({ error: 'name required' }); return }
  const item = await Category.create({ name: name.trim(), userId: req.userId })
  res.status(201).json(item)
}

export async function remove(req: Request, res: Response): Promise<void> {
  await Category.findOneAndDelete({ _id: req.params.id, userId: req.userId })
  res.status(204).end()
}
