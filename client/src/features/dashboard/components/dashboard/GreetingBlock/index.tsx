import React, { useEffect, useState } from 'react'
import { useProfileStore } from '@/shared/store/profileStore'
import { useUiStore } from '@/shared/store/uiStore'
import { useWeather } from '@/shared/hooks/useWeather'
import type { WeatherData } from '@/shared/hooks/useWeather'
import { reverseGeocodeCity } from '@/features/memories/utils/geocode'
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

function formatDateOnly(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${DAYS_SHORT[d.getDay()]} · ${dd}.${mm}`
}

function formatTimeParts(d: Date): { hh: string; mm: string } {
  return {
    hh: String(d.getHours()).padStart(2, '0'),
    mm: String(d.getMinutes()).padStart(2, '0'),
  }
}

const THEME_PHOTOS: Partial<Record<string, string>> = {
  aurum: '/theme/lunar.webp',
  cyber:  '/theme/cyber.webp',
  noir:   '/theme/noir.webp',
  mimir:  '/theme/mimir.webp',
  pixel:  '/theme/pixel.webp',
  arctic: '/theme/arctic.webp',
}

const GreetingBlock: React.FC<GreetingBlockProps> = ({ onWeatherClick, onOpenDay, todayTeasers }) => {
  const profile       = useProfileStore(s => s.activeProfile)
  const updateProfile = useProfileStore(s => s.updateProfile)
  const theme         = useUiStore(s => s.theme)
  const weather       = useWeather(profile?.city)
  const [now, setNow] = useState(() => new Date())
  const [geoState, setGeoState] = useState<'idle' | 'loading' | 'denied'>('idle')

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (profile?.city || !navigator.geolocation) return
    navigator.permissions?.query({ name: 'geolocation' }).then(status => {
      if (status.state !== 'granted') return
      setGeoState('loading')
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const city = await reverseGeocodeCity(pos.coords.latitude, pos.coords.longitude)
            if (city) await updateProfile({ city })
            setGeoState('idle')
          } catch {
            setGeoState('idle')
          }
        },
        () => setGeoState('denied'),
        { timeout: 8000 },
      )
    }).catch(() => {})
  }, [profile?.city, updateProfile])

  const dateStr     = formatDateOnly(now)
  const { hh, mm }  = formatTimeParts(now)
  const photoUrl    = THEME_PHOTOS[theme]
  const showGeoPrompt = !profile?.city && !weather && geoState !== 'denied'

  const handleGeoRequest = () => {
    if (!navigator.geolocation || geoState === 'loading') return
    setGeoState('loading')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const city = await reverseGeocodeCity(pos.coords.latitude, pos.coords.longitude)
          if (city) await updateProfile({ city })
          setGeoState('idle')
        } catch {
          setGeoState('idle')
        }
      },
      () => setGeoState('denied'),
      { timeout: 8000 },
    )
  }

  return (
    <div
      className={`${styles.card} ${photoUrl ? styles.cardPhoto : ''}`}
      style={photoUrl ? { backgroundImage: `url(${photoUrl})` } : undefined}
    >
      {/* Top: date + weather */}
      <div className={styles.topContent}>
        <span className={styles.date}>
          {dateStr} · <span className={styles.time}>{hh}<span className={styles.colon}>:</span>{mm}</span>
        </span>

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

        {showGeoPrompt && (
          <button
            type="button"
            className={styles.geoPrompt}
            onClick={handleGeoRequest}
            disabled={geoState === 'loading'}
            aria-label="Дозволити геолокацію для погоди"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
            </svg>
            <span>{geoState === 'loading' ? 'Визначаємо…' : 'Погода'}</span>
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
