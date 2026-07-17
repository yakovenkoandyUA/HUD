import cron from 'node-cron'
import { sendPushToUser } from '../services/webpush'
import { User } from '../models/User'

// ── Evening recap push — 21:00 Kyiv (18:00 UTC) ───────────────────────────
cron.schedule('0 18 * * *', async () => {
  try {
    const users = await User.find({})
    for (const user of users) {
      await sendPushToUser(user._id.toString(), {
        title: 'Як пройшов день?',
        body:  'Відзнач настрій і підсумуй день у MIMIR',
        url:   '/',
        tag:   'day-recap',  // one per day — replaces itself if sent twice
      })
    }
    console.log('[Push] Day recap reminders sent')
  } catch (err) {
    console.error('[Push] Day recap error:', err)
  }
})

console.log('📅 Day reminder job scheduled (21:00 Kyiv)')
