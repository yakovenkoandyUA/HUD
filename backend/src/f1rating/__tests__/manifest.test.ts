import { describe, expect, it } from 'vitest'
import { buildDatasetManifest } from '../dataset/manifest'
import type { CollectedRound } from '../dataset/collectedRound'
import type { FastF1SessionExport } from '../adapters/fastF1Adapter'

function raceEntry(driverId: string, constructorId: string, round: number): FastF1SessionExport & { status: string } {
  return {
    schemaVersion: 'fastf1-export-v1', season: 2025, round, sessionType: 'Race',
    driverId, constructorId, gridPosition: 1, finishPosition: 1, classified: true, status: 'Finished',
    laps: [],
  }
}

function round(roundNo: number, roster: { driverId: string; constructorId: string }[], overrides: Partial<CollectedRound> = {}): CollectedRound {
  return {
    schemaVersion: 'fastf1-export-v1', season: 2025, round: roundNo,
    qualifying: roster.map(r => ({ driverId: r.driverId, constructorId: r.constructorId, position: '1', Q1: '1:20.000', Q2: '1:19.500', Q3: '1:19.000' })),
    race: roster.map(r => raceEntry(r.driverId, r.constructorId, roundNo)),
    ...overrides,
  }
}

describe('buildDatasetManifest — basic shape', () => {
  const rounds = [
    round(1, [{ driverId: 'norris', constructorId: 'mclaren' }, { driverId: 'piastri', constructorId: 'mclaren' }]),
    round(4, [{ driverId: 'norris', constructorId: 'mclaren' }, { driverId: 'piastri', constructorId: 'mclaren' }]),
  ]

  it('records included rounds and teams/drivers', () => {
    const manifest = buildDatasetManifest(rounds, '/tmp/does-not-exist', 24)
    expect(manifest.includedRounds).toEqual([1, 4])
    expect(manifest.teams).toEqual(['mclaren'])
    expect(manifest.drivers).toEqual(['norris', 'piastri'])
  })

  it('computes missingRounds relative to the given total season length', () => {
    const manifest = buildDatasetManifest(rounds, '/tmp/does-not-exist', 5)
    expect(manifest.missingRounds).toEqual([2, 3, 5])
  })

  it('does not compute missingRounds when totalSeasonRounds is not provided', () => {
    const manifest = buildDatasetManifest(rounds, '/tmp/does-not-exist', null)
    expect(manifest.missingRounds).toEqual([])
  })

  it('flags a round missing a session', () => {
    const withGap = [...rounds, round(7, [{ driverId: 'norris', constructorId: 'mclaren' }], { qualifying: [] })]
    const manifest = buildDatasetManifest(withGap, '/tmp/does-not-exist', 24)
    expect(manifest.missingSessions).toEqual([{ round: 7, missing: ['Q'] }])
  })
})

describe('buildDatasetManifest — substitution detection', () => {
  it('detects a clean 1-for-1 substitution between two included rounds', () => {
    const rounds = [
      round(1, [{ driverId: 'verstappen', constructorId: 'red_bull' }, { driverId: 'lawson', constructorId: 'red_bull' }]),
      round(4, [{ driverId: 'verstappen', constructorId: 'red_bull' }, { driverId: 'tsunoda', constructorId: 'red_bull' }]),
    ]
    const manifest = buildDatasetManifest(rounds, '/tmp/does-not-exist', 24)
    expect(manifest.substitutions).toEqual([
      { constructorId: 'red_bull', outDriverId: 'lawson', inDriverId: 'tsunoda', detectedBetweenRounds: [1, 4] },
    ])
  })

  it('detects a mid-season TEAM CHANGE as symmetric out/in events on both constructors', () => {
    const rounds = [
      round(1, [{ driverId: 'mover', constructorId: 'alpine' }, { driverId: 'a', constructorId: 'alpine' }, { driverId: 'b', constructorId: 'williams' }, { driverId: 'c', constructorId: 'williams' }]),
      round(4, [{ driverId: 'x', constructorId: 'alpine' }, { driverId: 'a', constructorId: 'alpine' }, { driverId: 'mover', constructorId: 'williams' }, { driverId: 'c', constructorId: 'williams' }]),
    ]
    const manifest = buildDatasetManifest(rounds, '/tmp/does-not-exist', 24)
    const alpineEvent = manifest.substitutions.find(s => s.constructorId === 'alpine')!
    const williamsEvent = manifest.substitutions.find(s => s.constructorId === 'williams')!
    expect(alpineEvent).toEqual({ constructorId: 'alpine', outDriverId: 'mover', inDriverId: 'x', detectedBetweenRounds: [1, 4] })
    expect(williamsEvent).toEqual({ constructorId: 'williams', outDriverId: 'b', inDriverId: 'mover', detectedBetweenRounds: [1, 4] })
  })

  it('detects no substitution when the roster is unchanged between rounds', () => {
    const rounds = [
      round(1, [{ driverId: 'norris', constructorId: 'mclaren' }, { driverId: 'piastri', constructorId: 'mclaren' }]),
      round(4, [{ driverId: 'norris', constructorId: 'mclaren' }, { driverId: 'piastri', constructorId: 'mclaren' }]),
    ]
    const manifest = buildDatasetManifest(rounds, '/tmp/does-not-exist', 24)
    expect(manifest.substitutions).toEqual([])
  })

  it('records a known-gap warning acknowledging intermediate rounds are invisible to substitution detection', () => {
    const rounds = [
      round(1, [{ driverId: 'norris', constructorId: 'mclaren' }]),
      round(10, [{ driverId: 'norris', constructorId: 'mclaren' }]),
    ]
    const manifest = buildDatasetManifest(rounds, '/tmp/does-not-exist', 24)
    expect(manifest.knownGaps.some(g => g.includes('only be detectable BETWEEN') || g.includes('only detectable BETWEEN'))).toBe(true)
  })
})

