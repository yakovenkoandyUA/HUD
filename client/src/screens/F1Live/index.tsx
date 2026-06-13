import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppHeader from '../../components/AppHeader'
import { useOpenF1 } from '../../hooks/useOpenF1'
import { authFetch } from '../../services/api'
import styles from './F1Live.module.css'

/**
 * F1Live
 * ------
 * Live Race Dashboard — доступний тільки під час активної сесії.
 * Поза гонкою редіректить на /f1.
 *
 * Sections: Race Info header / Live Standings / Circuit Map
 */

// ── Types ────────────────────────────────────────────────────────────────────

interface OpenF1Session {
  session_key: number
  session_name: string
  session_type: string
  meeting_name: string
  date_start: string
  date_end: string
}

interface OpenF1Driver {
  driver_number: number
  broadcast_name: string
  name_acronym: string
  team_name: string
  team_colour: string
  headshot_url: string
}

interface OpenF1Position {
  driver_number: number
  position: number
  date: string
}

interface OpenF1Interval {
  driver_number: number
  gap_to_leader: number | null
  interval: number | null
  date: string
}

interface OpenF1Stint {
  driver_number: number
  compound: string
  tyre_age_at_start: number
  lap_start: number
  lap_end: number | null
}

interface OpenF1Lap {
  driver_number: number
  lap_number: number
  date_start: string
}

interface OpenF1Location {
  driver_number: number
  x: number
  y: number
  date: string
}

