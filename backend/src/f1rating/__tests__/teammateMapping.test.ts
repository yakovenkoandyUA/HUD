import { describe, expect, it } from 'vitest'
import { resolveTeammates, buildCompositeTeammateInput, type RosterEntry } from '../dataset/teammateMapping'
import type { DriverSeasonInput } from '../engine/metrics'
import type { RawRaceMetrics } from '../types'

describe('resolveTeammates', () => {
  it('pairs two drivers from the same constructor as mutual teammates', () => {
    const roster: RosterEntry[] = [
      { driverId: 'norris', constructorId: 'mclaren' },
      { driverId: 'piastri', constructorId: 'mclaren' },
    ]
    const result = resolveTeammates(roster)
    const norris = result.find(r => r.driverId === 'norris')!
    const piastri = result.find(r => r.driverId === 'piastri')!
    expect(norris.teammateId).toBe('piastri')
    expect(piastri.teammateId).toBe('norris')
  })

  it('resolves multiple constructors independently in the same call', () => {
    const roster: RosterEntry[] = [
      { driverId: 'norris', constructorId: 'mclaren' },
      { driverId: 'piastri', constructorId: 'mclaren' },
      { driverId: 'verstappen', constructorId: 'red_bull' },
      { driverId: 'lawson', constructorId: 'red_bull' },
    ]
    const result = resolveTeammates(roster)
    expect(result.find(r => r.driverId === 'verstappen')!.teammateId).toBe('lawson')
    expect(result.find(r => r.driverId === 'norris')!.teammateId).toBe('piastri')
  })

  it('does NOT fabricate a teammate when only one driver from a constructor is present', () => {
    const roster: RosterEntry[] = [{ driverId: 'norris', constructorId: 'mclaren' }]
    const result = resolveTeammates(roster)
    expect(result).toHaveLength(1)
    expect(result[0].teammateId).toBeNull()
    expect(result[0].reason).toMatch(/only one driver/)
  })

  it('resolves an anomalous 3-driver constructor deterministically (sorted by driverId)', () => {
    const roster: RosterEntry[] = [
      { driverId: 'zzz_driver', constructorId: 'alpine' },
      { driverId: 'aaa_driver', constructorId: 'alpine' },
      { driverId: 'mmm_driver', constructorId: 'alpine' },
    ]
    const a = resolveTeammates(roster)
    const b = resolveTeammates([...roster].reverse())
    // Same result regardless of input array order — deterministic.
    expect(a.map(r => `${r.driverId}:${r.teammateId}`).sort()).toEqual(b.map(r => `${r.driverId}:${r.teammateId}`).sort())
    const first = a.find(r => r.driverId === 'aaa_driver')!
    const second = a.find(r => r.driverId === 'mmm_driver')!
    const excluded = a.find(r => r.driverId === 'zzz_driver')!
    expect(first.teammateId).toBe('mmm_driver')
    expect(second.teammateId).toBe('aaa_driver')
    expect(excluded.teammateId).toBeNull()
  })

  it('is deterministic: same roster produces the same resolution every call', () => {
    const roster: RosterEntry[] = [
      { driverId: 'hamilton', constructorId: 'ferrari' },
      { driverId: 'leclerc', constructorId: 'ferrari' },
    ]
    const first = resolveTeammates(roster)
    const second = resolveTeammates(roster)
    expect(first).toEqual(second)
  })
})

function race(driverId: string, round: number, overrides: Partial<RawRaceMetrics> = {}): RawRaceMetrics {
  return {
    driverId, constructorId: 'red_bull', season: 2025, round, laps: [], stints: [],
    start: { gridPosition: 1, positionAfterLap1: 1, positionsGainedLost: 0, attributableContactOnLap1: false },
    finishPosition: 1, expectedFinishPosition: 1, classified: true, ...overrides,
  }
}

function seasonInput(driverId: string, rounds: number[]): DriverSeasonInput {
  return { driverId, qualifying: [], race: rounds.map(r => race(driverId, r)), dnfs: [], incidents: [] }
}

