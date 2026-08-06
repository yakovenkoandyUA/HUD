import * as crypto from 'crypto'
import * as fs from 'fs'
import * as path from 'path'
import type { CollectedRound } from './collectedRound'
import { rosterForRound } from './buildDriverSeasonInput'

export interface DriverTeamRoundEntry {
  round: number
  driverId: string
  constructorId: string
}

export interface SubstitutionEvent {
  constructorId: string
  outDriverId: string
  inDriverId: string
  /** The two consecutive INCLUDED rounds where the roster change was observed — an intermediate
   * change between them (if any rounds were skipped) would not be visible from this dataset. */
  detectedBetweenRounds: [number, number]
}

export interface DatasetManifest {
  datasetId: string
  season: number
  includedRounds: number[]
  missingRounds: number[]
  includedSessions: { round: number; sessions: ('Q' | 'R')[] }[]
  missingSessions: { round: number; missing: ('Q' | 'R')[] }[]
  teams: string[]
  drivers: string[]
  driverTeamRoundMap: DriverTeamRoundEntry[]
  substitutions: SubstitutionEvent[]
  fastf1Version: string | null
  exportSchemaVersion: string
  generatedAt: string
  sourceFiles: { round: number; path: string; checksum: string }[]
  knownGaps: string[]
  warnings: string[]
}

function sha256(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex')
}

/**
 * Builds a versioned manifest describing exactly what was collected — never assumes a "full
 * grid" from memory; everything here is derived from what's actually present in `rounds`.
 * `totalSeasonRounds` (if known, e.g. 24 for the 2025 season) is used ONLY to compute
 * `missingRounds`/`knownGaps` text — it never causes fabricated data for rounds not collected.
 */
export function buildDatasetManifest(
  rounds: CollectedRound[],
  sourceDir: string,
  totalSeasonRounds: number | null,
): DatasetManifest {
  const season = rounds[0]?.season ?? 0
  const includedRounds = rounds.map(r => r.round).sort((a, b) => a - b)
  const missingRounds = totalSeasonRounds
    ? Array.from({ length: totalSeasonRounds }, (_, i) => i + 1).filter(r => !includedRounds.includes(r))
    : []

  const includedSessions: DatasetManifest['includedSessions'] = []
  const missingSessions: DatasetManifest['missingSessions'] = []
  const warnings: string[] = []

  for (const round of rounds) {
    const sessions: ('Q' | 'R')[] = []
    const missing: ('Q' | 'R')[] = []
    if (round.qualifying.length > 0) sessions.push('Q'); else missing.push('Q')
    if (round.race.length > 0) sessions.push('R'); else missing.push('R')
    includedSessions.push({ round: round.round, sessions })
    if (missing.length > 0) {
      missingSessions.push({ round: round.round, missing })
      warnings.push(`round ${round.round}: missing session(s) ${missing.join(',')}`)
    }
  }

  const driverTeamRoundMap: DriverTeamRoundEntry[] = []
  for (const round of rounds) {
    for (const entry of rosterForRound(round)) {
      driverTeamRoundMap.push({ round: round.round, driverId: entry.driverId, constructorId: entry.constructorId })
    }
  }

  const teams = [...new Set(driverTeamRoundMap.map(e => e.constructorId))].sort()
  const drivers = [...new Set(driverTeamRoundMap.map(e => e.driverId))].sort()

  const substitutions = detectSubstitutions(driverTeamRoundMap, includedRounds)

  const sourceFiles = rounds.map(round => {
    const filePath = path.join(sourceDir, `${round.season}_${String(round.round).padStart(2, '0')}.json`)
    let checksum = 'unavailable'
    try {
      checksum = sha256(fs.readFileSync(filePath, 'utf-8'))
    } catch {
      warnings.push(`round ${round.round}: source file not found at ${filePath} for checksum`)
    }
    return { round: round.round, path: filePath, checksum }
  })

  const fastf1Version = rounds.find(r => r.fastf1Version)?.fastf1Version ?? null
  const exportSchemaVersion = rounds[0]?.schemaVersion ?? 'unknown'

  const knownGaps: string[] = []
  if (missingRounds.length > 0) {
    knownGaps.push(`${missingRounds.length} of ${totalSeasonRounds} season rounds not collected: ${missingRounds.join(', ')}`)
  }
  knownGaps.push('Sprint/SprintQualifying sessions are never collected — only Qualifying (Q) and Race (R).')
  knownGaps.push('Substitutions are only detectable BETWEEN two included rounds — an intermediate ' +
    'change on a round that was not collected is invisible to this manifest.')

  // Deterministic id: same season + same included rounds + same file contents -> same id.
  const idHashInput = `${season}|${includedRounds.join(',')}|${sourceFiles.map(f => f.checksum).join(',')}`
  const datasetId = `mimir-f1-${season}-grid-${sha256(idHashInput).slice(0, 12)}`

  return {
    datasetId, season, includedRounds, missingRounds, includedSessions, missingSessions,
    teams, drivers, driverTeamRoundMap, substitutions, fastf1Version, exportSchemaVersion,
    generatedAt: new Date().toISOString(), sourceFiles, knownGaps, warnings,
  }
}

function detectSubstitutions(map: DriverTeamRoundEntry[], includedRounds: number[]): SubstitutionEvent[] {
  const byConstructorRound = new Map<string, Map<number, Set<string>>>()
  for (const entry of map) {
    let byRound = byConstructorRound.get(entry.constructorId)
    if (!byRound) { byRound = new Map(); byConstructorRound.set(entry.constructorId, byRound) }
    const set = byRound.get(entry.round) ?? new Set<string>()
    set.add(entry.driverId)
    byRound.set(entry.round, set)
  }

  const events: SubstitutionEvent[] = []
  for (const [constructorId, byRound] of byConstructorRound) {
    for (let i = 1; i < includedRounds.length; i++) {
      const prevRound = includedRounds[i - 1]
      const currRound = includedRounds[i]
      const prevDrivers = byRound.get(prevRound)
      const currDrivers = byRound.get(currRound)
      if (!prevDrivers || !currDrivers) continue
      const outDrivers = [...prevDrivers].filter(d => !currDrivers.has(d)).sort()
      const inDrivers = [...currDrivers].filter(d => !prevDrivers.has(d)).sort()
      const pairCount = Math.min(outDrivers.length, inDrivers.length)
      for (let p = 0; p < pairCount; p++) {
        events.push({
          constructorId, outDriverId: outDrivers[p], inDriverId: inDrivers[p],
          detectedBetweenRounds: [prevRound, currRound],
        })
      }
    }
  }
  return events.sort((a, b) => a.detectedBetweenRounds[0] - b.detectedBetweenRounds[0] || a.constructorId.localeCompare(b.constructorId))
}
