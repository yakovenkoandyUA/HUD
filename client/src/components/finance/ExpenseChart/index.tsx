import React, { useMemo, useState } from 'react'
import type { Transaction } from '../../../types'
import { fmt } from '../../../utils/finance'
import styles from './ExpenseChart.module.css'

/**
 * ExpenseChart
 * ------------
 * SVG donut — витрати по категоріях з перемикачем Місяць/Тиждень.
 * Повертає null якщо витрат немає.
 *
 * Props:
 * @prop {Transaction[]} transactions — масив транзакцій з financeStore
 */
interface ExpenseChartProps {
  transactions: Transaction[]
}

const COLORS: Record<string, string> = {
  'таксі':      '#e8944a',
  'продукти':   '#5aad7c',
  'кава':       '#a07848',
  'метро':      '#6a8fb8',
  'транспорт':  '#9b72c8',
  'фібі':       '#c87a9a',
  'інше':       '#7a7a8c',
}
const FALLBACK = '#7a7a8c'

const R    = 66
const CX   = 88
const CY   = 88
const SW   = 22
const CIRC = 2 * Math.PI * R
const GAP_DEG = 2.5

type Period = 'month' | 'week'

function getWeekBounds(): { start: string; end: string } {
  const now = new Date()
  const dow = now.getDay() === 0 ? 7 : now.getDay()
  const mon = new Date(now)
  mon.setDate(now.getDate() - dow + 1)
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return { start: iso(mon), end: iso(sun) }
}

const ExpenseChart: React.FC<ExpenseChartProps> = ({ transactions }) => {
  const [period, setPeriod] = useState<Period>('month')

  const { entries, total } = useMemo(() => {
    const monthStart = new Date().toISOString().slice(0, 7)
    const { start, end } = getWeekBounds()

    const expenses = transactions.filter(t => {
      if (t.type !== 'expense') return false
      if (period === 'month') return t.date.startsWith(monthStart)
      return t.date >= start && t.date <= end
    })

    const map: Record<string, { amount: number; count: number }> = {}
    expenses.forEach(t => {
      const cat = t.category ?? 'інше'
      if (!map[cat]) map[cat] = { amount: 0, count: 0 }
      map[cat].amount += t.amount
      map[cat].count  += 1
    })

    const tot = Object.values(map).reduce((s, v) => s + v.amount, 0)
    const sorted = Object.entries(map)
      .map(([cat, v]) => ({ cat, ...v }))
      .sort((a, b) => b.amount - a.amount)

    return { entries: sorted, total: tot }
  }, [transactions, period])

  if (total === 0) return null

  const gapFrac = GAP_DEG / 360
  const totalGap = entries.length * gapFrac
  let angle = 0

  const segments = entries.map(({ cat, amount }) => {
    const rawFrac = amount / total
    const drawFrac = Math.max(0, rawFrac - gapFrac)
    const start = angle
    angle += rawFrac * 360
    return { cat, amount, start, dashLen: drawFrac * CIRC }
  })

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <p className={styles.title}>Витрати по категоріях</p>
        <div className={styles.switcher}>
          <button
            type="button"
            className={`${styles.switchBtn} ${period === 'month' ? styles.switchActive : ''}`}
            onClick={() => setPeriod('month')}
          >
            Місяць
          </button>
          <button
            type="button"
            className={`${styles.switchBtn} ${period === 'week' ? styles.switchActive : ''}`}
            onClick={() => setPeriod('week')}
          >
            Тиждень
          </button>
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.donut}>
          <svg width={176} height={176} viewBox="0 0 176 176">
            <circle
              cx={CX} cy={CY} r={R}
              fill="none"
              stroke="var(--surface2)"
              strokeWidth={SW}
            />
            {segments.map(({ cat, dashLen, start }) => (
              <circle
                key={cat}
                cx={CX} cy={CY} r={R}
                fill="none"
                stroke={COLORS[cat] ?? FALLBACK}
                strokeWidth={SW}
                strokeDasharray={`${dashLen} ${CIRC}`}
                transform={`rotate(${start - 90} ${CX} ${CY})`}
                strokeLinecap="butt"
              />
            ))}
          </svg>
          <div className={styles.center}>
            <span className={styles.centerValue}>{fmt(total)}</span>
            <span className={styles.centerUnit}>ГРН</span>
          </div>
        </div>

        <div className={styles.legend}>
          {entries.map(({ cat, amount, count }) => (
            <div key={cat} className={styles.row}>
              <span className={styles.dot} style={{ background: COLORS[cat] ?? FALLBACK }} />
              <span className={styles.catCount}>
                <span className={styles.cat}>{cat}</span>
                <span className={styles.count}>{count}×</span>
              </span>
              <span className={styles.amt}>{fmt(amount)} ₴</span>
            </div>
          ))}
        </div>
      </div>

      {entries.length > 0 && (
        <p className={styles.insight}>
          Найбільше цього {period === 'month' ? 'місяця' : 'тижня'}:{' '}
          <span className={styles.insightCat}>{entries[0].cat}</span>
        </p>
      )}
    </div>
  )
}

export default ExpenseChart
