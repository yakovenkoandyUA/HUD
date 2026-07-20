import React, { useState, useEffect } from 'react'
import MimirHint from '@/shared/components/ui/MimirHint'
import { useAchievementsStore } from '@/shared/store/achievementsStore'
import { useUiStore } from '@/shared/store/uiStore'
import { useProfileStore } from '@/shared/store/profileStore'
import { MIMIR_DIALOGUE, getMimirText } from '@/shared/data/mimirDialogue'
import { getMimirHistory, setMimirHistory } from '@/shared/utils/mimirHistory'

/**
 * MimirAchievementLayer
 * ---------------------
 * Global portal overlay that shows a Mimir achievement dialogue after the
 * achievement toast clears. Waits for `pending === null` then delays 500ms
 * to avoid overlapping with the exit animation.
 *
 * Mounted once in App.tsx. Reads from achievementsStore.
 */
const MimirAchievementLayer: React.FC = () => {
  const { mimirAchievementDialogue, clearMimirAchievementDialogue, pending } = useAchievementsStore()
  const { mimirMode } = useUiStore()
  const userId = useProfileStore(s => s.activeProfile?.id ?? '')

  const [canShow, setCanShow] = useState(false)

  useEffect(() => {
    if (pending !== null || !mimirAchievementDialogue) {
      setCanShow(false)
      return
    }
    const t = setTimeout(() => setCanShow(true), 500)
    return () => clearTimeout(t)
  }, [pending, mimirAchievementDialogue])

  if (!canShow || !mimirAchievementDialogue) return null

  const { id, achievementId } = mimirAchievementDialogue
  const entry = MIMIR_DIALOGUE[id]

  const handleDismiss = () => {
    const h = getMimirHistory(userId)
    if (id === 'achievement_first') {
      setMimirHistory(userId, { ...h, achievementFirstShown: true })
    } else if (id === 'achievement_rare') {
      setMimirHistory(userId, {
        ...h,
        shownRareAchievementIds: [...h.shownRareAchievementIds, achievementId],
      })
    }
    clearMimirAchievementDialogue()
  }

  return (
    <MimirHint
      portal
      pose={entry.pose}
      textKey={getMimirText(id, mimirMode)}
      oneTime
      onDismiss={handleDismiss}
    />
  )
}

export default MimirAchievementLayer
