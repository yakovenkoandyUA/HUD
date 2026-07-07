import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import AppHeader from '../../components/AppHeader'
import DoodleIllustration from '../../components/ui/DoodleIllustration'
import UpgradePrompt from '../../components/ui/UpgradePrompt'
import { useYearbookStore } from '../../store/yearbookStore'
import { useCanUseFeature } from '../../hooks/usePlan'
import styles from './Yearbook.module.css'

const MOOD_LABEL: Record<string, string> = {
  up: 'Настрій покращувався цього року',
  down: 'Рік був емоційно складнішим',
  flat: 'Настрій тримався стабільно',
}

function formatUAH(n: number): string {
  return Math.round(n).toLocaleString('uk-UA')
}

/**
 * YearbookScreen
 * --------------
 * Yearbook / Recap — кешований річний підсумок (`/yearbook/:year`).
 * Deterministic-статистика з тих самих джерел, що Timeline.
 * Генерація — тільки за явним натиском кнопки, ніколи автоматично.
 */
const YearbookScreen: React.FC = () => {
  const { year: yearParam } = useParams<{ year: string }>()
  const navigate = useNavigate()
  const year = parseInt(yearParam ?? '', 10) || new Date().getFullYear()
  const { loading, getReport, isNotGenerated, fetchYearbook, generateYearbook } = useYearbookStore()

  const [generating, setGenerating] = useState(false)
  const canGenerate = useCanUseFeature('yearbookGenerate')

  useEffect(() => { fetchYearbook(year, 'annual') }, [year, fetchYearbook])

  const handleGenerate = async () => {
    setGenerating(true)
    await generateYearbook(year, 'annual')
    setGenerating(false)
  }

  const report      = getReport(year, 'annual')
  const notGenerated = isNotGenerated(year, 'annual')
  const s = report?.sections

  return (
    <div className={styles.screen}>
      <AppHeader />
      <div className={styles.titleRow}>
        <button type="button" className={styles.backBtn} onClick={() => navigate('/timeline')}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M11 3.5L5.5 9l5.5 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <span className={styles.pageTitle}>ПІДСУМКИ {year}</span>
      </div>

      {!loading && notGenerated && !report && (
        <div className={styles.empty}>
          <DoodleIllustration variant="memories" size={56} />
          <span className={styles.emptyText}>Звіт за {year} ще не згенеровано</span>
          {canGenerate ? (
            <button type="button" className={styles.generateBtn} onClick={handleGenerate} disabled={generating}>
              {generating ? 'Рахуємо…' : 'Згенерувати підсумок'}
            </button>
          ) : (
            <UpgradePrompt feature="yearbookGenerate" />
          )}
        </div>
      )}

      {report && s && (
        <div className={styles.content}>
          {report.stale && (
            <div className={styles.staleBanner}>
              <span>Дані за рік змінились з моменту генерації</span>
              <button type="button" onClick={handleGenerate} disabled={generating}>
                {generating ? 'Рахуємо…' : 'Оновити'}
              </button>
            </div>
          )}

          <div className={styles.card}>
            <span className={styles.cardLabel}>СПОГАДИ</span>
            <span className={styles.cardValue}>{s.memoriesCount}</span>
            {s.topPlaces.length > 0 && (
              <span className={styles.cardSub}>Найчастіше: {s.topPlaces.join(', ')}</span>
            )}
            {s.placesVisitedCount > 0 && (
              <span className={styles.cardSub}>{s.placesVisitedCount} нових місць відвідано</span>
            )}
          </div>

          <div className={styles.card}>
            <span className={styles.cardLabel}>МЕДІА</span>
            <span className={styles.cardValue}>{s.moviesWatched + s.seriesWatched + s.animeWatched}</span>
            <span className={styles.cardSub}>
              {s.moviesWatched} фільмів · {s.seriesWatched} серіалів · {s.animeWatched} аніме
            </span>
          </div>

          <div className={styles.card}>
            <span className={styles.cardLabel}>РЕЦЕПТИ</span>
            <span className={styles.cardValue}>{s.recipesCookedCount}</span>
            <span className={styles.cardSub}>{s.uniqueRecipesCount} унікальних рецептів</span>
          </div>

          {s.moodTrend && (
            <div className={styles.card}>
              <span className={styles.cardLabel}>НАСТРІЙ</span>
              <span className={styles.cardSub}>{MOOD_LABEL[s.moodTrend]}</span>
            </div>
          )}

          {s.totalSpent > 0 && (
            <div className={styles.card}>
              <span className={styles.cardLabel}>ФІНАНСИ</span>
              <span className={styles.cardValue}>{formatUAH(s.totalSpent)} ₴</span>
              {s.topExpenseCategories.length > 0 && (
                <span className={styles.cardSub}>
                  Топ категорії: {s.topExpenseCategories.map((c: { name: string; total: number }) => `${c.name} (${formatUAH(c.total)} ₴)`).join(', ')}
                </span>
              )}
            </div>
          )}

          {s.f1 && (
            <div className={styles.card}>
              <span className={styles.cardLabel}>F1</span>
              <span className={styles.cardValue}>{s.f1.points} очок</span>
              <span className={styles.cardSub}>{s.f1.predictionsCount} прогнозів зроблено</span>
            </div>
          )}

          <button type="button" className={styles.regenerateBtn} onClick={handleGenerate} disabled={generating}>
            {generating ? 'Рахуємо…' : 'Перегенерувати'}
          </button>
        </div>
      )}
    </div>
  )
}

export default YearbookScreen
