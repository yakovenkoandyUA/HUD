import cron from 'node-cron'
import SprintTask from '../models/SprintTask'
import TodoItem from '../models/TodoItem'
import F1SessionReminder from '../models/F1SessionReminder'
import { User } from '../models/User'
import { F1_RACES_2026 } from '../data/f1Season2026'
import { isWebPushConfigured, sendScheduledPushToUser } from './webpush'
import { kyivDate, kyivTime, questReminderTime } from '../utils/questReminderTime'

async function sendRaceWeekendAlert(): Promise<void> {
  const date = kyivDate()
  const monday = Date.parse(date + 'T00:00:00Z')
  const nextMonday = new Date(monday + 7 * 86_400_000).toISOString().slice(0, 10)
  const race = F1_RACES_2026.find(item => {
    const day = kyivDate(Date.parse(item.raceUtc))
    return day >= date && day < nextMonday
  })
  if (!race) return
  const expiresAt = kyivTime(date, '09:00')
  if (!expiresAt) return
  const users = await User.find({ f1Enabled: true }, '_id').lean()
  for (const user of users) {
    await sendScheduledPushToUser(String(user._id), {
      title: '🏎️ Гоночний вікенд цього тижня',
      body: `${race.name} — не пропусти`,
      url: `/f1/${race.round}`,
      tag: `f1-race-weekend-${race.round}`,
    }, { key: `f1-weekend-${race.raceUtc}`, expiresAt })
  }
}

interface ReminderItem {
  _id: unknown; title: string; userId: string
  dueDate?: string | null; dueTime?: string | null; nextDue?: string; repeat?: string; type?: string
  reminder?: { amount: number; unit: string } | null
  automaticReminderSince?: Date | null
  reminderSent?: boolean
  dueReminderSent?: boolean
}

const REMINDER_GRACE_MS = 24 * 60 * 60 * 1000
const REMINDER_CLAIM_MS = 2 * 60 * 1000
const DEADLINE_GRACE_MS = 15 * 60 * 1000
const ADVANCE_NOTICE_MINUTES = 30

function getReminderAttempt(item: ReminderItem, date: string, now: number) {
  const automatic = item.automaticReminderSince
  const offset = automatic ? { amount: ADVANCE_NOTICE_MINUTES, unit: 'minutes' } : item.reminder
  if (!offset || (automatic && !item.dueTime)) return null
  const schedule = questReminderTime(date, item.dueTime, offset)
  if (!schedule || now < schedule.reminderAt) return null

  const atDeadline = Boolean(automatic && now >= schedule.dueAt)
  const startsAt = atDeadline ? schedule.dueAt : schedule.reminderAt
  const sentField = atDeadline ? 'dueReminderSent' : 'reminderSent'
  if (item[sentField] || (automatic && automatic.getTime() > startsAt)) return null
  const expiresAt = automatic
    ? schedule.dueAt + (atDeadline ? DEADLINE_GRACE_MS : 0)
    : schedule.dueAt + REMINDER_GRACE_MS
  if (expiresAt - now < 1000) return null

  const title = automatic && !atDeadline
    ? (item.type === 'shopping' ? 'Покупка за 30 хвилин' : 'Квест за 30 хвилин')
    : (item.type === 'shopping' ? 'Час купити' : 'Час виконати')
  return { sentField, expiresAt, title, atDeadline }
}

