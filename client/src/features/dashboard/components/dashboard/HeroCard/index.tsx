import React, { useEffect, useRef, useState } from 'react'
import { fmt } from '@/features/finance/utils/finance'
import styles from './HeroCard.module.css'

/**
 * HeroCard
 * --------
 * Фінансова картка Dashboard: баланс місяця + stat strip (число зверху, лейбл знизу).
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

const HeroCard: React.FC<HeroCardProps> = ({ balance, dailyBudget, todaySpent, sparklineData }) => {
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

  const todayValue = dailyBudget > 0
    ? `${fmt(todaySpent)} / ${fmt(dailyBudget)}`
    : `${fmt(todaySpent)}`

  const stats = [
    { value: `${todayValue} ₴`, label: 'Сьогодні', over: dailyBudget > 0 && todaySpent > dailyBudget },
    ...(weekTotal != null ? [{ value: `${fmt(weekTotal)} ₴`, label: '7 днів' }] : []),
    ...(peak ? [{ value: `${peak.amount} ₴`, label: 'Пік', sub: peak.day, accent: true }] : []),
  ]

  return (
    <div className={styles.balanceCard}>
      <div className={styles.balanceTop}>
        <span className={styles.balanceAmount}>
          {fmt(displayed)}<span className={styles.balanceCurrency}> ₴</span>
        </span>
        <span className={styles.balanceSubLabel}>за цей місяць</span>
      </div>

      {stats.length > 0 && (
        <div className={styles.statStrip}>
          {stats.map((s, i) => (
            <div key={i} className={styles.statItem}>
              <span className={`${styles.statValue} ${s.accent ? styles.statValueAccent : ''} ${'over' in s && s.over ? styles.statValueOver : ''}`}>
                {s.value}
                {s.sub && <span className={styles.statSub}> · {s.sub}</span>}
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
