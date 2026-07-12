import { useMemo } from 'react'
import { useMemoriesStore } from '@/features/memories/store/memoriesStore'
import { useSpacesStore } from '@/features/memories/store/spacesStore'
import { useFinanceStore } from '@/features/finance/store/financeStore'
import { useSprintStore } from '@/features/sprint/store/sprintStore'
import { useWatchlistStore } from '@/features/watchlist/store/watchlistStore'
import { useProfileStore } from '@/shared/store/profileStore'
import { ACHIEVEMENT_DEFS, ACHIEVEMENT_BY_ID } from '../data'
import type { AchievementWithStatus, AchievementStatus } from '../types'

function distinctDates(dates: string[]): number {
  return new Set(dates.map(d => d.slice(0, 10))).size
}

/**
 * useAchievementProgress
 * ----------------------
 * Computes real-time status + progress for all 24 achievements
 * by reading from existing feature stores.
 * Returns sorted list: unlocked first, then in_progress, then locked/hidden.
 */
export function useAchievementProgress(): AchievementWithStatus[] {
  const memories     = useMemoriesStore(s => s.memories)
  const spaces       = useSpacesStore(s => s.spaces)
  const transactions = useFinanceStore(s => s.transactions)
  const sprintItems  = useSprintStore(s => s.items)
  const watchItems   = useWatchlistStore(s => s.items)
  const unlocked     = useProfileStore(s => s.activeProfile?.unlockedAchievements ?? [])

  const unlockedIds = useMemo(() => new Set(unlocked.map(u => u.id)), [unlocked])

  return useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)

    // ── Progress per achievement id ─────────────────────────────────────────
    const progressMap: Record<string, number> = {
      // Memory
      'first-memory':      memories.length,
      'seven-days-memory': distinctDates(memories.map(m => m.date)),
      'memory-with-photo': memories.filter(m => m.coverUrl).length,
      'past-memory':       memories.filter(m => m.date.slice(0, 10) < today).length,
      'archive-10':        memories.length,

      // Spaces
      'first-space':    spaces.length,
      'space-with-name': spaces.filter(s => s.coverUrl).length,
      'three-spaces':   spaces.length,
      'living-space':   spaces.length, // simplified: at least 3 spaces
      'first-auto':     spaces.filter(s => s.type === 'vehicle').length,

      // Finance
      'first-transaction': transactions.length,
      'seven-records':     transactions.length,
      'no-fog-day':        transactions.length > 0 ? 1 : 0, // simplify: any record = day not foggy
      'month-watched':     distinctDates(transactions.map(t => t.date)),
      'first-pattern':     transactions.length >= 10 ? 1 : 0,

      // Sprint
      'first-quest':       sprintItems.filter(i => i.type === 'sprint' || i.type === 'todo').length,
      'first-step':        sprintItems.filter(i => i.done).length,
      'completed-path':    sprintItems.filter(i => i.done && (i.type === 'sprint' || i.type === 'todo')).length,
      'seven-days-fire':   0, // streak - complex, will add later
      'return-after-fail': 0, // complex, will add later

      // Watchlist
      'first-watchlist':   watchItems.length,
      'watched-completed': watchItems.filter(i => i.status === 'watched' || i.status === 'dropped').length,
      'not-just-list':     watchItems.filter(i => i.rating !== null && i.rating !== undefined).length,
      'taste-archive':     watchItems.length,
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
  }, [memories, spaces, transactions, sprintItems, watchItems, unlockedIds])
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

// Re-export for external unlock calls (auto-unlock when progress >= target)
export function useAutoUnlock() {
  const all = useAchievementProgress()
  const { activeProfile } = useProfileStore()

  return useMemo(() => {
    const unlocked = new Set((activeProfile?.unlockedAchievements ?? []).map(u => u.id))
    const toUnlock = all.filter(a => a.status === 'unlocked' && !unlocked.has(a.id) && !ACHIEVEMENT_BY_ID[a.id]?.hidden)
    return toUnlock
  }, [all, activeProfile])
}
