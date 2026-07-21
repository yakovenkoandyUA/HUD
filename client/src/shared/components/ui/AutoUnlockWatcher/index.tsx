import { useEffect, useRef } from 'react'
import { useAutoUnlock } from '@/features/achievements/hooks/useAchievementProgress'
import { useAchievementsStore } from '@/shared/store/achievementsStore'
import { useProfileStore } from '@/shared/store/profileStore'

/**
 * AutoUnlockWatcher
 * -----------------
 * Monitors achievements whose progress has crossed the unlock threshold
 * but haven't been recorded in the profile yet.
 *
 * On mount: silently persists all already-earned achievements (no modal) —
 * catches up users who had data before the celebration system was wired up.
 *
 * After mount: shows unlock modal for each newly earned achievement
 * one at a time as the user takes actions during the session.
 */
export default function AutoUnlockWatcher() {
  const toUnlock = useAutoUnlock()
  const unlock   = useAchievementsStore(s => s.unlock)

  // IDs that were already pending on first render — skip celebration for these
  const seenOnMount = useRef<Set<string> | null>(null)
  // IDs triggered this session to avoid double-firing before profile syncs
  const triggered = useRef(new Set<string>())

  useEffect(() => {
    if (toUnlock.length === 0) return

    if (seenOnMount.current === null) {
      // First render: silently persist all without showing modals
      seenOnMount.current = new Set(toUnlock.map(a => a.id))
      const { activeProfile, updateProfile } = useProfileStore.getState()
      if (!activeProfile) return
      const before = activeProfile.unlockedAchievements ?? []
      const now = new Date().toISOString()
      const newEntries = toUnlock
        .filter(a => !before.some(b => b.id === a.id))
        .map(a => ({ id: a.id, unlockedAt: now }))
      if (newEntries.length > 0) {
        updateProfile({ unlockedAchievements: [...before, ...newEntries] }).catch(() => {})
      }
      return
    }

    // Subsequent renders: celebrate only achievements NOT seen on mount
    for (const a of toUnlock) {
      if (!seenOnMount.current.has(a.id) && !triggered.current.has(a.id)) {
        triggered.current.add(a.id)
        unlock(a.id)
        break // one celebration at a time; next fires after store updates
      }
    }
  }, [toUnlock, unlock])

  return null
}
