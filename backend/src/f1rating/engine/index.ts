import type { DriverRating, ManualReviewAdjustment, MethodologyVersion, Round, Season } from '../types'
import { aggregateComponent } from './aggregate'
import type { DriverSeasonInput } from './metrics'
import {
  cleanWeekendRate, changingConditionAdaptability,
  documentedStrategicExecution, driverAttributableReliability, peakRepresentativePace,
  qualifyingConsistency, qualifyingHeadToHead, racecraftProxy, resultRelativeToExpectedPace,
  startAndOpeningLapExecution, teammateAdjustedCleanRacePace, teammateAdjustedQualifyingPace,
  unforcedErrorControl,
} from './metrics'
import { cleanRaceLapConsistency } from './cleanRaceLapConsistency'
import { tyreStintManagement } from './tyreStintManagement'

export type { DriverSeasonInput, MetricResult } from './metrics'

export interface ComputeDriverRatingInput {
  driver: DriverSeasonInput
  teammate: DriverSeasonInput
  season: Season
  calculatedAfterRound: Round
  methodology: MethodologyVersion
  manualAdjustments: ManualReviewAdjustment[]
}

/**
 * Computes a full `DriverRating` for one driver, relative to their teammate, up to and
 * including `calculatedAfterRound`. Pure and deterministic given the same inputs — no network
 * calls, no randomness, no mutable global state (`config/methodologyV1.ts` is a frozen-in-effect
 * data structure, not something this function reads and writes).
 */
export function computeDriverRating(input: ComputeDriverRatingInput): DriverRating {
  const { driver, teammate, season, calculatedAfterRound, methodology, manualAdjustments } = input

  const relevantAdjustments = manualAdjustments.filter(
    a => a.driverId === driver.driverId && a.season === season && a.round <= calculatedAfterRound,
  )

  const speed = aggregateComponent({
    component: 'speed',
    metricResults: {
      teammateAdjustedQualifyingPace: teammateAdjustedQualifyingPace(driver, teammate),
      teammateAdjustedCleanRacePace: teammateAdjustedCleanRacePace(driver, teammate),
      peakRepresentativePace: peakRepresentativePace(driver, teammate, methodology.tunables),
      qualifyingHeadToHead: qualifyingHeadToHead(driver),
    },
    weights: methodology.speedWeights,
    referenceRanges: methodology.referenceRanges,
    minSampleSize: methodology.minSampleSize,
    manualAdjustments: relevantAdjustments,
    finalScale: methodology.finalScale,
    tunables: methodology.tunables,
  })

  const precision = aggregateComponent({
    component: 'precision',
    metricResults: {
      cleanRaceLapConsistency: cleanRaceLapConsistency(driver, methodology.tunables),
      cleanWeekendRate: cleanWeekendRate(driver),
      driverAttributableReliability: driverAttributableReliability(driver),
      qualifyingConsistency: qualifyingConsistency(driver),
      unforcedErrorControl: unforcedErrorControl(driver),
    },
    weights: methodology.precisionWeights,
    referenceRanges: methodology.referenceRanges,
    minSampleSize: methodology.minSampleSize,
    manualAdjustments: relevantAdjustments,
    finalScale: methodology.finalScale,
    tunables: methodology.tunables,
  })

  const raceIq = aggregateComponent({
    component: 'raceIq',
    metricResults: {
      resultRelativeToExpectedPace: resultRelativeToExpectedPace(driver),
      tyreStintManagement: tyreStintManagement(driver, teammate, methodology.tunables, methodology.tyreAgeComparabilityThresholdLaps),
      startAndOpeningLapExecution: startAndOpeningLapExecution(driver, methodology.tunables),
      racecraftProxy: racecraftProxy(driver),
      changingConditionAdaptability: changingConditionAdaptability(driver, teammate),
      documentedStrategicExecution: documentedStrategicExecution(),
    },
    weights: methodology.raceIqWeights,
    referenceRanges: methodology.referenceRanges,
    minSampleSize: methodology.minSampleSize,
    manualAdjustments: relevantAdjustments,
    finalScale: methodology.finalScale,
    tunables: methodology.tunables,
  })

  const warnings = [...speed.warnings, ...precision.warnings, ...raceIq.warnings]
  const insufficientData = speed.score === null || precision.score === null || raceIq.score === null

  return {
    driverId: driver.driverId,
    season,
    calculatedAfterRound,
    methodologyVersion: methodology.id,
    generatedAt: new Date().toISOString(),
    speed,
    precision,
    raceIq,
    warnings,
    insufficientData,
  }
}