describe('buildCompositeTeammateInput — driver substitution handling', () => {
  it('pulls each round\'s ACTUAL teammate — never assumes a fixed teammate for the season', () => {
    // Verstappen races rounds 1,4,7. Lawson was his teammate for round 1, replaced by Tsunoda from round 4.
    const verstappen = seasonInput('verstappen', [1, 4, 7])
    const lawson = seasonInput('lawson', [1])
    const tsunoda = seasonInput('tsunoda', [4, 7])

    const allDrivers = new Map([
      ['verstappen', verstappen], ['lawson', lawson], ['tsunoda', tsunoda],
    ])
    const rosterByRound = new Map([
      [1, [{ driverId: 'verstappen', constructorId: 'red_bull' }, { driverId: 'lawson', constructorId: 'red_bull' }]],
      [4, [{ driverId: 'verstappen', constructorId: 'red_bull' }, { driverId: 'tsunoda', constructorId: 'red_bull' }]],
      [7, [{ driverId: 'verstappen', constructorId: 'red_bull' }, { driverId: 'tsunoda', constructorId: 'red_bull' }]],
    ])

    const composite = buildCompositeTeammateInput('verstappen', allDrivers, rosterByRound)
    expect(composite.teammateByRound.get(1)).toBe('lawson')
    expect(composite.teammateByRound.get(4)).toBe('tsunoda')
    expect(composite.teammateByRound.get(7)).toBe('tsunoda')
    // The composite's race entries actually come from the right underlying driver per round.
    expect(composite.driverSeasonInput.race.map(r => r.round).sort()).toEqual([1, 4, 7])
  })

  it('mid-season TEAM change: a driver switching constructors gets the new teammate at the new team', () => {
    // A driver races for team A in round 1, then team B in round 4 (constructorId changes).
    const mover = seasonInput('mover', [1, 4])
    mover.race[0] = race('mover', 1, { constructorId: 'alpine' })
    mover.race[1] = race('mover', 4, { constructorId: 'williams' })
    const alpineTeammate = seasonInput('alpineTeammate', [1])
    alpineTeammate.race[0] = race('alpineTeammate', 1, { constructorId: 'alpine' })
    const williamsTeammate = seasonInput('williamsTeammate', [4])
    williamsTeammate.race[0] = race('williamsTeammate', 4, { constructorId: 'williams' })

    const allDrivers = new Map([
      ['mover', mover], ['alpineTeammate', alpineTeammate], ['williamsTeammate', williamsTeammate],
    ])
    const rosterByRound = new Map([
      [1, [{ driverId: 'mover', constructorId: 'alpine' }, { driverId: 'alpineTeammate', constructorId: 'alpine' }]],
      [4, [{ driverId: 'mover', constructorId: 'williams' }, { driverId: 'williamsTeammate', constructorId: 'williams' }]],
    ])

    const composite = buildCompositeTeammateInput('mover', allDrivers, rosterByRound)
    expect(composite.teammateByRound.get(1)).toBe('alpineTeammate')
    expect(composite.teammateByRound.get(4)).toBe('williamsTeammate')
  })

  it('a round with only one driver from the constructor contributes NO composite teammate entry (never fabricated)', () => {
    const solo = seasonInput('solo', [1, 2])
    const allDrivers = new Map([['solo', solo]])
    const rosterByRound = new Map([
      [1, [{ driverId: 'solo', constructorId: 'haas' }]], // only one classified driver this round
      [2, [{ driverId: 'solo', constructorId: 'haas' }]],
    ])

    const composite = buildCompositeTeammateInput('solo', allDrivers, rosterByRound)
    expect(composite.driverSeasonInput.race).toHaveLength(0)
    expect(composite.roundsWithoutTeammate.sort()).toEqual([1, 2])
  })

  it('three different drivers of one constructor across a season are each resolved to the correct per-round teammate', () => {
    // Constructor fields: driverA (rounds 1-2), then driverB (round 3) as SUBSTITUTE for the SAME
    // seat, alongside a constant second-seat driverC for all 3 rounds.
    const driverC = seasonInput('driverC', [1, 2, 3])
    const driverA = seasonInput('driverA', [1, 2])
    const driverB = seasonInput('driverB', [3])
    const allDrivers = new Map([['driverA', driverA], ['driverB', driverB], ['driverC', driverC]])
    const rosterByRound = new Map([
      [1, [{ driverId: 'driverA', constructorId: 'haas' }, { driverId: 'driverC', constructorId: 'haas' }]],
      [2, [{ driverId: 'driverA', constructorId: 'haas' }, { driverId: 'driverC', constructorId: 'haas' }]],
      [3, [{ driverId: 'driverB', constructorId: 'haas' }, { driverId: 'driverC', constructorId: 'haas' }]],
    ])

    const compositeForC = buildCompositeTeammateInput('driverC', allDrivers, rosterByRound)
    expect(compositeForC.teammateByRound.get(1)).toBe('driverA')
    expect(compositeForC.teammateByRound.get(2)).toBe('driverA')
    expect(compositeForC.teammateByRound.get(3)).toBe('driverB')
  })

  it('is deterministic across repeated calls with the same inputs', () => {
    const verstappen = seasonInput('verstappen', [1])
    const lawson = seasonInput('lawson', [1])
    const allDrivers = new Map([['verstappen', verstappen], ['lawson', lawson]])
    const rosterByRound = new Map([[1, [{ driverId: 'verstappen', constructorId: 'red_bull' }, { driverId: 'lawson', constructorId: 'red_bull' }]]])

    const first = buildCompositeTeammateInput('verstappen', allDrivers, rosterByRound)
    const second = buildCompositeTeammateInput('verstappen', allDrivers, rosterByRound)
    expect(first.teammateByRound).toEqual(second.teammateByRound)
    expect(first.driverSeasonInput.race).toEqual(second.driverSeasonInput.race)
  })
})
