import React, { useEffect, useState } from 'react'
import { useProfileStore } from '@/shared/store/profileStore'
import { useUiStore } from '@/shared/store/uiStore'
import { useWeather } from '@/shared/hooks/useWeather'
import type { WeatherData } from '@/shared/hooks/useWeather'
import styles from './GreetingBlock.module.css'

/**
 * GreetingBlock (Daily Banner)
 * ----------------------------
 * Компактний банер з темовим фоном, датою/погодою та діями дня.
 * Верхня частина: дата + погода (тап → WeatherModal).
 * Нижня частина: СЬОГОДНІ label + список рутин + "детальніше >".
 *
 * Props:
 * @prop {(weather: WeatherData) => void} [onWeatherClick] — callback при тапі на погоду
 * @prop {() => void}                     onOpenDay        — відкрити DayOverlay
 * @prop {string[]}                       [todayTeasers]   — назви рутин на сьогодні (до 3)
 */
interface GreetingBlockProps {
  onWeatherClick?: (weather: WeatherData) => void
  onOpenDay: () => void
  todayTeasers?: string[]
}

const DAYS_SHORT = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

function formatDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${DAYS_SHORT[d.getDay()]} · ${dd}.${mm}`
}

const THEME_PHOTOS: Partial<Record<string, string>> = {
  velvet: '/theme/lunar.webp',
  cyber:  '/theme/cyber.webp',
  noir:   '/theme/noir.webp',
  japan:  '/theme/japan.webp',
  pixel:  '/theme/pixel.webp',
  arctic: '/theme/arctic.webp',
}

const GreetingBlock: React.FC<GreetingBlockProps> = ({ onWeatherClick, onOpenDay, todayTeasers }) => {
  const profile = useProfileStore(s => s.activeProfile)
  const theme   = useUiStore(s => s.theme)
  const weather = useWeather(profile?.city)
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const dateStr  = formatDate(now)
  const photoUrl = THEME_PHOTOS[theme]

  return (
    <div
      className={`${styles.card} ${photoUrl ? styles.cardPhoto : ''}`}
      style={photoUrl ? { backgroundImage: `url(${photoUrl})` } : undefined}
    >
      {/* Top: date + weather */}
      <div className={styles.topContent}>
        <span className={styles.date}>{dateStr}</span>

        {weather && (
          <button
            type="button"
            className={styles.weatherChip}
            onClick={() => onWeatherClick?.(weather)}
            aria-label="Деталі погоди"
          >
            <img src={weather.icon} alt={weather.desc} className={styles.weatherIcon} />
            <span className={styles.weatherTemp}>{weather.temp}°</span>
            <span className={styles.weatherDesc}>{weather.desc}</span>
          </button>
        )}
      </div>

      {/* Bottom: today row */}
      <div className={styles.todayRow}>
        <span className={styles.todayLabel}>СЬОГОДНІ</span>
        {todayTeasers && todayTeasers.length > 0 ? (
          todayTeasers.map((title, i) => {
            const isLast = i === todayTeasers.length - 1
            return (
              <div key={i} className={styles.todayBottom}>
                <div className={styles.todayItem}>
                  <span className={styles.todayDot} aria-hidden="true" />
                  <span className={styles.todayText}>{title}</span>
                </div>
                {isLast && (
                  <button type="button" className={styles.todayLink} onClick={onOpenDay}>
                    детальніше
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M9 18l6-6-6-6"/>
                    </svg>
                  </button>
                )}
              </div>
            )
          })
        ) : (
          <div className={styles.todayBottom}>
            <div className={styles.todayItem}>
              <span className={`${styles.todayText} ${styles.todayEmpty}`}>відкрити мій день</span>
            </div>
            <button type="button" className={styles.todayLink} onClick={onOpenDay}>
              детальніше
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default GreetingBlock
