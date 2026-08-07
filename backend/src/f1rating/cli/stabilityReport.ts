/**
 * Compares two `grid-calibration-report.json` outputs (typically a smaller subset run vs the
 * full-season run) and reports, per metric, whether the candidate reference range is 'stable',
 * 'moderately-shifted', or 'unstable' between the two dataset sizes — enforcing "не приймай
 * candidate range, якщо він materially unstable" in code (`dataset/stabilityAnalysis.ts`).
 *
 * Usage: `npm run f1rating:stability -- --smaller <dir> --larger <dir> [--out <file>]`
 *   --smaller/--larger point at directories containing a `grid-calibration-report.json` (as
 *   written by `cli/gridCalibrationReport.ts`, e.g. via its `--out`).
 *
 * NEVER touches `productionReady`/mutates `methodologyV1`, NEVER connects to UI/API. Finite
 * process: no watcher, no server, no writes to any database.
 */
import * as fs from 'fs'
import * as path from 'path'
import type { CandidateRangeEntry } from '../engine/calibrationCandidates'
import { compareCandidateRangeSets, applyStabilityGate, DEFAULT_STABILITY_THRESHOLDS } from '../dataset/stabilityAnalysis'
import { buildMethodologyV2Candidate } from '../dataset/candidateMethodology'
import { methodologyV1 } from '../config/methodologyV1'
import { getCanonicalMetricKeys, type MetricStateEntry, type MetricStateTotals } from '../engine/metricRegistry'

interface GridCalibrationReport {
  datasetId: string
  candidateReferenceRanges: Record<string, CandidateRangeEntry>
  metricStateReport: MetricStateEntry[]
  metricStateTotals: MetricStateTotals
}

function parseArgs(): { smaller: string; larger: string; out: string } {
  const args = process.argv.slice(2)
  const get = (flag: string, fallback?: string) => {
    const idx = args.indexOf(flag)
    return idx >= 0 && args[idx + 1] ? args[idx + 1] : fallback
  }
  const smaller = get('--smaller')
  const larger = get('--larger')
  if (!smaller || !larger) {
    console.error('Usage: --smaller <dir> --larger <dir> [--out <file>]')
    process.exit(1)
  }
  return { smaller, larger, out: get('--out', path.join(larger, 'stability-report.json'))! }
}

function loadReport(dir: string): GridCalibrationReport {
  const reportPath = path.join(dir, 'grid-calibration-report.json')
  return JSON.parse(fs.readFileSync(reportPath, 'utf-8'))
}

