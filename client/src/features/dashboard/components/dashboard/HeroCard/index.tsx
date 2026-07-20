import React, { useEffect, useRef, useState } from 'react'
import { fmt } from '@/features/finance/utils/finance'
import styles from './HeroCard.module.css'

/**
 * HeroCard
 * --------
 * Фінансова картка Dashboard.
 *
 * З бюджетом:   full-width — баланс + progress bar + 3 стати (Сьогодні / Залишилось / % бюджету)
 * Без бюджету:  30/70 split — ліво: баланс + сьогодні, право: SVG area chart (7 днів)
 *
 * Props:
 * @prop {number}      balance            — чистий баланс (топап − витрати)
 * @prop {number}      dailyBudget        — денний бюджет (грн)
 * @prop {number}      todaySpent         — витрачено сьогодні (грн)
 * @prop {number[]}    sparklineData      — витрати за 7 днів (oldest→newest)
 * @prop {number|null} monthlyBudget      — місячний бюджет (null = не задано)
 * @prop {number}      thisMonthExpenses  — витрати за поточний календарний місяць
 * @prop {number}      lastMonthExpenses  — витрати за попередній місяць
 * @prop {number}      upcomingTotal      — сума активних майбутніх регулярних платежів
 * @prop {number}      upcomingCount      — кількість таких платежів
 */
interface HeroCardProps {
  balance:           number
  dailyBudget:       number
  todaySpent:        number
  sparklineData?:    number[]
  monthlyBudget?:    number | null
  thisMonthExpenses: number
  lastMonthExpenses: number
  upcomingTotal:     number
  upcomingCount:     number
}

const DAYS_SHORT = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

function getSparkDaysShort(): string[] {
  const today = new Date()
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - (6 - i))
    return DAYS_SHORT[d.getDay()]
  })
}

const W = 100
const H = 44
const PAD_X = 2
const PAD_Y = 4

function buildSparkPath(data: number[]): { line: string; area: string; pts: { x: number; y: number }[] } {
  const max = Math.max(...data, 1)
  const pts = data.map((v, i) => ({
    x: PAD_X + (i / (data.length - 1)) * (W - PAD_X * 2),
    y: H - PAD_Y - (v / max) * (H - PAD_Y * 2),
  }))
  let line = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 1; i < pts.length; i++) {
    const cpx = (pts[i - 1].x + pts[i].x) / 2
    line += ` C ${cpx} ${pts[i - 1].y} ${cpx} ${pts[i].y} ${pts[i].x} ${pts[i].y}`
  }
  const area = `${line} L ${pts[pts.length - 1].x} ${H} L ${pts[0].x} ${H} Z`
  return { line, area, pts }
}

