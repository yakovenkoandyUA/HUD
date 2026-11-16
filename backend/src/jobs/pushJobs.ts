import cron from 'node-cron'
import { isWebPushConfigured, sendScheduledPushToUser } from '../services/webpush'
import { F1_RACES_2026 } from '../data/f1Season2026'
import WatchlistItem from '../models/WatchlistItem'
import { User } from '../models/User'
import { kyivDate, kyivTime } from '../utils/questReminderTime'

const MINUTE = 60_000

async function sendF1StartingSoon(): Promise<void> {
  if (!isWebPushConfigured()) return
  const now = Date.now()
  for (const race of F1_RACES_2026) {
    const raceStart = Date.parse(race.raceUtc)
    if (now < raceStart - 60 * MINUTE || now >= raceStart - 50 * MINUTE) continue
    const users = await User.find({ f1Enabled: true }, '_id').lean()
    for (const user of users) {
      await sendScheduledPushToUser(String(user._id), {
        title: '🏎️ Гонка скоро починається',
        body: `${race.name} — ${race.circuit}`,
        url: `/f1/${race.round}`,
        tag: `f1-race-start-${race.round}`,
      }, { key: `f1-race-start-${race.raceUtc}`, expiresAt: raceStart - 50 * MINUTE })
    }
  }
}

async function sendWatchlistReminders(kind: 'episode' | 'season'): Promise<void> {
  if (!isWebPushConfigured()) return
  const date = kyivDate()
  const expiresAt = kyivTime(date, kind === 'episode' ? '14:00' : '13:00')
  if (!expiresAt) return
  const midnight = new Date(date + 'T00:00:00Z')
  const tomorrow = new Date(midnight.getTime() + 86_400_000)
  const items = await WatchlistItem.find({
    [kind === 'episode' ? 'notifyNewEpisode' : 'notifyNewSeason']: true,
    [kind === 'episode' ? 'nextEpisodeDate' : 'nextSeasonDate']: { $gte: midnight, $lt: tomorrow },
  }).lean()
  for (const item of items) {
    await sendScheduledPushToUser(item.userId, {
      title: kind === 'episode' ? '🎬 Новий епізод' : '🎬 Новий сезон',
      body: `«${item.title}» — вже доступний`,
      url: '/watchlist',
      tag: `${kind}-${item._id}-${date}`,
    }, { key: `watchlist-${kind}-${item._id}-${date}`, expiresAt })
  }
}

cron.schedule('* * * * *', () => sendF1StartingSoon().catch(console.error), { noOverlap: true })
const options = { timezone: 'Europe/Kyiv', noOverlap: true }
cron.schedule('*/5 13 * * *', () => sendWatchlistReminders('episode').catch(console.error), options)
cron.schedule('*/5 12 * * *', () => sendWatchlistReminders('season').catch(console.error), options)
