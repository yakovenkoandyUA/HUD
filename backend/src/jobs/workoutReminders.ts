import cron from 'node-cron'
import { SportEvent } from '../models/SportEvent'
import { isWebPushConfigured, sendScheduledPushToUser } from '../services/webpush'
import { kyivDate, questReminderTime } from '../utils/questReminderTime'
import { isSportEventDueOnDay } from '../controllers/sportController'

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

const MINUTE = 60_000
const DAY = 86_400_000
const UNIT_MS = { minutes: MINUTE, hours: 60 * MINUTE, days: DAY, weeks: 7 * DAY }

async function sendWorkoutReminders(): Promise<void> {
  const now = Date.now()
  const events = await SportEvent.find({ reminder: { $ne: null } }).lean()
  for (const event of events) {
    if (!event.reminder) continue
    const lead = UNIT_MS[event.reminder.unit] * event.reminder.amount
    if (!Number.isFinite(lead) || lead <= 0) continue
    const target = now + lead
    // Adjacent dates cover the Kyiv offset change and a retry window crossing midnight.
    const dates = !event.repeat || event.repeat === 'none'
      ? [event.date]
      : [-DAY, 0, DAY].map(offset => kyivDate(target + offset)).filter(date => {
        const [year, month, day] = date.split('-').map(Number)
        return isSportEventDueOnDay(event, new Date(year, month - 1, day), date)
      })

    for (const date of dates) {
      if (event.reminderSentFor === date) continue
      const schedule = questReminderTime(date, event.time, event.reminder)
      if (!schedule || now < schedule.reminderAt) continue
      const expiresAt = Math.min(schedule.reminderAt + 60 * MINUTE, schedule.dueAt + 15 * MINUTE)
      if (now >= expiresAt) continue
      const { accepted, pending } = await sendScheduledPushToUser(event.userId, {
        title: 'Мімір нагадує про тренування',
        body: event.title ? `${event.title}. ${randomPhrase()}` : randomPhrase(),
        url: `/spaces/${event.spaceId}`,
        tag: `workout-${event._id}-${date}`,
      }, {
        key: `workout-${event._id}-${schedule.dueAt}-${schedule.reminderAt}`,
        expiresAt,
      })
      if (accepted > 0 && pending === 0) {
        await SportEvent.updateOne({
          _id: event._id, date: event.date, time: event.time ?? null,
          'reminder.amount': event.reminder.amount, 'reminder.unit': event.reminder.unit,
        }, { $set: { reminderSentFor: date } })
      }
    }
  }
}

if (isWebPushConfigured()) {
  cron.schedule('*/5 * * * *', () => sendWorkoutReminders().catch(console.error), { noOverlap: true })
}