describe('buildDatasetManifest — full-season (24-round) scale', () => {
  const fullSeasonRounds = Array.from({ length: 24 }, (_, i) =>
    round(i + 1, [{ driverId: 'norris', constructorId: 'mclaren' }, { driverId: 'piastri', constructorId: 'mclaren' }]))

  it('reports zero missingRounds/missingSessions for a genuinely complete 24/24 dataset', () => {
    const manifest = buildDatasetManifest(fullSeasonRounds, '/tmp/does-not-exist', 24)
    expect(manifest.includedRounds).toHaveLength(24)
    expect(manifest.missingRounds).toEqual([])
    expect(manifest.missingSessions).toEqual([])
  })

  it('does NOT falsify 24/24 when a round is genuinely missing — reports it in missingRounds', () => {
    const withGap = fullSeasonRounds.filter(r => r.round !== 12)
    const manifest = buildDatasetManifest(withGap, '/tmp/does-not-exist', 24)
    expect(manifest.includedRounds).toHaveLength(23)
    expect(manifest.missingRounds).toEqual([12])
  })

  it('produces the same datasetId at full-season scale regardless of input file ordering', () => {
    const forward = buildDatasetManifest(fullSeasonRounds, '/tmp/does-not-exist', 24)
    const reversed = buildDatasetManifest([...fullSeasonRounds].reverse(), '/tmp/does-not-exist', 24)
    expect(forward.datasetId).toBe(reversed.datasetId)
    expect(forward.includedRounds).toEqual(reversed.includedRounds)
  })

  it('reports partial-season coverage for a driver who only appears in a subset of the 24 rounds (e.g. a mid-season substitution)', () => {
    const withSub = fullSeasonRounds.map((r, i) =>
      i < 5 ? r : round(r.round, [{ driverId: 'norris', constructorId: 'mclaren' }, { driverId: 'colapinto', constructorId: 'mclaren' }]))
    const manifest = buildDatasetManifest(withSub, '/tmp/does-not-exist', 24)
    expect(manifest.drivers).toContain('piastri')
    expect(manifest.drivers).toContain('colapinto')
    const sub = manifest.substitutions.find(s => s.outDriverId === 'piastri' && s.inDriverId === 'colapinto')
    expect(sub).toBeDefined()
  })
})

describe('buildDatasetManifest — deterministic datasetId', () => {
  it('produces the SAME datasetId for the same season + rounds + file contents', () => {
    const rounds = [round(1, [{ driverId: 'norris', constructorId: 'mclaren' }])]
    const a = buildDatasetManifest(rounds, '/tmp/does-not-exist', 24)
    const b = buildDatasetManifest(rounds, '/tmp/does-not-exist', 24)
    expect(a.datasetId).toBe(b.datasetId)
  })

  it('produces a DIFFERENT datasetId when the included rounds differ', () => {
    const roundsA = [round(1, [{ driverId: 'norris', constructorId: 'mclaren' }])]
    const roundsB = [round(4, [{ driverId: 'norris', constructorId: 'mclaren' }])]
    const a = buildDatasetManifest(roundsA, '/tmp/does-not-exist', 24)
    const b = buildDatasetManifest(roundsB, '/tmp/does-not-exist', 24)
    expect(a.datasetId).not.toBe(b.datasetId)
  })

  it('driver/file ordering does not change the datasetId (sorted internally)', () => {
    const rosterA = [{ driverId: 'piastri', constructorId: 'mclaren' }, { driverId: 'norris', constructorId: 'mclaren' }]
    const rosterB = [{ driverId: 'norris', constructorId: 'mclaren' }, { driverId: 'piastri', constructorId: 'mclaren' }]
    const a = buildDatasetManifest([round(1, rosterA)], '/tmp/does-not-exist', 24)
    const b = buildDatasetManifest([round(1, rosterB)], '/tmp/does-not-exist', 24)
    expect(a.datasetId).toBe(b.datasetId)
    expect(a.drivers).toEqual(b.drivers)
  })
})
