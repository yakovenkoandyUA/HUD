import { useCallback } from 'react'
import { useProfileStore } from '@/shared/store/profileStore'

/**
 * useMimirHint
 * ------------
 * Tracks whether a named Mimir hint has already been shown to the user.
 * State is persisted to the backend (User.mimirSeenHints) — survives cache clears.
 *
 * Usage:
 *   const { seen, markSeen } = useMimirHint('hub-nav-intro')
 *   if (!seen) <MimirHint ... />
 *
 * @param id - unique hint identifier, e.g. 'hub-nav-intro', 'first-space', 'sprint-empty'
 */
export function useMimirHint(id: string): { seen: boolean; markSeen: () => void } {
  const { activeProfile, updateProfile } = useProfileStore()
  const seen = activeProfile?.mimirSeenHints?.includes(id) ?? false

  const markSeen = useCallback(() => {
    if (seen) return
    const current = activeProfile?.mimirSeenHints ?? []
    updateProfile({ mimirSeenHints: [...current, id] })
  }, [seen, activeProfile, id, updateProfile])

  return { seen, markSeen }
}
