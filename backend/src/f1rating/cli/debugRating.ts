/**
 * Debug CLI — prints a full explanation breakdown for the synthetic Norris/Piastri fixture.
 * Run with: `npm run f1rating:debug` (backend/). Finite process: computes, prints, exits.
 *
 * ⚠️ Output is derived entirely from `fixtures/norrisPiastriFixture.ts` — SYNTHETIC/TEST-ONLY
 * data. This is not a real rating of any real driver.
 */
import { computeDriverRating } from '../engine'
import { methodologyV1 } from '../config/methodologyV1'
import {
  FIXTURE_CALCULATED_AFTER_ROUND, FIXTURE_SEASON, fixtureManualAdjustments,
  norrisSeasonFixture, piastriSeasonFixture,
} from '../fixtures/norrisPiastriFixture'
import type { ComponentScore, DriverRating } from '../types'

function printComponent(name: string, component: ComponentScore): void {
  console.log(`\n  ${name}: ${component.score ?? 'null (insufficient data)'} ` +
    `(confidence: ${component.confidence.level}, ${(component.confidence.score * 100).toFixed(0)}%)`)
  for (const item of component.breakdown) {
    const status = item.excluded ? `EXCLUDED (${item.exclusionReason})` : 'ok'
    const raw = item.rawValue === null ? 'null' : item.rawValue.toFixed(3)
    const norm = item.normalizedValue === null ? 'null' : item.normalizedValue.toFixed(1)
    console.log(
      `    - ${item.key.padEnd(32)} raw=${raw.padEnd(10)} normalized=${norm.padEnd(6)} ` +
      `weight=${item.weight.toFixed(2)} effWeight=${item.effectiveWeight.toFixed(2)} ` +
      `contribution=${item.contribution.toFixed(2)} n=${item.sampleSize} [${status}] ` +
      `(${item.higherIsBetter ? 'higher is better' : 'lower/more-negative is better'})`,
    )
    console.log(`        ${item.description}`)
  }
  if (component.appliedManualAdjustments.length > 0) {
    console.log('    manual adjustments applied:')
    for (const adj of component.appliedManualAdjustments) {
      console.log(`      - ${adj.id}: ${adj.signedAdjustment >= 0 ? '+' : ''}${adj.signedAdjustment} (${adj.category}) — ${adj.reason}`)
    }
  }
  if (component.warnings.length > 0) {
    console.log('    warnings:')
    for (const w of component.warnings) console.log(`      - ${w}`)
  }
}

function printRating(rating: DriverRating): void {
  console.log(`\n${'='.repeat(72)}`)
  console.log(`Driver: ${rating.driverId}  |  season ${rating.season}  |  through round ${rating.calculatedAfterRound}`)
  console.log(`methodologyVersion=${rating.methodologyVersion}  generatedAt=${rating.generatedAt}`)
  console.log(`insufficientData=${rating.insufficientData}`)
  printComponent('SPEED', rating.speed)
  printComponent('PRECISION', rating.precision)
  printComponent('RACE IQ', rating.raceIq)
  if (rating.warnings.length > 0) {
    console.log('\n  top-level warnings:')
    for (const w of rating.warnings) console.log(`    - ${w}`)
  }
}

function main(): void {
  console.log('MIMIR F1 Driver Rating Model — debug output')
  console.log('SYNTHETIC/TEST-ONLY fixture data. Not a real 2026 rating.')

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

  printRating(norris)
  printRating(piastri)
  console.log(`\n${'='.repeat(72)}\n`)
}

main()
