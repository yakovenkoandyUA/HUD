import React, { useEffect, useState, useMemo } from 'react'
import { useSwipeToDismiss } from '../../../hooks/useSwipeToDismiss'
import { useModalHistory } from '../../../hooks/useModalHistory'
import type { WatchlistItem } from '../../../types'
import styles from './WatchlistStatsSheet.module.css'

const MOVIE_H  = 2
const SERIES_H = 0.75
const ANIME_H  = 0.4

interface Comparison { icon: string; text: string }

function countEpisodes(item: WatchlistItem): number {
  if (item.status === 'watched' && item.totalEpisodes) return item.totalEpisodes
  return item.watchedEpisodes?.length ?? 0
}

const WALK_DESTS = [
  { city: 'Вінниці',   km: 260  },
  { city: 'Варшави',   km: 800  },
  { city: 'Берліна',   km: 1400 },
  { city: 'Риму',      km: 2000 },
  { city: 'Мадрида',   km: 3200 },
  { city: 'Пекіна',    km: 6500 },
  { city: 'Токіо',     km: 8300 },
  { city: 'Нью-Йорка', km: 9200 },
]

function walkingText(h: number): string {
  const km = h * 5
  if (km >= 40075) return `Обійти Землю пішки ${(km / 40075).toFixed(1)} рази`
  const dest = [...WALK_DESTS].reverse().find(d => km >= d.km)
  return dest
    ? `Дійти пішки від Києва до ${dest.city}`
    : `Пройти пішки ${Math.round(km)} км`
}

function buildComparisons(h: number): Comparison[] {
  const list: Comparison[] = []

  list.push({ icon: '🚶', text: walkingText(h) })

  const flights = Math.max(1, Math.round(h / 10))
  list.push({ icon: '✈️', text: `Злітати Київ — Нью-Йорк ${flights} ${flights === 1 ? 'раз' : 'разів'}` })

  const books = Math.max(1, Math.round(h / 8))
  list.push({ icon: '📚', text: `Прочитати ${books} ${books === 1 ? 'книжку' : books < 5 ? 'книжки' : 'книжок'}` })

  const marathons = Math.round(h / 4.5)
  if (marathons >= 1) {
    list.push({ icon: '🏃', text: `Пробігти ${marathons} ${marathons === 1 ? 'марафон' : marathons < 5 ? 'марафони' : 'марафонів'}` })
  }

  const titanics = Math.round(h / 3.2)
  if (titanics >= 1) {
    list.push({ icon: '🎬', text: `Переглянути «Титанік» ${titanics} ${titanics === 1 ? 'раз' : 'разів'} — і щоразу плакати в кінці` })
  }

  const nights = Math.round(h / 7)
  list.push({ icon: '😴', text: `Проспати ${nights} ${nights === 1 ? 'ніч' : nights < 5 ? 'ночі' : 'ночей'} поспіль` })

  return list
}

/**
 * WatchlistStatsSheet
 * -------------------
 * Bottom sheet із загальною статистикою переглядів:
 * сумарна кількість годин, розбивка по категоріях і жартівливі порівняння.
 *
 * Props:
 * @prop {boolean}         isOpen  — чи відкритий sheet
 * @prop {() => void}      onClose — закриття sheet
 * @prop {WatchlistItem[]} items   — всі елементи watchlist (movie + series + anime)
 */
interface WatchlistStatsSheetProps {
  isOpen: boolean
  onClose: () => void
  items: WatchlistItem[]
}

const WatchlistStatsSheet: React.FC<WatchlistStatsSheetProps> = ({ isOpen, onClose, items }) => {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)

  useModalHistory(onClose, isOpen)
  const sheetRef = useSwipeToDismiss(onClose, { enabled: mounted })

  useEffect(() => {
    if (isOpen) {
      setMounted(true)
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    } else {
      setVisible(false)
      const t = setTimeout(() => setMounted(false), 340)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  const stats = useMemo(() => {
    const movies = items.filter(i => i.category === 'movie')
    const series = items.filter(i => i.category === 'series')
    const anime  = items.filter(i => i.category === 'anime')

    const movieWatched = movies.filter(i => i.status === 'watched').length
    const seriesCount  = series.length
    const animeCount   = anime.length
    const seriesEp     = series.reduce((s, i) => s + countEpisodes(i), 0)
    const animeEp      = anime.reduce((s, i)  => s + countEpisodes(i), 0)

    const totalH = Math.round(
      movieWatched * MOVIE_H +
      seriesEp     * SERIES_H +
      animeEp      * ANIME_H,
    )

    return { movieWatched, seriesCount, animeCount, seriesEp, animeEp, totalH }
  }, [items])

  const { totalH, movieWatched, seriesCount, animeCount, seriesEp, animeEp } = stats
  const comparisons = useMemo(() => totalH > 0 ? buildComparisons(totalH) : [], [totalH])

  if (!mounted) return null

  const days = (totalH / 24).toFixed(1)

  return (
    <div
      className={`${styles.overlay} ${visible ? styles.overlayVisible : styles.overlayHidden}`}
      onClick={onClose}
    >
      <div
        ref={sheetRef}
        className={`${styles.sheet} ${visible ? styles.sheetVisible : styles.sheetHidden}`}
        onClick={e => e.stopPropagation()}
      >
        <div className={styles.handle} />
        <div className={styles.header}>МЕДІАТЕКА</div>

        {totalH === 0 ? (
          <div className={styles.empty}>
            Додай фільми та серіали —<br />тоді буде що рахувати
          </div>
        ) : (
          <>
            {/* ── Total hours ── */}
            <div className={styles.heroBlock}>
              <span className={styles.heroNum}>{totalH.toLocaleString('uk')}</span>
              <span className={styles.heroLabel}>ГОДИН</span>
              <span className={styles.heroDays}>{days} доби</span>
            </div>

            {/* ── Category breakdown ── */}
            <div className={styles.breakdown}>
              {movieWatched > 0 && (
                <div className={styles.breakItem}>
                  <span className={styles.breakIcon}>🎬</span>
                  <span className={styles.breakNum}>{movieWatched}</span>
                  <span className={styles.breakLbl}>фільмів</span>
                </div>
              )}
              {seriesCount > 0 && (
                <div className={styles.breakItem}>
                  <span className={styles.breakIcon}>📺</span>
                  <span className={styles.breakNum}>{seriesEp}</span>
                  <span className={styles.breakLbl}>еп. серіалів</span>
                </div>
              )}
              {animeCount > 0 && (
                <div className={styles.breakItem}>
                  <span className={styles.breakIcon}>🌸</span>
                  <span className={styles.breakNum}>{animeEp}</span>
                  <span className={styles.breakLbl}>еп. аніме</span>
                </div>
              )}
            </div>

            <div className={styles.divider}>
              <span className={styles.dividerLabel}>ЗА ЦЕЙ ЧАС МІГ БИ...</span>
            </div>

            {/* ── Comparisons ── */}
            <div className={styles.compList}>
              {comparisons.map(c => (
                <div key={c.icon} className={styles.compRow}>
                  <span className={styles.compIcon}>{c.icon}</span>
                  <span className={styles.compText}>{c.text}</span>
                </div>
              ))}
            </div>

            <p className={styles.note}>
              * фільм ≈ 2 год · серіал ≈ 45 хв/еп · аніме ≈ 24 хв/еп
            </p>
          </>
        )}
      </div>
    </div>
  )
}

export default WatchlistStatsSheet
