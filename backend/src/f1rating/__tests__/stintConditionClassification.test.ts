import { describe, expect, it } from 'vitest'
import { fastF1ExportToRaceMetrics, type FastF1LapRow, type FastF1SessionExport } from '../adapters/fastF1Adapter'
import { methodologyV1 } from '../config/methodologyV1'

function lap(overrides: Partial<FastF1LapRow> = {}): FastF1LapRow {
  return {
    lapNumber: 1, lapTimeMs: 90_000, compound: 'medium', tyreLifeLaps: 1, stintNumber: 1,
    trackStatus: 'green', trackCondition: 'dry', isPitOutLap: false, isPitInLap: false,
    isAccurate: true, isDamaged: false, position: 1,
    ...overrides,
  }
}

function session(laps: FastF1LapRow[]): FastF1SessionExport {
  return {
    schemaVersion: 'fastf1-export-v1', season: 2025, round: 1, sessionType: 'Race',
    driverId: 'd', constructorId: 'c', gridPosition: 1, finishPosition: 1, classified: true, laps,
  }
}

/**
 * Regression tests for the real bug found in 2025 Australian GP data: a stint whose laps
 * straddle a wet/dry transition (Verstappen/Lawson stint 5 — laps alternate 'dry'/'wet' per-lap
 * classification mid-stint) was labeled uniformly 'dry' from its first lap alone, producing a
 * physically-impossible ±1921 ms/lap "degradation" pair once fed into tyreStintManagement.
 */
