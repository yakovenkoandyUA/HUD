import * as fs from 'fs'
import * as path from 'path'
import type { JolpicaQualifyingResult } from '../adapters/jolpicaAdapter'
import type { FastF1SessionExport } from '../adapters/fastF1Adapter'

/**
 * Shared shape for one round's collected `fastf1-export-v1` JSON, as written by
 * `scripts/f1rating-collector/collect.py` / `batch_collect.py`. Single source of truth — both
 * `cli/calibrationReport.ts` (2-driver McLaren smoke check) and the grid-wide dataset tooling
 * read files matching this shape; previously this type was duplicated inline in
 * `calibrationReport.ts`.
 */
export interface CollectedRound {
  schemaVersion: string
  season: number
  round: number
  /** Present on batch-collected exports; absent on older single-round exports collected before it was added. */
  eventName?: string
  fastf1Version?: string
  qualifying: JolpicaQualifyingResult[]
  race: (FastF1SessionExport & { status: string })[]
}

const EXPORT_SCHEMA_VERSION = 'fastf1-export-v1'

/**
 * Loads every valid `fastf1-export-v1` round file from `dir`. Deliberately validates each file's
 * shape (`schemaVersion` + `qualifying`/`race` arrays present) rather than excluding filenames
 * by prefix — the calibration/manifest/diagnostic CLIs all write their OWN output JSON files
 * into this same directory (manifest.json, grid-calibration-report.json,
 * v2-candidate-proposal.json, grid-diagnostic-ratings.json, collection-summary-*.json), and a
 * filename-prefix exclusion list has to be remembered and extended every time a new output file
 * is added — a shape check can't go stale that way.
 */
export function loadCollectedRounds(dir: string): CollectedRound[] {
  if (!fs.existsSync(dir)) {
    throw new Error(`[f1rating] no collected data directory at ${dir} — run collect.py/batch_collect.py first`)
  }
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'))
  const rounds: CollectedRound[] = []
  for (const f of files) {
    let parsed: unknown
    try {
      parsed = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8'))
    } catch {
      continue
    }
    if (
      typeof parsed === 'object' && parsed !== null &&
      (parsed as { schemaVersion?: unknown }).schemaVersion === EXPORT_SCHEMA_VERSION &&
      Array.isArray((parsed as { qualifying?: unknown }).qualifying) &&
      Array.isArray((parsed as { race?: unknown }).race)
    ) {
      rounds.push(parsed as CollectedRound)
    }
  }
  return rounds.sort((a, b) => a.round - b.round)
}
