import cron from 'node-cron'
import { isWebPushConfigured, sendScheduledPushToUser } from '../services/webpush'
import { kyivDate, kyivTime } from '../utils/questReminderTime'
import { Space } from '../models/Space'
import SprintTask from '../models/SprintTask'
import Memory from '../models/Memory'
import Transaction from '../models/Transaction'

function weekStart(): Date {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - 7)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

function formatAmount(n: number): string {
  return n >= 1000 ? `${Math.round(n / 100) / 10}к` : String(Math.round(n))
}

// Sunday at 11:00 Kyiv, with retries during that hour.
cron.schedule('*/5 11 * * 0', async () => {
  if (!isWebPushConfigured()) return
  try {
    const date = kyivDate()
    const expiresAt = kyivTime(date, '12:00')
    if (!expiresAt) return
    const since = weekStart()
    const sinceIso = since.toISOString().slice(0, 10)

    // All active spaces
    const spaces = await Space.find({ archived: { $ne: true } })
    if (!spaces.length) return

    // Group spaceIds by userId (owner and members both get digest)
    const userSpaceIds: Record<string, string[]> = {}
    for (const sp of spaces) {
      for (const m of sp.members) {
        if (!userSpaceIds[m.userId]) userSpaceIds[m.userId] = []
        userSpaceIds[m.userId].push((sp._id as { toString(): string }).toString())
      }
    }

    // Aggregate activity this week across all space collections
    const [doneTasks, newMemories, expenses] = await Promise.all([
      SprintTask.find({
        spaceId: { $in: spaces.map(s => (s._id as { toString(): string }).toString()) },
        done: true,
        updatedAt: { $gte: since },
      }).lean(),
      Memory.find({
        spaceId: { $in: spaces.map(s => (s._id as { toString(): string }).toString()) },
        createdAt: { $gte: since },
      }).lean(),
      Transaction.find({
        spaceId: { $in: spaces.map(s => (s._id as { toString(): string }).toString()) },
        type: 'expense',
        date: { $gte: sinceIso },
      }).lean(),
    ])

    // Roll up per user
    for (const [userId, spaceIds] of Object.entries(userSpaceIds)) {
      const idSet = new Set(spaceIds)

      const tasks = doneTasks.filter(t => t.spaceId && idSet.has(t.spaceId))
      const mems  = newMemories.filter(m => m.spaceId && idSet.has(m.spaceId))
      const txs   = expenses.filter(t => t.spaceId && idSet.has(t.spaceId))
      const spent = txs.reduce((s, t) => s + (t.amount ?? 0), 0)

      // Skip users with no activity at all
      if (!tasks.length && !mems.length && !txs.length) continue

      const parts: string[] = []
      if (tasks.length) parts.push(`${tasks.length} ${tasks.length === 1 ? 'задача' : 'задачі'} ✓`)
      if (mems.length) parts.push(`${mems.length} ${mems.length === 1 ? 'спогад' : 'спогади'}`)
      if (txs.length)  parts.push(`₴${formatAmount(spent)} витрат`)

      await sendScheduledPushToUser(userId, {
        title: 'Тижневий дайджест',
        body: parts.join(' · '),
        url: '/profile/modules',
        tag: `space-digest-${date}`,
      }, { key: `space-digest-${date}`, expiresAt })
    }

  } catch (err) {
    console.error('[Push] Space weekly digest error:', err)
  }
}, { timezone: 'Europe/Kyiv', noOverlap: true })
