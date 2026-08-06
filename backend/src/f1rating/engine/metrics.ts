import type {
  DnfRecord, DriverId, IncidentRecord, MethodologyVersion, RawQualifyingMetrics, RawRaceMetrics, StintMetrics,
} from '../types'

type MetricTunables = MethodologyVersion['tunables']
import { filterCleanRaceLaps, filterValidQualifyingLaps, groupByCondition } from './exclusions'
import { average, coefficientOfVariationPct, teammatePercentGap } from './teammateRelative'

/**
 * Everything the engine knows about one driver for one season, keyed by round via array
 * position matching (`qualifying[i]`/`race[i]` need not align 1:1 across drivers — each
 * metric matches by `round` number explicitly, not array index).
 */
export interface DriverSeasonInput {
  driverId: DriverId
  qualifying: RawQualifyingMetrics[]
  race: RawRaceMetrics[]
  dnfs: DnfRecord[]
  incidents: IncidentRecord[]
}

export interface MetricResult {
  rawValue: number | null
  sampleSize: number
}

const NO_DATA: MetricResult = { rawValue: null, sampleSize: 0 }

function representativeQualifyingLapMs(session: RawQualifyingMetrics): number | null {
  const { kept } = filterValidQualifyingLaps(session.laps)
  const dryLaps = kept.filter(l => l.trackCondition === 'dry')
  const pool = dryLaps.length > 0 ? dryLaps : kept
  if (pool.length === 0) return null
  return Math.min(...pool.map(l => l.lapTimeMs))
}

function byRound<T extends { round: number }>(items: T[]): Map<number, T> {
  return new Map(items.map(i => [i.round, i]))
}

// ── Speed ──────────────────────────────────────────────────────────────────

export function teammateAdjustedQualifyingPace(driver: DriverSeasonInput, teammate: DriverSeasonInput): MetricResult {
  const teammateByRound = byRound(teammate.qualifying)
  const gaps: number[] = []
  for (const session of driver.qualifying) {
    const teammateSession = teammateByRound.get(session.round)
    if (!teammateSession) continue
    const driverMs = representativeQualifyingLapMs(session)
    const teammateMs = representativeQualifyingLapMs(teammateSession)
    if (driverMs === null || teammateMs === null) continue
    const gap = teammatePercentGap(driverMs, teammateMs)
    if (gap !== null) gaps.push(gap)
  }
  const value = average(gaps)
  return { rawValue: value, sampleSize: gaps.length }
}

function dryCleanRaceLapTimes(race: RawRaceMetrics): number[] {
  const { kept } = filterCleanRaceLaps(race.laps)
  const byCondition = groupByCondition(kept)
  return byCondition.dry.map(l => l.lapTimeMs)
}

export function teammateAdjustedCleanRacePace(driver: DriverSeasonInput, teammate: DriverSeasonInput): MetricResult {
  const teammateByRound = byRound(teammate.race)
  const gaps: number[] = []
  for (const race of driver.race) {
    const teammateRace = teammateByRound.get(race.round)
    if (!teammateRace) continue
    const driverAvg = average(dryCleanRaceLapTimes(race))
    const teammateAvg = average(dryCleanRaceLapTimes(teammateRace))
    if (driverAvg === null || teammateAvg === null) continue
    const gap = teammatePercentGap(driverAvg, teammateAvg)
    if (gap !== null) gaps.push(gap)
  }
  const value = average(gaps)
  return { rawValue: value, sampleSize: gaps.length }
}

function bestSustainedStintPaceMs(stints: StintMetrics[], minCleanLaps: number): number | null {
  const eligible = stints.filter(s => s.trackCondition === 'dry' && s.cleanLapCount >= minCleanLaps && s.avgCleanLapTimeMs !== null)
  if (eligible.length === 0) return null
  return Math.min(...eligible.map(s => s.avgCleanLapTimeMs as number))
}

