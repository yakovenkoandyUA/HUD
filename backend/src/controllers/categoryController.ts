import { Request, Response } from 'express'
import Category from '../models/Category'

export async function getAll(req: Request, res: Response): Promise<void> {
  const items = await Category.find({ userId: req.userId })
    .sort({ isDefault: -1, order: 1, createdAt: 1 })
  res.json(items)
}

export async function create(req: Request, res: Response): Promise<void> {
  const { name, icon, color } = req.body as { name?: string; icon?: string; color?: string }
  if (!name?.trim()) { res.status(400).json({ error: 'name required' }); return }
  const item = await Category.create({
    name:   name.trim(),
    icon:   icon?.trim()  || 'ti-dots',
    color:  color?.trim() || '#9CA3AF',
    userId: req.userId,
    isDefault: false,
    isActive:  true,
  })
  res.status(201).json(item)
}

export async function update(req: Request, res: Response): Promise<void> {
  const cat = await Category.findOne({ _id: req.params.id, userId: req.userId })
  if (!cat) { res.status(404).json({ error: 'Not found' }); return }

  const { name, icon, color, isActive } = req.body as {
    name?: string; icon?: string; color?: string; isActive?: boolean
  }

  // Default categories cannot be renamed or recoloured — only toggled
  if (!cat.isDefault) {
    if (name?.trim())  cat.name  = name.trim()
    if (icon?.trim())  cat.icon  = icon.trim()
    if (color?.trim()) cat.color = color.trim()
  }
  if (isActive !== undefined) cat.isActive = isActive

  await cat.save()
  res.json(cat)
}

export async function remove(req: Request, res: Response): Promise<void> {
  const cat = await Category.findOne({ _id: req.params.id, userId: req.userId })
  if (!cat) { res.status(404).json({ error: 'Not found' }); return }
  if (cat.isDefault) {
    res.status(403).json({ error: 'Cannot delete a default category' })
    return
  }
  await cat.deleteOne()
  res.status(204).end()
}
