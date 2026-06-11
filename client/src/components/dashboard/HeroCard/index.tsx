import React, { useEffect, useRef, useState } from 'react'
import { fmt } from '../../../utils/finance'
import type { F1Race } from '../../../data/f1Season2026'
import styles from './HeroCard.module.css'

/**
 * HeroCard
 * --------
 * Компактна баланс-картка Dashboard з опціональним F1-таймером праворуч.
 * Анімований лічильник балансу при першому завантаженні.
 * Sparkline останніх 7 днів витрат під сумою балансу.
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

function sparkPoints(data: number[]): string {
  const w = 80
  const h = 16
  const max = Math.max(...data, 1)
  return data
    .map((v, i) => {
      const x = ((i / (data.length - 1)) * w).toFixed(1)
      const y = (h - (v / max) * (h - 2) - 1).toFixed(1)
      return `${x},${y}`
    })
    .join(' ')
}

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

  const hasSparkline = sparklineData && sparklineData.length >= 2 && sparklineData.some(v => v > 0)

  return (
    <div className={styles.balanceCard}>
      <div className={styles.topRow}>
        <div className={styles.balanceLeft}>
          <span className={styles.balanceAmount}>
            {fmt(displayed)}<span className={styles.balanceCurrency}> ₴</span>
          </span>

          {hasSparkline && (
            <svg
              className={styles.sparkline}
              viewBox="0 0 80 16"
              preserveAspectRatio="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <polyline
                points={sparkPoints(sparklineData!)}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </svg>
          )}

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
                    <span className={styles.countdownSub}>д</span>
                  </div>
                  <div className={styles.countdownUnit}>
                    <span className={styles.countdownNum}>{pad(countdown.h)}</span>
                    <span className={styles.countdownSub}>г</span>
                  </div>
                  <div className={styles.countdownUnit}>
                    <span className={styles.countdownNum}>{pad(countdown.m)}</span>
                    <span className={styles.countdownSub}>хв</span>
                  </div>
                  <div className={styles.countdownUnit}>
                    <span className={styles.countdownNum}>{pad(countdown.s)}</span>
                    <span className={styles.countdownSub}>с</span>
                  </div>
                </div>
              ) : (
                <div className={styles.raceDay}>RACE DAY! 🏁</div>
              )}
            </div>
          </>
        )}
      </div>

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
