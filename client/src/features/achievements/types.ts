export type AchievementCategory = 'memory' | 'spaces' | 'finance' | 'sprint' | 'watchlist'
export type AchievementStatus = 'unlocked' | 'in_progress' | 'locked' | 'hidden'
export type AchievementRarity = 'spark' | 'rune' | 'stone' | 'root' | 'well'

export interface AchievementDef {
  id: string
  category: AchievementCategory
  title: string
  /** Action instruction shown on the card when locked/in_progress */
  description: string
  /** Poetic flavor text shown in the unlock banner/modal */
  flavor?: string
  target: number
  reward: number
  rarity: AchievementRarity
  rune: string
  hidden?: boolean
}

export interface AchievementWithStatus extends AchievementDef {
  status: AchievementStatus
  progress: number
}
