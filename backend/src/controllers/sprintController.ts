import { Request, Response } from 'express'
import SprintTask from '../models/SprintTask'
import TodoItem from '../models/TodoItem'
import { User } from '../models/User'

const TASK_ALLOWED = [
  'title', 'done', 'priority', 'category', 'labels', 'dueDate', 'description',
  'checklist', 'order', 'tag', 'weekStart', 'weekNumber', 'year',
  'repeat', 'nextDue', 'repeatDay', 'repeatConfig', 'repeatStartDate',
  'completionHistory', 'reminder', 'isPinned', 'assignedTo',
]

export async function getTasks(req: Request, res: Response): Promise<void> {
  const { week, year } = req.query
  const myId = req.userId as string

  const myFilter: Record<string, unknown> = { userId: myId, deletedAt: null }
  if (week) myFilter.weekNumber = Number(week)
  if (year) myFilter.year = Number(year)

  const myTasks = await SprintTask.find(myFilter).sort({ createdAt: 1 })

  // Tasks assigned to me by others (no week filter — show regardless)
  const assignedTasks = await SprintTask.find({
    assignedTo: myId,
    userId: { $ne: myId },
    deletedAt: null,
  }).sort({ createdAt: 1 })

  // Attach ownerName for assigned tasks
  let enrichedAssigned: (typeof assignedTasks[0] & { ownerName?: string })[] = []
  if (assignedTasks.length > 0) {
    const ownerIds = [...new Set(assignedTasks.map(t => t.userId))]
    const owners = await User.find({ _id: { $in: ownerIds } }, 'name username')
    const ownerMap = new Map(owners.map(u => [u._id.toString(), u.name]))
    enrichedAssigned = assignedTasks.map(t => {
      const obj = t.toObject() as typeof t & { ownerName?: string }
      obj.ownerName = ownerMap.get(t.userId) ?? t.userId
      return obj
    })
  }

  // Unified fetch (no week filter) — also include legacy TodoItem records
  const todos = (!week && !year)
    ? await TodoItem.find({ userId: myId }).sort({ createdAt: 1 })
    : []

  res.json([...myTasks, ...enrichedAssigned, ...todos])
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
  // Soft-delete SprintTask — moves to trash for 24h
  const task = await SprintTask.findOne({ _id: req.params.id, userId: req.userId, deletedAt: null })
  if (task) {
    task.deletedAt = new Date()
    await task.save()
    res.status(204).end()
    return
  }
  // Legacy TodoItem — hard delete
  await TodoItem.findOneAndDelete({ _id: req.params.id, userId: req.userId })
  res.status(204).end()
}

export async function getTrash(req: Request, res: Response): Promise<void> {
  const tasks = await SprintTask.find({ userId: req.userId, deletedAt: { $ne: null } }).sort({ deletedAt: -1 })
  res.json(tasks)
}

export async function restoreTask(req: Request, res: Response): Promise<void> {
  const task = await SprintTask.findOne({ _id: req.params.id, userId: req.userId, deletedAt: { $ne: null } })
  if (!task) { res.status(404).json({ error: 'Not found' }); return }
  task.deletedAt = null
  await task.save()
  res.json(task)
}

export async function purgeTask(req: Request, res: Response): Promise<void> {
  await SprintTask.findOneAndDelete({ _id: req.params.id, userId: req.userId, deletedAt: { $ne: null } })
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
