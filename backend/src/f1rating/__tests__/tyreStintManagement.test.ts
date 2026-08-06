import { describe, expect, it } from 'vitest'
import { explainStintPaceEvolution, tyreStintManagement } from '../engine/tyreStintManagement'
import { fastF1ExportToRaceMetrics } from '../adapters/fastF1Adapter'
import { methodologyV1 } from '../config/methodologyV1'
import { realShapedRound3 } from './fixtures/realShapedRound'
import type { DriverSeasonInput } from '../engine/metrics'
import type { RawRaceMetrics, StintMetrics } from '../types'

const norrisReal = realShapedRound3.race.find(r => r.driverId === 'norris')!
const piastriReal = realShapedRound3.race.find(r => r.driverId === 'piastri')!

function driverInputFromReal(export_: typeof norrisReal): DriverSeasonInput {
  const race = fastF1ExportToRaceMetrics(export_, false, methodologyV1.tunables.minCleanLapsForDegradationSlope)
  return { driverId: export_.driverId, qualifying: [], race: [race], dnfs: [], incidents: [] }
}

describe('tyreStintManagement — teammate-relative comparable-stint pairing (real fixture)', () => {
  const norris = driverInputFromReal(norrisReal)
  const piastri = driverInputFromReal(piastriReal)

  it('pairs both real stints (medium + hard) between the two teammates', () => {
    const explain = explainStintPaceEvolution(norris, piastri, methodologyV1.tunables, methodologyV1.tyreAgeComparabilityThresholdLaps)
    expect(explain.pairs).toHaveLength(2)
    expect(explain.pairs.map(p => p.driverStint.compound).sort()).toEqual(['hard', 'medium'])
  })

  it('relativeDelta is the exact difference of the two real per-stint slopes', () => {
    const explain = explainStintPaceEvolution(norris, piastri, methodologyV1.tunables, methodologyV1.tyreAgeComparabilityThresholdLaps)
    for (const pair of explain.pairs) {
      expect(pair.relativeDeltaMsPerLap).toBeCloseTo(pair.driverSlopeMsPerLap - pair.teammateSlopeMsPerLap, 6)
    }
  })

  it('swapping driver/teammate negates every relativeDelta (direction is well-defined)', () => {
    const forward = explainStintPaceEvolution(norris, piastri, methodologyV1.tunables, methodologyV1.tyreAgeComparabilityThresholdLaps)
    const reverse = explainStintPaceEvolution(piastri, norris, methodologyV1.tunables, methodologyV1.tyreAgeComparabilityThresholdLaps)
    expect(forward.pairs).toHaveLength(reverse.pairs.length)
    const forwardByCompound = new Map(forward.pairs.map(p => [p.driverStint.compound, p.relativeDeltaMsPerLap]))
    for (const p of reverse.pairs) {
      expect(p.relativeDeltaMsPerLap).toBeCloseTo(-(forwardByCompound.get(p.driverStint.compound) as number), 6)
    }
  })

  it('does not fabricate a value from a single driver\'s raw slope alone — rawValue is the average of PAIR deltas', () => {
    const result = tyreStintManagement(norris, piastri, methodologyV1.tunables, methodologyV1.tyreAgeComparabilityThresholdLaps)
    const explain = explainStintPaceEvolution(norris, piastri, methodologyV1.tunables, methodologyV1.tyreAgeComparabilityThresholdLaps)
    const expectedAvg = explain.pairs.reduce((a, p) => a + p.relativeDeltaMsPerLap, 0) / explain.pairs.length
    expect(result.rawValue).toBeCloseTo(expectedAvg, 6)
    expect(result.sampleSize).toBe(explain.pairs.length)
  })
})

function stint(overrides: Partial<StintMetrics> = {}): StintMetrics {
  return {
    stintNumber: 1, compound: 'medium', startLap: 1, endLap: 20, trackCondition: 'dry',
    avgCleanLapTimeMs: 90_000, degradationMsPerLap: 20, cleanLapCount: 15, ...overrides,
  }
}

function race(overrides: Partial<RawRaceMetrics> = {}): RawRaceMetrics {
  return {
    driverId: 'd', constructorId: 'c', season: 2025, round: 1, laps: [], stints: [stint()],
    start: { gridPosition: 1, positionAfterLap1: 1, positionsGainedLost: 0, attributableContactOnLap1: false },
    finishPosition: 1, expectedFinishPosition: 1, classified: true, ...overrides,
  }
}

