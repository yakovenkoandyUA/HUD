import cron from 'node-cron'
import { sendPushToUser } from '../services/webpush'
import { User } from '../models/User'
import MoodLog from '../models/MoodLog'

function todayKyivIso(): string {
  const d = new Date(Date.now() + 3 * 60 * 60 * 1000)
  return d.toISOString().slice(0, 10)
}

// ── Evening recap push — 21:00 Kyiv (18:00 UTC) ───────────────────────────
cron.schedule('0 18 * * *', async () => {
  try {
    const today = todayKyivIso()
    const [users, loggedToday] = await Promise.all([
      User.find({}, '_id'),
      MoodLog.find({ date: today }, 'userId'),
    ])
    const loggedSet = new Set(loggedToday.map(l => l.userId))
    let sent = 0
    for (const user of users) {
      if (loggedSet.has(user._id.toString())) continue
      await sendPushToUser(user._id.toString(), {
        title: 'Як пройшов день?',
        body:  'Відзнач настрій і підсумуй день у MIMIR',
        url:   '/',
        tag:   'day-recap',
      })
      sent++
    }
    console.log(`[Push] Day recap sent to ${sent}/${users.length} users`)
  } catch (err) {
    console.error('[Push] Day recap error:', err)
  }
})

console.log('📅 Day reminder job scheduled (21:00 Kyiv)')
