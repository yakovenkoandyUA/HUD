import { Request, Response } from 'express'
import YearbookReport from '../models/YearbookReport'
import Memory from '../models/Memory'
import Plan from '../models/Plan'
import WatchlistItem from '../models/WatchlistItem'
import CookLog from '../models/CookLog'
import MoodLog from '../models/MoodLog'
import Transaction from '../models/Transaction'
import F1Prediction from '../models/F1Prediction'
import { Space } from '../models/Space'
import { VehicleEvent } from '../models/VehicleEvent'
import { getAcceptedFamilyIds } from './familyController'

// ── Period helpers ─────────────────────────────────────────────────────────────

type SeasonKey = 'spring' | 'summer' | 'autumn' | 'winter'

/** Returns ISO date-string range [start, end] for a given period in a year */
function periodRange(year: number, period: string): { start: string; end: string } {
  // Annual
  if (period === 'annual') {
    return { start: `${year}-01-01`, end: `${year}-12-31` }
  }
  // Month '01'..'12'
  if (/^\d{2}$/.test(period)) {
    const m = period
    const lastDay = new Date(year, parseInt(m, 10), 0).getDate()
    return { start: `${year}-${m}-01`, end: `${year}-${m}-${String(lastDay).padStart(2, '0')}` }
  }
  // Season
  const SEASONS: Record<SeasonKey, { start: string; end: string }> = {
    spring: { start: `${year}-03-01`, end: `${year}-05-31` },
    summer: { start: `${year}-06-01`, end: `${year}-08-31` },
    autumn: { start: `${year}-09-01`, end: `${year}-11-30` },
    winter: year === new Date().getFullYear()
      ? { start: `${year}-12-01`, end: `${year}-12-31` }
      : { start: `${year}-12-01`, end: `${year + 1}-02-28` },
  }
  return SEASONS[period as SeasonKey] ?? { start: `${year}-01-01`, end: `${year}-12-31` }
}

// ── Core aggregation ───────────────────────────────────────────────────────────

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

function topByCount(items: string[], n: number): string[] {
  const counts = new Map<string, number>()
  items.forEach(v => counts.set(v, (counts.get(v) ?? 0) + 1))
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([name]) => name)
}

/**
 * Будує секції звіту для довільного date range.
 * Спогади/місця/медіа/рецепти/настрій — родинний скоуп.
 * Фінанси та F1 — суто особисті.
 */
