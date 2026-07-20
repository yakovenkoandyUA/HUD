import type { MimirDialogueId } from '@/shared/data/mimirDialogue'

const STORAGE_PREFIX = 'mimir-history-'
const VERSION = 1 as const

export interface MimirHistoryData {
  readonly version: 1
  readonly userId: string
  achievementFirstShown: boolean
  lastDailyGreetingDate: string
  /** Maps dialogue id → last YYYY-MM-DD it was shown (once_per_day gate). */
  lastShownDates: Partial<Record<MimirDialogueId, string>>
  /** Maps dialogue id → ISO week string when it last fired (once_per_week gate). */
  weeklyEvents: Partial<Record<MimirDialogueId, string>>
  /** IDs of rare achievements for which the Mimir dialogue was already shown. */
  shownRareAchievementIds: string[]
}

export function getTodayIso(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** ISO 8601 week identifier — YYYY-Www (e.g. "2026-W30"). */
export function getIsoWeek(): string {
  const d = new Date()
  const dow = d.getDay() === 0 ? 7 : d.getDay()
  const thu = new Date(d)
  thu.setDate(d.getDate() + (4 - dow))
  const year = thu.getFullYear()
  const jan1 = new Date(year, 0, 1)
  const week = Math.ceil(((thu.getTime() - jan1.getTime()) / 86400000 + 1) / 7)
  return `${year}-W${String(week).padStart(2, '0')}`
}

function defaultHistory(userId: string): MimirHistoryData {
  return {
    version: VERSION,
    userId,
    achievementFirstShown: false,
    lastDailyGreetingDate: '',
    lastShownDates: {},
    weeklyEvents: {},
    shownRareAchievementIds: [],
  }
}

export function getMimirHistory(userId: string): MimirHistoryData {
  if (!userId) return defaultHistory('')
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${userId}`)
    if (!raw) return defaultHistory(userId)
    const parsed = JSON.parse(raw) as Partial<MimirHistoryData>
    if (parsed.version !== VERSION || parsed.userId !== userId) return defaultHistory(userId)
    return { ...defaultHistory(userId), ...parsed }
  } catch {
    return defaultHistory(userId)
  }
}

export function setMimirHistory(userId: string, data: MimirHistoryData): void {
  if (!userId) return
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${userId}`, JSON.stringify(data))
  } catch {
    // Storage full or unavailable — degrade gracefully
  }
}

/** True if a once_per_day dialogue has NOT been shown today. */
export function isDailyEligible(history: MimirHistoryData, id: MimirDialogueId): boolean {
  return (history.lastShownDates[id] ?? '') !== getTodayIso()
}

/** True if a once_per_week dialogue has NOT fired this ISO week. */
export function isWeeklyEligible(history: MimirHistoryData, id: MimirDialogueId): boolean {
  return (history.weeklyEvents[id] ?? '') !== getIsoWeek()
}

/** Persist that a once_per_day dialogue was shown today. */
export function markDailyShown(userId: string, id: MimirDialogueId): void {
  if (!userId) return
  const h = getMimirHistory(userId)
  setMimirHistory(userId, {
    ...h,
    lastShownDates: { ...h.lastShownDates, [id]: getTodayIso() },
  })
}

/** Persist that a once_per_week dialogue fired this week. */
export function markWeeklyShown(userId: string, id: MimirDialogueId): void {
  if (!userId) return
  const h = getMimirHistory(userId)
  setMimirHistory(userId, {
    ...h,
    weeklyEvents: { ...h.weeklyEvents, [id]: getIsoWeek() },
  })
}
