import cron from 'node-cron'
import PushSubscription from '../models/PushSubscription'
import SprintTask from '../models/SprintTask'
import TodoItem from '../models/TodoItem'
import RecurringPayment from '../models/RecurringPayment'
import { sendNotification, sendToAll } from './webpush'

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

// Returns the race happening this weekend (Mon–Sun window), if any
function getRaceThisWeekend(): { name: string; flag: string } | null {
  const now = new Date()
  // Start of current Monday
  const monday = new Date(now)
  monday.setHours(0, 0, 0, 0)
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  // End of current Sunday
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)

  return (
    F1_2026_RACES.find((race) => {
      const d = new Date(race.date)
      return d >= monday && d <= sunday
    }) ?? null
  )
}

export async function sendRaceWeekendAlert(): Promise<void> {
  const race = getRaceThisWeekend()
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
      title: 'MIMIR',
      body: `RAAAACCEEEEE WEEEEEEEK 🏎️`,
      icon: '/icons/icon-192.png',
      url: '/f1',
    },
    async (expiredId) => {
      await PushSubscription.findByIdAndDelete(expiredId)
      console.log(`🗑 Removed expired subscription: ${expiredId}`)
    }
  )
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function sendReminderNotifications(): Promise<void> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = toDateStr(today)

  const [tasks, todos] = await Promise.all([
    SprintTask.find({ repeat: { $ne: 'none' }, reminder: { $ne: null }, nextDue: { $exists: true } }).lean(),
    TodoItem.find({ repeat: { $ne: 'none' }, reminder: { $ne: null }, nextDue: { $exists: true } }).lean(),
  ])

  const allItems = [...tasks, ...todos] as Array<{
    _id: unknown; title: string; userId: string; nextDue?: string
    reminder?: { amount: number; unit: string } | null
  }>

  for (const item of allItems) {
    if (!item.reminder || !item.nextDue) continue

    const [ny, nm, nd] = item.nextDue.split('-').map(Number)
    const nextDueDate = new Date(ny, nm - 1, nd)
    nextDueDate.setHours(0, 0, 0, 0)

    const reminderDate = new Date(nextDueDate)
    const { amount, unit } = item.reminder
    if (unit === 'minutes') reminderDate.setMinutes(reminderDate.getMinutes() - amount)
    else if (unit === 'hours') reminderDate.setHours(reminderDate.getHours() - amount)
    else if (unit === 'days') reminderDate.setDate(reminderDate.getDate() - amount)
    else if (unit === 'weeks') reminderDate.setDate(reminderDate.getDate() - amount * 7)
    reminderDate.setHours(0, 0, 0, 0)

    if (toDateStr(reminderDate) !== todayStr) continue

    const subs = await PushSubscription.find({ userId: item.userId }).lean()
    for (const sub of subs) {
      try {
        await sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          { title: 'MIMIR', body: `Нагадування: ${item.title}`, icon: '/icons/icon-192.png' }
        )
      } catch (err: unknown) {
        if ((err as { expired?: boolean }).expired) {
          await PushSubscription.findByIdAndDelete(sub._id)
          console.log(`🗑 Removed expired subscription: ${String(sub._id)}`)
        }
      }
    }
  }

  console.log(`🔔 Reminder notifications processed (${allItems.length} recurring tasks checked)`)

  // Recurring payments — notify on the payment day
  const todayDay = new Date().getDate()
  const payments = await RecurringPayment.find({ dayOfMonth: todayDay, isActive: true }).lean()
  for (const payment of payments) {
    const subs = await PushSubscription.find({ userId: String(payment.userId) }).lean()
    for (const sub of subs) {
      try {
        await sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          { title: '💳 Регулярний платіж', body: `${payment.name} — ${payment.amount} ₴`, icon: '/icons/icon-192.png' }
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

  // F1 race weekend alert — every Sunday at 08:00 Kyiv
  cron.schedule('0 8 * * 0', () => {
    sendRaceWeekendAlert().catch(console.error)
  }, { timezone: 'Europe/Kyiv' })
  console.log('🏎 F1 race weekend scheduler started (Sun 08:00 Kyiv time)')

  // Recurring task reminders — every day at 08:00 Kyiv (05:00 UTC)
  cron.schedule('0 5 * * *', () => {
    sendReminderNotifications().catch(console.error)
  })
  console.log('🔔 Reminder scheduler started (daily 05:00 UTC / 08:00 Kyiv)')
}
