/**
 * Calibration report — runs REAL 2025 McLaren (Norris/Piastri) data collected by
 * `scripts/f1rating-collector/collect.py` through the exact same engine/adapters production
 * data will use, and compares observed raw metric values against the configured reference
 * ranges in `config/methodologyV1.ts`.
 *
 * Run with: `npm run f1rating:calibrate` (backend/). Finite process: reads JSON, computes,
 * prints a report, writes `scripts/f1rating-collector/output/calibration-report.json`, exits.
 *
 * ⚠️ This report NEVER mutates `config/methodologyV1.ts` and NEVER flips `productionReady` or
 * `calibrationStatus` — those remain human decisions. "Candidate" ranges below are proposals
 * for a human to review, not applied values. `pipelineValidated` (did the real-data pipeline run
 * end-to-end without error) is tracked SEPARATELY from calibration/production readiness —
 * a pipeline can work correctly on a sample far too small to calibrate anything from.
 *
 * KNOWN LIMITATIONS OF THIS PASS (read before trusting the numbers)
 * --------------------------------------------------------------------
 * - No incident/DNF-cause data source is connected — `incidents` is always empty and DNF
 *   `cause` is derived only from the Ergast/FastF1 `status` string via `classifyJolpicaStatus`,
 *   which cannot distinguish `contact_at_fault` from `contact_not_at_fault` (that requires human
 *   review per the engine's own invariants) — accidents are conservatively left `unknown`
 *   (non-attributable) rather than guessed. `cleanWeekendRate`/`unforcedErrorControl` are NOT
 *   meaningfully calibrated by this pass.
 * - `expectedFinishPosition` has no real data source yet — `resultRelativeToExpectedPace` is
 *   always missing in this pass, by design, not a bug.
 * - Only 2 drivers (teammates, same team) × 5 rounds. This report tells you whether reference
 *   ranges are IN THE RIGHT BALLPARK and whether the metric FORMULAS behave sanely on real data
 *   — it does NOT statistically fit anything. See `gridCalibrationReady`/`reasonsNotReady` below.
 */
import * as fs from 'fs'
import * as path from 'path'
import { methodologyV1 } from '../config/methodologyV1'
import { computeDriverRating } from '../engine'
import type { DriverSeasonInput } from '../engine/metrics'
import {
  changingConditionAdaptability, peakRepresentativePace,
  qualifyingConsistency, qualifyingHeadToHead, racecraftProxy, startAndOpeningLapExecution,
  teammateAdjustedCleanRacePace, teammateAdjustedQualifyingPace,
} from '../engine/metrics'
import { explainCleanRaceLapConsistency, type StintConsistencySample } from '../engine/cleanRaceLapConsistency'
import { explainStintPaceEvolution, type ComparableStintPairDelta } from '../engine/tyreStintManagement'
import { jolpicaQualifyingToRawMetrics, classifyJolpicaStatus, type JolpicaQualifyingResult } from '../adapters/jolpicaAdapter'
import { fastF1ExportToRaceMetrics, type FastF1SessionExport } from '../adapters/fastF1Adapter'
import { buildDnfRecord } from '../adapters/manualIncidentAdapter'
import { buildCandidateRange, type CandidateRangeEntry } from '../engine/calibrationCandidates'
import type { DnfRecord } from '../types'

interface CollectedRound {
  schemaVersion: string
  season: number
  round: number
  qualifying: JolpicaQualifyingResult[]
  race: (FastF1SessionExport & { status: string })[]
}

const OUTPUT_DIR = path.resolve(__dirname, '../../../../scripts/f1rating-collector/output')

function loadRounds(): CollectedRound[] {
  if (!fs.existsSync(OUTPUT_DIR)) {
    console.error(`No collected data found at ${OUTPUT_DIR}. Run collect.py first.`)
    process.exit(1)
  }
  const files = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.json') && !f.startsWith('calibration-report'))
  return files
    .map(f => JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, f), 'utf-8')) as CollectedRound)
    .sort((a, b) => a.round - b.round)
}

