import React from 'react'
import type { FlavorProfile } from '../../types'
import styles from './FlavorRadar.module.css'

interface Props {
  /** Flavor scores 0–5 */
  flavor: FlavorProfile
  /** Size in px, default 200 */
  size?: number
}

const AXES: { key: keyof FlavorProfile; label: string }[] = [
  { key: 'sweet',  label: 'СОЛОДКІСТЬ' },
  { key: 'smoky',  label: 'ДИМНІСТЬ'   },
  { key: 'fruity', label: 'ФРУКТОВІСТЬ' },
  { key: 'spicy',  label: 'ПРЯНІСТЬ'   },
  { key: 'woody',  label: 'ДЕРЕВИНА'   },
  { key: 'floral', label: 'КВІТКОВІСТЬ' },
]

const MAX = 5
const LEVELS = 5

function polarToXY(angleDeg: number, r: number, cx: number, cy: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

/**
 * FlavorRadar — SVG radar chart for drink flavor profile.
 */
const FlavorRadar: React.FC<Props> = ({ flavor, size = 200 }) => {
  const cx = size / 2
  const cy = size / 2
  const maxR = size * 0.38
  const n = AXES.length
  const step = 360 / n

  // background grid rings
  const rings = Array.from({ length: LEVELS }, (_, i) => {
    const r = (maxR / LEVELS) * (i + 1)
    const pts = AXES.map((_, j) => {
      const { x, y } = polarToXY(j * step, r, cx, cy)
      return `${x},${y}`
    }).join(' ')
    return pts
  })

  // axis lines
  const axisLines = AXES.map((_, i) => {
    const { x, y } = polarToXY(i * step, maxR, cx, cy)
    return { x, y }
  })

  // data polygon
  const dataPoints = AXES.map((axis, i) => {
    const val = Math.min(Math.max(flavor[axis.key] ?? 0, 0), MAX)
    const r = (val / MAX) * maxR
    return polarToXY(i * step, r, cx, cy)
  })
  const dataPolygon = dataPoints.map(p => `${p.x},${p.y}`).join(' ')

  // label positions (slightly outside maxR)
  const labelR = maxR + size * 0.14
  const labels = AXES.map((axis, i) => {
    const { x, y } = polarToXY(i * step, labelR, cx, cy)
    const val = flavor[axis.key] ?? 0
    return { ...axis, x, y, val }
  })

  return (
    <div className={styles.wrap}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Grid rings */}
        {rings.map((pts, i) => (
          <polygon key={i} points={pts} className={styles.ring} />
        ))}

        {/* Axis lines */}
        {axisLines.map(({ x, y }, i) => (
          <line key={i} x1={cx} y1={cy} x2={x} y2={y} className={styles.axis} />
        ))}

        {/* Data fill */}
        <polygon points={dataPolygon} className={styles.dataFill} />
        <polygon points={dataPolygon} className={styles.dataStroke} />

        {/* Data dots */}
        {dataPoints.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3} className={styles.dot} />
        ))}
      </svg>

      {/* Labels positioned absolutely relative to .wrap */}
      {labels.map(({ key, label, x, y, val }) => {
        const relX = (x / size) * 100
        const relY = (y / size) * 100
        return (
          <div
            key={key}
            className={styles.label}
            style={{ left: `${relX}%`, top: `${relY}%` }}
          >
            <span className={styles.labelName}>{label}</span>
            <span className={styles.labelVal}>{val}/5</span>
          </div>
        )
      })}
    </div>
  )
}

export default FlavorRadar