interface DriverRow {
  number: number
  pos: number
  acronym: string
  team: string
  colour: string
  gap: string
  compound: string
  tyreAge: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const COMPOUND_COLOR: Record<string, string> = {
  SOFT:     '#e8002d',
  MEDIUM:   '#ffd600',
  HARD:     '#e8e8e8',
  INTER:    '#39b54a',
  WET:      '#0067ff',
  UNKNOWN:  '#888',
}

function fmtGap(val: number | null | undefined): string {
  if (val === null || val === undefined) return '—'
  if (val === 0) return 'LEADER'
  return `+${val.toFixed(3)}`
}

function isSessionActive(s: OpenF1Session): boolean {
  const now  = Date.now()
  const start = new Date(s.date_start).getTime() - 4 * 60 * 60 * 1000
  const end   = new Date(s.date_end).getTime()   + 60 * 60 * 1000
  return now >= start && now <= end
}

// ── Component ─────────────────────────────────────────────────────────────────

const F1Live: React.FC = () => {
  const navigate = useNavigate()

  // ── Active session detection ──────────────────────────────────────────────
  const [sessionKey, setSessionKey] = useState<number | null>(null)
  const [sessionName, setSessionName] = useState('')
  const [checking, setChecking]     = useState(true)

  useEffect(() => {
    let cancelled = false
    const check = async () => {
      try {
        const res = await authFetch('/api/f1/live/sessions?meeting_key=latest')
        if (!res.ok) throw new Error()
        const sessions: OpenF1Session[] = await res.json()
        if (cancelled) return
        const active = sessions.find(isSessionActive)
        if (active) {
          setSessionKey(active.session_key)
          setSessionName(`${active.meeting_name} — ${active.session_name}`)
        } else {
          navigate('/f1', { replace: true })
        }
      } catch {
        if (!cancelled) navigate('/f1', { replace: true })
      } finally {
        if (!cancelled) setChecking(false)
      }
    }
    check()
    const timer = setInterval(check, 60_000)
    return () => { cancelled = true; clearInterval(timer) }
  }, [])

  // ── Lap counter ───────────────────────────────────────────────────────────
  const { data: laps } = useOpenF1<OpenF1Lap[]>(
    'laps', { session_key: sessionKey ?? 0 }, 10_000, !!sessionKey
  )
  const currentLap = laps ? Math.max(...laps.map(l => l.lap_number), 0) : 0

  // ── Drivers (fetch once) ──────────────────────────────────────────────────
  const { data: drivers } = useOpenF1<OpenF1Driver[]>(
    'drivers', { session_key: sessionKey ?? 0 }, 300_000, !!sessionKey
  )

  // ── Positions ─────────────────────────────────────────────────────────────
  const { data: positions } = useOpenF1<OpenF1Position[]>(
    'position', { session_key: sessionKey ?? 0 }, 5_000, !!sessionKey
  )

  // ── Intervals ─────────────────────────────────────────────────────────────
  const { data: intervals } = useOpenF1<OpenF1Interval[]>(
    'intervals', { session_key: sessionKey ?? 0 }, 5_000, !!sessionKey
  )

  // ── Stints (tyre info) ────────────────────────────────────────────────────
  const { data: stints } = useOpenF1<OpenF1Stint[]>(
    'stints', { session_key: sessionKey ?? 0 }, 30_000, !!sessionKey
  )

  // ── Location (circuit map) ────────────────────────────────────────────────
  const { data: locations } = useOpenF1<OpenF1Location[]>(
    'location', { session_key: sessionKey ?? 0 }, 3_000, !!sessionKey
  )

  // ── Build standings rows ──────────────────────────────────────────────────
  const rows: DriverRow[] = React.useMemo(() => {
    if (!drivers || !positions) return []

    // Latest position per driver
    const latestPos = new Map<number, number>()
    positions.forEach(p => {
      const prev = latestPos.get(p.driver_number)
      if (!prev) latestPos.set(p.driver_number, p.position)
    })

    // Latest interval per driver
    const latestGap = new Map<number, number | null>()
    intervals?.forEach(i => { latestGap.set(i.driver_number, i.gap_to_leader) })

    // Latest stint per driver
    const latestStint = new Map<number, OpenF1Stint>()
    stints?.forEach(s => {
      const prev = latestStint.get(s.driver_number)
      if (!prev || s.lap_start > prev.lap_start) latestStint.set(s.driver_number, s)
    })

    const driverMap = new Map(drivers.map(d => [d.driver_number, d]))

    return Array.from(latestPos.entries())
      .map(([num, pos]) => {
        const d     = driverMap.get(num)
        const stint = latestStint.get(num)
        return {
          number:   num,
          pos,
          acronym:  d?.name_acronym ?? String(num),
          team:     d?.team_name ?? '',
          colour:   d ? `#${d.team_colour}` : '#888',
          gap:      fmtGap(latestGap.get(num)),
          compound: stint?.compound ?? 'UNKNOWN',
          tyreAge:  stint ? (currentLap - stint.lap_start + (stint.tyre_age_at_start ?? 0)) : 0,
        }
      })
      .sort((a, b) => a.pos - b.pos)
  }, [drivers, positions, intervals, stints, currentLap])

  // ── Latest location per driver ────────────────────────────────────────────
  const latestLocations = React.useMemo(() => {
    const map = new Map<number, OpenF1Location>()
    locations?.forEach(l => {
      const prev = map.get(l.driver_number)
      if (!prev || l.date > prev.date) map.set(l.driver_number, l)
    })
    return map
  }, [locations])

  // ── SVG coordinate normalization ──────────────────────────────────────────
  const svgRef = useRef<SVGSVGElement>(null)
  const [svgBounds, setSvgBounds] = useState<{ minX: number; maxX: number; minY: number; maxY: number } | null>(null)

  useEffect(() => {
    if (!locations || locations.length === 0) return
    const xs = locations.map(l => l.x)
    const ys = locations.map(l => l.y)
    setSvgBounds({
      minX: Math.min(...xs), maxX: Math.max(...xs),
      minY: Math.min(...ys), maxY: Math.max(...ys),
    })
  }, [!!locations])

  function toSvgCoords(x: number, y: number, W = 280, H = 200): { cx: number; cy: number } {
    if (!svgBounds) return { cx: W / 2, cy: H / 2 }
    const pad = 16
    const cx = pad + ((x - svgBounds.minX) / (svgBounds.maxX - svgBounds.minX)) * (W - pad * 2)
    const cy = pad + ((y - svgBounds.minY) / (svgBounds.maxY - svgBounds.minY)) * (H - pad * 2)
    return { cx, cy }
  }

  if (checking) {
    return (
      <div className={styles.screen}>
        <AppHeader />
        <div className={styles.loading}>Перевіряємо сесію…</div>
      </div>
    )
  }

  return (
    <div className={styles.screen}>
      <AppHeader />
      <div className={styles.content}>

        {/* ── Race Info ── */}
        <div className={styles.raceInfo}>
          <span className={styles.raceName}>{sessionName}</span>
          {currentLap > 0 && (
            <span className={styles.lapBadge}>КРУГ {currentLap}</span>
          )}
        </div>

        {/* ── Circuit Map ── */}
        {svgBounds && (
          <div className={styles.mapWrap}>
            <svg ref={svgRef} viewBox="0 0 280 200" className={styles.mapSvg}>
              {Array.from(latestLocations.values()).map(loc => {
                const d = rows.find(r => r.number === loc.driver_number)
                const { cx, cy } = toSvgCoords(loc.x, loc.y)
                return (
                  <g key={loc.driver_number}>
                    <circle cx={cx} cy={cy} r={5} fill={d?.colour ?? '#888'} />
                    <text x={cx} y={cy - 7} textAnchor="middle" fontSize="6" fill="var(--text)" fontFamily="var(--font-mono)">
                      {d?.acronym ?? loc.driver_number}
                    </text>
                  </g>
                )
              })}
            </svg>
          </div>
        )}

        {/* ── Live Standings ── */}
        <div className={styles.standings}>
          {rows.map(row => (
            <div key={row.number} className={styles.row}>
              <span className={styles.pos}>{row.pos}</span>
              <span className={styles.bar} style={{ background: row.colour }} />
              <span className={styles.acronym}>{row.acronym}</span>
              <span className={styles.team}>{row.team}</span>
              <span className={styles.gap}>{row.gap}</span>
              <span
                className={styles.tyre}
                style={{ background: COMPOUND_COLOR[row.compound] ?? '#888' }}
                title={row.compound}
              >
                {row.compound[0]}
              </span>
              <span className={styles.tyreAge}>{row.tyreAge}к</span>
            </div>
          ))}
          {rows.length === 0 && (
            <p className={styles.empty}>Чекаємо на дані…</p>
          )}
        </div>

      </div>
    </div>
  )
}

export default F1Live
