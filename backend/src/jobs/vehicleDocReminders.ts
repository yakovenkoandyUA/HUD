import cron from 'node-cron'
import { VehicleEvent } from '../models/VehicleEvent'
import { Space } from '../models/Space'
import { sendPushToUser } from '../services/webpush'

const REMIND_DAYS = [30, 14, 7, 3, 1]

// Runs daily at 09:00 UTC (12:00 Kyiv)
cron.schedule('0 9 * * *', async () => {
  try {
    const now = new Date()
    now.setHours(0, 0, 0, 0)

    const docs = await VehicleEvent.find({
      type:         'document',
      docExpiresAt: { $exists: true, $ne: null },
    })

    for (const doc of docs) {
      if (!doc.docExpiresAt) continue

      const expiry = new Date(doc.docExpiresAt)
      expiry.setHours(0, 0, 0, 0)

      const daysLeft = Math.round((expiry.getTime() - now.getTime()) / 86_400_000)
      if (!REMIND_DAYS.includes(daysLeft)) continue

      // get space to find members to notify
      const space = await Space.findById(doc.spaceId)
      if (!space) continue

      const label =
        daysLeft === 1 ? 'завтра' :
        daysLeft <= 7  ? `через ${daysLeft} дн.` :
                         `через ${daysLeft} днів`

      const docLabel = doc.docType || 'Документ'
      const spaceName = space.name

      // notify all members
      await Promise.allSettled(
        space.members.map(m =>
          sendPushToUser(m.userId, {
            title: spaceName,
            body:  `${docLabel} — закінчується ${label}`,
            url:   `/spaces/${doc.spaceId}`,
          })
        )
      )
    }

    console.log('[Push] Vehicle doc reminders processed')
  } catch (err) {
    console.error('[Push] Vehicle doc reminder error:', err)
  }
})

console.log('🚗 Vehicle document reminders scheduled (09:00 UTC)')
