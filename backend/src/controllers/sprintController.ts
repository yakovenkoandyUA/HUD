import { Request, Response } from 'express'
import SprintTask from '../models/SprintTask'
import TodoItem from '../models/TodoItem'

export async function getTasks(req: Request, res: Response): Promise<void> {
  const { week, year } = req.query
  const filter: Record<string, unknown> = { userId: req.userId }
  if (week) filter.weekNumber = Number(week)
  if (year) filter.year = Number(year)
  const items = await SprintTask.find(filter).sort({ createdAt: 1 })
  res.json(items)
}

export async function createTask(req: Request, res: Response): Promise<void> {
  const item = await SprintTask.create({ ...req.body, userId: req.userId })
  res.status(201).json(item)
}

export async function updateTask(req: Request, res: Response): Promise<void> {
  const item = await SprintTask.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    req.body,
    { new: true }
  )
  if (!item) { res.status(404).json({ error: 'Not found' }); return }
  res.json(item)
}

export async function removeTask(req: Request, res: Response): Promise<void> {
  await SprintTask.findOneAndDelete({ _id: req.params.id, userId: req.userId })
  res.status(204).end()
}

export async function getTodos(req: Request, res: Response): Promise<void> {
  const items = await TodoItem.find({ userId: req.userId }).sort({ createdAt: 1 })
  res.json(items)
}

export async function createTodo(req: Request, res: Response): Promise<void> {
  const item = await TodoItem.create({ ...req.body, userId: req.userId })
  res.status(201).json(item)
}

export async function updateTodo(req: Request, res: Response): Promise<void> {
  const item = await TodoItem.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    req.body,
    { new: true }
  )
  if (!item) { res.status(404).json({ error: 'Not found' }); return }
  res.json(item)
}

export async function removeTodo(req: Request, res: Response): Promise<void> {
  await TodoItem.findOneAndDelete({ _id: req.params.id, userId: req.userId })
  res.status(204).end()
}
