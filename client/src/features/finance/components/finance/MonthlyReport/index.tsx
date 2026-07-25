import React, { useMemo, useState, useEffect, useRef } from 'react'
import { fmt } from '../../../utils/finance'
import { authFetch } from '@/shared/services/api'
import { useCategoryStore } from '@/features/finance/store/categoryStore'
import { useProfileStore } from '@/shared/store/profileStore'
import { useUiStore } from '@/shared/store/uiStore'
import { useCanUseFeature } from '@/shared/hooks/usePlan'
import MimirIcon from '@/shared/components/ui/MimirIcon'
import Modal from '@/shared/components/ui/Modal'
import type { Transaction } from '@/shared/types'
import styles from './MonthlyReport.module.css'

interface FinanceContextItem {
  _id: string
  category?: string
  note: string
  createdAt: string
}

function applyInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
}

function renderMarkdown(md: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  let listItems: string[] = []
  let listKey = 0

  const flushList = () => {
    if (listItems.length === 0) return
    nodes.push(
      <ul key={`list-${listKey++}`} className={styles.aiList}>
        {listItems.map((item, j) => (
          <li key={j} className={styles.aiListItem} dangerouslySetInnerHTML={{ __html: applyInline(item) }} />
        ))}
      </ul>
    )
    listItems = []
  }

  for (const line of md.split('\n')) {
    // Skip markdown table rows and separators
    if (line.trim().startsWith('|')) continue

    if (line.startsWith('## ')) {
      flushList()
      nodes.push(<p key={nodes.length} className={styles.aiSection}>{line.slice(3)}</p>)
      continue
    }

    if (line.match(/^[-*] /)) {
      listItems.push(line.slice(2))
      continue
    }

    flushList()

    if (line.trim() === '' || line.trim() === '—' || line.trim() === '--') {
      nodes.push(<div key={nodes.length} className={styles.aiSpacer} />)
      continue
    }

    nodes.push(
      <p key={nodes.length} className={styles.aiLine} dangerouslySetInnerHTML={{ __html: applyInline(line) }} />
    )
  }

  flushList()
  return nodes
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
  const { activeProfile } = useProfileStore()
  const { showToast } = useUiStore()
  const canReport = useCanUseFeature('advancedFinance')
  const now   = new Date()
  const [year,  setYear]  = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [open,  setOpen]  = useState(false)
  const [aiContent,     setAiContent]     = useState<string | null>(null)
  const [aiLoading,     setAiLoading]     = useState(false)
  const [aiError,       setAiError]       = useState(false)
  const [aiGeneratedAt, setAiGeneratedAt] = useState<Date | null>(null)
  const [aiTextExpanded, setAiTextExpanded] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [loadingPhase, setLoadingPhase] = useState(0)
  const aiMonthRef = useRef('')
  const loadingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [financeContext, setFinanceContext] = useState<FinanceContextItem[]>([])
  const [showAddNote, setShowAddNote] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [noteCategory, setNoteCategory] = useState('')
  const [noteSaving, setNoteSaving] = useState(false)
  const [contextLoaded, setContextLoaded] = useState(false)

  const LOADING_PHASES = [
    'Збираю транзакції за місяць…',
    'Аналізую категорії витрат…',
    'Шукаю патерни по днях тижня…',
    'Зіставляю з попереднім місяцем…',
    'Формую несподіваний інсайт…',
    'Пишу звіт…',
  ]

  useEffect(() => {
    if (aiLoading) {
      setLoadingProgress(0)
      setLoadingPhase(0)
      let progress = 0
      loadingIntervalRef.current = setInterval(() => {
        progress += Math.random() * 4 + 1
        if (progress >= 93) { progress = 93; clearInterval(loadingIntervalRef.current!) }
        setLoadingProgress(Math.min(progress, 93))
        setLoadingPhase(Math.floor((Math.min(progress, 93) / 93) * (LOADING_PHASES.length - 1)))
      }, 400)
    } else {
      if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current)
      if (loadingProgress > 0) {
        setLoadingProgress(100)
        setTimeout(() => setLoadingProgress(0), 600)
      }
    }
    return () => { if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiLoading])

  useEffect(() => {
    if (contextLoaded) return
    let cancelled = false
    const load = async () => {
      try {
        const res = await authFetch('/api/finance/context')
        if (!cancelled && res.ok) {
          const data = await res.json() as { context: FinanceContextItem[] }
          setFinanceContext(data.context)
          setContextLoaded(true)
        }
      } catch { /* silent */ }
    }
    load()
    return () => { cancelled = true }
  }, [contextLoaded])

  const saveNote = async () => {
    if (!noteText.trim()) return
    setNoteSaving(true)
    try {
      const res = await authFetch('/api/finance/context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: noteText.trim(), category: noteCategory || undefined }),
      })
      if (res.ok) {
        const data = await res.json() as { context: FinanceContextItem[] }
        setFinanceContext(data.context)
        setNoteText('')
        setNoteCategory('')
        setShowAddNote(false)
        showToast('Зауваження збережено', 'success')
      }
    } catch { /* silent */ } finally {
      setNoteSaving(false)
    }
  }

  const deleteNote = async (id: string) => {
    try {
      const res = await authFetch(`/api/finance/context/${id}`, { method: 'DELETE' })
      if (res.ok) {
        const data = await res.json() as { context: FinanceContextItem[] }
        setFinanceContext(data.context)
        showToast('Зауваження видалено', 'success')
      }
    } catch { /* silent */ }
  }

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
            const data = await res.json() as { content: string | null; generatedAt?: string }
            if (data.content) {
              setAiContent(data.content)
              if (data.generatedAt) setAiGeneratedAt(new Date(data.generatedAt))
            }
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
    if (!activeProfile?.isVerified) { showToast('Підтвердіть email для AI-аналізу', 'error'); return }
    if (!canReport) { showToast('AI звіт — Personal Memory план', 'error'); window.location.href = '/profile?tab=plan'; return }
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
          setAiTextExpanded(true)
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

  const { top3, totalCur, totalPrev, weekData, recommendation, txCount } = useMemo(() => {
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

    return { top3, totalCur, totalPrev, weekData: weekData.map(w => ({ ...w, maxWeek })), recommendation, txCount: curTxs.length }
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
  const MIN_TX = 10
  const WARN_TX = 20
  const canAnalyse = txCount >= MIN_TX
  const lowDataWarning = txCount >= MIN_TX && txCount < WARN_TX

  const maxBar = top3.length > 0 ? top3[0].amount : 1

  return (
    <div className={styles.wrap}>
      {/* ── Accordion header ── */}
      <button
        type="button"
        className={styles.header}
        onClick={() => { setOpen(v => { if (v) setAiTextExpanded(false); return !v }) }}
        aria-expanded={open}
      >
        <span className={styles.headerLeft}>
          <span className={styles.headerIcon}><MimirIcon size={13} /></span>
          <span className={styles.headerTitle}>МІСЯЧНА АНАЛІТИКА</span>
        </span>
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
              {/* Total + AI trigger */}
              <div className={styles.totalRow}>
                <span className={styles.totalLabel}>Всього витрачено</span>
                <span className={styles.totalValue}>{fmt(totalCur)} ₴</span>
                {totalPrev > 0 && (
                  <span className={`${styles.totalDelta} ${totalCur <= totalPrev ? styles.pos : styles.neg}`}>
                    {totalCur <= totalPrev ? '↓' : '↑'} {fmt(Math.abs(totalCur - totalPrev))} ₴
                  </span>
                )}
                {canAnalyse && (
                  <button
                    type="button"
                    className={styles.aiBtn}
                    onClick={generateReport}
                    disabled={aiLoading}
                    title={aiContent ? 'Оновити аналіз' : 'Згенерувати AI аналіз'}
                  >
                    <MimirIcon size={12} />
                    {aiContent ? 'Оновити' : 'Аналіз'}
                    {!activeProfile?.isVerified && <span className={styles.verifyBadge}>ВЕРИФІКАЦІЯ</span>}
                  </button>
                )}
              </div>
              {!canAnalyse && (
                <p className={styles.txThreshold}>Замало транзакцій для аналізу (мінімум {MIN_TX}, зараз {txCount})</p>
              )}
              {lowDataWarning && (
                <p className={styles.txWarning}>Мало даних — аналіз може бути неточним ({txCount} транзакцій)</p>
              )}

              {/* AI loading block */}
              {aiLoading && (
                <div className={styles.installBlock}>
                  <div className={styles.installHeader}>
                    <span className={styles.installTitle}>MIMIR АНАЛІЗУЄ</span>
                    <span className={styles.installPct}>{Math.round(loadingProgress)}%</span>
                  </div>
                  <div className={styles.installTrack}>
                    <div className={styles.installFill} style={{ width: `${loadingProgress}%` }} />
                  </div>
                  <span className={styles.installPhase}>{LOADING_PHASES[loadingPhase]}</span>
                  <div className={styles.installLog}>
                    {LOADING_PHASES.slice(0, loadingPhase + 1).map((p, i) => (
                      <span key={i} className={`${styles.installLogLine} ${i === loadingPhase ? styles.installLogActive : styles.installLogDone}`}>
                        {i < loadingPhase ? '✓ ' : '› '}{p}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* AI result + date */}
              {(aiContent || aiError) && (
                <div className={styles.aiBlock}>
                  <div className={styles.aiBlockHeader}>
                    {aiGeneratedAt && (
                      <span className={styles.aiDate}>
                        {aiGeneratedAt.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                    {!aiTextExpanded && aiContent && (
                      <button type="button" className={styles.aiExpandBtn} onClick={() => setAiTextExpanded(true)}>
                        Читати повністю
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>
                    )}
                  </div>
                  {aiError && <p className={styles.aiError}>Помилка генерації. Спробуйте ще раз.</p>}
                  {aiContent && (
                    <div className={`${styles.aiContent} ${!aiTextExpanded ? styles.aiContentCollapsed : ''}`}>
                      {renderMarkdown(aiContent)}
                      {!aiTextExpanded && <div className={styles.aiContentFade} />}
                    </div>
                  )}
                  {!aiTextExpanded && aiContent && (
                    <button type="button" className={styles.aiExpandBtnBottom} onClick={() => setAiTextExpanded(true)}>
                      Розгорнути аналіз
                    </button>
                  )}
                </div>
              )}

              {/* Mimir context notes */}
              <div className={styles.contextBlock}>
                <div className={styles.contextHeader}>
                  <span className={styles.sectionLabel} style={{ margin: 0 }}>ЗАУВАЖЕННЯ МІМІР</span>
                  <button type="button" className={styles.contextAddBtn} onClick={() => setShowAddNote(true)}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    Додати
                  </button>
                </div>
                {financeContext.length === 0 ? (
                  <p className={styles.contextEmpty}>Немає зауважень — Мімір аналізує без обмежень</p>
                ) : (
                  <ul className={styles.contextList}>
                    {financeContext.map(item => (
                      <li key={item._id} className={styles.contextItem}>
                        {item.category && <span className={styles.contextCat}>{item.category}</span>}
                        <span className={styles.contextNote}>{item.note}</span>
                        <button
                          type="button"
                          className={styles.contextDelBtn}
                          onClick={() => deleteNote(item._id)}
                          title="Видалити"
                        >
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                          </svg>
                        </button>
                      </li>
                    ))}
                  </ul>
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
            </>
          )}
        </div>
      </div>

      {/* Add note sheet */}
      <Modal isOpen={showAddNote} onClose={() => { setShowAddNote(false); setNoteText(''); setNoteCategory('') }} title="Зауваження Мімір" draggable>
        <div className={styles.noteForm}>
          <p className={styles.noteHint}>Мімір врахує це в наступних аналізах. Наприклад: "барбершоп — витрата раз на 2 місяці, не аномалія".</p>
          <label className={styles.noteLabel}>Категорія (необов'язково)</label>
          <select
            className={styles.noteSelect}
            value={noteCategory}
            onChange={e => setNoteCategory(e.target.value)}
          >
            <option value="">Загальне</option>
            {categories.map(c => (
              <option key={c._id} value={c.name}>{c.name}</option>
            ))}
          </select>
          <label className={styles.noteLabel}>Зауваження</label>
          <textarea
            className={styles.noteTextarea}
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            placeholder="Напиши уточнення для Міміра…"
            rows={4}
            maxLength={300}
          />
          <span className={styles.noteCount}>{noteText.length}/300</span>
          <button
            type="button"
            className={styles.noteSaveBtn}
            onClick={saveNote}
            disabled={noteSaving || !noteText.trim()}
          >
            {noteSaving ? 'Зберігаю…' : 'Зберегти'}
          </button>
        </div>
      </Modal>
    </div>
  )
}

export default MonthlyReport
