import React, { useMemo, useState, useEffect } from 'react'
import type { Transaction } from '@/shared/types'
import { fmt } from '../../../utils/finance'
import { useCategoryStore } from '@/features/finance/store/categoryStore'
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

const VISIBLE_COUNT = 5

const ExpenseChart: React.FC<ExpenseChartProps> = ({ transactions }) => {
  const { categories, fetchCategories } = useCategoryStore()
  const [period, setPeriod]             = useState<Period>('month')
  const [showAll, setShowAll]           = useState(false)

  useEffect(() => { fetchCategories() }, [fetchCategories])

  const colorOf = (catName: string): string => {
    const found = categories.find(c => c.name.toLowerCase() === catName.toLowerCase())
    return found?.color ?? FALLBACK
  }

  const { entries, total } = useMemo(() => {
    const monthStart = new Date().toISOString().slice(0, 7)
    const { start, end } = getWeekBounds()

    const expenses = transactions.filter(t => {
      if (t.type !== 'expense') return false
      if (period === 'month') return t.date.startsWith(monthStart)
      return t.date >= start && t.date <= end
    })

    const map: Record<string, number> = {}
    expenses.forEach(t => {
      const cat = t.category ?? 'інше'
      if (cat === 'накопичення') return
      map[cat] = (map[cat] ?? 0) + t.amount
    })

    const tot = Object.values(map).reduce((s, v) => s + v, 0)
    const sorted = Object.entries(map)
      .map(([cat, amount]) => ({ cat, amount }))
      .sort((a, b) => b.amount - a.amount)

    return { entries: sorted, total: tot }
  }, [transactions, period])

  if (total === 0) return null

  const gapFrac = GAP_DEG / 360

  const segments = entries.reduce(
    (acc, { cat, amount }) => {
      const rawFrac = amount / total
      const drawFrac = Math.max(0, rawFrac - gapFrac)
      const start = acc.angle
      acc.segments.push({ cat, amount, start, dashLen: drawFrac * CIRC })
      acc.angle += rawFrac * 360
      return acc
    },
    {
      angle: 0,
      segments: [] as { cat: string; amount: number; start: number; dashLen: number }[],
    }
  ).segments

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <p className={styles.title}>Витрати по категоріях</p>
        <div className={styles.switcher}>
          <button
            type="button"
            className={`${styles.switchBtn} ${period === 'month' ? styles.switchActive : ''}`}
            onClick={() => { setPeriod('month'); setShowAll(false) }}
          >
            Місяць
          </button>
          <button
            type="button"
            className={`${styles.switchBtn} ${period === 'week' ? styles.switchActive : ''}`}
            onClick={() => { setPeriod('week'); setShowAll(false) }}
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
                stroke={colorOf(cat)}
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
          {entries.slice(0, VISIBLE_COUNT).map(({ cat, amount }) => (
            <div key={cat} className={styles.legendItem}>
              <span className={styles.dot} style={{ background: colorOf(cat) }} />
              <span className={styles.legendName}>{cat}</span>
              <span className={styles.legendAmount}>{fmt(amount)} ₴</span>
            </div>
          ))}
          {entries.length > VISIBLE_COUNT && (
            <>
              <div className={`${styles.extraItems} ${showAll ? styles.extraItemsOpen : ''}`}>
                {entries.slice(VISIBLE_COUNT).map(({ cat, amount }) => (
                  <div key={cat} className={styles.legendItem}>
                    <span className={styles.dot} style={{ background: colorOf(cat) }} />
                    <span className={styles.legendName}>{cat}</span>
                    <span className={styles.legendAmount}>{fmt(amount)} ₴</span>
                  </div>
                ))}
              </div>
              <button
                className={styles.showMore}
                onClick={() => setShowAll(v => !v)}
              >
                <svg
                  width="10" height="10" viewBox="0 0 10 10" fill="none"
                  className={`${styles.showMoreChevron} ${showAll ? styles.showMoreChevronOpen : ''}`}
                >
                  <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {showAll ? 'сховати' : `ще ${entries.length - VISIBLE_COUNT}`}
              </button>
            </>
          )}
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
