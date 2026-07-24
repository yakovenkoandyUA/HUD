import type { SportEventInput, WorkoutMetric } from '../store/sportStore'

/** Haversine distance between two lat/lon points in km */
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function text(el: Element | null, tag: string): string {
  return el?.getElementsByTagName(tag)[0]?.textContent?.trim() ?? ''
}

function num(el: Element | null, tag: string): number | null {
  const v = parseFloat(text(el, tag))
  return isNaN(v) ? null : v
}

// ── GPX ───────────────────────────────────────────────────────────────────────

function parseGpx(doc: Document): SportEventInput {
  const trk   = doc.getElementsByTagName('trk')[0]
  const name  = text(trk, 'name') || 'Тренування'
  const trkpts = Array.from(doc.getElementsByTagName('trkpt'))

  let distanceKm    = 0
  let elevationGain = 0
  let prevLat: number | null = null
  let prevLon: number | null = null
  let prevEle: number | null = null
  let totalHr = 0
  let hrCount = 0

  const times: number[] = []

  for (const pt of trkpts) {
    const lat = parseFloat(pt.getAttribute('lat') ?? '')
    const lon = parseFloat(pt.getAttribute('lon') ?? '')
    const ele = parseFloat(text(pt, 'ele'))
    const timeStr = text(pt, 'time')
    if (timeStr) times.push(new Date(timeStr).getTime())

    if (!isNaN(lat) && !isNaN(lon)) {
      if (prevLat !== null && prevLon !== null) {
        distanceKm += haversine(prevLat, prevLon, lat, lon)
      }
      prevLat = lat; prevLon = lon
    }

    if (!isNaN(ele) && prevEle !== null && ele > prevEle) {
      elevationGain += ele - prevEle
    }
    if (!isNaN(ele)) prevEle = ele

    // heart rate in extensions (gpxtpx:hr or ns3:hr)
    const hrTags = ['gpxtpx:hr', 'ns3:hr', 'hr']
    for (const tag of hrTags) {
      const hrEl = pt.getElementsByTagName(tag)[0]
      if (hrEl?.textContent) {
        const v = parseFloat(hrEl.textContent)
        if (!isNaN(v)) { totalHr += v; hrCount++; break }
      }
    }
  }

  const date = times.length
    ? new Date(times[0]).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10)

  const durationMin = times.length >= 2
    ? Math.round((times[times.length - 1] - times[0]) / 60000)
    : null

  const metrics: WorkoutMetric[] = []
  if (distanceKm > 0.01) metrics.push({ name: 'Дистанція', value: distanceKm.toFixed(2), unit: 'км' })
  if (elevationGain > 1) metrics.push({ name: 'Набір висоти', value: String(Math.round(elevationGain)), unit: 'м' })
  if (hrCount > 0) metrics.push({ name: 'Пульс (сер)', value: String(Math.round(totalHr / hrCount)), unit: 'уд/хв' })

  return { date, title: name, duration: durationMin, metrics, notes: '' }
}

// ── TCX ───────────────────────────────────────────────────────────────────────

function parseTcx(doc: Document): SportEventInput {
  const activity = doc.getElementsByTagName('Activity')[0]
  const sport    = activity?.getAttribute('Sport') ?? ''
  const idStr    = text(activity, 'Id')

  const date = idStr
    ? new Date(idStr).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10)

  const laps = Array.from(activity?.getElementsByTagName('Lap') ?? [])
  let totalSec = 0, totalM = 0, totalCal = 0, totalHr = 0, hrCount = 0

  for (const lap of laps) {
    totalSec += num(lap, 'TotalTimeSeconds') ?? 0
    totalM   += num(lap, 'DistanceMeters')   ?? 0
    totalCal += num(lap, 'Calories')         ?? 0
    const hrEl = lap.getElementsByTagName('AverageHeartRateBpm')[0]
    const hr   = num(hrEl, 'Value')
    if (hr) { totalHr += hr; hrCount++ }
  }

  const SPORT_LABELS: Record<string, string> = {
    Running: 'Пробіжка', Cycling: 'Велосипед', Swimming: 'Плавання', Other: 'Тренування',
  }
  const title = SPORT_LABELS[sport] ?? sport || 'Тренування'

  const metrics: WorkoutMetric[] = []
  if (totalM > 10) metrics.push({ name: 'Дистанція', value: (totalM / 1000).toFixed(2), unit: 'км' })
  if (totalCal > 0) metrics.push({ name: 'Калорії', value: String(Math.round(totalCal)), unit: 'ккал' })
  if (hrCount > 0) metrics.push({ name: 'Пульс (сер)', value: String(Math.round(totalHr / hrCount)), unit: 'уд/хв' })

  return {
    date,
    title,
    duration: totalSec > 0 ? Math.round(totalSec / 60) : null,
    metrics,
    notes: '',
  }
}

// ── Public ────────────────────────────────────────────────────────────────────

/**
 * Parses a .gpx or .tcx file into SportEventInput.
 * Uses browser DOMParser — no external deps.
 */
export function parseWorkoutFile(file: File): Promise<SportEventInput> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        const isGpx = file.name.toLowerCase().endsWith('.gpx')
        const mimeType = isGpx ? 'application/xml' : 'application/xml'
        const doc = new DOMParser().parseFromString(text, mimeType)
        const result = isGpx ? parseGpx(doc) : parseTcx(doc)
        resolve(result)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error('Помилка читання файлу'))
    reader.readAsText(file)
  })
}