const HeroCard: React.FC<HeroCardProps> = ({
  balance,
  dailyBudget,
  todaySpent,
  sparklineData,
  monthlyBudget,
  thisMonthExpenses,
}) => {
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

  const hasBudget      = monthlyBudget != null && monthlyBudget > 0
  const budgetRemaining = hasBudget ? monthlyBudget! - thisMonthExpenses : 0
  const budgetProgress  = hasBudget ? Math.min(thisMonthExpenses / monthlyBudget!, 1) : 0
  const budgetOver      = hasBudget && thisMonthExpenses > monthlyBudget!
  const budgetPct       = Math.round(budgetProgress * 100)

  const todayOver = dailyBudget > 0 && todaySpent > dailyBudget
  const todayValue = dailyBudget > 0
    ? `${fmt(todaySpent)} / ${fmt(dailyBudget)}`
    : `${fmt(todaySpent)}`

  // ── З бюджетом: full-width layout ───────────────────────────
  if (hasBudget) {
    const stats = [
      { value: `${todayValue} ₴`, label: 'Сьогодні', over: todayOver },
      {
        value: budgetOver ? `−${fmt(Math.abs(budgetRemaining))} ₴` : `${fmt(budgetRemaining)} ₴`,
        label: budgetOver ? 'Перевищено' : 'Залишилось',
        over:  budgetOver,
      },
      { value: `${budgetPct}%`, label: 'Бюджету', over: budgetOver },
    ]

    return (
      <div className={styles.balanceCard}>
        <div className={styles.balanceTop}>
          <span className={styles.balanceAmount}>
            {fmt(displayed)}<span className={styles.balanceCurrency}> ₴</span>
          </span>
          <span className={styles.balanceSubLabel}>за цей місяць</span>
        </div>

        <div className={styles.budgetBar}>
          <div
            className={`${styles.budgetFill} ${budgetOver ? styles.budgetFillOver : ''}`}
            style={{ width: `${budgetProgress * 100}%` }}
          />
        </div>

        <div className={styles.statStrip}>
          {stats.map((s, i) => (
            <div key={i} className={styles.statItem}>
              <span className={`${styles.statValue} ${s.over ? styles.statValueOver : ''}`}>
                {s.value}
              </span>
              <span className={styles.statLabel}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Без бюджету: 30/70 split з area chart ───────────────────
  const data      = sparklineData && sparklineData.length === 7 ? sparklineData : Array(7).fill(0)
  const dayLabels = getSparkDaysShort()
  const hasAnyData = data.some(v => v > 0)
  const { line, area, pts } = buildSparkPath(data)
  const lastPt = pts[6]

  const [activeIdx, setActiveIdx] = useState<number | null>(null)
  const dismissRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleSparkTap = (i: number) => {
    if (dismissRef.current) clearTimeout(dismissRef.current)
    setActiveIdx(i)
    dismissRef.current = setTimeout(() => setActiveIdx(null), 2000)
  }

  const tooltipPct = activeIdx !== null
    ? Math.min(90, Math.max(10, (activeIdx / 6) * 100))
    : 0

  return (
    <div className={styles.splitCard}>
      {/* Left — баланс + сьогодні */}
      <div className={styles.splitLeft}>
        <div>
          <span className={styles.balanceAmount}>
            {fmt(displayed)}<span className={styles.balanceCurrency}> ₴</span>
          </span>
          <div className={styles.balanceSubLabel}>цей місяць</div>
        </div>
        <div className={styles.splitToday}>
          <span className={`${styles.splitTodayValue} ${todayOver ? styles.statValueOver : ''}`}>
            {fmt(todaySpent)} ₴
          </span>
          <span className={styles.splitTodayLabel}>сьогодні</span>
        </div>
      </div>

      {/* Right — area chart + tooltip */}
      <div className={styles.splitRight}>
        {activeIdx !== null && (
          <div
            className={styles.sparkTooltip}
            style={{ left: `${tooltipPct}%` }}
          >
            <span className={styles.sparkTooltipDay}>{dayLabels[activeIdx]}</span>
            <span className={styles.sparkTooltipVal}>{fmt(data[activeIdx])} ₴</span>
          </div>
        )}
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className={styles.sparkSvg}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Baseline */}
          <line x1={PAD_X} y1={H - PAD_Y} x2={W - PAD_X} y2={H - PAD_Y}
            stroke="var(--accent)" strokeOpacity="0.15" strokeWidth="0.5" />

          {hasAnyData && (
            <>
              <path d={area} fill="url(#sparkGrad)" />
              <path d={line} fill="none" stroke="var(--accent)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx={lastPt.x} cy={lastPt.y} r="1.8" fill="var(--accent)" />
              {activeIdx !== null && activeIdx !== 6 && (
                <circle cx={pts[activeIdx].x} cy={pts[activeIdx].y} r="2" fill="var(--accent)" fillOpacity="0.8" />
              )}
            </>
          )}

          {/* Invisible hit areas per day */}
          {data.map((_, i) => {
            const slotW = W / 7
            return (
              <rect
                key={i}
                x={i * slotW}
                y={0}
                width={slotW}
                height={H}
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onClick={() => handleSparkTap(i)}
                onTouchStart={e => { e.preventDefault(); handleSparkTap(i) }}
              />
            )
          })}
        </svg>

        {/* Day labels */}
        <div className={styles.sparkLabels}>
          {dayLabels.map((label, i) => (
            <span
              key={i}
              className={`${styles.sparkLabel} ${i === 6 || i === activeIdx ? styles.sparkLabelActive : ''}`}
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export default HeroCard