function buildDriverSeasonInput(driverId: string, rounds: CollectedRound[]): DriverSeasonInput {
  const qualifying = []
  const race = []
  const dnfs: DnfRecord[] = []

  for (const round of rounds) {
    const qDriver = round.qualifying.find(q => q.driverId === driverId)
    const qTeammate = round.qualifying.find(q => q.driverId !== driverId) ?? null
    if (qDriver) qualifying.push(jolpicaQualifyingToRawMetrics(qDriver, qTeammate, round.season, round.round))

    const rDriver = round.race.find(r => r.driverId === driverId)
    if (rDriver) {
      race.push(fastF1ExportToRaceMetrics(rDriver, false, methodologyV1.tunables.minCleanLapsForDegradationSlope))
      const cause = classifyJolpicaStatus(rDriver.status)
      if (cause !== 'finished') {
        dnfs.push(buildDnfRecord({
          id: `${round.season}-r${round.round}-${driverId}`,
          season: round.season, round: round.round, driverId,
          cause: cause === 'technical' ? 'technical' : 'unknown',
          lapNumber: null,
          notes: `auto-classified from status="${rDriver.status}" — fault not determined (needs manual review)`,
        }))
      }
    }
  }

  return { driverId, qualifying, race, dnfs, incidents: [] }
}

interface MetricSampleCollector { key: string; values: number[] }

function collectPerRoundMetrics(driver: DriverSeasonInput, teammate: DriverSeasonInput): MetricSampleCollector[] {
  const collectors: Record<string, number[]> = {
    teammateAdjustedQualifyingPace: [], teammateAdjustedCleanRacePace: [], peakRepresentativePace: [],
    qualifyingHeadToHead: [], qualifyingConsistency: [],
    startAndOpeningLapExecution: [], racecraftProxy: [], changingConditionAdaptability: [],
  }

  for (let i = 0; i < driver.race.length; i++) {
    const singleRoundDriver: DriverSeasonInput = {
      driverId: driver.driverId,
      qualifying: driver.qualifying.filter(q => q.round === driver.race[i].round),
      race: [driver.race[i]],
      dnfs: driver.dnfs.filter(d => d.round === driver.race[i].round),
      incidents: [],
    }
    const teammateRound = teammate.race.find(r => r.round === driver.race[i].round)
    const singleRoundTeammate: DriverSeasonInput = {
      driverId: teammate.driverId,
      qualifying: teammate.qualifying.filter(q => q.round === driver.race[i].round),
      race: teammateRound ? [teammateRound] : [],
      dnfs: [],
      incidents: [],
    }

    const push = (key: string, v: number | null) => { if (v !== null) collectors[key].push(v) }
    push('teammateAdjustedQualifyingPace', teammateAdjustedQualifyingPace(singleRoundDriver, singleRoundTeammate).rawValue)
    push('teammateAdjustedCleanRacePace', teammateAdjustedCleanRacePace(singleRoundDriver, singleRoundTeammate).rawValue)
    push('peakRepresentativePace', peakRepresentativePace(singleRoundDriver, singleRoundTeammate, methodologyV1.tunables).rawValue)
    push('qualifyingConsistency', qualifyingConsistency(singleRoundDriver).rawValue)
    push('startAndOpeningLapExecution', startAndOpeningLapExecution(singleRoundDriver, methodologyV1.tunables).rawValue)
    push('racecraftProxy', racecraftProxy(singleRoundDriver).rawValue)
    push('changingConditionAdaptability', changingConditionAdaptability(singleRoundDriver, singleRoundTeammate).rawValue)
  }

  const qh = qualifyingHeadToHead(driver).rawValue
  if (qh !== null) collectors.qualifyingHeadToHead.push(qh)

  return Object.entries(collectors).map(([key, values]) => ({ key, values }))
}

// ── Candidate reference ranges (non-mutating) — see engine/calibrationCandidates.ts ────────

// ── Debug: cleanRaceLapConsistency outliers ─────────────────────────────────

function printConsistencyDebug(driverId: string, samples: StintConsistencySample[]): void {
  console.log(`\n  ${driverId} — clean lap consistency per stint (dry only, min ${methodologyV1.tunables.minCleanLapsForConsistencyStint} clean laps):`)
  for (const s of [...samples].sort((a, b) => b.covPct - a.covPct)) {
    const flag = s.covPct > 2 ? '  ⚠ outlier' : ''
    console.log(
      `    round=${s.round} stint=${s.stintNumber} compound=${s.compound} n=${s.cleanLapCount} ` +
      `excluded=${s.excludedLapCount}[${s.exclusionReasons.join(',')}] median=${s.medianMs.toFixed(0)}ms ` +
      `MAD=${s.madMs.toFixed(1)}ms CoV=${s.covPct.toFixed(3)}%${flag}`,
    )
    if (s.covPct > 2) {
      console.log(`      raw lap times (ms): ${s.includedLapTimesMs.join(', ')}`)
    }
  }
}