async function buildSections(userId: string, year: number, dateStart: string, dateEnd: string) {
  const familyIds = await getAcceptedFamilyIds(userId)
  const sharedIds = [userId, ...familyIds]

  const dateStartObj = new Date(`${dateStart}T00:00:00Z`)
  const dateEndObj   = new Date(`${dateEnd}T23:59:59Z`)

  const [memories, plans, watchlistItems, cookLogs, moodLogs, transactions, f1Predictions, myVehicleSpaces] = await Promise.all([
    Memory.find({ userId: { $in: sharedIds }, date: { $gte: dateStart, $lte: dateEnd } }),
    Plan.find({ userId: { $in: sharedIds }, status: 'visited', visitedDate: { $gte: dateStartObj, $lte: dateEndObj } }),
    WatchlistItem.find({ userId: { $in: sharedIds }, status: 'watched', addedAt: { $gte: dateStart, $lte: dateEnd } }),
    CookLog.find({ userId: { $in: sharedIds }, date: { $gte: dateStartObj, $lte: dateEndObj } }),
    MoodLog.find({ userId: { $in: sharedIds }, date: { $gte: dateStart, $lte: dateEnd } }),
    Transaction.find({ userId, type: 'expense', date: { $gte: dateStart, $lte: dateEnd } }),
    F1Prediction.find({ userId, raceId: { $regex: `^${year}-` } }),
    Space.find({ type: 'vehicle', 'members.userId': userId }).select('_id'),
  ])

  const vehicleSpaceIds = myVehicleSpaces.map(s => s._id.toString())
  const vehicleEvents = vehicleSpaceIds.length > 0
    ? await VehicleEvent.find({ spaceId: { $in: vehicleSpaceIds }, date: { $gte: dateStart, $lte: dateEnd } })
    : []

  const placeNames = [
    ...memories.map(m => m.location).filter((l): l is string => !!l?.trim()),
    ...plans.filter(p => !p.memoryId).map(p => p.location?.name).filter((l): l is string => !!l?.trim()),
  ]

  const recipeIds = cookLogs.map(c => c.recipeId)

  const categoryTotals = new Map<string, number>()
  let totalSpent = 0
  for (const t of transactions) {
    totalSpent += t.amount
    const name = t.category || 'Інше'
    categoryTotals.set(name, (categoryTotals.get(name) ?? 0) + t.amount)
  }
  const topExpenseCategories = [...categoryTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, total]) => ({ name, total }))

  const f1Points = f1Predictions.reduce((sum, p) => sum + (p.result?.points ?? 0), 0)

  let vehicleStats: { totalCost: number; eventsCount: number; topEventType: string | null } | null = null
  if (vehicleEvents.length > 0) {
    const totalCost = vehicleEvents.reduce((sum, v) => sum + (v.cost ?? 0), 0)
    const typeCounts = new Map<string, number>()
    for (const v of vehicleEvents) typeCounts.set(v.type, (typeCounts.get(v.type) ?? 0) + 1)
    const topEventType = [...typeCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
    vehicleStats = { totalCost, eventsCount: vehicleEvents.length, topEventType }
  }

  return {
    memoriesCount: memories.length,
    placesVisitedCount: plans.filter(p => !p.memoryId).length,
    topPlaces: topByCount(placeNames, 3),
    moviesWatched: watchlistItems.filter(w => w.category === 'movie').length,
    seriesWatched: watchlistItems.filter(w => w.category === 'series').length,
    animeWatched: watchlistItems.filter(w => w.category === 'anime').length,
    recipesCookedCount: cookLogs.length,
    uniqueRecipesCount: new Set(recipeIds).size,
    moodTrend: moodTrend(moodLogs.map(m => m.score)),
    totalSpent,
    topExpenseCategories,
    f1: f1Predictions.length > 0 ? { points: f1Points, predictionsCount: f1Predictions.length } : null,
    vehicleStats,
  }
}

function snapshotHash(sections: Awaited<ReturnType<typeof buildSections>>): string {
  return [
    sections.memoriesCount, sections.placesVisitedCount, sections.moviesWatched,
    sections.seriesWatched, sections.animeWatched, sections.recipesCookedCount,
    sections.totalSpent, sections.f1?.predictionsCount ?? 0,
    sections.vehicleStats?.eventsCount ?? 0,
  ].join('-')
}

// ── Route handlers ────────────────────────────────────────────────────────────

/** GET /api/yearbook/:year?period=annual|spring|summer|autumn|winter|01..12 */
export async function getYearbook(req: Request, res: Response): Promise<void> {
  try {
    const year   = parseInt(req.params.year, 10)
    const period = (req.query.period as string) || 'annual'
    const report = await YearbookReport.findOne({ userId: req.userId, year, period })
    if (!report) { res.json({ notGenerated: true }); return }

    const { start, end } = periodRange(year, period)
    const freshSections  = await buildSections(req.userId!, year, start, end)
    const stale = snapshotHash(freshSections) !== report.sourceSnapshotHash
    res.json({ ...report.toObject(), stale })
  } catch {
    res.status(500).json({ error: 'Failed to fetch yearbook' })
  }
}

/** POST /api/yearbook/:year/generate?period=annual|spring|summer|autumn|winter|01..12 */
export async function generateYearbook(req: Request, res: Response): Promise<void> {
  try {
    const year   = parseInt(req.params.year, 10)
    const period = (req.query.period as string) || 'annual'
    const { start, end } = periodRange(year, period)
    const sections = await buildSections(req.userId!, year, start, end)
    const report = await YearbookReport.findOneAndUpdate(
      { userId: req.userId, year, period },
      { sections, sourceSnapshotHash: snapshotHash(sections), generatedAt: new Date() },
      { upsert: true, new: true }
    )
    res.json({ ...report.toObject(), stale: false })
  } catch {
    res.status(500).json({ error: 'Failed to generate yearbook' })
  }
}
