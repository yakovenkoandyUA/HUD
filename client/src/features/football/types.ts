export type CompetitionCode = 'PL' | 'PD' | 'BL1' | 'SA' | 'FL1' | 'CL'

export interface FootballTeam {
  id: number
  name: string
  shortName: string
  crest: string
}

export interface FootballStanding {
  position: number
  team: FootballTeam
  playedGames: number
  won: number
  draw: number
  lost: number
  points: number
}

export interface FootballMatch {
  id: number
  utcDate: string
  status: string
  homeTeam: FootballTeam
  awayTeam: FootballTeam
  competition: { code: string; name: string }
}
