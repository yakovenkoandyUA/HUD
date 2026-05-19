import React, { useState, useEffect, useCallback } from 'react'
import type { Transaction } from '../../../types'
import { fmt } from '../../../utils/finance'
import styles from './ShoppingTracker.module.css'

/**
 * ShoppingTracker
 * ---------------
 * SVG donut chart витрат по категоріях за місяць/тиждень.
 * Сегменти анімовані через strokeDasharray + staggered delay.
 * Перехід між періодами: fade-scale out → update → animate in.
 *
 * Props:
 * @prop {Transaction[]} transactions — всі транзакції
 */
interface ShoppingTrackerProps {
  transactions: Transaction[]
}

type Period = 'month' | 'week'

// ── Donut geometry ────────────────────────────────────────────────────────────
const CX = 80, CY = 80, R = 56, STROKE = 20
const C = 2 * Math.PI * R   // full circumference ≈ 351.86
const GAP_DEG = 0            // no gap between segments

// ── Category config ───────────────────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
  кава:             '#8B5E3C',
  продукти:         '#4A8B3C',
  таксі:            '#E67E22',
  метро:            '#3498DB',
  транспорт:        '#E67E22',
  фібі:             '#9B59B6',
  інше:             '#6c757d',
  'транспорт-інше': '#E67E22',
}

