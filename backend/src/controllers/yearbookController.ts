import { Request, Response } from 'express'
import YearbookReport from '../models/YearbookReport'
import Memory from '../models/Memory'
import Plan from '../models/Plan'
import WatchlistItem from '../models/WatchlistItem'
import CookLog from '../models/CookLog'
import MoodLog from '../models/MoodLog'
import Transaction from '../models/Transaction'
import F1Prediction from '../models/F1Prediction'
import { getAcceptedFamilyIds } from './familyController'

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
 * Будує секції звіту. Спогади/місця/медіа/рецепти/настрій — родинний скоуп
 * (userId + familyIds), як і Timeline. Фінанси та F1-прогнози — суто особисті:
 * жодна з цих фіч не має family-sharing в додатку, тож агрегувати їх по сім'ї
 * означало б показати чужі гроші/прогнози у звіті власника.
 */
async function buildSections(userId: string, year: number) {
  const familyIds = await getAcceptedFamilyIds(userId)
  const sharedIds = [userId, ...familyIds]

  const yearStart = `${year}-01-01`
  const yearEnd = `${year}-12-31`
  const yearStartDate = new Date(`${year}-01-01T00:00:00Z`)
  const yearEndDate = new Date(`${year}-12-31T23:59:59Z`)

  const [memories, plans, watchlistItems, cookLogs, moodLogs, transactions, f1Predictions] = await Promise.all([
    Memory.find({ userId: { $in: sharedIds }, date: { $gte: yearStart, $lte: yearEnd } }),
    Plan.find({ userId: { $in: sharedIds }, status: 'visited', visitedDate: { $gte: yearStartDate, $lte: yearEndDate } }),
    WatchlistItem.find({ userId: { $in: sharedIds }, status: 'watched', addedAt: { $gte: yearStart, $lte: yearEnd } }),
    CookLog.find({ userId: { $in: sharedIds }, date: { $gte: yearStartDate, $lte: yearEndDate } }),
    MoodLog.find({ userId: { $in: sharedIds }, date: { $gte: yearStart, $lte: yearEnd } }),
    Transaction.find({ userId, type: 'expense', date: { $gte: yearStart, $lte: yearEnd } }),
    F1Prediction.find({ userId, raceId: { $regex: `^${year}-` } }),
  ])

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
  }
}

function snapshotHash(sections: Awaited<ReturnType<typeof buildSections>>): string {
  return [
    sections.memoriesCount, sections.placesVisitedCount, sections.moviesWatched,
    sections.seriesWatched, sections.animeWatched, sections.recipesCookedCount,
    sections.totalSpent, sections.f1?.predictionsCount ?? 0,
  ].join('-')
}

/** GET /api/yearbook/:year — кешований звіт, 404 якщо ще не генерувався */
export async function getYearbook(req: Request, res: Response): Promise<void> {
  try {
    const year = parseInt(req.params.year, 10)
    const report = await YearbookReport.findOne({ userId: req.userId, year })
    if (!report) { res.status(404).json({ error: 'Not generated yet' }); return }

    const freshSections = await buildSections(req.userId!, year)
    const stale = snapshotHash(freshSections) !== report.sourceSnapshotHash
    res.json({ ...report.toObject(), stale })
  } catch {
    res.status(500).json({ error: 'Failed to fetch yearbook' })
  }
}

/** POST /api/yearbook/:year/generate — рахує і кешує звіт (тільки за явним запитом) */
export async function generateYearbook(req: Request, res: Response): Promise<void> {
  try {
    const year = parseInt(req.params.year, 10)
    const sections = await buildSections(req.userId!, year)
    const report = await YearbookReport.findOneAndUpdate(
      { userId: req.userId, year },
      { sections, sourceSnapshotHash: snapshotHash(sections), generatedAt: new Date() },
      { upsert: true, new: true }
    )
    res.json({ ...report.toObject(), stale: false })
  } catch {
    res.status(500).json({ error: 'Failed to generate yearbook' })
  }
}
