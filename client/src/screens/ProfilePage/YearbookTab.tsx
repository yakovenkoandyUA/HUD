import React, { useEffect, useRef, useState } from 'react'
import { useYearbookStore } from '../../store/yearbookStore'
import type { YearbookPeriod } from '../../types/yearbook'
import styles from './YearbookTab.module.css'

// ── Period helpers ─────────────────────────────────────────────────────────────

type PeriodType = 'month' | 'season' | 'year'
type SeasonKey = 'spring' | 'summer' | 'autumn' | 'winter'

const MONTHS_UA = [
  'СІЧЕНЬ', 'ЛЮТИЙ', 'БЕРЕЗЕНЬ', 'КВІТЕНЬ', 'ТРАВЕНЬ', 'ЧЕРВЕНЬ',
  'ЛИПЕНЬ', 'СЕРПЕНЬ', 'ВЕРЕСЕНЬ', 'ЖОВТЕНЬ', 'ЛИСТОПАД', 'ГРУДЕНЬ',
]

const SEASONS_UA: Record<SeasonKey, string> = {
  spring: 'ВЕСНА', summer: 'ЛІТО', autumn: 'ОСІНЬ', winter: 'ЗИМА',
}

const SEASON_ORDER: SeasonKey[] = ['spring', 'summer', 'autumn', 'winter']

function getCurrentSeason(monthOneBased: number): SeasonKey {
  if (monthOneBased >= 3 && monthOneBased <= 5) return 'spring'
  if (monthOneBased >= 6 && monthOneBased <= 8) return 'summer'
  if (monthOneBased >= 9 && monthOneBased <= 11) return 'autumn'
  return 'winter'
}

function prevSeason(s: SeasonKey, y: number): { season: SeasonKey; year: number } {
  const idx = SEASON_ORDER.indexOf(s)
  if (idx === 0) return { season: 'winter', year: y - 1 }
  return { season: SEASON_ORDER[idx - 1], year: y }
}

function nextSeason(s: SeasonKey, y: number): { season: SeasonKey; year: number } {
  const idx = SEASON_ORDER.indexOf(s)
  if (idx === SEASON_ORDER.length - 1) return { season: 'spring', year: y + 1 }
  return { season: SEASON_ORDER[idx + 1], year: y }
}

function formatUAH(n: number): string {
  return Math.round(n).toLocaleString('uk-UA')
}

// ── Component ──────────────────────────────────────────────────────────────────

/**
 * YearbookTab
 * -----------
 * Atmospheric yearly/seasonal/monthly wrap — замінює Timeline в Хроніці.
 * 5 секцій (Cover / Подорожі / Медіа / Кухня / Фінанси) з mesh-gradient фонами.
 * Period picker: МІСЯЦЬ / СЕЗОН / РІК + навігаційні стрілки.
 */
