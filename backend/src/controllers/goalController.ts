import { Request, Response } from 'express'
import SavingsGoal from '../models/SavingsGoal'

export async function getAll(req: Request, res: Response): Promise<void> {
  const items = await SavingsGoal.find({ userId: req.userId }).sort({ createdAt: 1 })
  res.json(items)
}

export async function create(req: Request, res: Response): Promise<void> {
  const item = await SavingsGoal.create({ ...req.body, userId: req.userId })
  res.status(201).json(item)
}

export async function update(req: Request, res: Response): Promise<void> {
  const item = await SavingsGoal.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    req.body,
    { new: true }
  )
  if (!item) { res.status(404).json({ error: 'Not found' }); return }
  res.json(item)
}

export async function deposit(req: Request, res: Response): Promise<void> {
  const { amount } = req.body as { amount?: number }
  if (!amount || amount <= 0) { res.status(400).json({ error: 'invalid amount' }); return }
  const goal = await SavingsGoal.findOne({ _id: req.params.id, userId: req.userId })
  if (!goal) { res.status(404).json({ error: 'Not found' }); return }
  goal.currentAmount = Math.min(goal.currentAmount + amount, goal.targetAmount)
  goal.deposits.push({ amount, date: new Date() })
  await goal.save()
  res.json(goal)
}

export async function remove(req: Request, res: Response): Promise<void> {
  await SavingsGoal.findOneAndDelete({ _id: req.params.id, userId: req.userId })
  res.status(204).end()
}
