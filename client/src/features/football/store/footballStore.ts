import { create } from 'zustand'
import { authFetch } from '@/shared/services/api'
import type { CompetitionCode, FootballStanding, FootballMatch } from '../types'

interface FootballState {
  standings: Partial<Record<CompetitionCode, FootballStanding[]>>
  nextMatch: Partial<Record<CompetitionCode, FootballMatch | null>>
  loading: boolean
  error: string | null
  fetchStandings: (competition: CompetitionCode) => Promise<void>
  fetchNextMatch: (competition: CompetitionCode) => Promise<void>
}

export const useFootballStore = create<FootballState>((set) => ({
  standings: {},
  nextMatch: {},
  loading: false,
  error: null,

  fetchStandings: async (competition) => {
    set({ loading: true, error: null })
    try {
      const res = await authFetch(`/api/football/standings?competition=${competition}`)
      if (!res.ok) throw new Error('Не вдалося завантажити таблицю')
      const data = await res.json() as { standings: FootballStanding[] }
      set(s => ({ standings: { ...s.standings, [competition]: data.standings }, loading: false }))
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : 'Помилка завантаження' })
    }
  },

  fetchNextMatch: async (competition) => {
    try {
      const res = await authFetch(`/api/football/matches?competition=${competition}`)
      if (!res.ok) return
      const data = await res.json() as { match: FootballMatch | null }
      set(s => ({ nextMatch: { ...s.nextMatch, [competition]: data.match } }))
    } catch {
      // silent — next-match card просто не покаже нічого
    }
  },
}))
