import React, { useMemo, useState, useEffect, useRef } from 'react'
import { fmt } from '../../../utils/finance'
import { authFetch } from '../../../services/api'
import { useCategoryStore } from '../../../store/categoryStore'
import MimirIcon from '../../ui/MimirIcon'
import type { Transaction } from '../../../types'
import styles from './MonthlyReport.module.css'

function renderMarkdown(md: string): React.ReactNode[] {
  return md.split('\n').map((line, i) => {
    if (line.startsWith('## ')) {
      return <p key={i} className={styles.aiSection}>{line.slice(3)}</p>
    }
    const bold = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    if (bold !== line) {
      return <p key={i} className={styles.aiLine} dangerouslySetInnerHTML={{ __html: bold }} />
    }
    if (line.trim() === '') return <div key={i} className={styles.aiSpacer} />
    return <p key={i} className={styles.aiLine}>{line}</p>
  })
}

/**
 * MonthlyReport
 * -------------
 * Акордеон-секція з місячною аналітикою витрат.
 * Топ-3 категорії, порівняння з попереднім місяцем, тижні, рекомендація.
 *
 * Props:
 * @prop {Transaction[]} transactions — всі транзакції з financeStore
 */
interface MonthlyReportProps {
  transactions: Transaction[]
}

const MONTHS_UA = [
  'Січень','Лютий','Березень','Квітень','Травень','Червень',
  'Липень','Серпень','Вересень','Жовтень','Листопад','Грудень',
]

