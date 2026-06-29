import React, { useEffect, useState } from 'react'
import { useProfileStore } from '../../../store/profileStore'
import { useUiStore } from '../../../store/uiStore'
import { useWeather } from '../../../hooks/useWeather'
import type { WeatherData } from '../../../hooks/useWeather'
import styles from './GreetingBlock.module.css'

/**
 * GreetingBlock
 * -------------
 * Компактний вітальний рядок з тематичною ілюстрацією на фоні.
 * Привітання+ім'я — дрібний підпис (вже відомі юзеру, не несуть інформації);
 * дата+погода — головний рядок, бо це єдине, що реально варто глянути зранку.
 * При натисканні на погоду — викликає onWeatherClick з даними погоди.
 *
 * Props:
 * @prop {(weather: WeatherData) => void} [onWeatherClick] — callback при тапі на погоду
 */
interface GreetingBlockProps {
  onWeatherClick?: (weather: WeatherData) => void
}

const DAYS_SHORT = ['Нд','Пн','Вт','Ср','Чт','Пт','Сб']

function greeting(h: number): string {
  if (h < 6)  return 'Добраніч'
  if (h < 12) return 'Доброго ранку'
  if (h < 18) return 'Добрий день'
  return 'Добрий вечір'
}

// Числовий формат — "Пн · 29.06" замість "Понеділок · 29 червня": вдвічі коротше,
// не вгортається навіть на вузьких екранах, а погода тепер на своєму рядку нижче
function formatDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${DAYS_SHORT[d.getDay()]} · ${dd}.${mm}`
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
  const profile = useProfileStore(s => s.activeProfile)
  const theme   = useUiStore(s => s.theme)
  const weather = useWeather(profile?.city)
  const [now, setNow] = useState(() => new Date())

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
        <span className={styles.greetLine}>
          {greet}, <span className={styles.name}>{profile?.name ?? ''}</span>
        </span>

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
    </div>
  )
}

export default GreetingBlock
