import React, { useEffect, useRef, useState } from 'react'
import { fmt } from '@/features/finance/utils/finance'
import styles from './HeroCard.module.css'

/**
 * HeroCard
 * --------
 * Фінансова картка Dashboard: баланс місяця + stat strip.
 *
 * Props:
 * @prop {number}        balance             — чистий баланс (топап − витрати)
 * @prop {number}        dailyBudget         — денний бюджет (грн)
 * @prop {number}        todaySpent          — витрачено сьогодні (грн)
 * @prop {number[]}      sparklineData       — витрати за 7 днів (oldest→newest)
 * @prop {number|null}   monthlyBudget       — місячний бюджет з профілю (null = не встановлено)
 * @prop {number}        thisMonthExpenses   — витрати за поточний календарний місяць
 * @prop {number}        lastMonthExpenses   — витрати за попередній календарний місяць
 */
interface HeroCardProps {
  balance:            number
  dailyBudget:        number
  todaySpent:         number
  sparklineData?:     number[]
  monthlyBudget?:     number | null
  thisMonthExpenses:  number
  lastMonthExpenses:  number
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

function daysInCurrentMonth(): number {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
}

function dayOfMonth(): number {
  return new Date().getDate()
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

  const hasBudget = monthlyBudget != null && monthlyBudget > 0

  // Budget progress
  const budgetRemaining = hasBudget ? (monthlyBudget! - thisMonthExpenses) : 0
  const budgetProgress  = hasBudget ? Math.min(thisMonthExpenses / monthlyBudget!, 1) : 0
  const budgetOver      = hasBudget && thisMonthExpenses > monthlyBudget!

  // vs last month
  const vsLastMonth = (() => {
    if (lastMonthExpenses === 0) return null
    const diff = thisMonthExpenses - lastMonthExpenses
    const pct  = Math.round(Math.abs(diff) / lastMonthExpenses * 100)
    return { pct, up: diff > 0, same: diff === 0 }
  })()

  // Forecast
  const day     = dayOfMonth()
  const daysIn  = daysInCurrentMonth()
  const forecast = day > 0 && thisMonthExpenses > 0
    ? Math.round((thisMonthExpenses / day) * daysIn)
    : null

  const hasData   = sparklineData && sparklineData.length === 7
  const peak = (() => {
    if (!hasData || !sparklineData!.some(v => v > 0)) return null
    const max = Math.max(...sparklineData!)
    if (max === 0) return null
    const idx  = sparklineData!.lastIndexOf(max)
    const days = getSparkDaysShort()
    return { amount: fmt(max), day: days[idx] }
  })()

  const todayValue = dailyBudget > 0
    ? `${fmt(todaySpent)} / ${fmt(dailyBudget)}`
    : `${fmt(todaySpent)}`

  // Stat strip: always Сьогодні first, then budget-aware items
  const stats = [
    { value: `${todayValue} ₴`, label: 'Сьогодні', over: dailyBudget > 0 && todaySpent > dailyBudget },
    ...(hasBudget
      ? [
          {
            value: budgetOver
              ? `−${fmt(Math.abs(budgetRemaining))} ₴`
              : `${fmt(budgetRemaining)} ₴`,
            label: budgetOver ? 'Перевищено' : 'Залишилось',
            over: budgetOver,
          },
        ]
      : forecast != null
        ? [{ value: `${fmt(forecast)} ₴`, label: 'Прогноз', accent: true }]
        : peak
          ? [{ value: `${peak.amount} ₴`, label: 'Пік', sub: peak.day, accent: true }]
          : []
    ),
    ...(vsLastMonth != null
      ? [{
          value: vsLastMonth.same
            ? '= 0%'
            : `${vsLastMonth.up ? '+' : '−'}${vsLastMonth.pct}%`,
          label: 'vs мин. міс.',
          over:  vsLastMonth.up,
          accent: !vsLastMonth.up,
        }]
      : []
    ),
  ]

  return (
    <div className={styles.balanceCard}>
      <div className={styles.balanceTop}>
        <span className={styles.balanceAmount}>
          {fmt(displayed)}<span className={styles.balanceCurrency}> ₴</span>
        </span>
        <span className={styles.balanceSubLabel}>за цей місяць</span>
      </div>

      {hasBudget && (
        <div className={styles.budgetBar}>
          <div
            className={`${styles.budgetFill} ${budgetOver ? styles.budgetFillOver : ''}`}
            style={{ width: `${budgetProgress * 100}%` }}
          />
        </div>
      )}

      {stats.length > 0 && (
        <div className={styles.statStrip}>
          {stats.map((s, i) => (
            <div key={i} className={styles.statItem}>
              <span className={`${styles.statValue} ${s.accent ? styles.statValueAccent : ''} ${'over' in s && s.over ? styles.statValueOver : ''}`}>
                {s.value}
                {'sub' in s && s.sub && <span className={styles.statSub}> · {s.sub}</span>}
              </span>
              <span className={styles.statLabel}>{s.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default HeroCard
