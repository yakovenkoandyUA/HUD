/**
 * ranks.ts
 * --------
 * Ранги — агрегація кількості розблокованих досягнень у тиери.
 * Суто косметика (колір рамки аватара, лейбл), не керує доступом до фіч.
 */
export interface Rank {
  id: string
  label: string
  minCount: number
  color: string
}

export const RANKS: Rank[] = [
  { id: 'novice',   label: 'НОВАЧОК',   minCount: 0, color: 'var(--text3)' },
  { id: 'explorer', label: 'ДОСЛІДНИК', minCount: 2, color: 'var(--accent)' },
  { id: 'resident', label: 'РЕЗИДЕНТ',  minCount: 5, color: 'var(--second)' },
  { id: 'legend',   label: 'ЛЕГЕНДА',   minCount: 8, color: 'var(--gold)' },
]

export function getRank(unlockedCount: number): Rank {
  return [...RANKS].reverse().find(r => unlockedCount >= r.minCount) ?? RANKS[0]
}
