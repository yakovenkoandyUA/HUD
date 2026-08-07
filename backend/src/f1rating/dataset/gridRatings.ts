import { computeDriverRating } from '../engine'
import type { DriverSeasonInput } from '../engine/metrics'
import {
  changingConditionAdaptability, cleanWeekendRate, documentedStrategicExecution,
  driverAttributableReliability, peakRepresentativePace, qualifyingConsistency,
  qualifyingHeadToHead, racecraftProxy, resultRelativeToExpectedPace, startAndOpeningLapExecution,
  teammateAdjustedCleanRacePace, teammateAdjustedQualifyingPace, unforcedErrorControl,
} from '../engine/metrics'
import { cleanRaceLapConsistency } from '../engine/cleanRaceLapConsistency'
import { tyreStintManagement } from '../engine/tyreStintManagement'
import { getCanonicalMetricKeys } from '../engine/metricRegistry'
import { methodologyV1 } from '../config/methodologyV1'
import { loadCollectedRounds, type CollectedRound } from './collectedRound'
import { buildDriverSeasonInputFromRounds, collectAllDriverIds, rosterForRound } from './buildDriverSeasonInput'
import { buildCompositeTeammateInput, type RosterEntry } from './teammateMapping'
import { buildDatasetManifest, type DatasetManifest } from './manifest'
import type { ComponentScore, DriverRating, MethodologyVersion, Round } from '../types'

/**
 * Shared "loop over the whole grid and compute everything the engine produces" step, so
 * `cli/gridCalibrationReport.ts` and `cli/gridDiagnosticReport.ts` never duplicate this logic —
 * one always-in-sync source for "what does computeDriverRating say about every driver in this
 * dataset, and what per-round raw samples fed into it".
 */

// Derived from `methodologyV1.referenceRanges` (the canonical registry — see
// `engine/metricRegistry.ts`), NOT a separately hand-maintained literal array. A hand-maintained
// copy of this list previously omitted `documentedStrategicExecution` from the entire grid-wide/
// calibration/stability pipeline while the core per-driver engine scored it correctly the whole
// time — exactly the class of bug this derivation makes structurally impossible going forward.
export const METRIC_KEYS = getCanonicalMetricKeys(methodologyV1)

export interface EventSample { round: Round; driverId: string; teamId: string; value: number }
export type SampleBank = Record<string, EventSample[]>

function emptyBank(): SampleBank {
  const bank: SampleBank = {}
  for (const key of METRIC_KEYS) bank[key] = []
  return bank
}

function singleRoundInput(full: DriverSeasonInput, round: Round): DriverSeasonInput {
  return {
    driverId: full.driverId,
    qualifying: full.qualifying.filter(q => q.round === round),
    race: full.race.filter(r => r.round === round),
    dnfs: full.dnfs.filter(d => d.round === round),
    incidents: full.incidents.filter(i => i.round === round),
  }
}

function collectEventSamples(
  driverId: string, teamId: string, driver: DriverSeasonInput, teammate: DriverSeasonInput,
  tunables: MethodologyVersion['tunables'], tyreAgeThreshold: number, bank: SampleBank,
): void {
  const push = (key: string, round: Round, v: number | null) => {
    if (v !== null) bank[key].push({ round, driverId, teamId, value: v })
  }
  for (const race of driver.race) {
    const round = race.round
    const dRound = singleRoundInput(driver, round)
    const tRound = singleRoundInput(teammate, round)
    push('teammateAdjustedQualifyingPace', round, teammateAdjustedQualifyingPace(dRound, tRound).rawValue)
    push('teammateAdjustedCleanRacePace', round, teammateAdjustedCleanRacePace(dRound, tRound).rawValue)
    push('peakRepresentativePace', round, peakRepresentativePace(dRound, tRound, tunables).rawValue)
    push('qualifyingConsistency', round, qualifyingConsistency(dRound).rawValue)
    push('cleanWeekendRate', round, cleanWeekendRate().rawValue)
    push('driverAttributableReliability', round, driverAttributableReliability().rawValue)
    push('unforcedErrorControl', round, unforcedErrorControl().rawValue)
    push('resultRelativeToExpectedPace', round, resultRelativeToExpectedPace(dRound).rawValue)
    push('startAndOpeningLapExecution', round, startAndOpeningLapExecution(dRound, tunables).rawValue)
    push('racecraftProxy', round, racecraftProxy(dRound).rawValue)
    push('changingConditionAdaptability', round, changingConditionAdaptability(dRound, tRound).rawValue)
    push('cleanRaceLapConsistency', round, cleanRaceLapConsistency(dRound, tunables).rawValue)
    push('tyreStintManagement', round, tyreStintManagement(dRound, tRound, tunables, tyreAgeThreshold).rawValue)
    // Always NO_DATA in v1 (structural no-signal — see engine/metricRegistry.ts) — pushed anyway
    // so the bank always has a (permanently empty) entry for it, same as the other no-signal keys.
    push('documentedStrategicExecution', round, documentedStrategicExecution().rawValue)
  }
  const qh = qualifyingHeadToHead(driver).rawValue
  if (qh !== null && driver.qualifying[0]) bank.qualifyingHeadToHead.push({ round: driver.qualifying[0].round, driverId, teamId, value: qh })
}

