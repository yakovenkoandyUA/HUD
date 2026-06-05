import cron from 'node-cron'
import WatchlistItem from '../models/WatchlistItem'
import PushSubscription from '../models/PushSubscription'
import { sendToAll } from '../services/webpush'

export function startEpisodeReminder(): void {
  // Every day at 09:00 server time
  cron.schedule('0 9 * * *', async () => {
    console.log('🔔 Episode reminder job started')
    const now   = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    try {
      const items = await WatchlistItem.find({
        $or: [{ notifyNewEpisode: true }, { notifyNewSeason: true }],
      })

      for (const item of items) {
        const subs = await PushSubscription.find({ userId: item.userId })
        if (!subs.length) continue

        const subList = subs.map(s => ({
          endpoint: s.endpoint,
          keys: s.keys,
          id: String(s._id),
        }))

        if (item.notifyNewEpisode && item.nextEpisodeDate) {
          const d = new Date(item.nextEpisodeDate)
          const day = new Date(d.getFullYear(), d.getMonth(), d.getDate())
          if (day <= today) {
            await sendToAll(subList, {
              title: '🎬 Нова серія!',
              body:  `«${item.title}» — вже доступна`,
              url:   '/watchlist',
            })
          }
        }

        if (item.notifyNewSeason && item.nextSeasonDate) {
          const d = new Date(item.nextSeasonDate)
          const day = new Date(d.getFullYear(), d.getMonth(), d.getDate())
          if (day <= today) {
            await sendToAll(subList, {
              title: '🎬 Новий сезон!',
              body:  `«${item.title}» — вже доступний`,
              url:   '/watchlist',
            })
          }
        }
      }
    } catch (err) {
      console.error('Episode reminder job error:', err)
    }
  })

  console.log('📅 Episode reminder scheduler started')
}
