import cron from 'node-cron'
import { SportEvent } from '../models/SportEvent'
import PushSubscription from '../models/PushSubscription'
import { sendNotification } from '../services/webpush'

// Мімір-голосом — випадкова фраза при кожному нагадуванні
const MIMIR_WORKOUT_PHRASES = [
  'Тренував розум — а тепер не забудь потренувати тіло',
  'В здоровому тілі — здоровий дух',
  'Сила не чекає нікого. Час до зали',
  'Навіть мудрість тримається на дисципліні тіла',
  'Тіло — теж храм. Не занедбуй його сьогодні',
]

function randomPhrase(): string {
  return MIMIR_WORKOUT_PHRASES[Math.floor(Math.random() * MIMIR_WORKOUT_PHRASES.length)]
}

// Дата + час (за умовчанням 09:00, якщо не вказано) → конкретний момент
function parseDueAt(dateStr: string, timeStr?: string | null): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  const [hh, mm] = (timeStr || '09:00').split(':').map(Number)
  return new Date(y, m - 1, d, hh, mm, 0, 0)
}

async function sendWorkoutReminders(): Promise<void> {
  const now = new Date()
  const events = await SportEvent.find({ reminder: { $ne: null }, reminderSent: { $ne: true } }).lean()
  if (events.length === 0) return

  let sentCount = 0
  for (const event of events) {
    if (!event.reminder) continue
    const dueAt = parseDueAt(event.date, event.time)
    const reminderAt = new Date(dueAt)
    const { amount, unit } = event.reminder
    if (unit === 'minutes') reminderAt.setMinutes(reminderAt.getMinutes() - amount)
    else if (unit === 'hours') reminderAt.setHours(reminderAt.getHours() - amount)
    else if (unit === 'days') reminderAt.setDate(reminderAt.getDate() - amount)
    else if (unit === 'weeks') reminderAt.setDate(reminderAt.getDate() - amount * 7)

    if (now < reminderAt) continue
    // Пропущене нагадування (сервер був недоступний/деплой) — не спамити через добу
    if (now.getTime() - dueAt.getTime() > 24 * 60 * 60 * 1000) continue

    const subs = await PushSubscription.find({ userId: event.userId }).lean()
    for (const sub of subs) {
      try {
        await sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          { title: 'Мімір нагадує', body: randomPhrase(), url: `/spaces/${event.spaceId}`, tag: `workout-${String(event._id)}` }
        )
      } catch (err: unknown) {
        if ((err as { expired?: boolean }).expired) {
          await PushSubscription.findByIdAndDelete(sub._id)
        }
      }
    }
    await SportEvent.updateOne({ _id: event._id }, { reminderSent: true })
    sentCount++
  }
  if (sentCount > 0) console.log(`🏋 Workout reminders sent (${sentCount})`)
}

if (process.env.VAPID_PUBLIC_KEY) {
  cron.schedule('*/5 * * * *', () => {
    sendWorkoutReminders().catch(console.error)
  })
  console.log('🏋 Workout reminder scheduler started (every 5 min)')
}
