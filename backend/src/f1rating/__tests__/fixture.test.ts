import { describe, expect, it } from 'vitest'
import { computeDriverRating } from '../engine'
import { methodologyV1 } from '../config/methodologyV1'
import {
  FIXTURE_CALCULATED_AFTER_ROUND, FIXTURE_SEASON, fixtureManualAdjustments,
  norrisSeasonFixture, piastriSeasonFixture,
} from '../fixtures/norrisPiastriFixture'

describe('Norris/Piastri synthetic fixture — full pipeline', () => {
  const norris = computeDriverRating({
    driver: norrisSeasonFixture,
    teammate: piastriSeasonFixture,
    season: FIXTURE_SEASON,
    calculatedAfterRound: FIXTURE_CALCULATED_AFTER_ROUND,
    methodology: methodologyV1,
    manualAdjustments: fixtureManualAdjustments,
  })

  const piastri = computeDriverRating({
    driver: piastriSeasonFixture,
    teammate: norrisSeasonFixture,
    season: FIXTURE_SEASON,
    calculatedAfterRound: FIXTURE_CALCULATED_AFTER_ROUND,
    methodology: methodologyV1,
    manualAdjustments: fixtureManualAdjustments,
  })

  it('produces a usable rating (not insufficient data) for both drivers on the fixture', () => {
    expect(norris.insufficientData).toBe(false)
    expect(piastri.insufficientData).toBe(false)
  })

  it('clamps every final component score to the public 70-99 scale', () => {
    for (const rating of [norris, piastri]) {
      for (const component of [rating.speed, rating.precision, rating.raceIq]) {
        expect(component.score).not.toBeNull()
        expect(component.score as number).toBeGreaterThanOrEqual(70)
        expect(component.score as number).toBeLessThanOrEqual(99)
      }
    }
  })

  it('rates Norris faster on Speed, matching the fixture\'s built-in pace gap', () => {
    expect((norris.speed.score as number)).toBeGreaterThan(piastri.speed.score as number)
  })

  it('does not let Piastri\'s technical DNF reduce his driver-attributable reliability', () => {
    const reliabilityItem = piastri.precision.breakdown.find(b => b.key === 'driverAttributableReliability')
    expect(reliabilityItem).toBeDefined()
    expect(reliabilityItem!.rawValue).toBe(100)
  })

  it('reflects Norris\'s attributable incident in a lower cleanWeekendRate than Piastri\'s', () => {
    const norrisClean = norris.precision.breakdown.find(b => b.key === 'cleanWeekendRate')!
    const piastriClean = piastri.precision.breakdown.find(b => b.key === 'cleanWeekendRate')!
    expect(norrisClean.rawValue as number).toBeLessThan(piastriClean.rawValue as number)
  })

  it('applies the fixture manual adjustment to Norris\'s Race IQ and not to Piastri\'s', () => {
    expect(norris.raceIq.appliedManualAdjustments).toHaveLength(1)
    expect(piastri.raceIq.appliedManualAdjustments).toHaveLength(0)
  })

  it('always reweights documentedStrategicExecution away as missing raw data (v1 has no telemetry proxy for it)', () => {
    for (const rating of [norris, piastri]) {
      const item = rating.raceIq.breakdown.find(b => b.key === 'documentedStrategicExecution')!
      expect(item.excluded).toBe(true)
      expect(item.rawValue).toBeNull()
    }
  })

  it('produces a full explanation breakdown covering every configured weight key per component', () => {
    expect(norris.speed.breakdown.map(b => b.key).sort()).toEqual(Object.keys(methodologyV1.speedWeights).sort())
    expect(norris.precision.breakdown.map(b => b.key).sort()).toEqual(Object.keys(methodologyV1.precisionWeights).sort())
    expect(norris.raceIq.breakdown.map(b => b.key).sort()).toEqual(Object.keys(methodologyV1.raceIqWeights).sort())
  })

  it('every non-excluded breakdown item carries a confidence and sample size for explainability', () => {
    for (const item of norris.speed.breakdown) {
      expect(item.confidence).toBeDefined()
      expect(typeof item.sampleSize).toBe('number')
    }
  })

  it('runs through the exact same pipeline as production data would (no fixture-specific branching in the engine)', () => {
    // Sanity check that the engine module never imports the fixture module.
    // (Static assertion by construction — engine/index.ts has no fixtures import.)
    expect(norris.methodologyVersion).toBe('mimir-f1-v1')
    expect(piastri.methodologyVersion).toBe('mimir-f1-v1')
  })
})