/**
 * "Peak representative pace" = the fastest *sustained clean stint average*, never a single
 * fastest lap (fastest-lap-as-race-pace is explicitly disallowed — see data-quality invariants).
 */
export function peakRepresentativePace(
  driver: DriverSeasonInput, teammate: DriverSeasonInput, tunables: MetricTunables,
): MetricResult {
  const teammateByRound = byRound(teammate.race)
  const gaps: number[] = []
  for (const race of driver.race) {
    const teammateRace = teammateByRound.get(race.round)
    if (!teammateRace) continue
    const driverMs = bestSustainedStintPaceMs(race.stints, tunables.minCleanLapsForStintAverage)
    const teammateMs = bestSustainedStintPaceMs(teammateRace.stints, tunables.minCleanLapsForStintAverage)
    if (driverMs === null || teammateMs === null) continue
    const gap = teammatePercentGap(driverMs, teammateMs)
    if (gap !== null) gaps.push(gap)
  }
  const value = average(gaps)
  return { rawValue: value, sampleSize: gaps.length }
}

export function qualifyingHeadToHead(driver: DriverSeasonInput): MetricResult {
  const comparable = driver.qualifying.filter(q => q.headToHead !== 'not_comparable')
  if (comparable.length === 0) return NO_DATA
  const wins = comparable.filter(q => q.headToHead === 'ahead').length
  return { rawValue: (wins / comparable.length) * 100, sampleSize: comparable.length }
}

// ── Precision ──────────────────────────────────────────────────────────────

export function cleanRaceLapConsistency(driver: DriverSeasonInput): MetricResult {
  const perRoundCov: number[] = []
  for (const race of driver.race) {
    const lapTimes = dryCleanRaceLapTimes(race)
    if (lapTimes.length < 2) continue
    const cov = coefficientOfVariationPct(lapTimes)
    if (cov !== null) perRoundCov.push(cov)
  }
  const value = average(perRoundCov)
  return { rawValue: value, sampleSize: perRoundCov.length }
}

export function cleanWeekendRate(driver: DriverSeasonInput): MetricResult {
  if (driver.race.length === 0) return NO_DATA
  const attributableIncidentRounds = new Set(
    driver.incidents.filter(i => i.attributable).map(i => i.round),
  )
  const attributableDnfRounds = new Set(
    driver.dnfs.filter(d => d.driverAttributable).map(d => d.round),
  )
  const cleanRounds = driver.race.filter(
    r => !attributableIncidentRounds.has(r.round) && !attributableDnfRounds.has(r.round),
  ).length
  return { rawValue: (cleanRounds / driver.race.length) * 100, sampleSize: driver.race.length }
}

export function driverAttributableReliability(driver: DriverSeasonInput): MetricResult {
  const totalStarts = driver.race.length
  if (totalStarts === 0) return NO_DATA
  const attributableFailures = driver.dnfs.filter(d => d.driverAttributable).length
  return { rawValue: (1 - attributableFailures / totalStarts) * 100, sampleSize: totalStarts }
}

export function qualifyingConsistency(driver: DriverSeasonInput): MetricResult {
  const perRoundCov: number[] = []
  for (const session of driver.qualifying) {
    const { kept } = filterValidQualifyingLaps(session.laps)
    if (kept.length < 2) continue
    const cov = coefficientOfVariationPct(kept.map(l => l.lapTimeMs))
    if (cov !== null) perRoundCov.push(cov)
  }
  const value = average(perRoundCov)
  return { rawValue: value, sampleSize: perRoundCov.length }
}

export function unforcedErrorControl(driver: DriverSeasonInput): MetricResult {
  if (driver.race.length === 0) return NO_DATA
  const errorCount = driver.incidents.filter(i => i.attributable && i.type === 'unforced_error').length
  return { rawValue: errorCount / driver.race.length, sampleSize: driver.race.length }
}

