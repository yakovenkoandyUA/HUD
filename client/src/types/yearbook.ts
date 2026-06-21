/**
 * YearbookSections
 * ----------------
 * Deterministic-статистика річного звіту `/api/yearbook/:year`.
 * Фінанси (`totalSpent`/`topExpenseCategories`) і `f1` — особисті дані власника
 * звіту, не агреговані по сім'ї (на відміну від решти секцій).
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
}

export interface YearbookReport {
  year: number
  sections: YearbookSections
  generatedAt: string
  stale: boolean
}
