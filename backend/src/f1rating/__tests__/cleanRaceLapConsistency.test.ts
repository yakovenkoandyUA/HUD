import { describe, expect, it } from 'vitest'
import { cleanRaceLapConsistency, explainCleanRaceLapConsistency } from '../engine/cleanRaceLapConsistency'
import { fastF1ExportToRaceMetrics } from '../adapters/fastF1Adapter'
import { methodologyV1 } from '../config/methodologyV1'
import { realShapedRound3 } from './fixtures/realShapedRound'
import type { DriverSeasonInput } from '../engine/metrics'
import type { RaceLapSample, RawRaceMetrics, StintMetrics } from '../types'

const norrisReal = realShapedRound3.race.find(r => r.driverId === 'norris')!

function driverInputFromReal(): DriverSeasonInput {
  const race = fastF1ExportToRaceMetrics(norrisReal, false, methodologyV1.tunables.minCleanLapsForDegradationSlope)
  return { driverId: 'norris', qualifying: [], race: [race], dnfs: [], incidents: [] }
}

describe('cleanRaceLapConsistency — per-stint, real fixture', () => {
  it('produces one consistency sample per real stint (medium, hard) — not one pooled sample for the whole race', () => {
    const driver = driverInputFromReal()
    const explain = explainCleanRaceLapConsistency(driver, methodologyV1.tunables)
    expect(explain.samples).toHaveLength(2)
    expect(explain.samples.map(s => s.compound).sort()).toEqual(['hard', 'medium'])
  })

  it('excludes the real in-lap/out-lap/inaccurate-lap from each stint\'s included lap times', () => {
    const driver = driverInputFromReal()
    const explain = explainCleanRaceLapConsistency(driver, methodologyV1.tunables)
    const mediumStint = explain.samples.find(s => s.compound === 'medium')!
    // lap 1 (inaccurate) and lap 21 (in-lap) must not appear in the included times
    expect(mediumStint.cleanLapCount).toBeLessThan(21)
    expect(mediumStint.excludedLapCount).toBeGreaterThan(0)
  })

  it('reports median/MAD/CoV with consistent units for each real stint', () => {
    const driver = driverInputFromReal()
    const explain = explainCleanRaceLapConsistency(driver, methodologyV1.tunables)
    for (const s of explain.samples) {
      expect(s.medianMs).toBeGreaterThan(50_000) // sane lap-time-scale sanity check, not a magic value
      expect(s.madMs).toBeGreaterThanOrEqual(0)
      expect(s.covPct).toBeGreaterThanOrEqual(0)
    }
  })

  it('the metric-level rawValue is the average of the real per-stint CoV values (not a pooled recomputation)', () => {
    const driver = driverInputFromReal()
    const explain = explainCleanRaceLapConsistency(driver, methodologyV1.tunables)
    const result = cleanRaceLapConsistency(driver, methodologyV1.tunables)
    const expectedAvg = explain.samples.reduce((a, s) => a + s.covPct, 0) / explain.samples.length
    expect(result.rawValue).toBeCloseTo(expectedAvg, 6)
  })
})

function lap(overrides: Partial<RaceLapSample> = {}): RaceLapSample {
  return {
    lapNumber: 1, lapTimeMs: 90_000, compound: 'medium', tyreAgeLaps: 1, trackCondition: 'dry',
    trackStatus: 'green', isInLap: false, isOutLap: false, isPitLap: false, isAccurate: true,
    isDamaged: false, position: 1, ...overrides,
  }
}

function stintMeta(overrides: Partial<StintMetrics> = {}): StintMetrics {
  return {
    stintNumber: 1, compound: 'medium', startLap: 1, endLap: 5, trackCondition: 'dry',
    avgCleanLapTimeMs: 90_000, degradationMsPerLap: 0, cleanLapCount: 5, ...overrides,
  }
}

describe('cleanRaceLapConsistency — regression: does not reintroduce the pooling bug', () => {
  it('a race with two stints at very different pace baselines reports LOW per-stint CoV, not an inflated pooled CoV', () => {
    // Stint 1: laps ~90.0s each (tight). Stint 2: laps ~110.0s each (also tight, different baseline
    // e.g. a wet/slow compound). Pooling these together (the old bug) would report a huge CoV
    // driven by the ~20s gap between stints, even though each stint is individually consistent.
    const stint1Laps: RaceLapSample[] = [1, 2, 3, 4, 5].map(n => lap({ lapNumber: n, lapTimeMs: 90_000 + n * 10 }))
    const stint2Laps: RaceLapSample[] = [6, 7, 8, 9, 10].map(n => lap({ lapNumber: n, lapTimeMs: 110_000 + n * 10, compound: 'hard' }))

    const raceMetrics: RawRaceMetrics = {
      driverId: 'd', constructorId: 'c', season: 2025, round: 1,
      laps: [...stint1Laps, ...stint2Laps],
      stints: [
        stintMeta({ stintNumber: 1, compound: 'medium', startLap: 1, endLap: 5, cleanLapCount: 5 }),
        stintMeta({ stintNumber: 2, compound: 'hard', startLap: 6, endLap: 10, cleanLapCount: 5 }),
      ],
      start: { gridPosition: 1, positionAfterLap1: 1, positionsGainedLost: 0, attributableContactOnLap1: false },
      finishPosition: 1, expectedFinishPosition: 1, classified: true,
    }
    const driver: DriverSeasonInput = { driverId: 'd', qualifying: [], race: [raceMetrics], dnfs: [], incidents: [] }
    const explain = explainCleanRaceLapConsistency(driver, methodologyV1.tunables)

    expect(explain.samples).toHaveLength(2)
    for (const s of explain.samples) {
      // Each stint individually is a tight ramp (~50ms spread over ~90-110s laps) — CoV should be
      // well under 1%, not inflated by the ~20s cross-stint baseline gap.
      expect(s.covPct).toBeLessThan(1)
    }
  })

  it('never mixes wet and dry laps into the same stint sample', () => {
    const wetLap = lap({ lapNumber: 1, trackCondition: 'wet' })
    const dryLap = lap({ lapNumber: 2, trackCondition: 'dry' })
    const raceMetrics: RawRaceMetrics = {
      driverId: 'd', constructorId: 'c', season: 2025, round: 1,
      laps: [wetLap, dryLap],
      stints: [stintMeta({ trackCondition: 'dry', startLap: 1, endLap: 2, cleanLapCount: 2 })],
      start: { gridPosition: 1, positionAfterLap1: 1, positionsGainedLost: 0, attributableContactOnLap1: false },
      finishPosition: 1, expectedFinishPosition: 1, classified: true,
    }
    const driver: DriverSeasonInput = { driverId: 'd', qualifying: [], race: [raceMetrics], dnfs: [], incidents: [] }
    const explain = explainCleanRaceLapConsistency(driver, methodologyV1.tunables)
    // Only 1 dry lap present (lap 2) — below the minCleanLapsForConsistencyStint threshold, so no
    // sample should be produced (proves the wet lap was never pooled in to pad the count).
    expect(explain.samples).toHaveLength(0)
  })
})