function toYearMonth(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`
}

function getWeeksOfMonth(year: number, month: number): { label: string; start: string; end: string }[] {
  const weeks: { label: string; start: string; end: string }[] = []
  const firstDay = new Date(year, month, 1)
  const lastDay  = new Date(year, month + 1, 0)

  let cur = new Date(firstDay)
  while (cur <= lastDay) {
    const weekStart = new Date(cur)
    const weekEnd   = new Date(cur)
    weekEnd.setDate(weekEnd.getDate() + 6)
    if (weekEnd > lastDay) weekEnd.setTime(lastDay.getTime())

    const fmt2 = (d: Date) => `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}`
    weeks.push({
      label: `${fmt2(weekStart)}–${fmt2(weekEnd)}`,
      start: weekStart.toISOString().slice(0, 10),
      end:   weekEnd.toISOString().slice(0, 10),
    })
    cur.setDate(cur.getDate() + 7)
  }
  return weeks
}

const FALLBACK_COLOR = '#7a7a8c'

const MonthlyReport: React.FC<MonthlyReportProps> = ({ transactions }) => {
  const { categories } = useCategoryStore()
  const now   = new Date()
  const [year,  setYear]  = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [open,  setOpen]  = useState(false)
  const [aiContent,     setAiContent]     = useState<string | null>(null)
  const [aiLoading,     setAiLoading]     = useState(false)
  const [aiError,       setAiError]       = useState(false)
  const [aiGeneratedAt, setAiGeneratedAt] = useState<Date | null>(null)
  const aiMonthRef = useRef('')

  const ym = toYearMonth(year, month)

  useEffect(() => {
    if (ym === aiMonthRef.current) return
    aiMonthRef.current = ym
    setAiContent(null)
    setAiError(false)
    setAiGeneratedAt(null)
  }, [ym])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    const load = async () => {
      if (aiContent !== null || aiLoading) return
      try {
        const res = await authFetch(`/api/finance/report/${ym}`)
        if (!cancelled) {
          if (res.ok) {
            const data = await res.json() as { content: string; generatedAt: string }
            setAiContent(data.content)
            setAiGeneratedAt(new Date(data.generatedAt))
          }
        }
      } catch {
        // silent — just no cached report
      }
    }
    load()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ym])

  const generateReport = async () => {
    let cancelled = false
    setAiLoading(true)
    setAiError(false)
    try {
      const res = await authFetch(`/api/finance/report/${ym}`, { method: 'POST' })
      if (!cancelled) {
        if (res.ok) {
          const data = await res.json() as { content: string; generatedAt: string }
          setAiContent(data.content)
          setAiGeneratedAt(new Date(data.generatedAt))
        } else {
          setAiError(true)
        }
      }
    } catch {
      if (!cancelled) setAiError(true)
    } finally {
      if (!cancelled) setAiLoading(false)
    }
    return () => { cancelled = true }
  }

  const colorOf = (name: string) =>
    categories.find(c => c.name.toLowerCase() === name.toLowerCase())?.color ?? FALLBACK_COLOR

  const prevYear  = month === 0 ? year - 1 : year
  const prevMonth = month === 0 ? 11 : month - 1

  const expensesOf = (ym: string) =>
    transactions.filter(t => t.type === 'expense' && t.date.startsWith(ym))

  const { top3, totalCur, totalPrev, weekData, recommendation } = useMemo(() => {
    const ymCur  = toYearMonth(year, month)
    const ymPrev = toYearMonth(prevYear, prevMonth)

    const curTxs  = expensesOf(ymCur)
    const prevTxs = expensesOf(ymPrev)

    // Category totals — exclude "накопичення"
    const buildMap = (txs: Transaction[]) => {
      const map: Record<string, number> = {}
      txs.forEach(t => {
        const cat = (t.category ?? 'інше').toLowerCase()
        if (cat === 'накопичення') return
        map[cat] = (map[cat] ?? 0) + t.amount
      })
      return map
    }

    const curMap  = buildMap(curTxs)
    const prevMap = buildMap(prevTxs)

    const totalCur  = Object.values(curMap).reduce((s, v) => s + v, 0)
    const totalPrev = Object.values(prevMap).reduce((s, v) => s + v, 0)

    const top3 = Object.entries(curMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([cat, amount]) => {
        const prev  = prevMap[cat] ?? null
        const delta = prev !== null ? amount - prev : null
        return { cat, amount, prev, delta }
      })

    // Weeks
    const weeks = getWeeksOfMonth(year, month)
    const weekData = weeks.map(w => {
      const sum = curTxs
        .filter(t => t.date >= w.start && t.date <= w.end)
        .reduce((s, t) => s + t.amount, 0)
      return { ...w, sum }
    })
    const maxWeek = Math.max(...weekData.map(w => w.sum), 1)

    // Recommendation — biggest growth vs prev month
    const hasPrev = Object.keys(prevMap).length > 0
    let recommendation: string | null = null
    if (hasPrev) {
      const growths = Object.entries(curMap)
        .filter(([cat]) => cat !== 'накопичення')
        .map(([cat, amount]) => ({ cat, delta: amount - (prevMap[cat] ?? 0) }))
        .filter(g => g.delta > 0)
        .sort((a, b) => b.delta - a.delta)
      if (growths.length > 0) {
        const g = growths[0]
        recommendation = `Найбільший ріст: ${g.cat} +${fmt(g.delta)} ₴ vs минулого місяця`
      }
    }

    return { top3, totalCur, totalPrev, weekData: weekData.map(w => ({ ...w, maxWeek })), recommendation }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, year, month])

  const prevMonth_ = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  const nextMonth_ = () => {
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth()
    if (isCurrentMonth) return
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth()
  const hasData = totalCur > 0

  const maxBar = top3.length > 0 ? top3[0].amount : 1

  return (
    <div className={styles.wrap}>
      {/* ── Accordion header ── */}
      <button
        type="button"
        className={styles.header}
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
      >
        <span className={styles.headerTitle}>МІСЯЧНА АНАЛІТИКА</span>
        <svg
          className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}
          width="16" height="16" viewBox="0 0 16 16" fill="none"
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* ── Body (accordion) ── */}
      <div className={`${styles.body} ${open ? styles.bodyOpen : ''}`}>
        <div className={styles.inner}>

          {/* Month selector */}
          <div className={styles.monthRow}>
            <button type="button" className={styles.monthBtn} onClick={prevMonth_}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <span className={styles.monthLabel}>
              {MONTHS_UA[month]} {year}
              {isCurrentMonth && <span className={styles.monthCurrent}>поточний</span>}
            </span>
            <button
              type="button"
              className={`${styles.monthBtn} ${isCurrentMonth ? styles.monthBtnDisabled : ''}`}
              onClick={nextMonth_}
              disabled={isCurrentMonth}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          {!hasData ? (
            <p className={styles.empty}>Немає витрат за цей місяць</p>
          ) : (
            <>
              {/* Total */}
              <div className={styles.totalRow}>
                <span className={styles.totalLabel}>Всього витрачено</span>
                <span className={styles.totalValue}>{fmt(totalCur)} ₴</span>
                {totalPrev > 0 && (
                  <span className={`${styles.totalDelta} ${totalCur <= totalPrev ? styles.pos : styles.neg}`}>
                    {totalCur <= totalPrev ? '↓' : '↑'} {fmt(Math.abs(totalCur - totalPrev))} ₴
                  </span>
                )}
              </div>

              {/* Top-3 categories */}
              <p className={styles.sectionLabel}>ТОП КАТЕГОРІЇ</p>
              <div className={styles.catList}>
                {top3.map(({ cat, amount, delta }) => (
                  <div key={cat} className={styles.catRow}>
                    <div className={styles.catMeta}>
                      <span
                        className={styles.catDot}
                        style={{ background: colorOf(cat) }}
                      />
                      <span className={styles.catName}>{cat}</span>
                      {delta !== null && (
                        <span className={`${styles.catDelta} ${delta <= 0 ? styles.pos : styles.neg}`}>
                          {delta > 0 ? '↑' : '↓'} {fmt(Math.abs(delta))} ₴
                        </span>
                      )}
                      {delta === null && <span className={styles.catNew}>NEW</span>}
                    </div>
                    <div className={styles.barWrap}>
                      <div
                        className={styles.bar}
                        style={{
                          width: `${Math.round((amount / maxBar) * 100)}%`,
                          background: colorOf(cat),
                        }}
                      />
                    </div>
                    <span className={styles.catAmount}>{fmt(amount)} ₴</span>
                  </div>
                ))}
              </div>

              {/* Weeks */}
              <p className={styles.sectionLabel}>ТИЖНІ</p>
              <div className={styles.weekGrid}>
                {weekData.map((w, i) => {
                  const pct = w.maxWeek > 0 ? Math.round((w.sum / w.maxWeek) * 100) : 0
                  const isMax = w.sum > 0 && w.sum === w.maxWeek
                  const isMin = w.sum > 0 && weekData.filter(x => x.sum > 0).every(x => x.sum >= w.sum) && !isMax
                  return (
                    <div key={i} className={styles.weekCol}>
                      <div className={styles.weekBarWrap}>
                        <div
                          className={`${styles.weekBar} ${isMax ? styles.weekBarMax : ''} ${isMin ? styles.weekBarMin : ''}`}
                          style={{ height: `${Math.max(pct, w.sum > 0 ? 8 : 2)}%` }}
                        />
                      </div>
                      <span className={styles.weekSum}>{w.sum > 0 ? `${fmt(w.sum)}` : '—'}</span>
                      <span className={styles.weekLabel}>{w.label}</span>
                    </div>
                  )
                })}
              </div>

              {/* Recommendation */}
              {recommendation && (
                <div className={styles.rec}>
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d="M6.5 1.5v4M6.5 8.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.2"/>
                  </svg>
                  <span>{recommendation}</span>
                </div>
              )}

              {/* AI Analysis */}
              <div className={styles.aiRow}>
                <button
                  type="button"
                  className={styles.aiBtn}
                  onClick={generateReport}
                  disabled={aiLoading}
                >
                  {aiLoading ? (
                    <span className={styles.aiSpinner} />
                  ) : (
                    <MimirIcon size={13} />
                  )}
                  {aiContent ? 'Оновити' : 'AI Аналіз'}
                </button>
                {aiGeneratedAt && (
                  <span className={styles.aiDate}>
                    {aiGeneratedAt.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>

              {aiError && (
                <p className={styles.aiError}>Помилка генерації. Спробуйте ще раз.</p>
              )}

              {aiContent && (
                <div className={styles.aiContent}>
                  {renderMarkdown(aiContent)}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default MonthlyReport
