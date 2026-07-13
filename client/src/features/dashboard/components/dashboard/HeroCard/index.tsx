import React, { useEffect, useRef, useState } from 'react'
import { fmt } from '@/features/finance/utils/finance'
import { useUiStore } from '@/shared/store/uiStore'
import styles from './HeroCard.module.css'

/**
 * HeroCard
 * --------
 * Фінансова картка Dashboard: баланс місяця + meta-рядок + повноширокий 7-day bar chart.
 * Layout: одна колонка — сума → за цей місяць → сьогодні · пік → графік.
 *
 * Props:
 * @prop {number}   balance       — витрачено за поточний місяць (грн)
 * @prop {number}   dailyBudget   — денний бюджет (грн, резерв)
 * @prop {number}   todaySpent    — витрачено сьогодні (грн)
 * @prop {number[]} sparklineData — масив витрат за 7 днів (oldest→newest)
 */
interface HeroCardProps {
  balance:        number
  dailyBudget:    number
  todaySpent:     number
  sparklineData?: number[]
}

const DAYS_SHORT = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
const DAYS_FULL  = ['неділя', 'понеділок', 'вівторок', 'середа', 'четвер', 'пʼятниця', 'субота']

function getSparkDays(): string[] {
  const today = new Date()
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - (6 - i))
    return DAYS_SHORT[d.getDay()]
  })
}

function getSparkDaysFull(): string[] {
  const today = new Date()
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - (6 - i))
    return DAYS_FULL[d.getDay()]
  })
}

// ── Bar chart (full-width, compact) ─────────────────────────────────────────

const BAR_GAP = 4
const CHART_H = 36

interface BarChartProps {
  data:    number[]
  days:    string[]
  theme:   string
  peakIdx: number
}

const BarChart: React.FC<BarChartProps> = ({ data, days, theme, peakIdx }) => {
  const [hoverId, setHoverId] = useState<number | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [w, setW]   = useState(260)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const obs = new ResizeObserver(e => setW(e[0].contentRect.width))
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const n      = data.length
  const barW   = Math.max(4, Math.floor((w - BAR_GAP * (n - 1)) / n))
  const max    = Math.max(...data, 1)
  const peakV  = Math.max(...data)
  const isPixel = theme === 'pixel'
  const isCyber = theme === 'cyber'
  const rx      = isPixel ? 0 : 2

  return (
    <div ref={wrapRef} className={styles.barWrap}>
      <svg
        width={w}
        height={CHART_H}
        className={styles.barSvg}
        xmlns="http://www.w3.org/2000/svg"
      >
        {isCyber && (
          <defs>
            <filter id="hcBarGlow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="2" result="blur"/>
              <feMerge>
                <feMergeNode in="blur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
        )}

        {data.map((v, i) => {
          const barH    = max > 0 ? Math.max((v / max) * CHART_H, v > 0 ? 3 : 1) : 1
          const x       = i * (barW + BAR_GAP)
          const y       = CHART_H - barH
          const isPeak  = i === peakIdx
          const isToday = i === n - 1
          const isHov   = hoverId === i

          return (
            <g key={i}>
              <rect
                x={x} y={y} width={barW} height={barH} rx={rx}
                className={[
                  styles.barRect,
                  isPeak              ? styles.barPeak  : '',
                  isToday && !isPeak  ? styles.barToday : '',
                ].join(' ')}
                filter={isPeak && isCyber ? 'url(#hcBarGlow)' : undefined}
              />

              {/* Hover tooltip */}
              {isHov && v > 0 && (
                <text
                  x={Math.min(Math.max(x + barW / 2, 20), w - 20)}
                  y={y - 4}
                  textAnchor="middle"
                  className={styles.barHoverLabel}
                >
                  {fmt(v)} ₴
                </text>
              )}

              {/* Hit area */}
              <rect
                x={x} y={0} width={barW} height={CHART_H}
                fill="transparent"
                onMouseEnter={() => setHoverId(i)}
                onMouseLeave={() => setHoverId(null)}
                onPointerDown={() => setHoverId(p => p === i ? null : i)}
                style={{ cursor: 'pointer', touchAction: 'manipulation' }}
              />
            </g>
          )
        })}
      </svg>

      <div className={styles.barDays}>
        {days.map((d, i) => (
          <span
            key={i}
            style={{ width: `${barW}px`, flexShrink: 0 }}
            className={[
              styles.barDay,
              i === peakIdx && peakV > 0 ? styles.barDayPeak  : '',
              i === n - 1               ? styles.barDayToday : '',
            ].join(' ')}
          >
            {d}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── HeroCard ─────────────────────────────────────────────────────────────────

const HeroCard: React.FC<HeroCardProps> = ({ balance, dailyBudget: _dailyBudget, todaySpent, sparklineData }) => {
  const theme = useUiStore(s => s.theme)

  const [displayed, setDisplayed] = useState(0)
  const hasAnimated = useRef(false)
  const rafRef      = useRef<number | undefined>(undefined)

  useEffect(() => {
    let cancelled = false
    const animate = async () => {
      if (balance === 0) { if (!cancelled) setDisplayed(0); return }
      if (hasAnimated.current) { if (!cancelled) setDisplayed(balance); return }
      hasAnimated.current = true
      const startTime = Date.now()
      const duration  = 900
      const tick = () => {
        if (cancelled) return
        const progress = Math.min((Date.now() - startTime) / duration, 1)
        const eased    = 1 - Math.pow(1 - progress, 3)
        if (!cancelled) setDisplayed(Math.round(balance * eased))
        if (progress < 1) rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    animate()
    return () => {
      cancelled = true
      if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current)
    }
  }, [balance])

  const hasData   = sparklineData && sparklineData.length === 7 && sparklineData.some(v => v > 0)
  const sparkDays = hasData ? getSparkDays() : []

  const peakInsight = (() => {
    if (!sparklineData || !sparklineData.some(v => v > 0)) return null
    const max = Math.max(...sparklineData)
    if (max === 0) return null
    const idx      = sparklineData.lastIndexOf(max)
    const daysFull = getSparkDaysFull()
    return { day: daysFull[idx], amount: fmt(max), idx }
  })()

  return (
    <div className={styles.balanceCard}>
      {/* Balance */}
      <span className={styles.balanceAmount}>
        {fmt(displayed)}<span className={styles.balanceCurrency}> ₴</span>
      </span>
      <span className={styles.balanceSubLabel}>за цей місяць</span>

      {/* Meta row: today · peak */}
      <div className={styles.balanceMeta}>
        <span className={styles.balanceToday}>Сьогодні: {fmt(todaySpent)} ₴</span>
        {peakInsight && (
          <>
            <span className={styles.metaSep} aria-hidden="true">·</span>
            <span className={styles.peakInsight}>
              <span className={styles.peakDot} aria-hidden="true" />
              Пік: {peakInsight.day} {peakInsight.amount} ₴
            </span>
          </>
        )}
      </div>

      {/* Full-width bar chart */}
      {hasData && (
        <BarChart
          data={sparklineData!}
          days={sparkDays}
          theme={theme}
          peakIdx={peakInsight?.idx ?? -1}
        />
      )}
    </div>
  )
}

export default HeroCard