const CATEGORY_LABEL: Record<string, string> = {
  кава:             'Кава',
  продукти:         'Продукти',
  таксі:            'Таксі',
  метро:            'Метро',
  транспорт:        'Транспорт',
  фібі:             'Фібі',
  інше:             'Інше',
  'транспорт-інше': 'Транспорт',
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getPeriodPrefix(period: Period): string {
  const d = new Date()
  if (period === 'month') return d.toISOString().slice(0, 7)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const mon = new Date(d)
  mon.setDate(diff)
  return mon.toISOString().slice(0, 10)
}

interface CatStat { category: string; total: number; count: number }

interface Segment extends CatStat {
  color: string
  startAngle: number   // degrees, after gap padding
  visLen: number       // visible arc length in SVG units
  delay: number        // stagger delay ms
}

function buildSegments(stats: CatStat[], grandTotal: number): Segment[] {
  const hasMany = stats.length > 1
  let cumAngle = 0
  return stats.map((s, i) => {
    const angle = (s.total / grandTotal) * 360
    const gapHalf = hasMany ? GAP_DEG / 2 : 0
    const visAngle = Math.max(0, angle - (hasMany ? GAP_DEG : 0))
    const visLen = (visAngle / 360) * C
    const startAngle = cumAngle + gapHalf
    cumAngle += angle
    return {
      ...s,
      color: CATEGORY_COLORS[s.category] ?? '#6c757d',
      startAngle,
      visLen,
      delay: i * 75,
    }
  })
}

// ── Component ─────────────────────────────────────────────────────────────────
const ShoppingTracker: React.FC<ShoppingTrackerProps> = ({ transactions }) => {
  const [period, setPeriod] = useState<Period>('month')
  const [animated, setAnimated] = useState(false)
  const [exiting, setExiting] = useState(false)

  // Compute stats from current period
  const prefix = getPeriodPrefix(period)
  const expenses = transactions.filter(
    (t) => t.type === 'expense' && t.date.startsWith(prefix)
  )
  const grouped: Record<string, CatStat> = {}
  for (const t of expenses) {
    const cat = t.category ?? 'інше'
    if (!grouped[cat]) grouped[cat] = { category: cat, total: 0, count: 0 }
    grouped[cat].total += t.amount
    grouped[cat].count += 1
  }
  const stats = Object.values(grouped).sort((a, b) => b.total - a.total)
  const grandTotal = stats.reduce((s, c) => s + c.total, 0)
  const segments = grandTotal > 0 ? buildSegments(stats, grandTotal) : []

  // Initial mount animation
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 60)
    return () => clearTimeout(t)
  }, [])

  // Period switch: fade-scale out → update → animate in
  const switchPeriod = useCallback((p: Period) => {
    if (p === period) return
    setExiting(true)
    setAnimated(false)
    const t1 = setTimeout(() => {
      setPeriod(p)
      setExiting(false)
    }, 220)
    const t2 = setTimeout(() => setAnimated(true), 290)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [period])

  const isEmpty = segments.length === 0

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.title}>Витрати по категоріях</span>
        <div className={styles.toggle}>
          <button
            className={`${styles.toggleBtn} ${period === 'month' ? styles.toggleActive : ''}`}
            onClick={() => switchPeriod('month')}
          >Місяць</button>
          <button
            className={`${styles.toggleBtn} ${period === 'week' ? styles.toggleActive : ''}`}
            onClick={() => switchPeriod('week')}
          >Тиждень</button>
        </div>
      </div>

      {isEmpty ? (
        <p className={styles.empty}>Витрат за цей період немає</p>
      ) : (
        <div className={styles.body}>
          {/* ── Donut chart ── */}
          <div
            className={styles.chartWrap}
            style={{
              opacity:   exiting ? 0.15 : 1,
              transform: exiting ? 'scale(0.91)' : 'scale(1)',
            }}
          >
            <svg
              width={CX * 2}
              height={CY * 2}
              viewBox={`0 0 ${CX * 2} ${CY * 2}`}
              className={styles.svg}
              overflow="visible"
            >
              <defs>
                {/* Drop shadow for segments group */}
                <filter id="donut-shadow" x="-30%" y="-30%" width="160%" height="160%">
                  <feDropShadow
                    dx="0" dy="3" stdDeviation="5"
                    floodColor="rgba(0,0,0,1)" floodOpacity="0.45"
                  />
                </filter>
              </defs>

              {/* 1. Outer depth shadow ring (wide, dark, slightly offset) */}
              <circle
                cx={CX} cy={CY + 3} r={R}
                fill="none"
                stroke="rgba(0,0,0,0.22)"
                strokeWidth={STROKE + 8}
              />

              {/* 2. Background ring */}
              <circle
                cx={CX} cy={CY} r={R}
                fill="none"
                stroke="var(--surface2)"
                strokeWidth={STROKE}
              />

              {/* 3. Colored segments with drop-shadow filter */}
              <g filter="url(#donut-shadow)">
                {segments.map((seg) => (
                  <circle
                    key={seg.category}
                    cx={CX} cy={CY} r={R}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth={STROKE}
                    strokeLinecap="butt"
                    strokeDasharray={
                      animated
                        ? `${seg.visLen.toFixed(2)} ${C.toFixed(2)}`
                        : `0 ${C.toFixed(2)}`
                    }
                    strokeDashoffset={0}
                    transform={`rotate(${seg.startAngle - 90} ${CX} ${CY})`}
                    style={{
                      transition: `stroke-dasharray 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${seg.delay}ms`,
                    }}
                  />
                ))}
              </g>

              {/* 4. Divider lines between segments */}
              {segments.length > 1 && segments.map((seg, i) => {
                const rad = ((seg.startAngle - 90) * Math.PI) / 180
                const innerR = R - STROKE / 2
                const outerR = R + STROKE / 2 + 1
                return (
                  <line
                    key={`div-${i}`}
                    x1={(CX + innerR * Math.cos(rad)).toFixed(2)}
                    y1={(CY + innerR * Math.sin(rad)).toFixed(2)}
                    x2={(CX + outerR * Math.cos(rad)).toFixed(2)}
                    y2={(CY + outerR * Math.sin(rad)).toFixed(2)}
                    stroke="var(--bg2)"
                    strokeWidth={2.5}
                  />
                )
              })}

              {/* 5. Inner rim highlight (thin bright line on inner edge) */}
              <circle
                cx={CX} cy={CY} r={R - STROKE / 2 + 1}
                fill="none"
                stroke="rgba(255,255,255,0.07)"
                strokeWidth={2}
              />

              {/* 5. Top gloss highlight arc (light source from above) */}
              <circle
                cx={CX} cy={CY} r={R}
                fill="none"
                stroke="rgba(255,255,255,0.11)"
                strokeWidth={STROKE - 8}
                strokeLinecap="butt"
                strokeDasharray={`${(C * 0.32).toFixed(2)} ${(C * 0.68).toFixed(2)}`}
                strokeDashoffset={0}
                transform={`rotate(-90 ${CX} ${CY})`}
              />

              {/* Center: total amount */}
              <text
                x={CX} y={CY - 7}
                textAnchor="middle"
                dominantBaseline="middle"
                className={styles.centerAmt}
              >
                {fmt(grandTotal)}
              </text>
              <text
                x={CX} y={CY + 12}
                textAnchor="middle"
                dominantBaseline="middle"
                className={styles.centerLabel}
              >
                грн
              </text>
            </svg>
          </div>

          {/* ── Legend ── */}
          <ul className={styles.legend}>
            {segments.map((seg) => (
              <li key={seg.category} className={styles.legendRow}>
                <span
                  className={styles.legendDot}
                  style={{ background: seg.color }}
                />
                <span className={styles.legendName}>
                  {CATEGORY_LABEL[seg.category] ?? seg.category}
                  <span className={styles.legendCount}> {seg.count}×</span>
                </span>
                <span className={styles.legendAmt}>{fmt(seg.total)} ₴</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default ShoppingTracker
