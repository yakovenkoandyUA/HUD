import cron from 'node-cron'
import { isWebPushConfigured, sendScheduledPushToUser } from '../services/webpush'
import SprintTask, { ISprintTask } from '../models/SprintTask'
import { isSportEventDueOnDay } from '../controllers/sportController'
import { kyivDate, kyivTime } from '../utils/questReminderTime'

function isRoutineDueToday(task: ISprintTask & { createdAt?: Date }, today: Date, date: string): boolean {
  const anchor = task.repeatStartDate ?? (task.createdAt && kyivDate(task.createdAt.getTime()))
  if (anchor && date < anchor) return false
  if (task.repeat === 'daily') return true
  if (task.repeat === 'weekly') {
    return Boolean(task.nextDue && today.getDay() === new Date(task.nextDue + 'T00:00:00').getDay())
  }
  if (task.repeat === 'monthly') {
    return today.getDate() === (task.repeatDay ?? Number(task.nextDue?.slice(8)))
  }
  return Boolean(anchor && isSportEventDueOnDay({
    date: anchor, repeat: task.repeat, repeatConfig: task.repeatConfig ?? null,
  }, today, date))
}

async function sendRoutineReminders(): Promise<void> {
  if (!isWebPushConfigured()) return
  const date = kyivDate()
  const today = new Date(date + 'T00:00:00')
  const expiresAt = kyivTime(date, '13:00')
  if (!expiresAt) return
  const routines = await SprintTask.find({ repeat: { $exists: true, $nin: ['none', null] }, done: false, deletedAt: null })
  const byUser = new Map<string, string[]>()
  for (const task of routines) {
    if (task.completionHistory?.includes(date) || !isRoutineDueToday(task, today, date)) continue
    const titles = byUser.get(task.userId) ?? []
    titles.push(task.title)
    byUser.set(task.userId, titles)
  }

  for (const [userId, titles] of byUser) {
    await sendScheduledPushToUser(userId, {
      title: 'Звички ще не виконані',
      body: titles.length === 1 ? `«${titles[0]}» ще чекає на тебе` : `${titles.length} звичок чекають — не зупиняй серію`,
      url: '/sprint',
      tag: `routine-reminder-${date}`,
    }, { key: `routine-reminder-${date}`, expiresAt })
  }
}

cron.schedule('*/5 12 * * *', () => sendRoutineReminders().catch(console.error), { timezone: 'Europe/Kyiv', noOverlap: true })
