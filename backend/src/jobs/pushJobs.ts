import cron from 'node-cron'
import { sendPushToUser } from '../services/webpush'
import { F1_RACES_2026 } from '../data/f1Season2026'
import WatchlistItem from '../models/WatchlistItem'
import { User } from '../models/User'

// ── F1: push 1 hour before race start ─────────────────────────────
// Runs every minute — lightweight date comparison only
cron.schedule('* * * * *', async () => {
  const now = new Date()

  for (const race of F1_RACES_2026) {
    const raceStart = new Date(race.raceUtc)
    const diffMin = (raceStart.getTime() - now.getTime()) / 1000 / 60

    if (diffMin >= 59 && diffMin <= 61) {
      try {
        const f1Users = await User.find({ f1Enabled: true })
        for (const user of f1Users) {
          await sendPushToUser(user._id.toString(), {
            title: '🏎️ Гонка через 1 годину!',
            body:  `${race.name} — ${race.circuit}`,
            url:   '/f1',
            tag:   'f1-race-start',
          })
        }
        console.log(`[Push] Sent F1 reminder for ${race.name}`)
      } catch (err) {
        console.error(`[Push] F1 reminder error for ${race.name}:`, err)
      }
    }
  }
})

// ── Watchlist: new episode today — 13:00 Kyiv (10:00 UTC) ─────────
cron.schedule('0 10 * * *', async () => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  try {
    const items = await WatchlistItem.find({
      notifyNewEpisode: true,
      nextEpisodeDate: { $gte: today, $lt: tomorrow },
    })
    for (const item of items) {
      await sendPushToUser(item.userId, {
        title: '🎬 Нова серія вийшла!',
        body:  `«${item.title}» — вже доступна`,
        url:   '/watchlist',
        tag:   `episode-${String(item._id)}`,
      })
      console.log(`[Push] Sent episode reminder for "${item.title}"`)
    }
  } catch (err) {
    console.error('[Push] Episode reminder error:', err)
  }
})

// ── Watchlist: new season today ────────────────────────────────────
cron.schedule('0 9 * * *', async () => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  try {
    const items = await WatchlistItem.find({
      notifyNewSeason: true,
      nextSeasonDate: { $gte: today, $lt: tomorrow },
    })
    for (const item of items) {
      await sendPushToUser(item.userId, {
        title: '🎬 Новий сезон вийшов!',
        body:  `«${item.title}» — вже доступний`,
        url:   '/watchlist',
        tag:   `season-${String(item._id)}`,
      })
      console.log(`[Push] Sent season reminder for "${item.title}"`)
    }
  } catch (err) {
    console.error('[Push] Season reminder error:', err)
  }
})

console.log('📅 Push jobs scheduled (F1 + Watchlist)')
