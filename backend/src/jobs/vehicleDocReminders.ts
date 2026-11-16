import cron from 'node-cron'
import { VehicleEvent } from '../models/VehicleEvent'
import { Space } from '../models/Space'
import { isWebPushConfigured, sendScheduledPushToUser } from '../services/webpush'
import { kyivDate, kyivTime } from '../utils/questReminderTime'

const REMIND_DAYS = [30, 14, 7, 3, 1]

async function sendVehicleDocReminders(): Promise<void> {
  if (!isWebPushConfigured()) return
  const date = kyivDate()
  const expiresAt = kyivTime(date, '13:00')
  if (!expiresAt) return
  const today = Date.parse(date + 'T00:00:00Z')
  const docs = await VehicleEvent.find({ type: 'document', docExpiresAt: { $exists: true, $ne: null } }).lean()

  for (const doc of docs) {
    const expiry = doc.docExpiresAt?.slice(0, 10)
    if (!expiry) continue
    const daysLeft = (Date.parse(expiry + 'T00:00:00Z') - today) / 86_400_000
    if (!REMIND_DAYS.includes(daysLeft)) continue
    const space = await Space.findById(doc.spaceId).select('name members').lean()
    if (!space) continue
    const label = daysLeft === 1 ? 'завтра' : `через ${daysLeft} дн.`
    const key = `vehicle-doc-${doc._id}-${expiry}-${date}`
    await Promise.allSettled(space.members.map(member =>
      sendScheduledPushToUser(member.userId, {
        title: space.name,
        body: `${doc.docType || 'Документ'} — закінчується ${label}`,
        url: `/spaces/${doc.spaceId}`,
        tag: key,
      }, { key, expiresAt }),
    ))
  }
}

cron.schedule('*/5 12 * * *', () => sendVehicleDocReminders().catch(console.error), { timezone: 'Europe/Kyiv', noOverlap: true })
