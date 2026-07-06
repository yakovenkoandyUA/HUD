import { Request, Response } from 'express'
import Memory from '../models/Memory'
import Plan from '../models/Plan'
import WatchlistItem from '../models/WatchlistItem'
import CookLog from '../models/CookLog'
import Recipe from '../models/Recipe'
import MoodLog from '../models/MoodLog'
import { User } from '../models/User'
import { getAcceptedFamilyIds } from './familyController'

type TimelineEvent = {
  id: string
  type: 'memory' | 'place' | 'media' | 'recipe' | 'mood'
  date: string
  userId: string
  ownerName?: string
  ownerAvatarUrl?: string | null
  payload: Record<string, unknown>
}

function moodTrend(scores: number[]): 'up' | 'down' | 'flat' | null {
  if (scores.length < 2) return null
  const half = Math.floor(scores.length / 2)
  const firstAvg = scores.slice(0, half).reduce((a, b) => a + b, 0) / half
  const secondAvg = scores.slice(half).reduce((a, b) => a + b, 0) / (scores.length - half)
  const diff = secondAvg - firstAvg
  if (diff > 0.3) return 'up'
  if (diff < -0.3) return 'down'
  return 'flat'
}

/** GET /api/timeline?year=2026&scope=all|mine|family */
export async function getTimeline(req: Request, res: Response): Promise<void> {
  try {
    const myId = req.userId as string
    const year = parseInt(req.query.year as string, 10) || new Date().getFullYear()
    const scope = (req.query.scope as string) ?? 'all'

    const spaceId = req.query.spaceId as string | undefined

    const familyIds = await getAcceptedFamilyIds(myId)
    const allIds = [myId, ...familyIds]
    const scopedIds = scope === 'mine' ? [myId] : scope === 'family' ? familyIds : allIds

    if (scopedIds.length === 0) {
      res.json({ events: [], owners: {} })
      return
    }

    const yearStart = `${year}-01-01`
    const yearEnd = `${year}-12-31`
    const yearStartDate = new Date(`${year}-01-01T00:00:00Z`)
    const yearEndDate = new Date(`${year}-12-31T23:59:59Z`)

    const wantMine = scope !== 'family'
    const wantFamily = scope !== 'mine'
    const watchlistOr: Record<string, unknown>[] = []
    if (wantMine) watchlistOr.push({ userId: myId })
    if (wantFamily) watchlistOr.push({ userId: { $in: familyIds }, watchedWith: myId })

    const memoryQuery = spaceId
      ? { userId: { $in: scopedIds }, date: { $gte: yearStart, $lte: yearEnd }, spaceId }
      : { userId: { $in: scopedIds }, date: { $gte: yearStart, $lte: yearEnd } }

    const planQuery = spaceId
      ? { userId: { $in: scopedIds }, status: 'visited', visitedDate: { $gte: yearStartDate, $lte: yearEndDate }, spaceId }
      : { userId: { $in: scopedIds }, status: 'visited', visitedDate: { $gte: yearStartDate, $lte: yearEndDate } }

    const [memories, plans, watchlistItems, cookLogs, moodLogs, owners] = await Promise.all([
      Memory.find(memoryQuery),
      Plan.find(planQuery),
      spaceId || watchlistOr.length === 0
        ? Promise.resolve([])
        : WatchlistItem.find({ status: 'watched', addedAt: { $gte: yearStart, $lte: yearEnd }, $or: watchlistOr }),
      spaceId ? Promise.resolve([]) : CookLog.find({ userId: { $in: scopedIds }, date: { $gte: yearStartDate, $lte: yearEndDate } }),
      spaceId ? Promise.resolve([]) : MoodLog.find({ userId: { $in: scopedIds }, date: { $gte: yearStart, $lte: yearEnd } }),
      User.find({ _id: { $in: familyIds } }).select('name username avatarUrl'),
    ])

    const ownerMap = new Map(owners.map(u => [u._id.toString(), { name: u.name || u.username, avatarUrl: (u as { avatarUrl?: string | null }).avatarUrl ?? null }]))
    const ownerInfo = (userId: string) => userId === myId ? undefined : ownerMap.get(userId)

    const events: TimelineEvent[] = []

    for (const m of memories) {
      const owner = ownerInfo(m.userId)
      events.push({
        id: m._id.toString(),
        type: 'memory',
        date: m.date,
        userId: m.userId,
        ownerName: owner?.name,
        ownerAvatarUrl: owner?.avatarUrl,
        payload: { title: m.title, location: m.location, coverUrl: m.coverUrl, tags: m.tags },
      })
    }

    // Visited plans without a linked memory — the memory itself already covers the converted case.
    for (const p of plans) {
      if (p.memoryId || !p.visitedDate) continue
      const owner = ownerInfo(p.userId)
      events.push({
        id: p._id.toString(),
        type: 'place',
        date: p.visitedDate.toISOString().slice(0, 10),
        userId: p.userId,
        ownerName: owner?.name,
        ownerAvatarUrl: owner?.avatarUrl,
        payload: { title: p.title, location: p.location },
      })
    }

    for (const w of watchlistItems) {
      const watchedTogether = w.watchedWith.length > 0
      const owner = ownerInfo(w.userId)
      events.push({
        id: w._id.toString(),
        type: 'media',
        date: w.addedAt,
        userId: w.userId,
        ownerName: owner?.name,
        ownerAvatarUrl: owner?.avatarUrl,
        payload: { title: w.title, category: w.category, posterPath: w.posterPath, watchedTogether },
      })
    }

    const recipeIds = [...new Set(cookLogs.map(c => c.recipeId))]
    const recipes = await Recipe.find({ _id: { $in: recipeIds } }).select('title imageUrl')
    const recipeMap = new Map(recipes.map(r => [r._id.toString(), r]))

    for (const c of cookLogs) {
      const recipe = recipeMap.get(c.recipeId)
      if (!recipe) continue
      const owner = ownerInfo(c.userId)
      events.push({
        id: c._id.toString(),
        type: 'recipe',
        date: c.date.toISOString().slice(0, 10),
        userId: c.userId,
        ownerName: owner?.name,
        ownerAvatarUrl: owner?.avatarUrl,
        payload: { title: recipe.title, imageUrl: recipe.imageUrl },
      })
    }

    // Mood — aggregated per user per month, no individual scores/notes exposed across family.
    const moodByUserMonth = new Map<string, number[]>()
    for (const log of moodLogs) {
      const month = log.date.slice(0, 7)
      const key = `${log.userId}:${month}`
      if (!moodByUserMonth.has(key)) moodByUserMonth.set(key, [])
      moodByUserMonth.get(key)!.push(log.score)
    }
    for (const [key, scores] of moodByUserMonth) {
      const [userId, month] = key.split(':')
      const trend = moodTrend(scores)
      if (!trend) continue
      const owner = ownerInfo(userId)
      events.push({
        id: key,
        type: 'mood',
        date: `${month}-01`,
        userId,
        ownerName: owner?.name,
        ownerAvatarUrl: owner?.avatarUrl,
        payload: { month, trend },
      })
    }

    events.sort((a, b) => a.date < b.date ? 1 : -1)
    res.json({ events })
  } catch {
    res.status(500).json({ error: 'Failed to fetch timeline' })
  }
}
