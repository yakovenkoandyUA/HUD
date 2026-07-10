import cron from 'node-cron'
import { sendPushToUser } from '../services/webpush'
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

// Sunday 08:00 UTC = 11:00 Kyiv — weekly digest for spaces
cron.schedule('0 8 * * 0', async () => {
  try {
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

      await sendPushToUser(userId, {
        title: 'Тижневий дайджест',
        body: parts.join(' · '),
        url: '/profile?tab=spaces',
      })
    }

    console.log('[Push] Space weekly digest sent')
  } catch (err) {
    console.error('[Push] Space weekly digest error:', err)
  }
})

console.log('📅 Space weekly digest scheduled (Sun 08:00 UTC)')
