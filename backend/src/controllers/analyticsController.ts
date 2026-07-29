import { Request, Response } from 'express'
import { User } from '../models/User'
import { Space } from '../models/Space'
import Memory from '../models/Memory'

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * GET /api/auth/admin/analytics — requireAdmin
 * Derives launch-readiness funnel metrics from existing timestamps
 * (User.createdAt/onboardingCompleted/lastLoginAt, Space/Memory.createdAt) —
 * no separate event-tracking pipeline, no third-party analytics service.
 */
export async function getAnalytics(_req: Request, res: Response): Promise<void> {
  try {
    const now = new Date()
    const since30d = new Date(now.getTime() - 30 * DAY_MS)
    const since7d  = new Date(now.getTime() - 7 * DAY_MS)

    const [
      totalUsers,
      onboardedUsers,
      active7d,
      active30d,
      spaceOwnerIds,
      memoryUserIds,
      signupsRaw,
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ onboardingCompleted: true }),
      User.countDocuments({ lastLoginAt: { $gte: since7d } }),
      User.countDocuments({ lastLoginAt: { $gte: since30d } }),
      Space.distinct('ownerId'),
      Memory.distinct('userId'),
      User.aggregate([
        { $match: { createdAt: { $gte: since30d } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
    ])

    const usersWithSpace  = totalUsers ? spaceOwnerIds.length  : 0
    const usersWithMemory = totalUsers ? memoryUserIds.length : 0

    const pct = (n: number) => totalUsers ? Math.round((n / totalUsers) * 1000) / 10 : 0

    res.json({
      totalUsers,
      funnel: {
        onboarded:        { count: onboardedUsers,   pct: pct(onboardedUsers) },
        createdFirstSpace: { count: usersWithSpace,   pct: pct(usersWithSpace) },
        createdFirstMemory:{ count: usersWithMemory,  pct: pct(usersWithMemory) },
      },
      active: {
        last7d:  active7d,
        last30d: active30d,
      },
      signupsByDay: (signupsRaw as { _id: string; count: number }[]).map(r => ({ date: r._id, count: r.count })),
    })
  } catch {
    res.status(500).json({ error: 'Помилка отримання аналітики' })
  }
}
