import { Request, Response } from 'express'
import Category from '../models/Category'

const PALETTE = [
  '#E76F51', '#2A9D8F', '#E9C46A', '#264653',
  '#6A4FC8', '#4E9E5C', '#C8102E', '#4A90D9',
  '#F4A261', '#A8DADC', '#E63946', '#457B9D',
]

function randomColor(): string {
  return PALETTE[Math.floor(Math.random() * PALETTE.length)]
}

export async function getAll(req: Request, res: Response): Promise<void> {
  const items = await Category.find({ userId: req.userId }).sort({ createdAt: 1 })
  res.json(items)
}

export async function create(req: Request, res: Response): Promise<void> {
  const { name, color } = req.body as { name?: string; color?: string }
  if (!name?.trim()) { res.status(400).json({ error: 'name required' }); return }
  const item = await Category.create({
    name:   name.trim(),
    color:  color?.trim() || randomColor(),
    userId: req.userId,
  })
  res.status(201).json(item)
}

export async function remove(req: Request, res: Response): Promise<void> {
  await Category.findOneAndDelete({ _id: req.params.id, userId: req.userId })
  res.status(204).end()
}