function printStintPairDebug(driverId: string, pairs: ComparableStintPairDelta[], excludedRounds: { round: number; reason: string }[]): void {
  console.log(`\n  ${driverId} — comparable stint pairs (tyreStintManagement):`)
  for (const p of pairs) {
    console.log(
      `    round=${p.round} compound=${p.driverStint.compound} driverSlope=${p.driverSlopeMsPerLap.toFixed(2)} ` +
      `teammateSlope=${p.teammateSlopeMsPerLap.toFixed(2)} relativeDelta=${p.relativeDeltaMsPerLap.toFixed(2)}`,
    )
  }
  for (const ex of excludedRounds) {
    console.log(`    round=${ex.round} EXCLUDED: ${ex.reason}`)
  }
}

function main(): void {
  const rounds = loadRounds()
  console.log(`Loaded ${rounds.length} real rounds: ${rounds.map(r => r.round).join(', ')} (season ${rounds[0]?.season})`)

  let pipelineValidated = true
  const pipelineErrors: string[] = []

  const norris = buildDriverSeasonInput('norris', rounds)
  const piastri = buildDriverSeasonInput('piastri', rounds)

  const norrisSamples = collectPerRoundMetrics(norris, piastri)
  const piastriSamples = collectPerRoundMetrics(piastri, norris)
  const combined: Record<string, number[]> = {}
  for (const s of [...norrisSamples, ...piastriSamples]) {
    combined[s.key] = [...(combined[s.key] ?? []), ...s.values]
  }

  // cleanRaceLapConsistency — full debug breakdown, per stint
  const norrisConsistency = explainCleanRaceLapConsistency(norris, methodologyV1.tunables)
  const piastriConsistency = explainCleanRaceLapConsistency(piastri, methodologyV1.tunables)
  combined.cleanRaceLapConsistency = [...norrisConsistency.samples.map(s => s.covPct), ...piastriConsistency.samples.map(s => s.covPct)]

  console.log('\n=== cleanRaceLapConsistency — per-stint debug breakdown ===')
  printConsistencyDebug('norris', norrisConsistency.samples)
  printConsistencyDebug('piastri', piastriConsistency.samples)

  // tyreStintManagement — teammate-relative comparable-stint delta
  const norrisStintPairs = explainStintPaceEvolution(norris, piastri, methodologyV1.tunables, methodologyV1.tyreAgeComparabilityThresholdLaps)
  const piastriStintPairs = explainStintPaceEvolution(piastri, norris, methodologyV1.tunables, methodologyV1.tyreAgeComparabilityThresholdLaps)
  combined.tyreStintManagement = [...norrisStintPairs.pairs.map(p => p.relativeDeltaMsPerLap), ...piastriStintPairs.pairs.map(p => p.relativeDeltaMsPerLap)]

  console.log('\n=== tyreStintManagement — comparable stint pairs (teammate-relative) ===')
  printStintPairDebug('norris', norrisStintPairs.pairs, norrisStintPairs.excludedRounds)
  printStintPairDebug('piastri', piastriStintPairs.pairs, piastriStintPairs.excludedRounds)

  // reference-range observations (NOT applied — informational only)
  console.log('\n=== Reference range observations (real 2025 McLaren data) — informational only, NOT applied ===\n')
  const referenceRangeObservations: Record<string, unknown> = {}
  const candidateReferenceRanges: Record<string, CandidateRangeEntry> = {}
  for (const [key, range] of Object.entries(methodologyV1.referenceRanges)) {
    const values = combined[key] ?? []
    if (values.length === 0) {
      console.log(`${key.padEnd(32)} NO DATA (0 samples — see script doc comment for known gaps)`)
      referenceRangeObservations[key] = { samples: 0, note: 'no data collected for this metric in this pass' }
      continue
    }
    const min = Math.min(...values)
    const max = Math.max(...values)
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    console.log(`${key.padEnd(32)} n=${values.length}  observed=[${min.toFixed(3)}, ${max.toFixed(3)}]  mean=${mean.toFixed(3)}  configured=[${range.min}, ${range.max}]`)
    referenceRangeObservations[key] = { samples: values.length, observedMin: min, observedMax: max, observedMean: mean, configuredRange: [range.min, range.max] }

    const forceInvestigate = key === 'tyreStintManagement'
    const note = key === 'tyreStintManagement'
      ? 'metric formula redesigned this iteration (teammate-relative stint-pair delta) — always investigate, never auto-accept, regardless of sample stats'
      : (key === 'cleanRaceLapConsistency'
        ? 'formula redesigned this iteration (per-stint, not pooled) — re-observed value should be compared against the ORIGINAL 2.5 ceiling, not the previously-widened 4'
        : 'candidate proposed from observed real-data spread; NOT applied to active methodology')
    candidateReferenceRanges[key] = buildCandidateRange(values, range, forceInvestigate, note)
  }

  console.log('\n=== Candidate reference ranges (proposals only — active methodology unchanged) ===')
  for (const [key, c] of Object.entries(candidateReferenceRanges)) {
    if (c.sampleCount === 0) continue
    console.log(
      `${key.padEnd(32)} recommendation=${c.recommendation.padEnd(11)} current=[${c.currentRange}] ` +
      `candidate=${c.candidateRange ? `[${c.candidateRange.map(v => v.toFixed(2))}]` : 'null'} ` +
      `saturationBefore=${(c.saturationBefore * 100).toFixed(0)}% confidence=${c.confidence}`,
    )
  }

  // Full-season rating (real data) — proves the pipeline runs end-to-end
  console.log('\n=== Full-season rating (real data, methodology mimir-f1-v1) ===')
  const ratings: Record<string, unknown> = {}
  for (const [driver, teammate] of [[norris, piastri], [piastri, norris]] as const) {
    try {
      const rating = computeDriverRating({
        driver, teammate, season: rounds[0].season, calculatedAfterRound: rounds[rounds.length - 1].round,
        methodology: methodologyV1, manualAdjustments: [],
      })
      console.log(`\n${driver.driverId}: speed=${rating.speed.score} precision=${rating.precision.score} raceIq=${rating.raceIq.score}`)
      console.log(`  insufficientData=${rating.insufficientData}, warnings=${rating.warnings.length}`)
      ratings[driver.driverId] = {
        speed: rating.speed.score, precision: rating.precision.score, raceIq: rating.raceIq.score,
        insufficientData: rating.insufficientData, warningCount: rating.warnings.length,
      }
      if (rating.insufficientData) {
        pipelineValidated = false
        pipelineErrors.push(`${driver.driverId}: insufficientData=true`)
      }
    } catch (err) {
      pipelineValidated = false
      pipelineErrors.push(`${driver.driverId}: threw ${(err as Error).message}`)
      console.error(`${driver.driverId}: ERROR — ${(err as Error).message}`)
    }
  }

  // Pipeline validation vs calibration readiness are DELIBERATELY separate booleans.
  const reasonsNotReady = [
    'only 1 team (McLaren) represented — no cross-team variance observed',
    'only 2 drivers total',
    `only ${rounds.length} rounds`,
    'no incident/DNF-cause data source connected — cleanWeekendRate/unforcedErrorControl unmeasured',
    'no pace-based expected-finish model — resultRelativeToExpectedPace unmeasured',
    'tyreStintManagement formula redesigned this iteration — not yet validated on a second real dataset',
  ]

  const report = {
    generatedAt: new Date().toISOString(),
    methodologyVersion: methodologyV1.id,
    pipelineValidated,
    pipelineErrors,
    calibrationStatus: 'insufficient-sample' as const,
    datasetScope: { teams: 1, drivers: 2, rounds: rounds.length, roundsUsed: rounds.map(r => r.round) },
    gridCalibrationReady: false,
    reasonsNotReady,
    referenceRangeObservations,
    candidateReferenceRanges,
    tyreStintManagementDebug: {
      norris: { pairs: norrisStintPairs.pairs, excludedRounds: norrisStintPairs.excludedRounds, warnings: norrisStintPairs.warnings },
      piastri: { pairs: piastriStintPairs.pairs, excludedRounds: piastriStintPairs.excludedRounds, warnings: piastriStintPairs.warnings },
    },
    cleanRaceLapConsistencyDebug: {
      norris: norrisConsistency.samples,
      piastri: piastriConsistency.samples,
    },
    ratings,
  }

  const reportPath = path.join(OUTPUT_DIR, 'calibration-report.json')
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
  console.log(`\npipelineValidated=${pipelineValidated}  gridCalibrationReady=false  (see reasonsNotReady in the report)`)
  console.log(`Wrote ${reportPath}`)
}

main()
