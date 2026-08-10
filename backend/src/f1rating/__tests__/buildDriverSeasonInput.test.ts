import { describe, expect, it, vi } from 'vitest'
import { buildDriverSeasonInputFromRounds } from '../dataset/buildDriverSeasonInput'
import { methodologyV1 } from '../config/methodologyV1'
import type { CollectedRound } from '../dataset/collectedRound'
import type { FastF1SessionExport } from '../adapters/fastF1Adapter'

function raceEntry(overrides: Partial<FastF1SessionExport & { status: string }> = {}): FastF1SessionExport & { status: string } {
  return {
    schemaVersion: 'fastf1-export-v1', season: 2023, round: 1, sessionType: 'Race',
    driverId: 'stroll', constructorId: 'aston_martin', gridPosition: 5, finishPosition: 10,
    classified: true, status: 'Finished', laps: [],
    ...overrides,
  }
}

function round(roundNo: number, race: (FastF1SessionExport & { status: string })[]): CollectedRound {
  return { schemaVersion: 'fastf1-export-v1', season: 2023, round: roundNo, qualifying: [], race }
}

describe('buildDriverSeasonInputFromRounds — grid-scale resilience to per-driver malformed data', () => {
  // Real 2023 case: a driver (Stroll, Zandvoort) missed qualifying and started from the pit lane
  // — FastF1 reports gridPosition: null for that round. `fastF1ExportToRaceMetrics` correctly
  // THROWS on that (a real data-quality invariant, not a bug), but at grid-wide multi-season
  // scale one driver's one bad round must not crash the entire batch.
  it('excludes the single round with gridPosition:null instead of throwing and crashing the whole grid batch', () => {
    const rounds: CollectedRound[] = [
      round(1, [raceEntry({ round: 1, gridPosition: 5 })]),
      round(2, [raceEntry({ round: 2, gridPosition: null })]),
      round(3, [raceEntry({ round: 3, gridPosition: 8 })]),
    ]
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const input = buildDriverSeasonInputFromRounds('stroll', rounds, methodologyV1.tunables)
    expect(input.race.map(r => r.round)).toEqual([1, 3])
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('round 2'))
    warnSpy.mockRestore()
  })

  it('does not build a DNF record for the excluded round either (no orphaned DNF referencing missing race data)', () => {
    const rounds: CollectedRound[] = [
      round(2, [raceEntry({ round: 2, gridPosition: null, status: 'Retired' })]),
    ]
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const input = buildDriverSeasonInputFromRounds('stroll', rounds, methodologyV1.tunables)
    expect(input.race).toHaveLength(0)
    expect(input.dnfs).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('other drivers in the SAME round are unaffected by one driver\'s malformed entry', () => {
    const rounds: CollectedRound[] = [
      round(1, [
        raceEntry({ driverId: 'stroll', round: 1, gridPosition: null }),
        raceEntry({ driverId: 'alonso', round: 1, gridPosition: 3 }),
      ]),
    ]
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const strollInput = buildDriverSeasonInputFromRounds('stroll', rounds, methodologyV1.tunables)
    const alonsoInput = buildDriverSeasonInputFromRounds('alonso', rounds, methodologyV1.tunables)
    expect(strollInput.race).toHaveLength(0)
    expect(alonsoInput.race).toHaveLength(1)
    vi.restoreAllMocks()
  })
})
