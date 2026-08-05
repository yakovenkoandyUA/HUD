import cron from 'node-cron'
import PushSubscription from '../models/PushSubscription'
import SprintTask from '../models/SprintTask'
import TodoItem from '../models/TodoItem'
import RecurringPayment from '../models/RecurringPayment'
import F1SessionReminder from '../models/F1SessionReminder'
import { sendNotification, sendToAll, sendPushToUser } from './webpush'

// 2026 F1 race dates (race Sunday, ISO format)
const F1_2026_RACES: Array<{ name: string; date: string; flag: string }> = [
  { name: 'Australian GP',          flag: '🇦🇺', date: '2026-03-08' },
  { name: 'Chinese GP',             flag: '🇨🇳', date: '2026-03-15' },
  { name: 'Japanese GP',            flag: '🇯🇵', date: '2026-03-29' },
  { name: 'Miami GP',               flag: '🇺🇸', date: '2026-05-03' },
  { name: 'Canadian GP',            flag: '🇨🇦', date: '2026-05-24' },
  { name: 'Monaco GP',              flag: '🇲🇨', date: '2026-06-07' },
  { name: 'Spain GP',               flag: '🇪🇸', date: '2026-06-14' },
  { name: 'Austrian GP',            flag: '🇦🇹', date: '2026-06-28' },
  { name: 'British GP',             flag: '🇬🇧', date: '2026-07-05' },
  { name: 'Belgian GP',             flag: '🇧🇪', date: '2026-07-19' },
  { name: 'Hungarian GP',           flag: '🇭🇺', date: '2026-07-26' },
  { name: 'Dutch GP',               flag: '🇳🇱', date: '2026-08-23' },
  { name: 'Italian GP',             flag: '🇮🇹', date: '2026-09-06' },
  { name: 'Spain GP',    flag: '🇪🇸', date: '2026-09-13' },
  { name: 'Azerbaijan GP',          flag: '🇦🇿', date: '2026-09-26' },
  { name: 'Singapore GP',           flag: '🇸🇬', date: '2026-10-11' },
  { name: 'United States GP',       flag: '🇺🇸', date: '2026-10-25' },
  { name: 'Mexico City GP',         flag: '🇲🇽', date: '2026-11-01' },
  { name: 'São Paulo GP',           flag: '🇧🇷', date: '2026-11-08' },
  { name: 'Las Vegas GP',           flag: '🇺🇸', date: '2026-11-21' },
  { name: 'Qatar GP',               flag: '🇶🇦', date: '2026-11-29' },
  { name: 'Abu Dhabi GP',           flag: '🇦🇪', date: '2026-12-06' },
]

// Returns the race happening this Sunday (called on Monday morning), if any.
// "This Sunday" = 6 days after Monday = the same calendar week's Sunday.
function getRaceThisSunday(): { name: string; flag: string } | null {
  const now = new Date()
  // Find next Sunday: from today (Monday) it's always +6 days
  const sunday = new Date(now)
  sunday.setHours(0, 0, 0, 0)
  // getDay(): 0=Sun,1=Mon,...6=Sat — from Monday (+1) to Sunday is +6 days
  const daysUntilSunday = (7 - now.getDay()) % 7 || 7
  sunday.setDate(now.getDate() + daysUntilSunday)
  const sundayStr = sunday.toISOString().slice(0, 10)

  return F1_2026_RACES.find(race => race.date === sundayStr) ?? null
}

export async function sendRaceWeekendAlert(): Promise<void> {
  const race = getRaceThisSunday()
  if (!race) return

  const subscriptions = await PushSubscription.find({}).lean()
  if (subscriptions.length === 0) return

  console.log(`🏎 Sending race weekend alert: ${race.name} to ${subscriptions.length} subscribers`)

  await sendToAll(
    subscriptions.map((s) => ({
      id: String(s._id),
      endpoint: s.endpoint,
      keys: s.keys,
    })),
    {
      title: '🏎️ Гоночний вікенд цього тижня',
      body: `${race.name} — не пропусти`,
      url:  '/f1',
      tag:  'f1-race-weekend',
    },
    async (expiredId) => {
      await PushSubscription.findByIdAndDelete(expiredId)
      console.log(`🗑 Removed expired subscription: ${expiredId}`)
    }
  )
}

interface ReminderItem {
  _id: unknown; title: string; userId: string
  dueDate?: string | null; dueTime?: string | null; nextDue?: string; repeat?: string
  reminder?: { amount: number; unit: string } | null
}

// Дедлайн + час (за умовчанням 09:00, якщо час не вказано) → конкретний момент
function parseDueAt(dateStr: string, timeStr?: string | null): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  const [hh, mm] = (timeStr || '09:00').split(':').map(Number)
  return new Date(y, m - 1, d, hh, mm, 0, 0)
}

