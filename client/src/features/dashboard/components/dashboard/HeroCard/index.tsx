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


const HeroCard: React.FC<HeroCardProps> = ({
  balance,
  dailyBudget,
  todaySpent,
  sparklineData,
  monthlyBudget,
  thisMonthExpenses,
  lastMonthExpenses,
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

  // ── Без бюджету: 30/70 split з статами ─────────────────────
  const data      = sparklineData && sparklineData.length === 7 ? sparklineData : Array(7).fill(0)
  const weekTotal = data.reduce((s: number, v: number) => s + v, 0)

  const vsLastMonth = lastMonthExpenses > 0
    ? Math.round(((thisMonthExpenses - lastMonthExpenses) / lastMonthExpenses) * 100)
    : null
  const vsPositive = vsLastMonth !== null && vsLastMonth <= 0

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

      {/* Right — 2 контекстні стати */}
      <div className={styles.splitRight}>
        <div className={styles.splitStat}>
          <span className={styles.splitStatValue}>{fmt(weekTotal)} ₴</span>
          <span className={styles.splitStatLabel}>тиждень</span>
        </div>
        <div className={styles.splitStatDivider} />
        <div className={styles.splitStat}>
          {vsLastMonth !== null ? (
            <span className={`${styles.splitStatValue} ${vsPositive ? styles.splitStatPos : styles.splitStatNeg}`}>
              {vsLastMonth > 0 ? '+' : ''}{vsLastMonth}%
            </span>
          ) : (
            <span className={`${styles.splitStatValue} ${styles.splitStatDim}`}>—</span>
          )}
          <span className={styles.splitStatLabel}>vs минулий</span>
        </div>
      </div>
    </div>
  )
}

export default HeroCard
