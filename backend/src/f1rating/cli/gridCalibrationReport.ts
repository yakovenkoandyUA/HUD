/**
 * Grid-wide calibration report — runs a full-grid, multi-round, multi-team real dataset through
 * the SAME engine/adapters/dataset tooling as every other calibration script (no parallel/
 * simplified engine — the driver-rating loop lives in `dataset/gridRatings.ts`, shared with
 * `cli/gridDiagnosticReport.ts`). Builds grid-level distributions, a team-car-bias diagnostic,
 * an outlier audit, coverage/confidence analysis, and — if enough key metrics have sufficient
 * data — an experimental `mimir-f1-v2-candidate` methodology proposal. NEVER touches
 * `productionReady`/mutates `methodologyV1`, NEVER connects to UI/API.
 *
 * Usage: `npm run f1rating:grid-calibrate -- --input <dir> [--out <dir>] [--total-rounds <n>]`
 *   --input defaults to scripts/f1rating-collector/output_grid (local, gitignored, produced by
 *   `batch_collect.py`) --out defaults to the same directory. --total-rounds defaults to 24 (the
 *   2025 season length) — MUST be passed explicitly for any other season (e.g. 22 for 2023),
 *   otherwise genuinely-nonexistent rounds get misreported as "missing" from a season that never
 *   had them.
 *
 * Exits 0 on success, 1 if the input directory has no collectable rounds. Finite process: no
 * watcher, no server, no writes to any database.
 */
import * as fs from 'fs'
import * as path from 'path'
import { methodologyV1 } from '../config/methodologyV1'
import { computeGridRatings, METRIC_KEYS, type EventSample } from '../dataset/gridRatings'
import { buildCandidateRange, computeDistributionStats, type CandidateRangeEntry } from '../engine/calibrationCandidates'
import { buildMethodologyV2Candidate, type CandidateMethodologyResult } from '../dataset/candidateMethodology'
import {
  getCanonicalMetricKeys, buildMetricStateReport, summarizeMetricStates, assertMetricStateInvariant,
} from '../engine/metricRegistry'

const DEFAULT_DIR = path.resolve(__dirname, '../../../../scripts/f1rating-collector/output_grid')

function parseArgs(): { input: string; out: string; totalRounds: number } {
  const args = process.argv.slice(2)
  const get = (flag: string, fallback: string) => {
    const idx = args.indexOf(flag)
    return idx >= 0 && args[idx + 1] ? args[idx + 1] : fallback
  }
  const input = get('--input', DEFAULT_DIR)
  return { input, out: get('--out', path.join(input, 'reports')), totalRounds: Number(get('--total-rounds', '24')) }
}

function pearsonCorrelation(xs: number[], ys: number[]): number | null {
  if (xs.length < 3 || xs.length !== ys.length) return null
  const meanX = xs.reduce((a, b) => a + b, 0) / xs.length
  const meanY = ys.reduce((a, b) => a + b, 0) / ys.length
  let num = 0, denX = 0, denY = 0
  for (let i = 0; i < xs.length; i++) {
    num += (xs[i] - meanX) * (ys[i] - meanY)
    denX += (xs[i] - meanX) ** 2
    denY += (ys[i] - meanY) ** 2
  }
  if (denX === 0 || denY === 0) return null
  return num / Math.sqrt(denX * denY)
}

/** Self-derived from OUR OWN collected race results — average finish position per team across
 * the collected rounds. Lower = stronger car (rough proxy only). Explicitly NOT fetched from an
 * official standings API, and NEVER fed into any driver's score — diagnostic correlation only. */
function computeTeamStrengthProxy(rounds: { race: { constructorId: string; finishPosition: number | null }[] }[]): Map<string, number> {
  const positionsByTeam = new Map<string, number[]>()
  for (const round of rounds) {
    for (const r of round.race) {
      if (r.finishPosition === null) continue
      const list = positionsByTeam.get(r.constructorId) ?? []
      list.push(r.finishPosition)
      positionsByTeam.set(r.constructorId, list)
    }
  }
  const result = new Map<string, number>()
  for (const [team, positions] of positionsByTeam) {
    result.set(team, positions.reduce((a, b) => a + b, 0) / positions.length)
  }
  return result
}