const YearbookTab: React.FC = () => {
  const now = new Date()
  const todayYear  = now.getFullYear()
  const todayMonth = now.getMonth() + 1
  const todaySeason = getCurrentSeason(todayMonth)

  const [periodType, setPeriodType] = useState<PeriodType>('year')
  const [year,   setYear]   = useState(todayYear)
  const [month,  setMonth]  = useState(todayMonth)
  const [season, setSeason] = useState<SeasonKey>(todaySeason)

  const { fetchYearbook, generateYearbook, getReport, isNotGenerated, loading } = useYearbookStore()

  const period: YearbookPeriod =
    periodType === 'year'  ? 'annual' :
    periodType === 'month' ? String(month).padStart(2, '0') :
    season

  const report       = getReport(year, period)
  const notGenerated = isNotGenerated(year, period)

  const prevFetchKey = useRef('')
  useEffect(() => {
    const k = `${year}-${period}`
    if (prevFetchKey.current === k) return
    prevFetchKey.current = k
    fetchYearbook(year, period)
  }, [year, period, fetchYearbook])

  // Label shown in nav
  const periodLabel =
    periodType === 'year'  ? String(year) :
    periodType === 'month' ? `${MONTHS_UA[month - 1]} ${year}` :
    `${SEASONS_UA[season]} ${year}`

  // Navigation
  const atMax = (): boolean => {
    if (periodType === 'year') return year >= todayYear
    if (periodType === 'month') return year >= todayYear && month >= todayMonth
    return year >= todayYear && SEASON_ORDER.indexOf(season) >= SEASON_ORDER.indexOf(todaySeason)
  }

  const goPrev = () => {
    if (periodType === 'year') { setYear(y => y - 1) }
    else if (periodType === 'month') {
      if (month === 1) { setMonth(12); setYear(y => y - 1) }
      else setMonth(m => m - 1)
    } else {
      const { season: s, year: y } = prevSeason(season, year)
      setSeason(s); setYear(y)
    }
  }

  const goNext = () => {
    if (atMax()) return
    if (periodType === 'year') { setYear(y => y + 1) }
    else if (periodType === 'month') {
      if (month === 12) { setMonth(1); setYear(y => y + 1) }
      else setMonth(m => m + 1)
    } else {
      const { season: s, year: y } = nextSeason(season, year)
      setSeason(s); setYear(y)
    }
  }

  const handleGenerate = () => { generateYearbook(year, period) }

  const s = report?.sections

  return (
    <div className={styles.wrap}>

      {/* ── Period picker ── */}
      <div className={styles.picker}>
        <div className={styles.pickerTabs}>
          {(['month', 'season', 'year'] as PeriodType[]).map(t => (
            <button
              key={t}
              type="button"
              className={`${styles.pickerTab} ${periodType === t ? styles.pickerTabActive : ''}`}
              onClick={() => setPeriodType(t)}
            >
              {t === 'month' ? 'МІСЯЦЬ' : t === 'season' ? 'СЕЗОН' : 'РІК'}
            </button>
          ))}
        </div>

        <div className={styles.pickerNav}>
          <button type="button" className={styles.pickerArrow} onClick={goPrev} aria-label="Назад">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <span className={styles.pickerLabel}>{periodLabel}</span>
          <button type="button" className={styles.pickerArrow} onClick={goNext} disabled={atMax()} aria-label="Вперед">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ── Loading ── */}
      {loading && !report && (
        <div className={styles.loadingWrap}>
          <div className={styles.spinner} />
        </div>
      )}

      {/* ── Not generated yet ── */}
      {!loading && notGenerated && !report && (
        <div className={styles.empty}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true" className={styles.emptyIcon}>
            <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M16 10v6M16 21v1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
          <p className={styles.emptyText}>Дані за {periodLabel.toLowerCase()} ще не зібрані</p>
          <button type="button" className={styles.generateBtn} onClick={handleGenerate} disabled={loading}>
            ЗГЕНЕРУВАТИ
          </button>
        </div>
      )}

      {/* ── Sections ── */}
      {report && s && (
        <div className={styles.sections}>

          {/* Stale banner */}
          {report.stale && (
            <div className={styles.staleBanner}>
              <span>Дані змінились з моменту генерації</span>
              <button type="button" onClick={handleGenerate} disabled={loading}>
                {loading ? '…' : 'Оновити'}
              </button>
            </div>
          )}

          {/* ── 1. Cover ── */}
          <div className={`${styles.section} ${styles.sectionCover}`}>
            <div className={styles.sectionInner}>
              <span className={styles.eyebrow}>{periodLabel}</span>
              <h2 className={styles.coverTitle}>MIMIR</h2>
              <div className={styles.statBlock}>
                <span className={styles.statNum}>{s.memoriesCount}</span>
                <span className={styles.statUnit}>СПОГАДІВ</span>
              </div>
              <div className={styles.aiBox}>
                <span className={styles.aiBoxLabel}>AI НАРАТИВ · НЕЗАБАРОМ</span>
              </div>
            </div>
          </div>

          {/* ── 2. Подорожі ── */}
          <div className={`${styles.section} ${styles.sectionTravel}`}>
            <div className={styles.sectionInner}>
              <span className={styles.eyebrow}>ПОДОРОЖІ</span>
              <div className={styles.statBlock}>
                <span className={styles.statNum}>{s.memoriesCount + s.placesVisitedCount}</span>
                <span className={styles.statUnit}>МІСЦЬ</span>
              </div>
              {s.placesVisitedCount > 0 && (
                <p className={styles.subText}>{s.placesVisitedCount} нових планів відвідано</p>
              )}
              {s.topPlaces.length > 0 && (
                <div className={styles.pills}>
                  {s.topPlaces.map((p, i) => (
                    <span key={i} className={styles.pill}>{p}</span>
                  ))}
                </div>
              )}
              <div className={styles.aiBox}>
                <span className={styles.aiBoxLabel}>AI НАРАТИВ · НЕЗАБАРОМ</span>
              </div>
            </div>
          </div>

          {/* ── 3. Медіа ── */}
          <div className={`${styles.section} ${styles.sectionMedia}`}>
            <div className={styles.sectionInner}>
              <span className={styles.eyebrow}>МЕДІА</span>
              <div className={styles.statBlock}>
                <span className={styles.statNum}>{s.moviesWatched + s.seriesWatched + s.animeWatched}</span>
                <span className={styles.statUnit}>ПЕРЕГЛЯНУТО</span>
              </div>
              <div className={styles.subStats}>
                {s.moviesWatched   > 0 && <span>{s.moviesWatched} фільмів</span>}
                {s.seriesWatched   > 0 && <span>{s.seriesWatched} серіалів</span>}
                {s.animeWatched    > 0 && <span>{s.animeWatched} аніме</span>}
              </div>
              <div className={styles.aiBox}>
                <span className={styles.aiBoxLabel}>AI НАРАТИВ · НЕЗАБАРОМ</span>
              </div>
            </div>
          </div>

          {/* ── 4. Кухня ── */}
          <div className={`${styles.section} ${styles.sectionFood}`}>
            <div className={styles.sectionInner}>
              <span className={styles.eyebrow}>КУХНЯ</span>
              <div className={styles.statBlock}>
                <span className={styles.statNum}>{s.recipesCookedCount}</span>
                <span className={styles.statUnit}>СТРАВ</span>
              </div>
              {s.uniqueRecipesCount > 0 && (
                <p className={styles.subText}>{s.uniqueRecipesCount} унікальних рецептів</p>
              )}
              <div className={styles.aiBox}>
                <span className={styles.aiBoxLabel}>AI НАРАТИВ · НЕЗАБАРОМ</span>
              </div>
            </div>
          </div>

          {/* ── 5. Фінанси ── */}
          <div className={`${styles.section} ${styles.sectionFinance} ${styles.sectionLast}`}>
            <div className={styles.sectionInner}>
              <span className={styles.eyebrow}>ФІНАНСИ</span>
              <div className={styles.statBlock}>
                <span className={`${styles.statNum} ${styles.statNumUah}`}>{formatUAH(s.totalSpent)}</span>
                <span className={styles.statUnit}>₴ ВИТРАТ</span>
              </div>
              {s.topExpenseCategories.length > 0 && (
                <div className={styles.subStats}>
                  {s.topExpenseCategories.map(c => (
                    <span key={c.name}>{c.name} · {formatUAH(c.total)} ₴</span>
                  ))}
                </div>
              )}
              <div className={styles.aiBox}>
                <span className={styles.aiBoxLabel}>AI НАРАТИВ · НЕЗАБАРОМ</span>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}

export default YearbookTab
