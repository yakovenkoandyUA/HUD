import React, { useEffect, useRef, useState } from 'react'
import styles from './TrackSVG.module.css'

/**
 * TrackSVG
 * --------
 * Завантажує SVG треку, парсить path і рендерить inline SVG.
 * При animated=true: draw-path через getTotalLength() + CSS transition.
 *
 * Якщо передано startOffset (0-1) — контур перед анімацією "перекроюється"
 * так, щоб малювання починалось саме зі старт/фінішу (а не з довільної
 * першої точки трасування SVG), і йшло по колу назад до тієї ж точки.
 * Обчислюється через нативні DOM-методи getTotalLength/getPointAtLength
 * на прихованому eталонному path з оригінальним d.
 *
 * Props:
 * @prop {string}  src           — URL до SVG файлу (/tracks/Monaco.svg)
 * @prop {string}  color         — CSS-значення stroke ('var(--accent)' тощо)
 * @prop {number}  [strokeWidth=1.5]
 * @prop {boolean} [animated=true]             — увімкнути draw-path анімацію на mount
 * @prop {number}  [startOffset]               — 0-1, де на контурі старт/фініш
 * @prop {string}  [preserveAspectRatio]       — SVG preserveAspectRatio атрибут
 * @prop {string}  [className]
 */
interface TrackSVGProps {
  src: string
  color: string
  strokeWidth?: number
  animated?: boolean
  startOffset?: number
  preserveAspectRatio?: string
  className?: string
}

interface TrackData {
  viewBox: string
  d: string
}

const cache = new Map<string, TrackData>()

const rotatedCache = new Map<string, string>()

const TrackSVG: React.FC<TrackSVGProps> = ({
  src,
  color,
  strokeWidth = 1.5,
  animated = true,
  startOffset,
  preserveAspectRatio = 'xMidYMid meet',
  className,
}) => {
  const [track, setTrack] = useState<TrackData | null>(cache.get(src) ?? null)
  const rotatedKey = startOffset !== undefined ? `${src}:${startOffset}` : null
  const [displayD, setDisplayD] = useState<string | null>(rotatedKey ? rotatedCache.get(rotatedKey) ?? null : null)
  const pathRef = useRef<SVGPathElement>(null)
  const measureRef = useRef<SVGPathElement>(null)

  // ── Fetch & parse SVG ──────────────────────────────────────────────────────
  useEffect(() => {
    if (cache.has(src)) return
    let cancelled = false
    fetch(src)
      .then((r) => r.text())
      .then((text) => {
        if (cancelled) return
        const doc = new DOMParser().parseFromString(text, 'image/svg+xml')
        const svgEl = doc.querySelector('svg')
        const pathEl = doc.querySelector('path')
        if (!svgEl || !pathEl) return
        const data: TrackData = {
          viewBox: svgEl.getAttribute('viewBox') ?? '0 0 100 100',
          d: pathEl.getAttribute('d') ?? '',
        }
        cache.set(src, data)
        setTrack(data)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [src])

  // ── Rotate the contour so it starts at startOffset (start/finish line) ────
  // Samples the original path via native getPointAtLength() and rebuilds it
  // as a polyline beginning at that point, wrapping the full loop back to it.
  useEffect(() => {
    if (!track || !rotatedKey) { setDisplayD(null); return }
    if (rotatedCache.has(rotatedKey)) { setDisplayD(rotatedCache.get(rotatedKey)!); return }
    const measure = measureRef.current
    if (!measure) return
    const len = measure.getTotalLength()
    if (!len) return
    const SAMPLES = 400
    const startLen = (startOffset ?? 0) * len
    const pts: string[] = []
    for (let i = 0; i <= SAMPLES; i++) {
      const l = (startLen + (i / SAMPLES) * len) % len
      const p = measure.getPointAtLength(l)
      pts.push(`${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
    }
    const d = pts.join(' ')
    rotatedCache.set(rotatedKey, d)
    setDisplayD(d)
  }, [track, rotatedKey, startOffset])

  // ── Draw-path animation via getTotalLength() ───────────────────────────────
  useEffect(() => {
    if (!animated || !track) return
    if (rotatedKey && !displayD) return // wait for rotation to finish first
    const path = pathRef.current
    if (!path) return

    const length = path.getTotalLength()
    path.style.strokeDasharray = `${length}`
    path.style.strokeDashoffset = `${length}`
    path.style.transition = 'none'

    // Force reflow so transition applies cleanly
    void path.getBoundingClientRect()

    const timer = setTimeout(() => {
      path.style.transition = 'stroke-dashoffset 3.5s cubic-bezier(0.4, 0, 0.2, 1)'
      path.style.strokeDashoffset = '0'
    }, 500)

    return () => clearTimeout(timer)
  }, [track, animated, displayD, rotatedKey])

  if (!track) return <div className={`${styles.placeholder} ${className ?? ''}`} />

  return (
    <svg
      key={src}
      viewBox={track.viewBox}
      fill="none"
      preserveAspectRatio={preserveAspectRatio}
      className={`${styles.svg} ${className ?? ''}`}
      aria-hidden="true"
    >
      {rotatedKey && (
        <path ref={measureRef} d={track.d} style={{ opacity: 0 }} />
      )}
      <path
        ref={pathRef}
        d={displayD ?? track.d}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={animated ? undefined : styles.pathStatic}
      />
    </svg>
  )
}

export default TrackSVG
