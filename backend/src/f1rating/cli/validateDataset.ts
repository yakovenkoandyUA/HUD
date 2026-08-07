/**
 * Validates a collected dataset directory: loads every round, builds the manifest, and prints
 * whether it's usable — missing sessions, missing rounds (vs a known season length), detected
 * substitutions, and file-level warnings. Does not compute any ratings.
 *
 * Usage: `npm run f1rating:validate-dataset -- --input <dir> [--season-rounds 24]`
 * Exits 0 if every collected round has both Q and R sessions present; exits 1 otherwise.
 */
import * as path from 'path'
import { loadCollectedRounds } from '../dataset/collectedRound'
import { buildDatasetManifest } from '../dataset/manifest'

const DEFAULT_DIR = path.resolve(__dirname, '../../../../scripts/f1rating-collector/output_grid')

function parseArgs(): { input: string; seasonRounds: number | null } {
  const args = process.argv.slice(2)
  const get = (flag: string, fallback: string | null) => {
    const idx = args.indexOf(flag)
    return idx >= 0 && args[idx + 1] ? args[idx + 1] : fallback
  }
  const input = get('--input', DEFAULT_DIR) as string
  const seasonRoundsRaw = get('--season-rounds', '24')
  return { input, seasonRounds: seasonRoundsRaw ? parseInt(seasonRoundsRaw, 10) : null }
}

function main(): void {
  const { input, seasonRounds } = parseArgs()

  let rounds
  try {
    rounds = loadCollectedRounds(input)
  } catch (err) {
    console.error((err as Error).message)
    process.exit(1)
  }
  if (rounds.length === 0) {
    console.error(`No rounds found in ${input}`)
    process.exit(1)
  }

  const manifest = buildDatasetManifest(rounds, input, seasonRounds)

  console.log(`datasetId: ${manifest.datasetId}`)
  console.log(`season: ${manifest.season}`)
  console.log(`includedRounds (${manifest.includedRounds.length}): ${manifest.includedRounds.join(', ')}`)
  if (manifest.missingRounds.length > 0) console.log(`missingRounds (${manifest.missingRounds.length}): ${manifest.missingRounds.join(', ')}`)
  console.log(`teams (${manifest.teams.length}): ${manifest.teams.join(', ')}`)
  console.log(`drivers (${manifest.drivers.length}): ${manifest.drivers.join(', ')}`)
  console.log(`substitutions detected (${manifest.substitutions.length}):`)
  for (const s of manifest.substitutions) {
    console.log(`  ${s.constructorId}: ${s.outDriverId} -> ${s.inDriverId} (between rounds ${s.detectedBetweenRounds.join(' and ')})`)
  }
  if (manifest.missingSessions.length > 0) {
    console.log(`missingSessions:`)
    for (const m of manifest.missingSessions) console.log(`  round ${m.round}: missing ${m.missing.join(',')}`)
  }
  if (manifest.warnings.length > 0) {
    console.log(`warnings:`)
    for (const w of manifest.warnings) console.log(`  - ${w}`)
  }
  console.log(`knownGaps:`)
  for (const g of manifest.knownGaps) console.log(`  - ${g}`)

  const hasIncompleteSessions = manifest.missingSessions.length > 0
  if (hasIncompleteSessions) {
    console.error('\nVALIDATION FAILED: one or more included rounds is missing a Q or R session.')
    process.exit(1)
  }
  console.log('\nVALIDATION OK')
}

main()
