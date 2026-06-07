import { Request, Response } from 'express'
import SprintTask from '../models/SprintTask'
import TodoItem from '../models/TodoItem'

const TASK_ALLOWED = [
  'title', 'done', 'priority', 'category', 'labels', 'dueDate', 'description',
  'checklist', 'order', 'tag', 'weekStart', 'weekNumber', 'year',
  'repeat', 'nextDue', 'repeatDay', 'repeatConfig', 'repeatStartDate',
  'completionHistory', 'reminder',
]

export async function getTasks(req: Request, res: Response): Promise<void> {
  const { week, year } = req.query
  const filter: Record<string, unknown> = { userId: req.userId }
  if (week) filter.weekNumber = Number(week)
  if (year) filter.year = Number(year)

  const tasks = await SprintTask.find(filter).sort({ createdAt: 1 })

  // Unified fetch (no week filter) — also include legacy TodoItem records
  const todos = (!week && !year)
    ? await TodoItem.find({ userId: req.userId }).sort({ createdAt: 1 })
    : []

  res.json([...tasks, ...todos])
}

export async function createTask(req: Request, res: Response): Promise<void> {
  const item = await SprintTask.create({ ...req.body, userId: req.userId })
  res.status(201).json(item)
}

export async function updateTask(req: Request, res: Response): Promise<void> {
  // Try SprintTask first (findOne+save for proper Mongoose middleware/strict handling)
  const task = await SprintTask.findOne({ _id: req.params.id, userId: req.userId })
  if (task) {
    TASK_ALLOWED.forEach(key => {
      if (req.body[key] !== undefined) (task as unknown as Record<string, unknown>)[key] = req.body[key]
    })
    await task.save()
    res.json(task)
    return
  }

  // Fall back to TodoItem (legacy)
  const todo = await TodoItem.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    req.body,
    { new: true }
  )
  if (!todo) { res.status(404).json({ error: 'Not found' }); return }
  res.json(todo)
}

export async function removeTask(req: Request, res: Response): Promise<void> {
  const deleted = await SprintTask.findOneAndDelete({ _id: req.params.id, userId: req.userId })
  if (!deleted) {
    await TodoItem.findOneAndDelete({ _id: req.params.id, userId: req.userId })
  }
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