async function processReminders(
  Model: { updateOne: (filter: Record<string, unknown>, update: Record<string, unknown>) => Promise<{ matchedCount: number }> },
  items: ReminderItem[],
  activeFilter: Record<string, unknown>,
): Promise<number> {
  let sentCount = 0
  for (const item of items) {
    const isRecurring = !!item.repeat && item.repeat !== 'none'
    const dateStr = isRecurring ? item.nextDue : item.dueDate
    if (!dateStr) continue

    const now = Date.now()
    const attempt = getReminderAttempt(item, dateStr, now)
    if (!attempt) continue

    const currentSchedule = {
      ...activeFilter,
      _id: item._id,
      repeat: item.repeat ?? null,
      [isRecurring ? 'nextDue' : 'dueDate']: dateStr,
      dueTime: item.dueTime ?? null,
      automaticReminderSince: item.automaticReminderSince ?? null,
      [attempt.sentField]: { $ne: true },
      ...(item.reminder && {
        'reminder.amount': item.reminder.amount,
        'reminder.unit': item.reminder.unit,
      }),
    }
    // Atomically reserve this attempt so concurrent cron runs don't both send it.
    const claimUntil = new Date(now + REMINDER_CLAIM_MS)
    const claim = await Model.updateOne({
      ...currentSchedule,
      $or: [{ reminderClaimUntil: null }, { reminderClaimUntil: { $lte: new Date(now) } }],
    }, { $set: { reminderClaimUntil: claimUntil } })
    if (!claim.matchedCount) continue

    const claimFilter = { _id: item._id, reminderClaimUntil: claimUntil }
    try {
      const { accepted, pending } = await sendScheduledPushToUser(item.userId, {
        title: attempt.title,
        body: item.title,
        url: `/sprint?quest=${String(item._id)}`,
        tag: `reminder-${String(item._id)}${attempt.atDeadline ? '-due' : ''}`,
      }, {
        key: JSON.stringify([
          'quest', String(item._id), dateStr, item.dueTime, item.automaticReminderSince,
          item.reminder?.amount, item.reminder?.unit, attempt.sentField,
        ]),
        expiresAt: attempt.expiresAt,
      })
      if (accepted > 0 && pending === 0) {
        await Model.updateOne({ ...currentSchedule, ...claimFilter }, { $set: { [attempt.sentField]: true } })
        sentCount++
      }
    } finally {
      await Model.updateOne(claimFilter, { $unset: { reminderClaimUntil: '' } })
    }
  }
  return sentCount
}

async function sendReminderNotifications(): Promise<void> {
  const now = Date.now()
  const baseFilter = { done: false }
  const taskFilter = { ...baseFilter, deletedAt: null }
  const pending = {
    $or: [
      { automaticReminderSince: null, reminder: { $ne: null }, reminderSent: { $ne: true } },
      {
        automaticReminderSince: { $ne: null },
        dueReminderSent: { $ne: true },
        dueDate: { $gte: kyivDate(now - DEADLINE_GRACE_MS), $lte: kyivDate(now + ADVANCE_NOTICE_MINUTES * 60000) },
      },
    ],
  }

  const [tasks, todos] = await Promise.all([
    SprintTask.find({ ...taskFilter, ...pending }).lean(),
    TodoItem.find({ ...baseFilter, ...pending }).lean(),
  ])

  const sentTasks = await processReminders(SprintTask, tasks, taskFilter)
  const sentTodos = await processReminders(TodoItem, todos, baseFilter)
  if (sentTasks + sentTodos > 0) {
    console.log(`🔔 Reminder notifications sent (${sentTasks + sentTodos})`)
  }
}

async function sendF1SessionReminders(): Promise<void> {
  const now = new Date()
  const due = await F1SessionReminder.find({
    sent: false, remindAt: { $lte: now }, sessionAt: { $gt: now },
  }).lean()
  for (const reminder of due) {
    const { accepted, pending } = await sendScheduledPushToUser(reminder.userId, {
      title: `🏎 Скоро ${reminder.sessionLabel}`,
      body: 'Скоро початок сесії',
      url: `/f1/${reminder.round}`,
      tag: `f1-session-${reminder.round}-${reminder.sessionKey}`,
    }, {
      key: `f1-session-${reminder._id}-${reminder.sessionAt.toISOString()}`,
      expiresAt: reminder.sessionAt.getTime(),
    })
    if (accepted > 0 && pending === 0) {
      await F1SessionReminder.updateOne({
        _id: reminder._id, sessionAt: reminder.sessionAt,
      }, { $set: { sent: true } })
    }
  }
}

export function startF1Scheduler(): void {
  if (!isWebPushConfigured()) {
    console.warn('⚠️  VAPID not configured — F1 scheduler disabled')
    return
  }

  // F1 race week alert — every Monday at 08:00 Kyiv
  // Checks if this week's Sunday has a race; if yes → push early in the week
  cron.schedule('*/5 8 * * 1', () => sendRaceWeekendAlert().catch(console.error), { timezone: 'Europe/Kyiv', noOverlap: true })

  cron.schedule('* * * * *', () => sendReminderNotifications().catch(console.error), { noOverlap: true })
  console.log('🔔 Reminder scheduler started (every minute)')

  // F1 session reminders — every 5 minutes, precise to sessionAt - 30min
  cron.schedule('*/5 * * * *', () => sendF1SessionReminders().catch(console.error), { noOverlap: true })
}
