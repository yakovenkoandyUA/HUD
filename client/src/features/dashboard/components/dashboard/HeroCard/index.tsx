import React, { useEffect, useRef, useState } from 'react'
import { fmt } from '@/features/finance/utils/finance'
import styles from './HeroCard.module.css'

/**
 * HeroCard
 * --------
 * Фінансова картка Dashboard: баланс місяця + 3 stat chips (сьогодні / тиждень / пік).
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

function getSparkDaysShort(): string[] {
  const today = new Date()
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - (6 - i))
    return DAYS_SHORT[d.getDay()]
  })
}

// ── HeroCard ──────────────────────────────────────────────────────────────────

const HeroCard: React.FC<HeroCardProps> = ({ balance, dailyBudget: _dailyBudget, todaySpent, sparklineData }) => {
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

  const hasData   = sparklineData && sparklineData.length === 7
  const weekTotal = hasData ? sparklineData!.reduce((s, v) => s + v, 0) : null

  const peak = (() => {
    if (!hasData || !sparklineData!.some(v => v > 0)) return null
    const max = Math.max(...sparklineData!)
    if (max === 0) return null
    const idx  = sparklineData!.lastIndexOf(max)
    const days = getSparkDaysShort()
    return { amount: fmt(max), day: days[idx] }
  })()

  const chips = [
    { label: 'Сьогодні', value: `${fmt(todaySpent)} ₴` },
    ...(weekTotal != null ? [{ label: '7 днів', value: `${fmt(weekTotal)} ₴` }] : []),
    ...(peak ? [{ label: 'Пік', value: `${peak.amount} ₴`, sub: peak.day }] : []),
  ]

  return (
    <div className={styles.balanceCard}>
      <div className={styles.balanceTop}>
        <span className={styles.balanceAmount}>
          {fmt(displayed)}<span className={styles.balanceCurrency}> ₴</span>
        </span>
        <span className={styles.balanceSubLabel}>за цей місяць</span>
      </div>

      {chips.length > 0 && (
        <div className={styles.chips}>
          {chips.map(c => (
            <div key={c.label} className={styles.chip}>
              <span className={styles.chipLabel}>{c.label}</span>
              <span className={styles.chipValue}>
                {c.value}
                {c.sub && <span className={styles.chipSub}> · {c.sub}</span>}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default HeroCard