// ── Race IQ ─────────────────────────────────────────────────────────────────

export function resultRelativeToExpectedPace(driver: DriverSeasonInput): MetricResult {
  const deltas: number[] = []
  for (const race of driver.race) {
    if (!race.classified || race.finishPosition === null || race.expectedFinishPosition === null) continue
    deltas.push(race.expectedFinishPosition - race.finishPosition)
  }
  const value = average(deltas)
  return { rawValue: value, sampleSize: deltas.length }
}

export function tyreStintManagement(driver: DriverSeasonInput, tunables: MetricTunables): MetricResult {
  const slopes: number[] = []
  for (const race of driver.race) {
    for (const stint of race.stints) {
      if (stint.trackCondition !== 'dry') continue
      if (stint.cleanLapCount < tunables.minCleanLapsForDegradationSlope) continue
      if (stint.degradationMsPerLap === null) continue
      slopes.push(stint.degradationMsPerLap)
    }
  }
  const value = average(slopes)
  return { rawValue: value, sampleSize: slopes.length }
}

export function startAndOpeningLapExecution(driver: DriverSeasonInput, tunables: MetricTunables): MetricResult {
  const values: number[] = []
  for (const race of driver.race) {
    const penalty = race.start.attributableContactOnLap1 ? tunables.attributableLap1ContactPenaltyPositions : 0
    values.push(race.start.positionsGainedLost - penalty)
  }
  const value = average(values)
  return { rawValue: value, sampleSize: values.length }
}

/**
 * v1 racecraft proxy: net position change during green-flag racing, excluding lap 1 (covered
 * by `startAndOpeningLapExecution`) and pit-stop laps. See reference-range doc comment in
 * `config/methodologyV1.ts` for the acknowledged limitation of this proxy.
 */
export function racecraftProxy(driver: DriverSeasonInput): MetricResult {
  const values: number[] = []
  for (const race of driver.race) {
    const greenLaps = race.laps.filter(
      l => l.lapNumber > 1 && !l.isPitLap && !l.isInLap && !l.isOutLap &&
        l.trackStatus === 'green' && l.position !== null,
    )
    if (greenLaps.length < 2) continue
    const first = greenLaps[0].position as number
    const last = greenLaps[greenLaps.length - 1].position as number
    values.push(first - last)
  }
  const value = average(values)
  return { rawValue: value, sampleSize: values.length }
}

export function changingConditionAdaptability(driver: DriverSeasonInput, teammate: DriverSeasonInput): MetricResult {
  const teammateByRound = byRound(teammate.race)
  const gaps: number[] = []
  for (const race of driver.race) {
    const teammateRace = teammateByRound.get(race.round)
    if (!teammateRace) continue
    const { kept: driverClean } = filterCleanRaceLaps(race.laps)
    const { kept: teammateClean } = filterCleanRaceLaps(teammateRace.laps)
    const driverWet = groupByCondition(driverClean)
    const teammateWet = groupByCondition(teammateClean)
    const driverLaps = [...driverWet.wet, ...driverWet.mixed].map(l => l.lapTimeMs)
    const teammateLaps = [...teammateWet.wet, ...teammateWet.mixed].map(l => l.lapTimeMs)
    const driverAvg = average(driverLaps)
    const teammateAvg = average(teammateLaps)
    if (driverAvg === null || teammateAvg === null) continue
    const gap = teammatePercentGap(driverAvg, teammateAvg)
    if (gap !== null) gaps.push(gap)
  }
  const value = average(gaps)
  return { rawValue: value, sampleSize: gaps.length }
}

/**
 * v1 has no objective telemetry proxy for strategic execution quality — always reports missing
 * data so the weight is reweighted away, unless a manual review adjustment (category
 * "strategic_intervention") is later applied at the component level in `aggregate.ts`.
 */
export function documentedStrategicExecution(): MetricResult {
  return NO_DATA
}
