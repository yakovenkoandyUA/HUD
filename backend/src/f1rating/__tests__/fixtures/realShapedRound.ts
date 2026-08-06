import type { JolpicaQualifyingResult } from '../../adapters/jolpicaAdapter'
import type { FastF1SessionExport } from '../../adapters/fastF1Adapter'

/**
 * ✅ REAL DATA (trimmed) — NOT synthetic.
 * ---------------------------------------
 * A genuine slice of `scripts/f1rating-collector/output/2025_03.json` (2025 Australian... no,
 * round 3 — Bahrain-era McLaren 1-2, Norris P2/Piastri P3, both "Finished"), trimmed to the
 * first 30 laps per driver so the test suite never needs a live FastF1 download. This is a real,
 * coherent race excerpt — it includes a genuinely inaccurate opening lap (FastF1 flags lap 1 as
 * `IsAccurate: false` for both drivers), a real pit-stop transition (in-lap → out-lap → new
 * stint/compound), and two full real stints (medium → hard) with real lap times.
 *
 * Regenerate with: `.venv/bin/python3 collect.py --season 2025 --round 3 --drivers NOR,PIA`
 * (from `scripts/f1rating-collector/`), then trim `race[].laps` to `lapNumber <= 30`.
 */
export const realShapedRound3: {
  schemaVersion: 'fastf1-export-v1'
  season: number
  round: number
  qualifying: JolpicaQualifyingResult[]
  race: (FastF1SessionExport & { status: string })[]
} = {
  schemaVersion: 'fastf1-export-v1',
  season: 2025,
  round: 3,
  qualifying: [
    { driverId: 'norris', constructorId: 'mclaren', position: '2', Q1: '1:27.845', Q2: '1:27.146', Q3: '1:26.995' },
    { driverId: 'piastri', constructorId: 'mclaren', position: '3', Q1: '1:27.687', Q2: '1:27.507', Q3: '1:27.027' },
  ],
  race: [
    {
      schemaVersion: 'fastf1-export-v1', season: 2025, round: 3, sessionType: 'Race',
      driverId: 'norris', constructorId: 'mclaren',
      gridPosition: 2, finishPosition: 2, classified: true, status: 'Finished',
      laps: [
        { lapNumber: 1, lapTimeMs: 95761, compound: 'medium', tyreLifeLaps: 1, stintNumber: 1, trackStatus: 'green', trackCondition: 'dry', isPitOutLap: false, isPitInLap: false, isAccurate: false, isDamaged: false, position: 2 },
        { lapNumber: 2, lapTimeMs: 93947, compound: 'medium', tyreLifeLaps: 2, stintNumber: 1, trackStatus: 'green', trackCondition: 'dry', isPitOutLap: false, isPitInLap: false, isAccurate: true, isDamaged: false, position: 2 },
        { lapNumber: 3, lapTimeMs: 93789, compound: 'medium', tyreLifeLaps: 3, stintNumber: 1, trackStatus: 'green', trackCondition: 'dry', isPitOutLap: false, isPitInLap: false, isAccurate: true, isDamaged: false, position: 2 },
        { lapNumber: 4, lapTimeMs: 93838, compound: 'medium', tyreLifeLaps: 4, stintNumber: 1, trackStatus: 'green', trackCondition: 'dry', isPitOutLap: false, isPitInLap: false, isAccurate: true, isDamaged: false, position: 2 },
        { lapNumber: 5, lapTimeMs: 93947, compound: 'medium', tyreLifeLaps: 5, stintNumber: 1, trackStatus: 'green', trackCondition: 'dry', isPitOutLap: false, isPitInLap: false, isAccurate: true, isDamaged: false, position: 2 },
        { lapNumber: 6, lapTimeMs: 93936, compound: 'medium', tyreLifeLaps: 6, stintNumber: 1, trackStatus: 'green', trackCondition: 'dry', isPitOutLap: false, isPitInLap: false, isAccurate: true, isDamaged: false, position: 2 },
        { lapNumber: 7, lapTimeMs: 93820, compound: 'medium', tyreLifeLaps: 7, stintNumber: 1, trackStatus: 'green', trackCondition: 'dry', isPitOutLap: false, isPitInLap: false, isAccurate: true, isDamaged: false, position: 2 },
        { lapNumber: 8, lapTimeMs: 93588, compound: 'medium', tyreLifeLaps: 8, stintNumber: 1, trackStatus: 'green', trackCondition: 'dry', isPitOutLap: false, isPitInLap: false, isAccurate: true, isDamaged: false, position: 2 },
        { lapNumber: 9, lapTimeMs: 93512, compound: 'medium', tyreLifeLaps: 9, stintNumber: 1, trackStatus: 'green', trackCondition: 'dry', isPitOutLap: false, isPitInLap: false, isAccurate: true, isDamaged: false, position: 2 },
        { lapNumber: 10, lapTimeMs: 93648, compound: 'medium', tyreLifeLaps: 10, stintNumber: 1, trackStatus: 'green', trackCondition: 'dry', isPitOutLap: false, isPitInLap: false, isAccurate: true, isDamaged: false, position: 2 },
        { lapNumber: 11, lapTimeMs: 93574, compound: 'medium', tyreLifeLaps: 11, stintNumber: 1, trackStatus: 'green', trackCondition: 'dry', isPitOutLap: false, isPitInLap: false, isAccurate: true, isDamaged: false, position: 2 },
        { lapNumber: 12, lapTimeMs: 93465, compound: 'medium', tyreLifeLaps: 12, stintNumber: 1, trackStatus: 'green', trackCondition: 'dry', isPitOutLap: false, isPitInLap: false, isAccurate: true, isDamaged: false, position: 2 },
        { lapNumber: 13, lapTimeMs: 93466, compound: 'medium', tyreLifeLaps: 13, stintNumber: 1, trackStatus: 'green', trackCondition: 'dry', isPitOutLap: false, isPitInLap: false, isAccurate: true, isDamaged: false, position: 2 },
        { lapNumber: 14, lapTimeMs: 93513, compound: 'medium', tyreLifeLaps: 14, stintNumber: 1, trackStatus: 'green', trackCondition: 'dry', isPitOutLap: false, isPitInLap: false, isAccurate: true, isDamaged: false, position: 2 },
        { lapNumber: 15, lapTimeMs: 93510, compound: 'medium', tyreLifeLaps: 15, stintNumber: 1, trackStatus: 'green', trackCondition: 'dry', isPitOutLap: false, isPitInLap: false, isAccurate: true, isDamaged: false, position: 2 },
        { lapNumber: 16, lapTimeMs: 93401, compound: 'medium', tyreLifeLaps: 16, stintNumber: 1, trackStatus: 'green', trackCondition: 'dry', isPitOutLap: false, isPitInLap: false, isAccurate: true, isDamaged: false, position: 2 },
        { lapNumber: 17, lapTimeMs: 93328, compound: 'medium', tyreLifeLaps: 17, stintNumber: 1, trackStatus: 'green', trackCondition: 'dry', isPitOutLap: false, isPitInLap: false, isAccurate: true, isDamaged: false, position: 2 },
        { lapNumber: 18, lapTimeMs: 93261, compound: 'medium', tyreLifeLaps: 18, stintNumber: 1, trackStatus: 'green', trackCondition: 'dry', isPitOutLap: false, isPitInLap: false, isAccurate: true, isDamaged: false, position: 2 },
        { lapNumber: 19, lapTimeMs: 92988, compound: 'medium', tyreLifeLaps: 19, stintNumber: 1, trackStatus: 'green', trackCondition: 'dry', isPitOutLap: false, isPitInLap: false, isAccurate: true, isDamaged: false, position: 2 },
        { lapNumber: 20, lapTimeMs: 93119, compound: 'medium', tyreLifeLaps: 20, stintNumber: 1, trackStatus: 'green', trackCondition: 'dry', isPitOutLap: false, isPitInLap: false, isAccurate: true, isDamaged: false, position: 2 },
        { lapNumber: 21, lapTimeMs: 95034, compound: 'medium', tyreLifeLaps: 21, stintNumber: 1, trackStatus: 'green', trackCondition: 'dry', isPitOutLap: false, isPitInLap: true, isAccurate: false, isDamaged: false, position: 2 },
        { lapNumber: 22, lapTimeMs: 114797, compound: 'hard', tyreLifeLaps: 1, stintNumber: 2, trackStatus: 'green', trackCondition: 'dry', isPitOutLap: true, isPitInLap: false, isAccurate: false, isDamaged: false, position: 6 },
        { lapNumber: 23, lapTimeMs: 92719, compound: 'hard', tyreLifeLaps: 2, stintNumber: 2, trackStatus: 'green', trackCondition: 'dry', isPitOutLap: false, isPitInLap: false, isAccurate: true, isDamaged: false, position: 6 },
        { lapNumber: 24, lapTimeMs: 92717, compound: 'hard', tyreLifeLaps: 3, stintNumber: 2, trackStatus: 'green', trackCondition: 'dry', isPitOutLap: false, isPitInLap: false, isAccurate: true, isDamaged: false, position: 5 },
        { lapNumber: 25, lapTimeMs: 92238, compound: 'hard', tyreLifeLaps: 4, stintNumber: 2, trackStatus: 'green', trackCondition: 'dry', isPitOutLap: false, isPitInLap: false, isAccurate: true, isDamaged: false, position: 5 },
        { lapNumber: 26, lapTimeMs: 92567, compound: 'hard', tyreLifeLaps: 5, stintNumber: 2, trackStatus: 'green', trackCondition: 'dry', isPitOutLap: false, isPitInLap: false, isAccurate: true, isDamaged: false, position: 4 },
        { lapNumber: 27, lapTimeMs: 92303, compound: 'hard', tyreLifeLaps: 6, stintNumber: 2, trackStatus: 'green', trackCondition: 'dry', isPitOutLap: false, isPitInLap: false, isAccurate: true, isDamaged: false, position: 4 },
        { lapNumber: 28, lapTimeMs: 92084, compound: 'hard', tyreLifeLaps: 7, stintNumber: 2, trackStatus: 'green', trackCondition: 'dry', isPitOutLap: false, isPitInLap: false, isAccurate: true, isDamaged: false, position: 4 },
        { lapNumber: 29, lapTimeMs: 92176, compound: 'hard', tyreLifeLaps: 8, stintNumber: 2, trackStatus: 'green', trackCondition: 'dry', isPitOutLap: false, isPitInLap: false, isAccurate: true, isDamaged: false, position: 4 },
        { lapNumber: 30, lapTimeMs: 92106, compound: 'hard', tyreLifeLaps: 9, stintNumber: 2, trackStatus: 'green', trackCondition: 'dry', isPitOutLap: false, isPitInLap: false, isAccurate: true, isDamaged: false, position: 3 },
      ],
    },
    {
      schemaVersion: 'fastf1-export-v1', season: 2025, round: 3, sessionType: 'Race',
      driverId: 'piastri', constructorId: 'mclaren',
      gridPosition: 3, finishPosition: 3, classified: true, status: 'Finished',
      laps: [
        { lapNumber: 1, lapTimeMs: 96482, compound: 'medium', tyreLifeLaps: 1, stintNumber: 1, trackStatus: 'green', trackCondition: 'dry', isPitOutLap: false, isPitInLap: false, isAccurate: false, isDamaged: false, position: 3 },
        { lapNumber: 2, lapTimeMs: 94084, compound: 'medium', tyreLifeLaps: 2, stintNumber: 1, trackStatus: 'green', trackCondition: 'dry', isPitOutLap: false, isPitInLap: false, isAccurate: true, isDamaged: false, position: 3 },
        { lapNumber: 3, lapTimeMs: 94042, compound: 'medium', tyreLifeLaps: 3, stintNumber: 1, trackStatus: 'green', trackCondition: 'dry', isPitOutLap: false, isPitInLap: false, isAccurate: true, isDamaged: false, position: 3 },
        { lapNumber: 4, lapTimeMs: 93699, compound: 'medium', tyreLifeLaps: 4, stintNumber: 1, trackStatus: 'green', trackCondition: 'dry', isPitOutLap: false, isPitInLap: false, isAccurate: true, isDamaged: false, position: 3 },
        { lapNumber: 5, lapTimeMs: 93967, compound: 'medium', tyreLifeLaps: 5, stintNumber: 1, trackStatus: 'green', trackCondition: 'dry', isPitOutLap: false, isPitInLap: false, isAccurate: true, isDamaged: false, position: 3 },
        { lapNumber: 6, lapTimeMs: 93831, compound: 'medium', tyreLifeLaps: 6, stintNumber: 1, trackStatus: 'green', trackCondition: 'dry', isPitOutLap: false, isPitInLap: false, isAccurate: true, isDamaged: false, position: 3 },
        { lapNumber: 7, lapTimeMs: 93849, compound: 'medium', tyreLifeLaps: 7, stintNumber: 1, trackStatus: 'green', trackCondition: 'dry', isPitOutLap: false, isPitInLap: false, isAccurate: true, isDamaged: false, position: 3 },
        { lapNumber: 8, lapTimeMs: 93772, compound: 'medium', tyreLifeLaps: 8, stintNumber: 1, trackStatus: 'green', trackCondition: 'dry', isPitOutLap: false, isPitInLap: false, isAccurate: true, isDamaged: false, position: 3 },
        { lapNumber: 9, lapTimeMs: 93590, compound: 'medium', tyreLifeLaps: 9, stintNumber: 1, trackStatus: 'green', trackCondition: 'dry', isPitOutLap: false, isPitInLap: false, isAccurate: true, isDamaged: false, position: 3 },
        { lapNumber: 10, lapTimeMs: 94175, compound: 'medium', tyreLifeLaps: 10, stintNumber: 1, trackStatus: 'green', trackCondition: 'dry', isPitOutLap: false, isPitInLap: false, isAccurate: true, isDamaged: false, position: 3 },
        { lapNumber: 11, lapTimeMs: 93479, compound: 'medium', tyreLifeLaps: 11, stintNumber: 1, trackStatus: 'green', trackCondition: 'dry', isPitOutLap: false, isPitInLap: false, isAccurate: true, isDamaged: false, position: 3 },
        { lapNumber: 12, lapTimeMs: 93334, compound: 'medium', tyreLifeLaps: 12, stintNumber: 1, trackStatus: 'green', trackCondition: 'dry', isPitOutLap: false, isPitInLap: false, isAccurate: true, isDamaged: false, position: 3 },
        { lapNumber: 13, lapTimeMs: 93253, compound: 'medium', tyreLifeLaps: 13, stintNumber: 1, trackStatus: 'green', trackCondition: 'dry', isPitOutLap: false, isPitInLap: false, isAccurate: true, isDamaged: false, position: 3 },
        { lapNumber: 14, lapTimeMs: 93560, compound: 'medium', tyreLifeLaps: 14, stintNumber: 1, trackStatus: 'green', trackCondition: 'dry', isPitOutLap: false, isPitInLap: false, isAccurate: true, isDamaged: false, position: 3 },
        { lapNumber: 15, lapTimeMs: 93361, compound: 'medium', tyreLifeLaps: 15, stintNumber: 1, trackStatus: 'green', trackCondition: 'dry', isPitOutLap: false, isPitInLap: false, isAccurate: true, isDamaged: false, position: 3 },
        { lapNumber: 16, lapTimeMs: 93572, compound: 'medium', tyreLifeLaps: 16, stintNumber: 1, trackStatus: 'green', trackCondition: 'dry', isPitOutLap: false, isPitInLap: false, isAccurate: true, isDamaged: false, position: 3 },
        { lapNumber: 17, lapTimeMs: 93667, compound: 'medium', tyreLifeLaps: 17, stintNumber: 1, trackStatus: 'green', trackCondition: 'dry', isPitOutLap: false, isPitInLap: false, isAccurate: true, isDamaged: false, position: 3 },
        { lapNumber: 18, lapTimeMs: 93660, compound: 'medium', tyreLifeLaps: 18, stintNumber: 1, trackStatus: 'green', trackCondition: 'dry', isPitOutLap: false, isPitInLap: false, isAccurate: true, isDamaged: false, position: 3 },
        { lapNumber: 19, lapTimeMs: 93435, compound: 'medium', tyreLifeLaps: 19, stintNumber: 1, trackStatus: 'green', trackCondition: 'dry', isPitOutLap: false, isPitInLap: false, isAccurate: true, isDamaged: false, position: 3 },
        { lapNumber: 20, lapTimeMs: 95359, compound: 'medium', tyreLifeLaps: 20, stintNumber: 1, trackStatus: 'green', trackCondition: 'dry', isPitOutLap: false, isPitInLap: true, isAccurate: false, isDamaged: false, position: 3 },
        { lapNumber: 21, lapTimeMs: 113035, compound: 'hard', tyreLifeLaps: 1, stintNumber: 2, trackStatus: 'green', trackCondition: 'dry', isPitOutLap: true, isPitInLap: false, isAccurate: false, isDamaged: false, position: 9 },
        { lapNumber: 22, lapTimeMs: 93844, compound: 'hard', tyreLifeLaps: 2, stintNumber: 2, trackStatus: 'green', trackCondition: 'dry', isPitOutLap: false, isPitInLap: false, isAccurate: true, isDamaged: false, position: 7 },
        { lapNumber: 23, lapTimeMs: 93017, compound: 'hard', tyreLifeLaps: 3, stintNumber: 2, trackStatus: 'green', trackCondition: 'dry', isPitOutLap: false, isPitInLap: false, isAccurate: true, isDamaged: false, position: 7 },
        { lapNumber: 24, lapTimeMs: 92386, compound: 'hard', tyreLifeLaps: 4, stintNumber: 2, trackStatus: 'green', trackCondition: 'dry', isPitOutLap: false, isPitInLap: false, isAccurate: true, isDamaged: false, position: 6 },
        { lapNumber: 25, lapTimeMs: 92399, compound: 'hard', tyreLifeLaps: 5, stintNumber: 2, trackStatus: 'green', trackCondition: 'dry', isPitOutLap: false, isPitInLap: false, isAccurate: true, isDamaged: false, position: 6 },
        { lapNumber: 26, lapTimeMs: 92440, compound: 'hard', tyreLifeLaps: 6, stintNumber: 2, trackStatus: 'green', trackCondition: 'dry', isPitOutLap: false, isPitInLap: false, isAccurate: true, isDamaged: false, position: 5 },
        { lapNumber: 27, lapTimeMs: 92435, compound: 'hard', tyreLifeLaps: 7, stintNumber: 2, trackStatus: 'green', trackCondition: 'dry', isPitOutLap: false, isPitInLap: false, isAccurate: true, isDamaged: false, position: 5 },
        { lapNumber: 28, lapTimeMs: 92142, compound: 'hard', tyreLifeLaps: 8, stintNumber: 2, trackStatus: 'green', trackCondition: 'dry', isPitOutLap: false, isPitInLap: false, isAccurate: true, isDamaged: false, position: 5 },
        { lapNumber: 29, lapTimeMs: 92181, compound: 'hard', tyreLifeLaps: 9, stintNumber: 2, trackStatus: 'green', trackCondition: 'dry', isPitOutLap: false, isPitInLap: false, isAccurate: true, isDamaged: false, position: 5 },
        { lapNumber: 30, lapTimeMs: 92047, compound: 'hard', tyreLifeLaps: 10, stintNumber: 2, trackStatus: 'green', trackCondition: 'dry', isPitOutLap: false, isPitInLap: false, isAccurate: true, isDamaged: false, position: 5 },
      ],
    },
  ],
}
