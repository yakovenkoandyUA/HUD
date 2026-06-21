import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfileStore } from '../../../store/profileStore'
import { useUiStore } from '../../../store/uiStore'
import { useWeather } from '../../../hooks/useWeather'
import type { WeatherData } from '../../../hooks/useWeather'
import { ACHIEVEMENTS } from '../../../data/achievements'
import styles from './GreetingBlock.module.css'

/**
 * GreetingBlock
 * -------------
 * Персоналізований вітальний блок з іменем, часовим привітанням, датою
 * та тематичною SVG-ілюстрацією на фоні.
 * При натисканні на погоду — викликає onWeatherClick з даними погоди.
 *
 * Props:
 * @prop {(weather: WeatherData) => void} [onWeatherClick] — callback при тапі на погоду
 */
interface GreetingBlockProps {
  onWeatherClick?: (weather: WeatherData) => void
}

const DAYS = ['Неділя','Понеділок','Вівторок','Середа','Четвер','Пятниця','Субота']
const MONTHS = ['січня','лютого','березня','квітня','травня','червня','липня','серпня','вересня','жовтня','листопада','грудня']

function greeting(h: number): string {
  if (h < 6)  return 'Добраніч'
  if (h < 12) return 'Доброго ранку'
  if (h < 18) return 'Добрий день'
  return 'Добрий вечір'
}

function formatDate(d: Date): string {
  return `${DAYS[d.getDay()]} · ${d.getDate()} ${MONTHS[d.getMonth()]}`
}

/* ── Component ───────────────────────────────────────────── */

const THEME_PHOTOS: Partial<Record<string, string>> = {
  velvet: '/theme/lunar.webp',
  cyber:  '/theme/cyber.webp',
  noir:   '/theme/noir.webp',
  japan:  '/theme/japan.webp',
  pixel:  '/theme/pixel.webp',
  arctic: '/theme/arctic.webp',
}

const GreetingBlock: React.FC<GreetingBlockProps> = ({ onWeatherClick }) => {
  const navigate = useNavigate()
  const profile = useProfileStore(s => s.activeProfile)
  const theme   = useUiStore(s => s.theme)
  const weather = useWeather(profile?.city)
  const [now, setNow] = useState(() => new Date())
  const unlockedCount = profile?.unlockedAchievements?.length ?? 0

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const greet    = greeting(now.getHours())
  const dateStr  = formatDate(now)
  const photoUrl = THEME_PHOTOS[theme]

  return (
    <div
      className={`${styles.card} ${photoUrl ? styles.cardPhoto : ''}`}
      style={photoUrl ? { backgroundImage: `url(${photoUrl})` } : undefined}
    >
      {!photoUrl && (
        <div className={styles.illustration} aria-hidden />
      )}

      <div className={styles.content}>
        <span className={styles.greetText}>{greet}</span>
        <span className={styles.name}>{profile?.name ?? ''}</span>
        <span className={styles.date}>{dateStr}</span>
        {weather && (
          <button
            type="button"
            className={styles.weatherRow}
            onClick={() => onWeatherClick?.(weather)}
            aria-label="Деталі погоди"
          >
            <img src={weather.icon} alt={weather.desc} className={styles.weatherIcon} />
            <div className={styles.weatherInfo}>
              <span className={styles.weatherTemp}>{weather.temp}°</span>
              <span className={styles.weatherDesc}>{weather.desc}</span>
            </div>
          </button>
        )}
        <button
          type="button"
          className={styles.achievementsRow}
          onClick={() => navigate('/profile?tab=me&section=achievements')}
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M8 1.5l1.85 3.75L14 5.85l-3 2.92.7 4.13L8 10.9l-3.7 1.99.7-4.13-3-2.92 4.15-.6L8 1.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
          </svg>
          Досягнення {unlockedCount}/{ACHIEVEMENTS.length}
        </button>
      </div>
    </div>
  )
}

export default GreetingBlock
