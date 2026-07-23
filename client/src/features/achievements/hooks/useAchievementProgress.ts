import { useMemo } from 'react'
import { useMemoriesStore } from '@/features/memories/store/memoriesStore'
import { useSpacesStore } from '@/features/memories/store/spacesStore'
import { useFinanceStore } from '@/features/finance/store/financeStore'
import { useGoalsStore } from '@/features/finance/store/goalsStore'
import { useSprintStore } from '@/features/sprint/store/sprintStore'
import { useSprintStreakStore } from '@/features/sprint/store/sprintStreakStore'
import { useWatchlistStore } from '@/features/watchlist/store/watchlistStore'
import { useProfileStore } from '@/shared/store/profileStore'
import { ACHIEVEMENT_DEFS, ACHIEVEMENT_BY_ID } from '../data'
import type { AchievementWithStatus, AchievementStatus } from '../types'

const EMPTY_UNLOCKED: { id: string }[] = []

function distinctDates(dates: string[]): number {
  return new Set(dates.map(d => d.slice(0, 10))).size
}

function distinctSpaceTypes(spaces: { type: string }[]): number {
  return new Set(spaces.map(s => s.type)).size
}

/** Returns the max count of memories linked to any single space */
function maxMemoriesInOneSpace(memories: { spaceId?: string | null }[]): number {
  const counts: Record<string, number> = {}
  for (const m of memories) {
    if (m.spaceId) counts[m.spaceId] = (counts[m.spaceId] ?? 0) + 1
  }
  return Object.values(counts).reduce((max, v) => Math.max(max, v), 0)
}

/** Returns count of consecutive days going back from today that have at least one date in the set */
function currentStreak(dates: string[]): number {
  const dateSet = new Set(dates.map(d => d.slice(0, 10)))
  let streak = 0
  const d = new Date()
  while (true) {
    const key = d.toISOString().slice(0, 10)
    if (!dateSet.has(key)) break
    streak++
    d.setDate(d.getDate() - 1)
  }
  return streak
}

/**
 * useAchievementProgress
 * ----------------------
 * Computes real-time status + progress for all 50 achievements
 * by reading from existing feature stores.
 * Returns sorted list: unlocked first, then in_progress, then locked/hidden.
 */