describe('tyreStintManagement — 1:1 pairing, never a cartesian product', () => {
  it('two eligible driver stints × two eligible teammate stints produce exactly two pairs, not four', () => {
    // Driver: early short-run hard stint (age ~5) then a long hard stint (age ~20).
    // Teammate: same shape, same compound — each driver stint should pair with exactly ONE
    // teammate stint (A↔A, B↔B), never both driver stints pairing with both teammate stints.
    const driverStintA = stint({ stintNumber: 1, compound: 'hard', startLap: 1, endLap: 6, cleanLapCount: 5 })   // age 5
    const driverStintB = stint({ stintNumber: 2, compound: 'hard', startLap: 7, endLap: 27, cleanLapCount: 20 }) // age 20
    const teammateStintA = stint({ stintNumber: 1, compound: 'hard', startLap: 1, endLap: 7, cleanLapCount: 6 })  // age 6
    const teammateStintB = stint({ stintNumber: 2, compound: 'hard', startLap: 8, endLap: 29, cleanLapCount: 21 }) // age 21

    const driver: DriverSeasonInput = {
      driverId: 'a', qualifying: [], dnfs: [], incidents: [],
      race: [race({ stints: [driverStintA, driverStintB] })],
    }
    const teammate: DriverSeasonInput = {
      driverId: 'b', qualifying: [], dnfs: [], incidents: [],
      race: [race({ driverId: 'b', stints: [teammateStintA, teammateStintB] })],
    }

    const explain = explainStintPaceEvolution(driver, teammate, methodologyV1.tunables, methodologyV1.tyreAgeComparabilityThresholdLaps)

    // The critical assertion: exactly 2 pairs, never 4 (which a cartesian A×B expansion would produce).
    expect(explain.pairs).toHaveLength(2)

    // And the pairing must be the CORRECT one (closest tyre age), not crossed:
    // driver stint A (age 5) -> teammate stint A (age 6, diff 1), not teammate stint B (age 21, diff 16).
    const pairForA = explain.pairs.find(p => p.driverStint.stintNumber === 1)!
    const pairForB = explain.pairs.find(p => p.driverStint.stintNumber === 2)!
    expect(pairForA.teammateStint.stintNumber).toBe(1)
    expect(pairForB.teammateStint.stintNumber).toBe(2)

    // Every teammate stint is used at most once.
    const usedTeammateStintNumbers = explain.pairs.map(p => p.teammateStint.stintNumber)
    expect(new Set(usedTeammateStintNumbers).size).toBe(usedTeammateStintNumbers.length)
  })

  it('when a driver stint is comparable to two unused teammate stints, picks the closer tyre age deterministically', () => {
    // Both teammate stints are within the comparability threshold of the driver's single stint
    // (threshold=3 by default) — the picker must choose the closer one (age 6, diff 1) over the
    // farther one (age 8, diff 3), not whichever appears first in the array.
    const driverStint = stint({ stintNumber: 1, compound: 'medium', startLap: 1, endLap: 6, cleanLapCount: 5 }) // age 5
    const teammateFar = stint({ stintNumber: 1, compound: 'medium', startLap: 1, endLap: 9, cleanLapCount: 8 })  // age 8 (diff 3, still comparable)
    const teammateClose = stint({ stintNumber: 2, compound: 'medium', startLap: 10, endLap: 16, cleanLapCount: 6 }) // age 6 (diff 1)

    const driver: DriverSeasonInput = {
      driverId: 'a', qualifying: [], dnfs: [], incidents: [],
      race: [race({ stints: [driverStint] })],
    }
    const teammate: DriverSeasonInput = {
      driverId: 'b', qualifying: [], dnfs: [], incidents: [],
      // Deliberately ordered so the FARTHER stint comes first in the array — a naive
      // "first match wins" implementation would incorrectly pick this one.
      race: [race({ driverId: 'b', stints: [teammateFar, teammateClose] })],
    }

    const explain = explainStintPaceEvolution(driver, teammate, methodologyV1.tunables, methodologyV1.tyreAgeComparabilityThresholdLaps)
    expect(explain.pairs).toHaveLength(1)
    expect(explain.pairs[0].teammateStint.stintNumber).toBe(2) // teammateClose, not teammateFar
  })
})

describe('tyreStintManagement — no comparable stint pair', () => {
  it('returns null (not zero) when the teammate has no race entry for the round', () => {
    const driver: DriverSeasonInput = { driverId: 'a', qualifying: [], race: [race()], dnfs: [], incidents: [] }
    const teammate: DriverSeasonInput = { driverId: 'b', qualifying: [], race: [], dnfs: [], incidents: [] }
    const result = tyreStintManagement(driver, teammate, methodologyV1.tunables, methodologyV1.tyreAgeComparabilityThresholdLaps)
    expect(result.rawValue).toBeNull()
    expect(result.sampleSize).toBe(0)
  })

  it('returns null when the only stints available use different compounds (not comparable)', () => {
    const driver: DriverSeasonInput = {
      driverId: 'a', qualifying: [], dnfs: [], incidents: [],
      race: [race({ stints: [stint({ compound: 'soft' })] })],
    }
    const teammate: DriverSeasonInput = {
      driverId: 'b', qualifying: [], dnfs: [], incidents: [],
      race: [race({ driverId: 'b', stints: [stint({ compound: 'hard' })] })],
    }
    const result = tyreStintManagement(driver, teammate, methodologyV1.tunables, methodologyV1.tyreAgeComparabilityThresholdLaps)
    expect(result.rawValue).toBeNull()
    expect(result.sampleSize).toBe(0)
  })

  it('returns null when stints have too few clean laps to trust a slope', () => {
    const driver: DriverSeasonInput = {
      driverId: 'a', qualifying: [], dnfs: [], incidents: [],
      race: [race({ stints: [stint({ cleanLapCount: 1 })] })],
    }
    const teammate: DriverSeasonInput = {
      driverId: 'b', qualifying: [], dnfs: [], incidents: [],
      race: [race({ driverId: 'b', stints: [stint({ cleanLapCount: 1 })] })],
    }
    const result = tyreStintManagement(driver, teammate, methodologyV1.tunables, methodologyV1.tyreAgeComparabilityThresholdLaps)
    expect(result.rawValue).toBeNull()
  })

  it('records the exclusion reason for a round with no comparable pair', () => {
    const driver: DriverSeasonInput = { driverId: 'a', qualifying: [], race: [race()], dnfs: [], incidents: [] }
    const teammate: DriverSeasonInput = { driverId: 'b', qualifying: [], race: [], dnfs: [], incidents: [] }
    const explain = explainStintPaceEvolution(driver, teammate, methodologyV1.tunables, methodologyV1.tyreAgeComparabilityThresholdLaps)
    expect(explain.excludedRounds).toHaveLength(1)
    expect(explain.warnings.some(w => w.includes('unmeasured (null), not zero'))).toBe(true)
  })
})
