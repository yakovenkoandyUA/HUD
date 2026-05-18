import React, { useEffect, useRef, useState } from 'react'
import styles from './TrackSVG.module.css'

/**
 * TrackSVG
 * --------
 * Завантажує SVG треку, парсить path і рендерить inline SVG.
 * При animated=true: draw-path через getTotalLength() + CSS transition.
 *
 * Props:
 * @prop {string}  src           — URL до SVG файлу (/tracks/Monaco.svg)
 * @prop {string}  color         — CSS-значення stroke ('var(--accent)' тощо)
 * @prop {number}  [strokeWidth=1.5]
 * @prop {boolean} [animated=true] — увімкнути draw-path анімацію на mount
 * @prop {string}  [className]
 */
interface TrackSVGProps {
  src: string
  color: string
  strokeWidth?: number
  animated?: boolean
  className?: string
}

interface TrackData {
  viewBox: string
  d: string
}

const cache = new Map<string, TrackData>()

const TrackSVG: React.FC<TrackSVGProps> = ({
  src,
  color,
  strokeWidth = 1.5,
  animated = true,
  className,
}) => {
  const [track, setTrack] = useState<TrackData | null>(cache.get(src) ?? null)
  const pathRef = useRef<SVGPathElement>(null)

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

  // ── Draw-path animation via getTotalLength() ───────────────────────────────
  useEffect(() => {
    if (!animated || !track) return
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
  }, [track, animated])

  if (!track) return <div className={`${styles.placeholder} ${className ?? ''}`} />

  return (
    <svg
      key={src}
      viewBox={track.viewBox}
      fill="none"
      className={`${styles.svg} ${className ?? ''}`}
      aria-hidden="true"
    >
      <path
        ref={pathRef}
        d={track.d}
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