export function useAchievementProgress(): AchievementWithStatus[] {
  const memories     = useMemoriesStore(s => s.memories)
  const spaces       = useSpacesStore(s => s.spaces)
  const transactions = useFinanceStore(s => s.transactions)
  const goals        = useGoalsStore(s => s.goals)
  const sprintItems  = useSprintStore(s => s.items)
  const doneDates    = useSprintStreakStore(s => s.doneDates)
  const watchItems   = useWatchlistStore(s => s.items)
  const unlocked     = useProfileStore(s => s.activeProfile?.unlockedAchievements ?? EMPTY_UNLOCKED)

  const unlockedIds = useMemo(() => new Set(unlocked.map(u => u.id)), [unlocked])

  return useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    const txDates   = transactions.map(t => t.date)
    const memDates  = memories.map(m => m.date)
    const doneSprint = sprintItems.filter(i => i.done && (i.type === 'sprint' || i.type === 'todo'))
    const doneTasks  = sprintItems.filter(i => i.done)

    // Count tasks done per sprint (group by sprint id when available)
    const sprintDoneCounts: Record<string, number> = {}
    for (const item of doneSprint) {
      const key = (item as { sprintId?: string }).sprintId ?? item.id
      sprintDoneCounts[key] = (sprintDoneCounts[key] ?? 0) + 1
    }
    const maxDoneInOneSprint = Object.values(sprintDoneCounts).reduce((max, v) => Math.max(max, v), doneSprint.length > 0 ? 1 : 0)

    // Watchlist category coverage
    const watchCategories = new Set(watchItems.map(i => i.category))

    const progressMap: Record<string, number> = {
      // ── Memory ────────────────────────────────────────────────────────────
      'first-memory':       memories.length,
      'memory-with-photo':  memories.filter(m => m.coverUrl).length,
      'past-memory':        memories.filter(m => m.date.slice(0, 10) < today).length,
      'three-memories':     memories.length,
      'ten-memories':       memories.length,
      'seven-days-memory':  distinctDates(memDates),
      'month-memory':       distinctDates(memDates),
      'memory-in-space':    memories.filter(m => m.spaceId).length,
      'memory-with-person': memories.filter(m => m.withProfiles && m.withProfiles.length > 0).length,
      'archive-25':         memories.length,

      // ── Spaces ────────────────────────────────────────────────────────────
      'first-space':        spaces.length,
      'space-with-profile': spaces.filter(s =>
        s.vehicleProfile !== null || s.homeProfile !== null ||
        s.petProfile !== null || s.tripProfile !== null
      ).length,
      'space-with-cover':   spaces.filter(s => s.coverUrl && s.coverUrl.trim()).length,
      'three-spaces':       spaces.length,
      'five-spaces':        spaces.length,
      'living-space':       maxMemoriesInOneSpace(memories),
      'full-space':         maxMemoriesInOneSpace(memories),
      'first-auto':         spaces.filter(s => s.type === 'vehicle').length,
      'first-home':         spaces.filter(s => s.type === 'plant').length,
      'life-map':           distinctSpaceTypes(spaces),

      // ── Finance ───────────────────────────────────────────────────────────
      'first-transaction':  transactions.length,
      'seven-records':      transactions.length,
      'ten-records':        transactions.length,
      'no-fog-day':         distinctDates(txDates),
      'week-watched':       distinctDates(txDates),
      'month-watched':      distinctDates(txDates),
      'first-category':     transactions.filter(t => t.category && t.category.trim()).length,
      'first-goal':         goals.length,
      'first-pattern':      transactions.length,
      'daily-finance':      currentStreak(txDates),

      // ── Sprint ────────────────────────────────────────────────────────────
      'first-quest':       sprintItems.filter(i => i.type === 'sprint' || i.type === 'todo').length,
      'first-step':        doneTasks.length,
      'three-steps':       doneTasks.length,
      'ten-steps':         doneTasks.length,
      'completed-path':    doneSprint.length,
      'seven-days-fire':   currentStreak(doneDates),
      'return-after-fail': sprintItems.filter(i => i.done && i.dueDate && i.dueDate < today).length,
      'three-day-chain':   currentStreak(doneDates),
      'big-sprint':        maxDoneInOneSprint,
      'three-quests':      doneSprint.length,

      // ── Watchlist ─────────────────────────────────────────────────────────
      'first-watchlist':   watchItems.length,
      'first-movie':       watchItems.filter(i => i.category === 'movie').length,
      'first-series':      watchItems.filter(i => i.category === 'series').length,
      'first-anime':       watchItems.filter(i => i.category === 'anime').length,
      'watched-completed': watchItems.filter(i => i.status === 'watched' || i.status === 'dropped').length,
      'not-just-list':     watchItems.filter(i => i.rating !== null && i.rating !== undefined).length,
      'first-rating':      watchItems.filter(i => i.rating !== null && i.rating !== undefined).length,
      'ten-watchlist':     watchItems.length,
      'taste-archive':     watchItems.filter(i => i.status === 'watched' || i.status === 'dropped').length,
      'taste-variety':     watchCategories.size,
    }

    return ACHIEVEMENT_DEFS.map(def => {
      const rawProgress = Math.min(progressMap[def.id] ?? 0, def.target)
      const isUnlocked  = unlockedIds.has(def.id) || rawProgress >= def.target

      let status: AchievementStatus
      if (isUnlocked) {
        status = 'unlocked'
      } else if (def.hidden && rawProgress === 0) {
        status = 'hidden'
      } else if (rawProgress > 0) {
        status = 'in_progress'
      } else {
        status = 'locked'
      }

      return { ...def, status, progress: isUnlocked ? def.target : rawProgress }
    }).sort((a, b) => {
      const order: Record<AchievementStatus, number> = { unlocked: 0, in_progress: 1, locked: 2, hidden: 3 }
      return order[a.status] - order[b.status]
    })
  }, [memories, spaces, transactions, goals, sprintItems, doneDates, watchItems, unlockedIds])
}

export function useAchievementById(id: string): AchievementWithStatus | undefined {
  const all = useAchievementProgress()
  return useMemo(() => all.find(a => a.id === id), [all, id])
}

export function useAchievementScore(): { earned: number; max: number } {
  const all = useAchievementProgress()
  return useMemo(() => ({
    earned: all.filter(a => a.status === 'unlocked').reduce((s, a) => s + a.reward, 0),
    max:    ACHIEVEMENT_DEFS.reduce((s, a) => s + a.reward, 0),
  }), [all])
}

/** Lightweight score hook — reads only profileStore, no heavy store subscriptions */
export function useRuneScore(): number {
  const unlocked = useProfileStore(s => s.activeProfile?.unlockedAchievements ?? [])
  return useMemo(
    () => unlocked.reduce((sum, u) => sum + (ACHIEVEMENT_BY_ID[u.id]?.reward ?? 0), 0),
    [unlocked],
  )
}

export function useAutoUnlock() {
  const all = useAchievementProgress()
  const { activeProfile } = useProfileStore()

  return useMemo(() => {
    const unlocked = new Set((activeProfile?.unlockedAchievements ?? EMPTY_UNLOCKED).map(u => u.id))
    const toUnlock = all.filter(a => a.status === 'unlocked' && !unlocked.has(a.id) && !ACHIEVEMENT_BY_ID[a.id]?.hidden)
    return toUnlock
  }, [all, activeProfile])
}
