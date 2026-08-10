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
import { seasonRoundKey } from '../engine/seasonRoundKey'
import { methodologyV1 } from '../config/methodologyV1'
import { loadCollectedRounds, type CollectedRound } from './collectedRound'
import { buildDriverSeasonInputFromRounds, collectAllDriverIds, rosterForRound } from './buildDriverSeasonInput'
import { buildCompositeTeammateInput, type RosterEntry } from './teammateMapping'
import { buildDatasetManifest, type DatasetManifest } from './manifest'
import type { ComponentScore, DriverRating, MethodologyVersion, Round, Season } from '../types'

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

// `season` is carried on every sample (not just `round`) so downstream multi-season tooling
// (pooling, season-normalization — see dataset/multiSeasonPool.ts) can group/label samples
// correctly; a bare `round` is not a unique event identifier across seasons.
export interface EventSample { season: Season; round: Round; driverId: string; teamId: string; value: number }
export type SampleBank = Record<string, EventSample[]>

function emptyBank(): SampleBank {
  const bank: SampleBank = {}
  for (const key of METRIC_KEYS) bank[key] = []
  return bank
}

function singleRoundInput(full: DriverSeasonInput, season: Season, round: Round): DriverSeasonInput {
  return {
    driverId: full.driverId,
    qualifying: full.qualifying.filter(q => q.season === season && q.round === round),
    race: full.race.filter(r => r.season === season && r.round === round),
    dnfs: full.dnfs.filter(d => d.season === season && d.round === round),
    incidents: full.incidents.filter(i => i.season === season && i.round === round),
  }
}

function collectEventSamples(
  driverId: string, teamId: string, driver: DriverSeasonInput, teammate: DriverSeasonInput,
  tunables: MethodologyVersion['tunables'], tyreAgeThreshold: number, bank: SampleBank,
): void {
  const push = (key: string, season: Season, round: Round, v: number | null) => {
    if (v !== null) bank[key].push({ season, round, driverId, teamId, value: v })
  }
  for (const race of driver.race) {
    const { season, round } = race
    const dRound = singleRoundInput(driver, season, round)
    const tRound = singleRoundInput(teammate, season, round)
    push('teammateAdjustedQualifyingPace', season, round, teammateAdjustedQualifyingPace(dRound, tRound).rawValue)
    push('teammateAdjustedCleanRacePace', season, round, teammateAdjustedCleanRacePace(dRound, tRound).rawValue)
    push('peakRepresentativePace', season, round, peakRepresentativePace(dRound, tRound, tunables).rawValue)
    push('qualifyingConsistency', season, round, qualifyingConsistency(dRound).rawValue)
    push('cleanWeekendRate', season, round, cleanWeekendRate().rawValue)
    push('driverAttributableReliability', season, round, driverAttributableReliability().rawValue)
    push('unforcedErrorControl', season, round, unforcedErrorControl().rawValue)
    push('resultRelativeToExpectedPace', season, round, resultRelativeToExpectedPace(dRound).rawValue)
    push('startAndOpeningLapExecution', season, round, startAndOpeningLapExecution(dRound, tunables).rawValue)
    push('racecraftProxy', season, round, racecraftProxy(dRound).rawValue)
    push('changingConditionAdaptability', season, round, changingConditionAdaptability(dRound, tRound).rawValue)
    push('cleanRaceLapConsistency', season, round, cleanRaceLapConsistency(dRound, tunables).rawValue)
    push('tyreStintManagement', season, round, tyreStintManagement(dRound, tRound, tunables, tyreAgeThreshold).rawValue)
    // Always NO_DATA in v1 (structural no-signal — see engine/metricRegistry.ts) — pushed anyway
    // so the bank always has a (permanently empty) entry for it, same as the other no-signal keys.
    push('documentedStrategicExecution', season, round, documentedStrategicExecution().rawValue)
  }
  const qh = qualifyingHeadToHead(driver).rawValue
  if (qh !== null && driver.qualifying[0]) {
    bank.qualifyingHeadToHead.push({
      season: driver.qualifying[0].season, round: driver.qualifying[0].round, driverId, teamId, value: qh,
    })
  }
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
  roundsWithoutTeammateByDriver: Record<string, { season: Season; round: Round }[]>
}

export function computeGridRatings(inputDir: string, methodology: MethodologyVersion, totalSeasonRounds: number | null): GridRatingsResult {
  const rounds = loadCollectedRounds(inputDir)
  const manifest = buildDatasetManifest(rounds, inputDir, totalSeasonRounds)

  const allDriverIds = collectAllDriverIds(rounds)
  const allDrivers = new Map<string, DriverSeasonInput>()
  for (const driverId of allDriverIds) {
    allDrivers.set(driverId, buildDriverSeasonInputFromRounds(driverId, rounds, methodology.tunables))
  }

  // Keyed by (season, round) composite — a bare round number collides across seasons.
  const rosterByRound = new Map<string, RosterEntry[]>()
  for (const round of rounds) rosterByRound.set(seasonRoundKey(round.season, round.round), rosterForRound(round))

  const teamOf = new Map<string, string>()
  for (const round of rounds) for (const r of round.race) teamOf.set(r.driverId, r.constructorId)

  const bank = emptyBank()
  const ratings: DriverRating[] = []
  const coverageReport: DriverCoverage[] = []
  const roundsWithoutTeammateByDriver: Record<string, { season: Season; round: Round }[]> = {}

  for (const driverId of allDriverIds) {
    const driver = allDrivers.get(driverId)!
    const composite = buildCompositeTeammateInput(driverId, allDrivers, rosterByRound)
    roundsWithoutTeammateByDriver[driverId] = composite.roundsWithoutTeammate

    collectEventSamples(
      driverId, teamOf.get(driverId) ?? 'unknown', driver, composite.driverSeasonInput,
      methodology.tunables, methodology.tyreAgeComparabilityThresholdLaps, bank,
    )

    // `computeGridRatings` is only ever called with a SINGLE season's rounds (one directory =
    // one season, enforced by `rounds[0].season` below) — safe to take a bare round max here.
    // Multi-season analysis (pooling/season-normalization) runs `computeGridRatings` once PER
    // season and combines the resulting SampleBanks afterward (see dataset/multiSeasonPool.ts),
    // never by feeding multiple seasons' rounds into one call.
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
    if (composite.roundsWithoutTeammate.length > 0) {
      const list = composite.roundsWithoutTeammate.map(r => `${r.season}-${r.round}`).join(',')
      warnings.push(`${composite.roundsWithoutTeammate.length} round(s) with no resolvable teammate: ${list}`)
    }

    coverageReport.push({
      driverId, team: teamOf.get(driverId) ?? 'unknown', roundsRaced: driver.race.length,
      speedCoverage: speed.coverage, precisionCoverage: precision.coverage, raceIqCoverage: raceIq.coverage,
      warnings,
    })
  }

  return { rounds, manifest, allDrivers, teamOf, ratings, coverageReport, bank, roundsWithoutTeammateByDriver }
}
