import { Request, Response } from 'express'
import Transaction from '../models/Transaction'

export async function getAll(req: Request, res: Response): Promise<void> {
  const { month, spaceId } = req.query as { month?: string; spaceId?: string }
  const query: Record<string, unknown> = { userId: req.userId }
  if (month) query.date = { $regex: `^${month}` }
  if (spaceId) query.spaceId = spaceId
  const items = await Transaction.find(query).sort({ date: -1 }).limit(1000)
  res.json(items)
}

export async function getStats(req: Request, res: Response): Promise<void> {
  const { month } = req.query as { month?: string }
  const query: Record<string, unknown> = { userId: req.userId }
  if (month) query.date = { $regex: `^${month}` }

  const items = await Transaction.find(query)

  const totalIncome  = items.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense = items.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  const catMap = new Map<string, number>()
  items
    .filter(t => t.type === 'expense' && t.category)
    .forEach(t => catMap.set(t.category, (catMap.get(t.category) ?? 0) + t.amount))

  const byCategory = Array.from(catMap.entries()).map(([category, amount]) => ({ category, amount }))

  res.json({ totalIncome, totalExpense, byCategory })
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

export async function countByCategory(req: Request, res: Response): Promise<void> {
  const { category } = req.query
  if (!category || typeof category !== 'string') { res.status(400).json({ error: 'category required' }); return }
  const count = await Transaction.countDocuments({ userId: req.userId, type: 'expense', category })
  res.json({ count })
}

export async function migrateCategory(req: Request, res: Response): Promise<void> {
  const { from, to } = req.body
  if (!from) { res.status(400).json({ error: 'from required' }); return }
  await Transaction.updateMany(
    { userId: req.userId, category: from },
    { $set: { category: to ?? '' } }
  )
  res.json({ ok: true })
}
