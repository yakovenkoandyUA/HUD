import { Request, Response } from 'express'
import SprintTask from '../models/SprintTask'
import TodoItem from '../models/TodoItem'
import { User } from '../models/User'
import { sendPushToUser } from '../services/webpush'
import { destroyImages } from '../utils/cloudinary'

const TASK_ALLOWED = [
  'title', 'done', 'priority', 'category', 'labels', 'dueDate', 'dueTime', 'description',
  'checklist', 'order', 'tag', 'weekStart', 'weekNumber', 'year',
  'repeat', 'nextDue', 'repeatDay', 'repeatConfig', 'repeatStartDate',
  'completionHistory', 'reminder', 'isPinned', 'assignedTo', 'timeOfDay', 'spaceId',
  'imageUrls', 'imagePublicIds',
]

// Зміна дедлайну/часу/повторення/нагадування скидає прапорець "вже надіслано" — щоб нагадування пересчиталось
const REMINDER_RESET_FIELDS = ['dueDate', 'dueTime', 'nextDue', 'reminder']
function touchesReminderSchedule(body: Record<string, unknown>): boolean {
  return REMINDER_RESET_FIELDS.some(k => body[k] !== undefined)
}

export async function getTasks(req: Request, res: Response): Promise<void> {
  const { week, year } = req.query
  const myId = req.userId as string

  const myFilter: Record<string, unknown> = { userId: myId, deletedAt: null }
  if (week) myFilter.weekNumber = Number(week)
  if (year) myFilter.year = Number(year)
  if (req.query.spaceId) myFilter.spaceId = req.query.spaceId

  const myTasks = await SprintTask.find(myFilter).sort({ createdAt: 1 })

  // Tasks assigned to me by others (no week filter — show regardless)
  // When filtering by spaceId, apply same filter so assigned tasks from other spaces are excluded
  const assignedFilter: Record<string, unknown> = { assignedTo: myId, userId: { $ne: myId }, deletedAt: null }
  if (req.query.spaceId) assignedFilter.spaceId = req.query.spaceId
  const assignedTasks = await SprintTask.find(assignedFilter).sort({ createdAt: 1 })

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

  // Enrich owned tasks that have assignees — attach assigneeNames
  const allAssigneeIds = [...new Set(myTasks.flatMap(t => t.assignedTo ?? []))]
  let assigneeMap = new Map<string, string>()
  if (allAssigneeIds.length > 0) {
    const assigneeUsers = await User.find({ _id: { $in: allAssigneeIds } }, 'name username')
    assigneeMap = new Map(assigneeUsers.map(u => [u._id.toString(), u.name ?? u.username]))
  }
  const enrichedMyTasks = myTasks.map(t => {
    if (!t.assignedTo?.length) return t.toObject()
    const obj = t.toObject() as ReturnType<typeof t.toObject> & { assigneeNames?: string[] }
    obj.assigneeNames = t.assignedTo.map(id => assigneeMap.get(id)).filter((n): n is string => !!n)
    return obj
  })

  // Unified fetch (no week filter, no spaceId) — also include legacy TodoItem records
  // TodoItem has no spaceId — exclude when fetching for a specific space
  const todos = (!week && !year && !req.query.spaceId)
    ? await TodoItem.find({ userId: myId }).sort({ createdAt: 1 })
    : []

  res.json([...enrichedMyTasks, ...enrichedAssigned, ...todos])
}

export async function createTask(req: Request, res: Response): Promise<void> {
  const item = await SprintTask.create({ ...req.body, userId: req.userId })
  res.status(201).json(item)

  // Notify assigned users (fire-and-forget)
  const assignedTo: string[] = item.assignedTo ?? []
  const newlyAssigned = assignedTo.filter(id => id !== req.userId)
  if (newlyAssigned.length > 0) {
    const assigner = await User.findById(req.userId, 'name username')
    const assignerName = assigner?.name || assigner?.username || 'Хтось'
    await Promise.allSettled(
      newlyAssigned.map(uid =>
        sendPushToUser(uid, {
          title: '📋 Нова задача для тебе',
          body: `${assignerName} призначив тебе на «${item.title}»`,
          url: `/sprint?quest=${item._id}`,
        })
      )
    )
  }
}

export async function updateTask(req: Request, res: Response): Promise<void> {
  // Try SprintTask first — owner OR assignee can update
  const task = await SprintTask.findOne({
    _id: req.params.id,
    $or: [{ userId: req.userId }, { assignedTo: req.userId }],
    deletedAt: null,
  })
  if (task) {
    const prevAssigned: string[] = task.assignedTo ?? []
    TASK_ALLOWED.forEach(key => {
      if (req.body[key] !== undefined) (task as unknown as Record<string, unknown>)[key] = req.body[key]
    })
    if (touchesReminderSchedule(req.body)) task.reminderSent = false
    await task.save()
    res.json(task)

    // Notify newly assigned users (fire-and-forget)
    const nextAssigned: string[] = task.assignedTo ?? []
    const newlyAssigned = nextAssigned.filter(id => !prevAssigned.includes(id) && id !== req.userId)
    if (newlyAssigned.length > 0) {
      const assigner = await User.findById(req.userId, 'name username')
      const assignerName = assigner?.name || assigner?.username || 'Хтось'
      await Promise.allSettled(
        newlyAssigned.map(uid =>
          sendPushToUser(uid, {
            title: '📋 Нова задача для тебе',
            body: `${assignerName} призначив тебе на «${task.title}»`,
            url: `/sprint?quest=${task._id}`,
          })
        )
      )
    }
    return
  }

  // Fall back to TodoItem (legacy)
  const todo = await TodoItem.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    touchesReminderSchedule(req.body) ? { ...req.body, reminderSent: false } : req.body,
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
  const task = await SprintTask.findOneAndDelete({ _id: req.params.id, userId: req.userId, deletedAt: { $ne: null } })
  if (task?.imagePublicIds?.length) {
    destroyImages(task.imagePublicIds).catch(() => {})
  }
  res.status(204).end()
}

export async function rollbackImages(req: Request, res: Response): Promise<void> {
  const { publicIds } = req.body as { publicIds?: unknown }
  if (!Array.isArray(publicIds) || publicIds.length === 0) {
    res.status(400).json({ error: 'publicIds array required' })
    return
  }
  const ids = (publicIds as unknown[]).filter((id): id is string => typeof id === 'string')
  await destroyImages(ids)
  res.status(204).end()
}

export async function reorderTasks(req: Request, res: Response): Promise<void> {
  const { ids } = req.body
  if (!Array.isArray(ids)) { res.status(400).json({ error: 'ids required' }); return }
  await Promise.all(
    (ids as string[]).map((id, i) =>
      SprintTask.findOneAndUpdate({ _id: id, userId: req.userId }, { order: i + 1 })
    )
  )
  res.json({ ok: true })
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
    touchesReminderSchedule(req.body) ? { ...req.body, reminderSent: false } : req.body,
    { new: true }
  )
  if (!item) { res.status(404).json({ error: 'Not found' }); return }
  res.json(item)
}

export async function removeTodo(req: Request, res: Response): Promise<void> {
  await TodoItem.findOneAndDelete({ _id: req.params.id, userId: req.userId })
  res.status(204).end()
}
