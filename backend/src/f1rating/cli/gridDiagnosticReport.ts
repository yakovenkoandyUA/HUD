/**
 * Grid diagnostic ratings — prints Speed/Precision/RaceIQ + confidence + coverage for every
 * driver in a collected dataset, computed by the SAME `computeGridRatings` shared step
 * `cli/gridCalibrationReport.ts` uses (no duplicated rating logic).
 *
 * ⚠️ THESE ARE NOT AN OFFICIAL "MIMIR RATING". `methodologyV1.calibrationStatus` is
 * `'unverified'` and `productionReady` is `false` — every row below is explicitly
 * `diagnosticOnly: true` and drivers are printed in dataset order, NOT ranked by any single
 * "Overall" score (no such score exists or is endorsed by this methodology).
 *
 * Usage: `npm run f1rating:grid-diagnostic -- --input <dir> [--out <dir>]`
 * Exits 0 on success, 1 if the input directory has no collectable rounds.
 */
import * as fs from 'fs'
import * as path from 'path'
import { methodologyV1 } from '../config/methodologyV1'
import { computeGridRatings } from '../dataset/gridRatings'

const DEFAULT_DIR = path.resolve(__dirname, '../../../../scripts/f1rating-collector/output_grid')

function parseArgs(): { input: string; out: string } {
  const args = process.argv.slice(2)
  const get = (flag: string, fallback: string) => {
    const idx = args.indexOf(flag)
    return idx >= 0 && args[idx + 1] ? args[idx + 1] : fallback
  }
  const input = get('--input', DEFAULT_DIR)
  return { input, out: get('--out', path.join(input, 'reports')) }
}

function main(): void {
  const { input, out } = parseArgs()

  let grid: ReturnType<typeof computeGridRatings>
  try {
    grid = computeGridRatings(input, methodologyV1, 24)
  } catch (err) {
    console.error((err as Error).message)
    process.exit(1)
  }

  console.log('⚠️  DIAGNOSTIC OUTPUT ONLY — not an official rating (calibrationStatus=unverified, productionReady=false)\n')
  console.log(`Dataset ${grid.manifest.datasetId} — ${grid.manifest.drivers.length} drivers, ${grid.manifest.includedRounds.length} rounds\n`)

  const rows = grid.ratings.map(r => {
    const coverage = grid.coverageReport.find(c => c.driverId === r.driverId)
    return {
      driverId: r.driverId,
      team: grid.teamOf.get(r.driverId) ?? 'unknown',
      roundsCovered: coverage?.roundsRaced ?? 0,
      speed: r.speed.score, speedConfidence: r.speed.confidence.level,
      precision: r.precision.score, precisionConfidence: r.precision.confidence.level,
      raceIq: r.raceIq.score, raceIqConfidence: r.raceIq.confidence.level,
      insufficientData: r.insufficientData,
      missingComponents: [
        ...r.speed.breakdown.filter(b => b.excluded).map(b => `speed.${b.key}`),
        ...r.precision.breakdown.filter(b => b.excluded).map(b => `precision.${b.key}`),
        ...r.raceIq.breakdown.filter(b => b.excluded).map(b => `raceIq.${b.key}`),
      ],
      warnings: coverage?.warnings ?? [],
      methodologyVersion: r.methodologyVersion,
      calibrationDatasetId: grid.manifest.datasetId,
      diagnosticOnly: true as const,
    }
  })

  for (const row of rows) {
    console.log(
      `${row.driverId.padEnd(20)} ${row.team.padEnd(14)} rounds=${row.roundsCovered} ` +
      `Speed=${String(row.speed).padEnd(5)}(${row.speedConfidence}) ` +
      `Precision=${String(row.precision).padEnd(5)}(${row.precisionConfidence}) ` +
      `RaceIQ=${String(row.raceIq).padEnd(5)}(${row.raceIqConfidence}) ` +
      `${row.insufficientData ? 'INSUFFICIENT_DATA' : ''}`,
    )
  }

  fs.mkdirSync(out, { recursive: true })
  const reportPath = path.join(out, 'grid-diagnostic-ratings.json')
  fs.writeFileSync(reportPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    datasetId: grid.manifest.datasetId,
    methodologyVersion: methodologyV1.id,
    diagnosticOnly: true,
    note: 'No single "Overall" score is produced — that formula is not approved. Do not rank drivers by summing these fields.',
    ratings: rows,
  }, null, 2))
  console.log(`\nWrote ${reportPath}`)
}

main()
