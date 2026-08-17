export type InternalStatus = 'want' | 'watching' | 'watched' | 'dropped'

export const STATUS_KEYWORDS: Record<InternalStatus, string[]> = {
  watching: [
    'смотрю', 'дивлюся', 'дивлюсь', 'watching', 'in progress',
    'в процессе', 'зараз дивлюся', 'currently watching', 'ongoing', 'currently-reading', 'currently reading',
  ],
  want: [
    'буду смотреть', 'планую', 'хочу', 'want to watch', 'plan to watch',
    'planned', 'буду дивитись', 'want', 'plan', 'wishlist', 'хочу переглянути',
    'буду дивитися', 'to-read', 'to read',
  ],
  watched: [
    'полностью посмотрел', 'переглянув', 'completed', 'watched', 'finished',
    'подивився', 'дивився', 'complete', 'done', 'переглянуто', 'read',
  ],
  dropped: [
    'перестал', 'dropped', 'покинув', 'кинув', 'abandoned', 'quit',
    'перестала', 'закинув',
  ],
}

export function mapStatus(raw: string): InternalStatus | null {
  const lower = raw.toLowerCase().trim()
  for (const [status, keywords] of Object.entries(STATUS_KEYWORDS) as [InternalStatus, string[]][]) {
    if (keywords.some(kw => lower.includes(kw))) return status
  }
  return null
}