// Перевіряє та шле нагадування для одної моделі (SprintTask або TodoItem), позначає reminderSent
async function processReminders(
  Model: { updateOne: (filter: Record<string, unknown>, update: Record<string, unknown>) => Promise<unknown> },
  items: ReminderItem[],
  now: Date
): Promise<number> {
  let sentCount = 0
  for (const item of items) {
    if (!item.reminder) continue
    const isRecurring = !!item.repeat && item.repeat !== 'none'
    const dateStr = isRecurring ? item.nextDue : item.dueDate
    if (!dateStr) continue

    const dueAt = parseDueAt(dateStr, item.dueTime)
    const reminderAt = new Date(dueAt)
    const { amount, unit } = item.reminder
    if (unit === 'minutes') reminderAt.setMinutes(reminderAt.getMinutes() - amount)
    else if (unit === 'hours') reminderAt.setHours(reminderAt.getHours() - amount)
    else if (unit === 'days') reminderAt.setDate(reminderAt.getDate() - amount)
    else if (unit === 'weeks') reminderAt.setDate(reminderAt.getDate() - amount * 7)

    if (now < reminderAt) continue
    // Пропущене нагадування (сервер був недоступний/деплой) — не спамити через добу
    if (now.getTime() - dueAt.getTime() > 24 * 60 * 60 * 1000) continue

    const subs = await PushSubscription.find({ userId: item.userId }).lean()
    for (const sub of subs) {
      try {
        await sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          { title: 'Час виконати', body: item.title, url: '/sprint', tag: `reminder-${String(item._id)}` }
        )
      } catch (err: unknown) {
        if ((err as { expired?: boolean }).expired) {
          await PushSubscription.findByIdAndDelete(sub._id)
          console.log(`🗑 Removed expired subscription: ${String(sub._id)}`)
        }
      }
    }
    await Model.updateOne({ _id: item._id }, { reminderSent: true })
    sentCount++
  }
  return sentCount
}

async function sendReminderNotifications(): Promise<void> {
  const now = new Date()
  const baseFilter = { reminder: { $ne: null }, reminderSent: { $ne: true }, done: false }

  const [tasks, todos] = await Promise.all([
    SprintTask.find({ ...baseFilter, deletedAt: null }).lean(),
    TodoItem.find(baseFilter).lean(),
  ])

  const sentTasks = await processReminders(SprintTask, tasks as unknown as ReminderItem[], now)
  const sentTodos = await processReminders(TodoItem, todos as unknown as ReminderItem[], now)
  if (sentTasks + sentTodos > 0) {
    console.log(`🔔 Reminder notifications sent (${sentTasks + sentTodos})`)
  }
}

// Нагадування про конкретну сесію ГП (FP/Sprint/Quali/Race) — точні до сесії, окремо від задач
async function sendF1SessionReminders(): Promise<void> {
  const now = new Date()
  const due = await F1SessionReminder.find({ sent: false, remindAt: { $lte: now } }).lean()
  if (due.length === 0) return

  for (const r of due) {
    // Пропущене нагадування (сервер був недоступний/деплой) — не спамити через добу
    if (now.getTime() - new Date(r.remindAt).getTime() <= 24 * 60 * 60 * 1000) {
      await sendPushToUser(r.userId, {
        title: `🏎 ${r.sessionLabel} за 30 хв`,
        body: 'Скоро початок сесії',
        url: `/f1/${r.round}`,
        tag: `f1-session-${r.round}-${r.sessionKey}`,
      })
    }
    await F1SessionReminder.updateOne({ _id: r._id }, { sent: true })
  }
  console.log(`🏎 F1 session reminders sent (${due.length})`)
}

// Регулярні платежі — раз на добу, окремо від 5-хвилинного reminder-циклу
async function sendRecurringPaymentNotifications(): Promise<void> {
  const todayDay = new Date().getDate()
  const payments = await RecurringPayment.find({ dayOfMonth: todayDay, isActive: true }).lean()
  for (const payment of payments) {
    const subs = await PushSubscription.find({ userId: String(payment.userId) }).lean()
    for (const sub of subs) {
      try {
        await sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          { title: `💳 «${payment.name}» — сьогодні`, body: `${payment.amount} ₴ спишеться сьогодні`, url: '/finance', tag: `recurring-${String(payment._id)}` }
        )
      } catch (err: unknown) {
        if ((err as { expired?: boolean }).expired) {
          await PushSubscription.findByIdAndDelete(sub._id)
        }
      }
    }
  }
  if (payments.length > 0) console.log(`💳 Recurring payment notifications sent (${payments.length})`)
}

export function startF1Scheduler(): void {
  if (!process.env.VAPID_PUBLIC_KEY) {
    console.warn('⚠️  VAPID not configured — F1 scheduler disabled')
    return
  }

  // F1 race week alert — every Monday at 08:00 Kyiv
  // Checks if this week's Sunday has a race; if yes → push early in the week
  cron.schedule('0 8 * * 1', () => {
    sendRaceWeekendAlert().catch(console.error)
  }, { timezone: 'Europe/Kyiv' })
  console.log('🏎 F1 race week scheduler started (Mon 08:00 Kyiv time)')

  // Task/quest reminders — every 5 minutes, precise to dueDate+dueTime
  cron.schedule('*/5 * * * *', () => {
    sendReminderNotifications().catch(console.error)
  })
  console.log('🔔 Reminder scheduler started (every 5 min)')

  // F1 session reminders — every 5 minutes, precise to sessionAt - 30min
  cron.schedule('*/5 * * * *', () => {
    sendF1SessionReminders().catch(console.error)
  })
  console.log('🏎 F1 session reminder scheduler started (every 5 min)')

  // Recurring payments — daily at 08:00 Kyiv (05:00 UTC)
  cron.schedule('0 5 * * *', () => {
    sendRecurringPaymentNotifications().catch(console.error)
  })
  console.log('💳 Recurring payment scheduler started (daily 05:00 UTC / 08:00 Kyiv)')
}
