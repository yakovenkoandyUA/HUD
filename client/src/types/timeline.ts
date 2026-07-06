/**
 * TimelineEvent
 * -------------
 * Уніфікована подія для Timeline — мердж memories/plans/watchlist/recipes/mood
 * з backend `/api/timeline`. `payload` форма залежить від `type`.
 */
export type TimelineEventType = 'memory' | 'place' | 'media' | 'recipe' | 'mood'

export interface TimelineEvent {
  id: string
  type: TimelineEventType
  date: string
  userId: string
  ownerName?: string
  ownerAvatarUrl?: string | null
  payload: Record<string, unknown>
}

export type TimelineScope = 'all' | 'mine' | 'family'
