export interface Level {
  level: number
  label: string
  /** Коротке слово-девіз рангу — підпис під назвою на моноліті рівнів */
  hint: string
  minRunes: number
  color: string
  unlocksTheme?: string
}

export const LEVELS: Level[] = [
  { level: 1,  minRunes: 0,    label: 'МАНДРІВНИК',   hint: 'ПОЧАТОК',        color: 'var(--text3)' },
  { level: 2,  minRunes: 30,   label: 'УЧЕНЬ',         hint: 'ДИСЦИПЛІНА',     color: 'var(--text2)' },
  { level: 3,  minRunes: 80,   label: 'СЛІДОПИТ',      hint: 'ПОШУК',          color: 'var(--accent)', unlocksTheme: 'arctic' },
  { level: 4,  minRunes: 150,  label: 'ШУКАЧ',         hint: 'НАПОЛЕГЛИВІСТЬ', color: 'var(--accent)' },
  { level: 5,  minRunes: 250,  label: 'ХРАНИТЕЛЬ',     hint: "ПАМ'ЯТЬ",       color: 'var(--second)', unlocksTheme: 'noir' },
  { level: 6,  minRunes: 400,  label: 'ПРОВИДЕЦЬ',     hint: 'ПРОЗРІННЯ',     color: 'var(--second)' },
  { level: 7,  minRunes: 550,  label: 'МУДРЕЦЬ',       hint: 'ГЛИБИНА',       color: 'var(--gold)',   unlocksTheme: 'cyber' },
  { level: 8,  minRunes: 700,  label: 'ПРОСВІТЛЕНИЙ',  hint: 'ЯСНІСТЬ',       color: 'var(--gold)' },
  { level: 9,  minRunes: 850,  label: 'ОРАКУЛ',        hint: 'ПРАВДА',        color: 'var(--gold)',   unlocksTheme: 'pixel' },
  { level: 10, minRunes: 1010, label: 'МІМІР',         hint: 'ЛЕГЕНДА',       color: 'var(--gold)' },
]

/** Themes available without any requirement */
export const DEFAULT_THEMES = ['aurum', 'vellum'] as const

/**
 * Trigger-based unlock conditions per theme.
 * `hint` — shown in the lock badge.
 */
export const THEME_UNLOCK_CONDITIONS: Record<string, { hint: string }> = {
  aurum:  { hint: 'Доступна одразу' },
  vellum: { hint: 'Доступна одразу' },
  noir:   { hint: 'Після onboarding' },
  arctic: { hint: 'Після першого досягнення' },
  cyber:  { hint: 'Заверши перший квест' },
  pixel:  { hint: '7 днів задач поспіль' },
}

export function getLevel(earned: number): Level {
  return [...LEVELS].reverse().find(l => earned >= l.minRunes) ?? LEVELS[0]
}

export function getNextLevel(earned: number): Level | null {
  const current = getLevel(earned)
  return LEVELS.find(l => l.level === current.level + 1) ?? null
}

/** 0–100 progress toward the next level */
export function getLevelProgress(earned: number): number {
  const current = getLevel(earned)
  const next = getNextLevel(earned)
  if (!next) return 100
  const span = next.minRunes - current.minRunes
  const done = earned - current.minRunes
  return Math.round((done / span) * 100)
}

/**
 * Returns the set of theme ids available to the user based on their progress.
 * Triggers (in order of ease):
 *   aurum, mimir — always
 *   noir          — onboarding completed
 *   arctic        — at least 1 achievement unlocked
 *   cyber         — 'completed-path' achievement (first quest finished)
 *   pixel         — 'seven-days-fire' achievement (7 consecutive sprint days)
 */
export function getUnlockedThemes(
  unlockedIds: ReadonlySet<string>,
  onboardingCompleted: boolean,
): string[] {
  const unlocked: string[] = [...DEFAULT_THEMES]
  if (onboardingCompleted)                     unlocked.push('noir')
  if (unlockedIds.size >= 1)                   unlocked.push('arctic')
  if (unlockedIds.has('completed-path'))        unlocked.push('cyber')
  if (unlockedIds.has('seven-days-fire'))       unlocked.push('pixel')
  return unlocked
}