export interface DriverCoverage {
  driverId: string
  team: string
  roundsRaced: number
  speedCoverage: number
  precisionCoverage: number
  raceIqCoverage: number
  warnings: string[]
}

function componentCoverage(component: ComponentScore): { coverage: number; maxEffectiveWeight: number } {
  const available = component.breakdown.filter(b => !b.excluded)
  const coverage = component.breakdown.length > 0 ? available.length / component.breakdown.length : 0
  const maxEffectiveWeight = component.breakdown.reduce((m, b) => Math.max(m, b.effectiveWeight), 0)
  return { coverage, maxEffectiveWeight }
}

export interface GridRatingsResult {
  rounds: CollectedRound[]
  manifest: DatasetManifest
  allDrivers: Map<string, DriverSeasonInput>
  teamOf: Map<string, string>
  ratings: DriverRating[]
  coverageReport: DriverCoverage[]
  bank: SampleBank
  roundsWithoutTeammateByDriver: Record<string, Round[]>
}

export function computeGridRatings(inputDir: string, methodology: MethodologyVersion, totalSeasonRounds: number | null): GridRatingsResult {
  const rounds = loadCollectedRounds(inputDir)
  const manifest = buildDatasetManifest(rounds, inputDir, totalSeasonRounds)

  const allDriverIds = collectAllDriverIds(rounds)
  const allDrivers = new Map<string, DriverSeasonInput>()
  for (const driverId of allDriverIds) {
    allDrivers.set(driverId, buildDriverSeasonInputFromRounds(driverId, rounds, methodology.tunables))
  }

  const rosterByRound = new Map<Round, RosterEntry[]>()
  for (const round of rounds) rosterByRound.set(round.round, rosterForRound(round))

  const teamOf = new Map<string, string>()
  for (const round of rounds) for (const r of round.race) teamOf.set(r.driverId, r.constructorId)

  const bank = emptyBank()
  const ratings: DriverRating[] = []
  const coverageReport: DriverCoverage[] = []
  const roundsWithoutTeammateByDriver: Record<string, Round[]> = {}

  for (const driverId of allDriverIds) {
    const driver = allDrivers.get(driverId)!
    const composite = buildCompositeTeammateInput(driverId, allDrivers, rosterByRound)
    roundsWithoutTeammateByDriver[driverId] = composite.roundsWithoutTeammate

    collectEventSamples(
      driverId, teamOf.get(driverId) ?? 'unknown', driver, composite.driverSeasonInput,
      methodology.tunables, methodology.tyreAgeComparabilityThresholdLaps, bank,
    )

    const lastRound = Math.max(...driver.race.map(r => r.round), 0)
    const rating = computeDriverRating({
      driver, teammate: composite.driverSeasonInput, season: rounds[0].season,
      calculatedAfterRound: lastRound, methodology, manualAdjustments: [],
    })
    ratings.push(rating)

    const speed = componentCoverage(rating.speed)
    const precision = componentCoverage(rating.precision)
    const raceIq = componentCoverage(rating.raceIq)
    const warnings: string[] = []
    if (driver.race.length <= 3) warnings.push(`partial-season driver: only ${driver.race.length} collected round(s)`)
    if (speed.maxEffectiveWeight > 0.6) warnings.push(`Speed: one sub-metric reweighted to ${(speed.maxEffectiveWeight * 100).toFixed(0)}% effective weight`)
    if (precision.maxEffectiveWeight > 0.6) warnings.push(`Precision: one sub-metric reweighted to ${(precision.maxEffectiveWeight * 100).toFixed(0)}% effective weight`)
    if (raceIq.maxEffectiveWeight > 0.6) warnings.push(`RaceIQ: one sub-metric reweighted to ${(raceIq.maxEffectiveWeight * 100).toFixed(0)}% effective weight`)
    if (composite.roundsWithoutTeammate.length > 0) warnings.push(`${composite.roundsWithoutTeammate.length} round(s) with no resolvable teammate: ${composite.roundsWithoutTeammate.join(',')}`)

    coverageReport.push({
      driverId, team: teamOf.get(driverId) ?? 'unknown', roundsRaced: driver.race.length,
      speedCoverage: speed.coverage, precisionCoverage: precision.coverage, raceIqCoverage: raceIq.coverage,
      warnings,
    })
  }

  return { rounds, manifest, allDrivers, teamOf, ratings, coverageReport, bank, roundsWithoutTeammateByDriver }
}
