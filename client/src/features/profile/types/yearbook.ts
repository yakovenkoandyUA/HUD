/**
 * YearbookSections
 * ----------------
 * Deterministic-статистика звіту `/api/yearbook/:year`.
 * Фінанси (`totalSpent`/`topExpenseCategories`) і `f1` — особисті дані власника.
 */
export interface YearbookSections {
  memoriesCount: number
  placesVisitedCount: number
  topPlaces: string[]
  moviesWatched: number
  seriesWatched: number
  animeWatched: number
  recipesCookedCount: number
  uniqueRecipesCount: number
  moodTrend: 'up' | 'down' | 'flat' | null
  totalSpent: number
  topExpenseCategories: { name: string; total: number }[]
  f1: { points: number; predictionsCount: number } | null
  vehicleStats: { totalCost: number; eventsCount: number; topEventType: string | null } | null
}

/** 'annual' | 'spring' | 'summer' | 'autumn' | 'winter' | '01'..'12' */
export type YearbookPeriod = string

export interface YearbookReport {
  year: number
  period: YearbookPeriod
  sections: YearbookSections
  generatedAt: string
  stale: boolean
}