function main(): void {
  const { input, out, totalRounds } = parseArgs()

  let grid: ReturnType<typeof computeGridRatings>
  try {
    grid = computeGridRatings(input, methodologyV1, totalRounds)
  } catch (err) {
    console.error((err as Error).message)
    process.exit(1)
  }
  const { rounds, manifest, ratings, coverageReport, bank, roundsWithoutTeammateByDriver, teamOf } = grid

  console.log(`Loaded ${rounds.length} rounds from ${input}: ${rounds.map(r => r.round).join(', ')}`)
  console.log(`Dataset ${manifest.datasetId}: ${manifest.teams.length} teams, ${manifest.drivers.length} drivers, ${manifest.substitutions.length} substitution(s) detected`)

  const teamCount = manifest.teams.length
  const driverCount = manifest.drivers.length
  const roundCount = manifest.includedRounds.length

  const candidateReferenceRanges: Record<string, CandidateRangeEntry> = {}
  console.log('\n=== Grid-wide distributions ===')
  for (const key of METRIC_KEYS) {
    const values = bank[key].map(s => s.value)
    const stats = computeDistributionStats(values)
    if (!stats) {
      console.log(`${key.padEnd(32)} NO DATA`)
    } else {
      console.log(
        `${key.padEnd(32)} n=${stats.sampleCount} median=${stats.median.toFixed(3)} ` +
        `P5=${stats.p5.toFixed(2)} P95=${stats.p95.toFixed(2)} IQR=${stats.iqr.toFixed(3)} MAD=${stats.mad.toFixed(3)}`,
      )
    }
    const forceInvestigate = key === 'tyreStintManagement'
    candidateReferenceRanges[key] = buildCandidateRange({
      values, range: methodologyV1.referenceRanges[key], teamCount, driverCount, roundCount,
      forceInvestigate, note: `grid-wide sample across ${teamCount} teams, ${driverCount} drivers, ${roundCount} rounds`,
    })
  }

  console.log('\n=== Candidate ranges ===')
  for (const [key, c] of Object.entries(candidateReferenceRanges)) {
    console.log(
      `${key.padEnd(32)} n=${(c.distribution?.sampleCount ?? 0).toString().padEnd(4)} ` +
      `recommendation=${c.recommendation.padEnd(17)} confidence=${c.confidence.padEnd(6)} ` +
      `outliers=${c.outlierCount} saturationBefore=${(c.saturationBefore * 100).toFixed(0)}%`,
    )
  }

  // Metric-state accounting — SINGLE canonical registry (see engine/metricRegistry.ts), fails
  // loudly (throws, non-zero exit) rather than silently under/over-counting if a metric is ever
  // missing from or duplicated in the sample bank.
  const canonicalKeys = getCanonicalMetricKeys(methodologyV1)
  const sampleSizeByKey: Record<string, number> = {}
  for (const key of METRIC_KEYS) sampleSizeByKey[key] = bank[key].length
  const metricStateReport = buildMetricStateReport(methodologyV1, sampleSizeByKey)
  assertMetricStateInvariant(metricStateReport, canonicalKeys.length)
  const metricStateTotals = summarizeMetricStates(metricStateReport)

  console.log(`\n=== Metric state (${metricStateTotals.totalMetrics} canonical metrics) ===`)
  for (const entry of metricStateReport) {
    console.log(`${entry.key.padEnd(32)} ${entry.state.padEnd(17)} n=${entry.sampleSize}`)
  }
  console.log(
    `observed=${metricStateTotals.observedMetrics} no-signal=${metricStateTotals.noSignalMetrics} ` +
    `insufficient-data=${metricStateTotals.insufficientDataMetrics} excluded=${metricStateTotals.excludedMetrics} ` +
    `(sum=${metricStateTotals.observedMetrics + metricStateTotals.noSignalMetrics + metricStateTotals.insufficientDataMetrics + metricStateTotals.excludedMetrics}/${metricStateTotals.totalMetrics})`,
  )

  const outlierAudit: Record<string, { high: EventSample[]; low: EventSample[] }> = {}
  for (const key of METRIC_KEYS) {
    const sorted = [...bank[key]].sort((a, b) => a.value - b.value)
    outlierAudit[key] = { low: sorted.slice(0, 3), high: sorted.slice(-3).reverse() }
  }

  const teamStrength = computeTeamStrengthProxy(rounds)
  const speedScores = ratings.filter(r => r.speed.score !== null).map(r => ({
    driverId: r.driverId, score: r.speed.score as number, teamStrength: teamStrength.get(teamOf.get(r.driverId) ?? '') ?? null,
  })).filter(r => r.teamStrength !== null)
  const teamBiasCorrelation = pearsonCorrelation(
    speedScores.map(s => s.teamStrength as number), speedScores.map(s => s.score),
  )
  console.log(`\nTeam-bias diagnostic (DIAGNOSTIC ONLY, self-derived proxy): correlation(Speed, avg team finish pos) = ${teamBiasCorrelation?.toFixed(3) ?? 'n/a'} (n=${speedScores.length})`)

  const v2: CandidateMethodologyResult = buildMethodologyV2Candidate(methodologyV1, candidateReferenceRanges, manifest.datasetId)
  console.log(`\n=== mimir-f1-v2-candidate (EXPLORATORY, NOT stability-validated): ${v2.methodology ? 'CREATED' : 'NOT CREATED'} ===`)
  if (!v2.methodology) console.log(`Reason: ${v2.reasonNotCreated}`)
  else console.log(`Calibrated ${v2.calibratedMetricKeys.length}/${canonicalKeys.length} ranges: ${v2.calibratedMetricKeys.join(', ') || '(none)'}`)
  console.log(
    'NOTE: this proposal is built from a SINGLE dataset run only and has NOT been checked for ' +
    'stability against a different dataset size. It is exploratory, not an authoritative candidate ' +
    'decision — run `npm run f1rating:stability` (cli/stabilityReport.ts) against a second run to ' +
    'get the authoritative, stability-gated mimir-f1-v2-candidate. See `authoritative`/' +
    '`stabilityValidated` fields in the written file below.',
  )

  fs.mkdirSync(out, { recursive: true })
  const manifestPath = path.join(out, 'manifest.json')
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
  console.log(`\nWrote ${manifestPath}`)

  const v2Path = path.join(out, 'v2-candidate-proposal.json')
  fs.writeFileSync(v2Path, JSON.stringify({
    // EXPLORATORY ONLY — see cli/stabilityReport.ts's output for the authoritative decision.
    // A single-dataset-run proposal has NOT been checked for stability against a second run of a
    // different size, so it MUST NOT be treated as an alternative/equally-valid candidate
    // methodology. Do not feed this file's `methodology` into anything that scores real drivers.
    authoritative: false,
    stabilityValidated: false,
    supersededBy: 'stability-report.json (cli/stabilityReport.ts), when available',
    datasetId: manifest.datasetId, generatedAt: new Date().toISOString(),
    created: v2.methodology !== null, reasonNotCreated: v2.reasonNotCreated,
    calibratedMetricKeys: v2.calibratedMetricKeys, inheritedUnverifiedKeys: v2.inheritedUnverifiedKeys,
    keyMetricKeys: v2.keyMetricKeys, insufficientKeyMetricKeys: v2.insufficientKeyMetricKeys,
    methodology: v2.methodology,
  }, null, 2))
  console.log(`Wrote ${v2Path} (exploratory, authoritative=false)`)

  const reportPath = path.join(out, 'grid-calibration-report.json')
  fs.writeFileSync(reportPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    datasetId: manifest.datasetId,
    methodologyVersion: methodologyV1.id,
    pipelineValidated: ratings.length === manifest.drivers.length,
    gridCalibrationReady: false,
    metricStateReport,
    metricStateTotals,
    candidateReferenceRanges,
    outlierAudit,
    coverageReport,
    roundsWithoutTeammateByDriver,
    teamBiasDiagnostic: {
      note: 'DIAGNOSTIC ONLY — team strength is a self-derived average-finish-position proxy from ' +
        'this dataset, not an official standings fetch, and is never fed into any score.',
      correlationSpeedVsTeamStrength: teamBiasCorrelation,
      sampleSize: speedScores.length,
    },
  }, null, 2))
  console.log(`Wrote ${reportPath}`)
}

main()
