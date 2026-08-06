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

export function loadCollectedRounds(dir: string): CollectedRound[] {
  if (!fs.existsSync(dir)) {
    throw new Error(`[f1rating] no collected data directory at ${dir} — run collect.py/batch_collect.py first`)
  }
  const files = fs.readdirSync(dir).filter(
    f => f.endsWith('.json') && !f.startsWith('calibration-report') && !f.startsWith('collection-summary'),
  )
  return files
    .map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8')) as CollectedRound)
    .sort((a, b) => a.round - b.round)
}