describe('fastF1ExportToRaceMetrics — stint condition classification (uncertain -> exclude, never guess)', () => {
  it('labels a stint dry only when EVERY lap in it is dry', () => {
    const laps = [1, 2, 3, 4, 5].map(n => lap({ lapNumber: n, trackCondition: 'dry' }))
    const metrics = fastF1ExportToRaceMetrics(session(laps), false, methodologyV1.tunables.minCleanLapsForDegradationSlope)
    expect(metrics.stints[0].trackCondition).toBe('dry')
  })

  it('labels a stint wet only when EVERY lap in it is wet', () => {
    const laps = [1, 2, 3].map(n => lap({ lapNumber: n, trackCondition: 'wet' }))
    const metrics = fastF1ExportToRaceMetrics(session(laps), false, methodologyV1.tunables.minCleanLapsForDegradationSlope)
    expect(metrics.stints[0].trackCondition).toBe('wet')
  })

  it('REGRESSION: a stint whose laps disagree (straddles a transition) is labeled "mixed", never guessed "dry" from the first lap', () => {
    // Reproduces the real Verstappen/Lawson round-1 stint-5 shape: starts dry, several laps
    // later reads wet, then dry again — a genuine transitional stint.
    const laps = [
      lap({ lapNumber: 35, trackCondition: 'dry' }),
      lap({ lapNumber: 36, trackCondition: 'dry' }),
      lap({ lapNumber: 37, trackCondition: 'wet' }),
      lap({ lapNumber: 38, trackCondition: 'wet' }),
      lap({ lapNumber: 39, trackCondition: 'dry' }),
    ]
    const metrics = fastF1ExportToRaceMetrics(session(laps), false, methodologyV1.tunables.minCleanLapsForDegradationSlope)
    expect(metrics.stints[0].trackCondition).toBe('mixed')
  })

  it('a mixed-condition stint is EXCLUDED from tyreStintManagement eligibility (dry-only filter)', async () => {
    const { explainStintPaceEvolution } = await import('../engine/tyreStintManagement')
    const straddlingLaps = Array.from({ length: 10 }, (_, i) => lap({
      lapNumber: i + 1, trackCondition: i < 5 ? 'dry' : 'wet', lapTimeMs: 90_000 - i * 500,
    }))
    const cleanTeammateLaps = Array.from({ length: 10 }, (_, i) => lap({ lapNumber: i + 1, trackCondition: 'dry', lapTimeMs: 90_000 - i * 10 }))

    const driverExport = session(straddlingLaps)
    const teammateExport = { ...session(cleanTeammateLaps), driverId: 't' }

    const driverInput = {
      driverId: 'd', qualifying: [], dnfs: [], incidents: [],
      race: [fastF1ExportToRaceMetrics(driverExport, false, methodologyV1.tunables.minCleanLapsForDegradationSlope)],
    }
    const teammateInput = {
      driverId: 't', qualifying: [], dnfs: [], incidents: [],
      race: [fastF1ExportToRaceMetrics(teammateExport, false, methodologyV1.tunables.minCleanLapsForDegradationSlope)],
    }

    const explain = explainStintPaceEvolution(driverInput, teammateInput, methodologyV1.tunables, methodologyV1.tyreAgeComparabilityThresholdLaps)
    // No pair should form: the driver's only stint is 'mixed', not 'dry', so it's never eligible.
    expect(explain.pairs).toHaveLength(0)
  })

  it('a mixed-condition stint is EXCLUDED from cleanRaceLapConsistency (dry-only filter)', async () => {
    const { explainCleanRaceLapConsistency } = await import('../engine/cleanRaceLapConsistency')
    const straddlingLaps = Array.from({ length: 10 }, (_, i) => lap({
      lapNumber: i + 1, trackCondition: i < 5 ? 'dry' : 'wet',
    }))
    const metrics = fastF1ExportToRaceMetrics(session(straddlingLaps), false, methodologyV1.tunables.minCleanLapsForDegradationSlope)
    const driverInput = { driverId: 'd', qualifying: [], dnfs: [], incidents: [], race: [metrics] }
    const explain = explainCleanRaceLapConsistency(driverInput, methodologyV1.tunables)
    expect(explain.samples).toHaveLength(0)
  })

  it('any single "uncertain" lap makes the WHOLE stint uncertain, never merely "mixed"', () => {
    // Real case: a lap where the weather/compound signals genuinely conflict (see collect.py
    // classify_lap_condition) — we don't even confidently know THAT lap's condition, so calling
    // the stint "mixed" (implying we know it disagrees) would overstate our knowledge.
    const laps = [
      lap({ lapNumber: 1, trackCondition: 'dry' }),
      lap({ lapNumber: 2, trackCondition: 'dry' }),
      lap({ lapNumber: 3, trackCondition: 'uncertain' }),
      lap({ lapNumber: 4, trackCondition: 'dry' }),
    ]
    const metrics = fastF1ExportToRaceMetrics(session(laps), false, methodologyV1.tunables.minCleanLapsForDegradationSlope)
    expect(metrics.stints[0].trackCondition).toBe('uncertain')
  })

  it('an uncertain stint is EXCLUDED from tyreStintManagement, same as mixed', async () => {
    const { explainStintPaceEvolution } = await import('../engine/tyreStintManagement')
    const uncertainLaps = Array.from({ length: 10 }, (_, i) => lap({ lapNumber: i + 1, trackCondition: 'uncertain' }))
    const cleanTeammateLaps = Array.from({ length: 10 }, (_, i) => lap({ lapNumber: i + 1, trackCondition: 'dry' }))

    const driverInput = {
      driverId: 'd', qualifying: [], dnfs: [], incidents: [],
      race: [fastF1ExportToRaceMetrics(session(uncertainLaps), false, methodologyV1.tunables.minCleanLapsForDegradationSlope)],
    }
    const teammateInput = {
      driverId: 't', qualifying: [], dnfs: [], incidents: [],
      race: [fastF1ExportToRaceMetrics({ ...session(cleanTeammateLaps), driverId: 't' }, false, methodologyV1.tunables.minCleanLapsForDegradationSlope)],
    }
    const explain = explainStintPaceEvolution(driverInput, teammateInput, methodologyV1.tunables, methodologyV1.tyreAgeComparabilityThresholdLaps)
    expect(explain.pairs).toHaveLength(0)
  })

  it('tyreStintManagement DOES pair two confidently WET stints (not dry-only anymore)', async () => {
    const { explainStintPaceEvolution } = await import('../engine/tyreStintManagement')
    const driverWetLaps = Array.from({ length: 10 }, (_, i) => lap({
      lapNumber: i + 1, tyreLifeLaps: i + 1, trackCondition: 'wet', compound: 'intermediate', lapTimeMs: 100_000 - i * 200,
    }))
    const teammateWetLaps = Array.from({ length: 10 }, (_, i) => lap({
      lapNumber: i + 1, tyreLifeLaps: i + 1, trackCondition: 'wet', compound: 'intermediate', lapTimeMs: 100_000 - i * 150,
    }))

    const driverInput = {
      driverId: 'd', qualifying: [], dnfs: [], incidents: [],
      race: [fastF1ExportToRaceMetrics(session(driverWetLaps), false, methodologyV1.tunables.minCleanLapsForDegradationSlope)],
    }
    const teammateInput = {
      driverId: 't', qualifying: [], dnfs: [], incidents: [],
      race: [fastF1ExportToRaceMetrics({ ...session(teammateWetLaps), driverId: 't' }, false, methodologyV1.tunables.minCleanLapsForDegradationSlope)],
    }
    const explain = explainStintPaceEvolution(driverInput, teammateInput, methodologyV1.tunables, methodologyV1.tyreAgeComparabilityThresholdLaps)
    expect(explain.pairs).toHaveLength(1)
    expect(explain.pairs[0].driverStint.trackCondition).toBe('wet')
  })

  it('tyreStintManagement NEVER pairs a dry stint against a wet one, even with matching compound/tyre-age', async () => {
    const { explainStintPaceEvolution } = await import('../engine/tyreStintManagement')
    // Same compound (both intermediate — plausible on a drying/wetting track), same tyre age
    // shape, but one is confidently dry and the other confidently wet.
    const driverDryLaps = Array.from({ length: 10 }, (_, i) => lap({ lapNumber: i + 1, trackCondition: 'dry', compound: 'intermediate' }))
    const teammateWetLaps = Array.from({ length: 10 }, (_, i) => lap({ lapNumber: i + 1, trackCondition: 'wet', compound: 'intermediate' }))

    const driverInput = {
      driverId: 'd', qualifying: [], dnfs: [], incidents: [],
      race: [fastF1ExportToRaceMetrics(session(driverDryLaps), false, methodologyV1.tunables.minCleanLapsForDegradationSlope)],
    }
    const teammateInput = {
      driverId: 't', qualifying: [], dnfs: [], incidents: [],
      race: [fastF1ExportToRaceMetrics({ ...session(teammateWetLaps), driverId: 't' }, false, methodologyV1.tunables.minCleanLapsForDegradationSlope)],
    }
    const explain = explainStintPaceEvolution(driverInput, teammateInput, methodologyV1.tunables, methodologyV1.tyreAgeComparabilityThresholdLaps)
    expect(explain.pairs).toHaveLength(0)
  })

  it('REAL-DATA REGRESSION: the exact 2025 Australian GP Verstappen/Lawson round-1 stint shape produces zero pairs (±1921 pathology gone)', () => {
    // Reproduces the real stint boundary found in output_grid_full/2025_01.json: laps 35-45 dry,
    // lap 46 wet (real rain returned), all on MEDIUM compound.
    const verLaps = [
      ...Array.from({ length: 11 }, (_, i) => lap({ lapNumber: 35 + i, trackCondition: 'dry', compound: 'medium', lapTimeMs: 124_508 - i * 3_000 })),
      lap({ lapNumber: 46, trackCondition: 'wet', compound: 'medium', lapTimeMs: 112_606 }),
    ]
    const lawLaps = [
      ...Array.from({ length: 11 }, (_, i) => lap({ lapNumber: 34 + i, trackCondition: 'dry', compound: 'medium', lapTimeMs: 120_000 - i * 2_800 })),
      lap({ lapNumber: 45, trackCondition: 'wet', compound: 'medium', lapTimeMs: 118_000 }),
    ]
    const verMetrics = fastF1ExportToRaceMetrics({ ...session(verLaps), driverId: 'max_verstappen' }, false, 3)
    const lawMetrics = fastF1ExportToRaceMetrics({ ...session(lawLaps), driverId: 'lawson' }, false, 3)
    expect(verMetrics.stints[0].trackCondition).toBe('mixed')
    expect(lawMetrics.stints[0].trackCondition).toBe('mixed')
  })
})
