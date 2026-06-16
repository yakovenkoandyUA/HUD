import React, { useEffect, useRef, useState } from 'react'
import { fmt } from '../../../utils/finance'
import type { F1Race } from '../../../data/f1Season2026'
import styles from './HeroCard.module.css'

/**
 * HeroCard
 * --------
 * Компактна баланс-картка Dashboard з опціональним F1-таймером праворуч.
 * Анімований лічильник балансу при першому завантаженні.
 * Інтерактивна sparkline останніх 7 днів — тап на точку показує суму дня.
 *
 * Props:
 * @prop {number}       balance       — поточний баланс (грн)
 * @prop {number}       dailyBudget   — денний бюджет (грн)
 * @prop {number}       todaySpent    — витрачено сьогодні (грн)
 * @prop {F1Race|null}  race          — наступна гонка або null
 * @prop {boolean}      compact       — true коли RaceHeroCard вже показано зверху
 * @prop {number[]}     sparklineData — масив витрат за 7 днів (oldest→newest)
 */
interface HeroCardProps {
  balance: number
  dailyBudget: number
  todaySpent: number
  race: F1Race | null
  compact?: boolean
  sparklineData?: number[]
}

interface Countdown {
  d: number
  h: number
  m: number
  s: number
}

function getCountdown(raceDate: string): Countdown | null {
  const target = new Date(raceDate + 'T14:00:00Z').getTime()
  const diff = target - Date.now()
  if (diff <= 0) return null
  const s = Math.floor(diff / 1000)
  return {
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
  }
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

const DAYS_SHORT = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
const CHART_H = 48
const SEG_PAD_X = 10

function getSparkDays(): string[] {
  const today = new Date()
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - (6 - i))
    return DAYS_SHORT[d.getDay()]
  })
}

/**
 * SparklineChart
 * --------------
 * 7-денний інтерактивний графік витрат.
 * Тап/hover на день → tooltip з сумою.
 *
 * Props:
 * @prop {number[]} data — витрати за 7 днів (oldest→newest)
 * @prop {string[]} days — мітки днів тижня
 */
interface SparklineChartProps {
  data: number[]
  days: string[]
}

