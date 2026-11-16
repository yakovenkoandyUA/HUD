import cron from 'node-cron'
import { PetEvent } from '../models/PetEvent'
import { Space } from '../models/Space'
import { isWebPushConfigured, sendScheduledPushToUser } from '../services/webpush'
import { kyivDate, kyivTime } from '../utils/questReminderTime'

async function sendPetCareReminders(): Promise<void> {
  if (!isWebPushConfigured()) return
  const today = kyivDate()
  const expiresAt = kyivTime(today, '10:00')
  if (!expiresAt) return
  const events = await PetEvent.find({
    type: { $in: ['vaccination', 'medication'] },
    date: { $lte: today },
  }).sort({ date: -1, createdAt: -1 }).lean()
  const seen = new Set<string>()

  for (const event of events) {
    const label = (event.medicationName || event.title).trim()
    const series = JSON.stringify([event.spaceId, event.type, label.toLowerCase()])
    if (seen.has(series)) continue
    seen.add(series)
    if (event.nextDue?.slice(0, 10) !== today) continue

    const space = await Space.findOne({ _id: event.spaceId, type: 'pet', archived: { $ne: true } })
      .select('members name petProfile.name').lean()
    if (!space) continue
    const name = space.petProfile?.name || space.name
    const key = `pet-care-${event._id}-${today}`
    await Promise.allSettled(space.members.map(member =>
      sendScheduledPushToUser(member.userId, {
        title: event.type === 'vaccination' ? 'Сьогодні щеплення' : 'Сьогодні час дати ліки',
        body: label ? `${name} · ${label}` : name,
        url: `/spaces/${event.spaceId}`,
        tag: key,
      }, { key, expiresAt }),
    ))
  }
}

cron.schedule('*/5 9 * * *', () => sendPetCareReminders().catch(console.error), {
  timezone: 'Europe/Kyiv',
  noOverlap: true,
})
