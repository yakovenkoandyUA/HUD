import React from 'react'
import styles from './RadarChart.module.css'

interface RadarAxis {
  key: string
  label: string
}

interface Props {
  /** Axes to render, in clockwise order starting from the top */
  axes: RadarAxis[]
  /** Score per axis key, 0–max */
  values: Record<string, number>
  /** Max value per axis, default 5 */
  max?: number
  /** Size in px, default 200 */
  size?: number
}

function polarToXY(angleDeg: number, r: number, cx: number, cy: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

/**
 * RadarChart — generic SVG radar/spider chart for an N-axis 0..max profile.
 */
const RadarChart: React.FC<Props> = ({ axes, values, max = 5, size = 200 }) => {
  const cx = size / 2
  const cy = size / 2
  const maxR = size * 0.38
  const n = axes.length
  const step = 360 / n
  const levels = max

  const rings = Array.from({ length: levels }, (_, i) => {
    const r = (maxR / levels) * (i + 1)
    return axes.map((_, j) => {
      const { x, y } = polarToXY(j * step, r, cx, cy)
      return `${x},${y}`
    }).join(' ')
  })

  const axisLines = axes.map((_, i) => polarToXY(i * step, maxR, cx, cy))

  const dataPoints = axes.map((axis, i) => {
    const val = Math.min(Math.max(values[axis.key] ?? 0, 0), max)
    const r = (val / max) * maxR
    return polarToXY(i * step, r, cx, cy)
  })
  const dataPolygon = dataPoints.map(p => `${p.x},${p.y}`).join(' ')

  const labelR = maxR + size * 0.14
  const labels = axes.map((axis, i) => {
    const { x, y } = polarToXY(i * step, labelR, cx, cy)
    const val = values[axis.key] ?? 0
    return { ...axis, x, y, val }
  })

  return (
    <div className={styles.wrap}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {rings.map((pts, i) => (
          <polygon key={i} points={pts} className={styles.ring} />
        ))}

        {axisLines.map(({ x, y }, i) => (
          <line key={i} x1={cx} y1={cy} x2={x} y2={y} className={styles.axis} />
        ))}

        <polygon points={dataPolygon} className={styles.dataFill} />
        <polygon points={dataPolygon} className={styles.dataStroke} />

        {dataPoints.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3} className={styles.dot} />
        ))}
      </svg>

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
            <span className={styles.labelVal}>{val}/{max}</span>
          </div>
        )
      })}
    </div>
  )
}

export default RadarChart
export type { RadarAxis }