const SparklineChart: React.FC<SparklineChartProps> = ({ data, days }) => {
  const [activeIdx, setActiveIdx] = useState<number | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(280)
  const dismissRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const obs = new ResizeObserver(entries => {
      setW(entries[0].contentRect.width)
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  /* Auto-dismiss tooltip after 2s on touch */
  useEffect(() => {
    if (activeIdx === null) return
    if (dismissRef.current) clearTimeout(dismissRef.current)
    dismissRef.current = setTimeout(() => setActiveIdx(null), 2000)
    return () => { if (dismissRef.current) clearTimeout(dismissRef.current) }
  }, [activeIdx])

  const max = Math.max(...data, 1)
  const segW = (w - SEG_PAD_X * 2) / (data.length - 1)

  const pts = data.map((v, i) => ({
    x: SEG_PAD_X + i * segW,
    y: CHART_H - (v / max) * (CHART_H - 10) - 4,
    v,
  }))

  const polyPts = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

  const areaPath =
    `M ${pts[0].x.toFixed(1)},${CHART_H} ` +
    pts.map(p => `L ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') +
    ` L ${pts[pts.length - 1].x.toFixed(1)},${CHART_H} Z`

  const handleTap = (i: number) => {
    setActiveIdx(prev => (prev === i ? null : i))
  }

  return (
    <div
      ref={wrapRef}
      className={styles.sparkWrap}
      onMouseLeave={() => setActiveIdx(null)}
    >
      {/* Tooltip */}
      {activeIdx !== null && (
        <div
          className={styles.sparkTip}
          style={{ left: `${((pts[activeIdx].x / w) * 100).toFixed(1)}%` }}
        >
          <span className={styles.sparkTipDay}>{days[activeIdx]}</span>
          <span className={styles.sparkTipAmt}>
            {data[activeIdx] > 0 ? `${fmt(data[activeIdx])} ₴` : '—'}
          </span>
        </div>
      )}

      <svg
        width={w}
        height={CHART_H}
        className={styles.sparkSvg}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="sparkAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Area fill */}
        <path d={areaPath} fill="url(#sparkAreaGrad)" />

        {/* Line */}
        <polyline
          points={polyPts}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Dots */}
        {pts.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={activeIdx === i ? 4.5 : 2.5}
            fill={activeIdx === i ? 'currentColor' : 'var(--bg2)'}
            stroke="currentColor"
            strokeWidth="1.5"
            style={{ transition: 'r 0.12s ease' }}
          />
        ))}

        {/* Invisible tap columns */}
        {pts.map((p, i) => {
          const halfSeg = segW / 2
          const x = i === 0 ? 0 : p.x - halfSeg
          const colW = i === 0 || i === data.length - 1 ? halfSeg + SEG_PAD_X : segW
          return (
            <rect
              key={i}
              x={x}
              y={0}
              width={colW}
              height={CHART_H}
              fill="transparent"
              onMouseEnter={() => setActiveIdx(i)}
              onPointerDown={() => handleTap(i)}
              style={{ cursor: 'pointer', touchAction: 'manipulation' }}
            />
          )
        })}
      </svg>

      {/* Day labels */}
      <div className={styles.sparkDays}>
        {days.map((d, i) => (
          <span
            key={i}
            className={`${styles.sparkDay} ${activeIdx === i ? styles.sparkDayActive : ''} ${i === 6 ? styles.sparkDayToday : ''}`}
          >
            {d}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── HeroCard ─────────────────────────────────────────────────────────────────

const HeroCard: React.FC<HeroCardProps> = ({ balance, dailyBudget, todaySpent, race, compact, sparklineData }) => {
  const [countdown, setCountdown] = useState<Countdown | null>(
    race ? getCountdown(race.date) : null
  )
  const [displayed, setDisplayed] = useState(0)
  const hasAnimated = useRef(false)
  const rafRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (!race) return
    const id = setInterval(() => setCountdown(getCountdown(race.date)), 1000)
    return () => clearInterval(id)
  }, [race])

  /* Animate balance counter once on first non-zero value */
  useEffect(() => {
    let cancelled = false
    const animate = async () => {
      if (balance === 0) {
        if (!cancelled) setDisplayed(0)
        return
      }
      if (hasAnimated.current) {
        if (!cancelled) setDisplayed(balance)
        return
      }
      hasAnimated.current = true
      const startTime = Date.now()
      const duration = 900
      const to = balance
      const tick = () => {
        if (cancelled) return
        const progress = Math.min((Date.now() - startTime) / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3)
        if (!cancelled) setDisplayed(Math.round(to * eased))
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

  const progressPct = dailyBudget > 0
    ? Math.min(100, Math.round((todaySpent / dailyBudget) * 100))
    : 0
  const overBudget = todaySpent > dailyBudget
  const showRace = !compact && !!race

  const hasSparkline = sparklineData && sparklineData.length === 7 && sparklineData.some(v => v > 0)
  const sparkDays = hasSparkline ? getSparkDays() : []

  return (
    <div className={styles.balanceCard}>
      <div className={styles.topRow}>
        <div className={styles.balanceLeft}>
          <span className={styles.balanceAmount}>
            {fmt(displayed)}<span className={styles.balanceCurrency}> ₴</span>
          </span>
          <span className={styles.balanceToday}>
            Сьогодні: {fmt(todaySpent)} / {fmt(dailyBudget)} ₴
          </span>
        </div>

        {showRace && (
          <>
            <div className={styles.divider} />
            <div className={styles.right}>
              <div className={styles.raceLabel}>
                <span className={styles.flag}>{race!.flag}</span>
                <span className={styles.raceName}>{race!.name.replace(' GP', '')}</span>
              </div>
              {countdown ? (
                <div className={styles.countdownGrid}>
                  <div className={styles.countdownUnit}>
                    <span className={styles.countdownNum}>{countdown.d}</span>
                    {/* <span className={styles.countdownSub}>д</span> */}
                  </div>
                  <div className={styles.countdownUnit}>
                    <span className={styles.countdownNum}>{pad(countdown.h)}</span>
                    {/* <span className={styles.countdownSub}>г</span> */}
                  </div>
                  <div className={styles.countdownUnit}>
                    <span className={styles.countdownNum}>{pad(countdown.m)}</span>
                    {/* <span className={styles.countdownSub}>хв</span> */}
                  </div>
                  <div className={styles.countdownUnit}>
                    <span className={styles.countdownNum}>{pad(countdown.s)}</span>
                    {/* <span className={styles.countdownSub}>с</span> */}
                  </div>
                </div>
              ) : (
                <div className={styles.raceDay}>RACE DAY! 🏁</div>
              )}
            </div>
          </>
        )}
      </div>

      {hasSparkline && (
        <SparklineChart data={sparklineData!} days={sparkDays} />
      )}

      <div className={styles.balanceBar}>
        <div
          className={`${styles.balanceBarFill} ${overBudget ? styles.barOver : ''}`}
          style={{ width: `${progressPct}%` }}
        />
      </div>
    </div>
  )
}

export default HeroCard
