import cron from 'node-cron'
import { isWebPushConfigured, sendScheduledPushToUser } from '../services/webpush'
import { User } from '../models/User'
import MoodLog from '../models/MoodLog'
import { kyivDate, kyivTime } from '../utils/questReminderTime'

async function sendDayReminder(): Promise<void> {
  if (!isWebPushConfigured()) return
  const now = Date.now()
  const date = kyivDate(now)
  const recapAt = kyivTime(date, '21:00')
  if (!recapAt) return
  const dateWindow = [-1, 0, 1].map(offset => kyivDate(now + offset * 86_400_000))
  const [users, loggedRecently] = await Promise.all([
    User.find({}, '_id').lean(),
    MoodLog.find({ date: { $in: dateWindow } }, 'userId').lean(),
  ])
  const loggedSet = new Set(loggedRecently.map(log => log.userId))
  for (const user of users) {
    const userId = String(user._id)
    if (loggedSet.has(userId)) continue
    await sendScheduledPushToUser(userId, {
      title: 'День добігає кінця',
      body: 'Як себе почуваєш? Відзнач настрій і зафіксуй підсумки',
      url: '/',
      tag: 'day-recap',
    }, { key: `day-recap-${date}`, expiresAt: recapAt + 6 * 60 * 60_000 })
  }
}

cron.schedule('*/5 21 * * *', () => sendDayReminder().catch(console.error), { timezone: 'Europe/Kyiv', noOverlap: true })
