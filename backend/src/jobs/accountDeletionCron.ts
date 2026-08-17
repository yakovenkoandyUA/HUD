import cron from 'node-cron'
import { User } from '../models/User'
import { hardDeleteUser } from '../scripts/hardDeleteUser'

/**
 * Щоденно о 04:00 UTC знаходить акаунти, для яких видалення запитане
 * 30+ днів тому (`accountStatus: 'deletion_requested'`), і остаточно
 * видаляє їх дані через hardDeleteUser.
 */
export function startAccountDeletionCron(): void {
  cron.schedule('0 4 * * *', async () => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 30)

    const due = await User.find({
      accountStatus: 'deletion_requested',
      deletedAt: { $lt: cutoff },
    }).select('_id')

    if (!due.length) return

    let succeeded = 0
    for (const u of due) {
      const uid = (u._id as { toString(): string }).toString()
      try {
        await hardDeleteUser(uid)
        succeeded++
      } catch (err) {
        console.error(`[accountDeletionCron] failed to delete user ${uid}`, err)
      }
    }

    console.log(`[accountDeletionCron] hard-deleted ${succeeded}/${due.length} accounts`)
  })
}
