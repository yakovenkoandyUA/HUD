/**
 * Re-derives the `mimir-f1-v2-candidate` methodology proposal from an ALREADY-COMPUTED
 * `grid-calibration-report.json` + `manifest.json` (both written by
 * `npm run f1rating:grid-calibrate`) — does not recompute distributions or re-run the engine,
 * just re-applies `buildMethodologyV2Candidate` to the recorded candidate ranges. Useful for
 * re-deriving the proposal (e.g. after reviewing/adjusting the acceptance rule) without paying
 * the cost of a full grid rating pass again.
 *
 * Usage: `npm run f1rating:candidate-proposal -- --input <dir with grid-calibration-report.json>`
 * Exits 1 if the report/manifest files are not found.
 */
import * as fs from 'fs'
import * as path from 'path'
import { methodologyV1 } from '../config/methodologyV1'
import { buildMethodologyV2Candidate } from '../dataset/candidateMethodology'
import type { CandidateRangeEntry } from '../engine/calibrationCandidates'
import type { DatasetManifest } from '../dataset/manifest'

const DEFAULT_DIR = path.resolve(__dirname, '../../../../scripts/f1rating-collector/output_grid/reports')

function parseArgs(): { input: string } {
  const args = process.argv.slice(2)
  const idx = args.indexOf('--input')
  return { input: idx >= 0 && args[idx + 1] ? args[idx + 1] : DEFAULT_DIR }
}

function main(): void {
  const { input } = parseArgs()
  const reportPath = path.join(input, 'grid-calibration-report.json')
  const manifestPath = path.join(input, 'manifest.json')

  if (!fs.existsSync(reportPath) || !fs.existsSync(manifestPath)) {
    console.error(`Missing ${reportPath} or ${manifestPath} — run "npm run f1rating:grid-calibrate" first.`)
    process.exit(1)
  }

  const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8')) as { candidateReferenceRanges: Record<string, CandidateRangeEntry> }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as DatasetManifest

  const result = buildMethodologyV2Candidate(methodologyV1, report.candidateReferenceRanges, manifest.datasetId)

  console.log(`mimir-f1-v2-candidate: ${result.methodology ? 'CREATED' : 'NOT CREATED'}`)
  if (!result.methodology) {
    console.log(`Reason: ${result.reasonNotCreated}`)
  } else {
    console.log(`calibratedMetricKeys (${result.calibratedMetricKeys.length}): ${result.calibratedMetricKeys.join(', ') || '(none)'}`)
    console.log(`inheritedUnverifiedKeys (${result.inheritedUnverifiedKeys.length}): ${result.inheritedUnverifiedKeys.join(', ')}`)
  }

  const outPath = path.join(input, 'v2-candidate-proposal.json')
  fs.writeFileSync(outPath, JSON.stringify({
    datasetId: manifest.datasetId, generatedAt: new Date().toISOString(),
    created: result.methodology !== null, reasonNotCreated: result.reasonNotCreated,
    calibratedMetricKeys: result.calibratedMetricKeys, inheritedUnverifiedKeys: result.inheritedUnverifiedKeys,
    keyMetricKeys: result.keyMetricKeys, insufficientKeyMetricKeys: result.insufficientKeyMetricKeys,
    methodology: result.methodology,
  }, null, 2))
  console.log(`Wrote ${outPath}`)
}

main()
