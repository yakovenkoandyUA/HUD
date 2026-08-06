import { jolpicaQualifyingToRawMetrics, classifyJolpicaStatus } from '../adapters/jolpicaAdapter'
import { fastF1ExportToRaceMetrics } from '../adapters/fastF1Adapter'
import { buildDnfRecord } from '../adapters/manualIncidentAdapter'
import { resolveTeammates } from './teammateMapping'
import type { CollectedRound } from './collectedRound'
import type { DriverSeasonInput } from '../engine/metrics'
import type { DnfRecord, MethodologyVersion } from '../types'

/**
 * Builds one driver's `DriverSeasonInput` from a set of collected rounds. Shared by
 * `cli/calibrationReport.ts` (2-driver smoke check) and the grid-wide dataset tooling — single
 * source of truth for "collected JSON -> engine input" so the two never silently diverge.
 *
 * The qualifying head-to-head teammate is resolved via `resolveTeammates` (same-constructor
 * pairing for THAT round), not "the other driver in the file" — on a 2-driver-only dataset those
 * happen to be the same thing, but on a full-grid dataset "the other driver in the file" would
 * almost always be from a different team. This was a latent bug in the original 2-driver-only
 * implementation that never manifested because the dataset never had more than 2 entries.
 */
export function buildDriverSeasonInputFromRounds(
  driverId: string,
  rounds: CollectedRound[],
  tunables: MethodologyVersion['tunables'],
): DriverSeasonInput {
  const qualifying: DriverSeasonInput['qualifying'] = []
  const race: DriverSeasonInput['race'] = []
  const dnfs: DnfRecord[] = []

  for (const round of rounds) {
    const qDriver = round.qualifying.find(q => q.driverId === driverId)
    if (qDriver) {
      const roster = round.qualifying.map(q => ({ driverId: q.driverId, constructorId: q.constructorId }))
      const resolution = resolveTeammates(roster).find(r => r.driverId === driverId)
      const qTeammate = resolution?.teammateId
        ? round.qualifying.find(q => q.driverId === resolution.teammateId) ?? null
        : null
      qualifying.push(jolpicaQualifyingToRawMetrics(qDriver, qTeammate, round.season, round.round))
    }

    const rDriver = round.race.find(r => r.driverId === driverId)
    if (rDriver) {
      race.push(fastF1ExportToRaceMetrics(rDriver, false, tunables.minCleanLapsForDegradationSlope))
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

/** Every distinct driverId that appears in ANY collected round's race entries (the real 2025 grid). */
export function collectAllDriverIds(rounds: CollectedRound[]): string[] {
  const ids = new Set<string>()
  for (const round of rounds) {
    for (const r of round.race) ids.add(r.driverId)
  }
  return [...ids].sort()
}

/** Roster (driverId + constructorId) actually present in a given round's RACE session. */
export function rosterForRound(round: CollectedRound): { driverId: string; constructorId: string }[] {
  return round.race.map(r => ({ driverId: r.driverId, constructorId: r.constructorId }))
}
