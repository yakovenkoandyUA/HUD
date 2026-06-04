import { create } from 'zustand'
import type { F1Race } from '../data/f1Season2026'
import { authFetch, isBackendConfigured, getToken } from '../services/api'

export interface RacePrediction {
  raceId:    string   // "2026-r6"
  raceName:  string
  raceRound: number
  p1: string          // driverId
  p2: string
  p3: string
  savedAt:   string   // ISO timestamp
  result?: {
    p1Match:  'exact' | 'partial' | 'miss'
    p2Match:  'exact' | 'partial' | 'miss'
    p3Match:  'exact' | 'partial' | 'miss'
    actualP1: string
    actualP2: string
    actualP3: string
    points:   number
  }
}

interface F1PredictionsStore {
  predictions: RacePrediction[]
  totalPoints: number
  fetchPredictions: () => Promise<void>
  savePrediction: (race: F1Race, p1: string, p2: string, p3: string) => void
  checkResult:    (raceId: string, actualP1: string, actualP2: string, actualP3: string) => void
}

export function toRaceId(race: F1Race): string {
  return `${race.date.slice(0, 4)}-r${race.round}`
}

// Lock prediction 2 hours before race (approximate start time 13:00 UTC)
export function isRaceLocked(race: F1Race): boolean {
  const start = new Date(race.date + 'T13:00:00Z').getTime()
  return start - Date.now() < 2 * 60 * 60 * 1000
}

function matchAt(
  myPick: string, pos: number, actual: [string, string, string]
): 'exact' | 'partial' | 'miss' {
  if (myPick === actual[pos]) return 'exact'
  if (actual.includes(myPick)) return 'partial'
  return 'miss'
}

function calcTotal(predictions: RacePrediction[]): number {
  return predictions.reduce((sum, p) => sum + (p.result?.points ?? 0), 0)
}

interface ApiPrediction {
  _id: string
  raceId: string
  raceName: string
  raceRound: number
  p1: string
  p2: string
  p3: string
  savedAt: string
  result?: RacePrediction['result'] | null
}

function fromApi(item: ApiPrediction): RacePrediction {
  return {
    raceId:    item.raceId,
    raceName:  item.raceName,
    raceRound: item.raceRound,
    p1: item.p1,
    p2: item.p2,
    p3: item.p3,
    savedAt: item.savedAt,
    ...(item.result ? { result: item.result } : {}),
  }
}

export const useF1PredictionsStore = create<F1PredictionsStore>()((set, get) => ({
  predictions: [],
  totalPoints:  0,

  fetchPredictions: async () => {
    if (!getToken() || !isBackendConfigured()) return
    try {
      const res = await authFetch('/api/f1/predictions')
      if (!res.ok) return
      const data: ApiPrediction[] = await res.json()
      const predictions = data.map(fromApi)
      set({ predictions, totalPoints: calcTotal(predictions) })
    } catch { /* offline */ }
  },

  savePrediction: (race, p1, p2, p3) => {
    const raceId  = toRaceId(race)
    const savedAt = new Date().toISOString()
    const next: RacePrediction = {
      raceId, raceName: race.name, raceRound: race.round, p1, p2, p3, savedAt,
    }
    set(s => ({
      predictions: [
        ...s.predictions.filter(p => p.raceId !== raceId),
        next,
      ],
    }))

    if (!getToken() || !isBackendConfigured()) return
    authFetch('/api/f1/predictions', {
      method: 'POST',
      body: JSON.stringify({ raceId, raceName: race.name, raceRound: race.round, p1, p2, p3, savedAt }),
    }).catch(() => {})
  },

  checkResult: (raceId, actualP1, actualP2, actualP3) => {
    const pred = get().predictions.find(p => p.raceId === raceId)
    if (!pred || pred.result) return

    const actual: [string, string, string] = [actualP1, actualP2, actualP3]
    const p1Match = matchAt(pred.p1, 0, actual)
    const p2Match = matchAt(pred.p2, 1, actual)
    const p3Match = matchAt(pred.p3, 2, actual)
    const pts = (m: 'exact' | 'partial' | 'miss') =>
      m === 'exact' ? 10 : m === 'partial' ? 5 : 0
    const points = pts(p1Match) + pts(p2Match) + pts(p3Match)
    const result = { p1Match, p2Match, p3Match, actualP1, actualP2, actualP3, points }

    set(s => {
      const predictions = s.predictions.map(p =>
        p.raceId === raceId ? { ...p, result } : p
      )
      return { predictions, totalPoints: calcTotal(predictions) }
    })

    if (!getToken() || !isBackendConfigured()) return
    authFetch(`/api/f1/predictions/${raceId}/result`, {
      method: 'PATCH',
      body: JSON.stringify({ result }),
    }).catch(() => {})
  },
}))
