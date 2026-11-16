import { Request, Response } from 'express'
import Transaction from '../models/Transaction'
import { findHomeSpaceId, isUtilitiesCategory } from '../utils/utilitiesSpace'

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
  const body = { ...req.body }
  // "Комунальні" expenses without an explicit space go straight to the user's home space
  if (!body.spaceId && body.type === 'expense' && isUtilitiesCategory(body.category)) {
    body.spaceId = await findHomeSpaceId(req.userId!)
  }
  const item = await Transaction.create({ ...body, userId: req.userId })
  res.status(201).json(item)
}

export async function update(req: Request, res: Response): Promise<void> {
  const item = await Transaction.findOne({ _id: req.params.id, userId: req.userId })
  if (!item) { res.status(404).json({ error: 'Not found' }); return }
  const allowed = ['desc', 'amount', 'title', 'category', 'categoryId', 'incomeCategory', 'subcategory', 'date', 'tripMemoryId', 'spaceId']
  allowed.forEach(k => { if (req.body[k] !== undefined) (item as unknown as Record<string, unknown>)[k] = req.body[k] })
  await item.save()
  res.json(item)
}

export async function remove(req: Request, res: Response): Promise<void> {
  await Transaction.findOneAndDelete({ _id: req.params.id, userId: req.userId })
  res.status(204).end()
}

/** Days back from today (inclusive window): day = today only, week = 7 days, month = 30 days */
const CLEAR_PERIOD_DAYS_BACK: Record<string, number> = { day: 0, week: 6, month: 29 }

/**
 * DELETE /api/transactions/bulk?period=day|week|month|all[&walletId=sense|mono][&dryRun=1]
 * Deletes the user's transactions for a rolling period (day = today, week = last 7 days incl. today,
 * month = last 30 days) or everything. `walletId` limits it to one card; without it all wallets go.
 * With `dryRun` nothing is deleted — only `{ count }` is returned so the UI can show it before confirming.
 */
export async function clearTransactions(req: Request, res: Response): Promise<void> {
  const { period, walletId, dryRun } = req.query as { period?: string; walletId?: string; dryRun?: string }
  if (period !== 'all' && !(period && period in CLEAR_PERIOD_DAYS_BACK)) {
    res.status(400).json({ error: 'period must be day, week, month or all' }); return
  }

  const query: Record<string, unknown> = { userId: req.userId }
  if (period !== 'all') {
    const from = new Date()
    from.setDate(from.getDate() - CLEAR_PERIOD_DAYS_BACK[period!])
    query.date = { $gte: from.toISOString().slice(0, 10) }
  }
  if (walletId === 'mono') query.walletId = 'mono'
  else if (walletId === 'sense') query.walletId = { $ne: 'mono' }

  if (dryRun === '1') {
    res.json({ count: await Transaction.countDocuments(query) }); return
  }
  const result = await Transaction.deleteMany(query)
  res.json({ deleted: result.deletedCount })
}

export async function countByCategory(req: Request, res: Response): Promise<void> {
  const { category } = req.query
  if (!category || typeof category !== 'string') { res.status(400).json({ error: 'category required' }); return }
  const count = await Transaction.countDocuments({ userId: req.userId, type: 'expense', category })
  // (category usage is wallet-agnostic — categories are shared across wallets)
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
