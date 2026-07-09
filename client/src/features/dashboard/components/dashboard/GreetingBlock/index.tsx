import React, { useEffect, useState } from 'react'
import { useProfileStore } from '@/shared/store/profileStore'
import { useUiStore } from '@/shared/store/uiStore'
import { useWeather } from '@/shared/hooks/useWeather'
import type { WeatherData } from '@/shared/hooks/useWeather'
import styles from './GreetingBlock.module.css'

/**
 * GreetingBlock
 * -------------
 * Компактний вітальний рядок з тематичною ілюстрацією на фоні.
 * Привітання+ім'я — дрібний підпис (вже відомі юзеру, не несуть інформації);
 * дата+погода — головний рядок, бо це єдине, що реально варто глянути зранку.
 * При натисканні на погоду — викликає onWeatherClick з даними погоди.
 *
 * Коли на сьогодні немає звичок, секція "СЬОГОДНІ" зникає — замість неї
 * "детальніше" вбудовується в нижній край картки з градієнтом.
 *
 * Props:
 * @prop {(weather: WeatherData) => void} [onWeatherClick] — callback при тапі на погоду
 * @prop {() => void}                     [onOpenDay]      — відкрити DayOverlay (коли немає звичок)
 */
interface GreetingBlockProps {
  onWeatherClick?: (weather: WeatherData) => void
  onOpenDay?: () => void
}

const DAYS_SHORT = ['Нд','Пн','Вт','Ср','Чт','Пт','Сб']

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

const GreetingBlock: React.FC<GreetingBlockProps> = ({ onWeatherClick, onOpenDay }) => {
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
      {!photoUrl && (
        <div className={styles.illustration} aria-hidden />
      )}

      {onOpenDay && <div className={styles.bottomGrad} aria-hidden />}

      <div className={styles.content}>
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

      {onOpenDay && (
        <button type="button" className={styles.detailBtn} onClick={onOpenDay}>
          детальніше
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>
      )}
    </div>
  )
}

export default GreetingBlock