function main(): void {
  const { smaller, larger, out } = parseArgs()
  const smallerReport = loadReport(smaller)
  const largerReport = loadReport(larger)

  const stability = compareCandidateRangeSets(
    smallerReport.candidateReferenceRanges, largerReport.candidateReferenceRanges, DEFAULT_STABILITY_THRESHOLDS,
  )
  const gated = applyStabilityGate(largerReport.candidateReferenceRanges, stability)

  console.log(`Comparing ${smallerReport.datasetId} (smaller) vs ${largerReport.datasetId} (larger)\n`)
  console.log('=== Stability per metric ===')
  const downgraded: string[] = []
  for (const [key, comparison] of Object.entries(stability)) {
    console.log(
      `${key.padEnd(32)} ${comparison.classification.padEnd(20)} ` +
      `relativeShift=${comparison.relativeShift !== null ? (comparison.relativeShift * 100).toFixed(1) + '%' : 'n/a'} ` +
      `recommendation ${comparison.recommendationSmaller} -> ${comparison.recommendationLarger}` +
      (comparison.recommendationFlipped ? ' [FLIPPED]' : ''),
    )
    if (largerReport.candidateReferenceRanges[key]?.recommendation === 'accept-candidate' && comparison.classification !== 'stable') {
      downgraded.push(key)
    }
  }

  console.log(`\n=== Gate applied: ${downgraded.length} metric(s) downgraded from accept-candidate ===`)
  for (const key of downgraded) console.log(`  ${key}: ${gated[key].note}`)

  // Rebuild mimir-f1-v2-candidate from the STABILITY-GATED ranges — this SUPERSEDES the
  // ungated v2-candidate-proposal.json written directly by gridCalibrationReport.ts for the
  // larger dataset, since that one does not know about cross-dataset-size stability at all.
  const totalCandidateMetrics = getCanonicalMetricKeys(methodologyV1).length
  const v2Gated = buildMethodologyV2Candidate(methodologyV1, gated, largerReport.datasetId)
  const acceptedCandidateMetrics = v2Gated.calibratedMetricKeys.length
  console.log(`\n=== mimir-f1-v2-candidate (AUTHORITATIVE, stability-gated): ${v2Gated.methodology ? 'CREATED' : 'NOT CREATED'} ===`)
  if (!v2Gated.methodology) console.log(`Reason: ${v2Gated.reasonNotCreated}`)
  else console.log(`Calibrated ${acceptedCandidateMetrics}/${totalCandidateMetrics} ranges: ${v2Gated.calibratedMetricKeys.join(', ') || '(none)'}`)

  // Metric-state totals are read from the LARGER (full-season) run's report, since that is the
  // more complete dataset — same canonical registry, same 15-metric denominator as
  // gridCalibrationReport.ts (see engine/metricRegistry.ts). Reconciles "N of 14" vs "N of 15"
  // drift between separately-generated reports by construction: there is only one denominator.
  console.log(
    `\n=== Metric totals (from larger/full-season run, canonical registry = ${largerReport.metricStateTotals.totalMetrics}) ===`,
  )
  console.log(
    `observed=${largerReport.metricStateTotals.observedMetrics} no-signal=${largerReport.metricStateTotals.noSignalMetrics} ` +
    `insufficient-data=${largerReport.metricStateTotals.insufficientDataMetrics} excluded=${largerReport.metricStateTotals.excludedMetrics} ` +
    `| acceptedCandidateMetrics=${acceptedCandidateMetrics}/${totalCandidateMetrics}`,
  )

  fs.writeFileSync(out, JSON.stringify({
    // AUTHORITATIVE — this is the ONLY source of truth for the mimir-f1-v2-candidate decision.
    // The ungated `v2-candidate-proposal.json` written by gridCalibrationReport.ts for the larger
    // dataset alone is exploratory/superseded (authoritative=false there) — never treat the two
    // as equally-valid alternative candidates.
    authoritative: true,
    stabilityValidated: true,
    generatedAt: new Date().toISOString(),
    smallerDatasetId: smallerReport.datasetId,
    largerDatasetId: largerReport.datasetId,
    thresholds: DEFAULT_STABILITY_THRESHOLDS,
    stability,
    downgradedFromAcceptCandidate: downgraded,
    gatedCandidateReferenceRanges: gated,
    metricTotals: {
      totalMetrics: largerReport.metricStateTotals.totalMetrics,
      observedMetrics: largerReport.metricStateTotals.observedMetrics,
      noSignalMetrics: largerReport.metricStateTotals.noSignalMetrics,
      insufficientDataMetrics: largerReport.metricStateTotals.insufficientDataMetrics,
      excludedMetrics: largerReport.metricStateTotals.excludedMetrics,
      acceptedCandidateMetrics,
      totalCandidateMetrics,
    },
    v2CandidateGated: {
      created: v2Gated.methodology !== null,
      reasonNotCreated: v2Gated.reasonNotCreated,
      calibratedMetricKeys: v2Gated.calibratedMetricKeys,
      inheritedUnverifiedKeys: v2Gated.inheritedUnverifiedKeys,
      methodology: v2Gated.methodology,
    },
  }, null, 2))
  console.log(`\nWrote ${out}`)
}

main()
