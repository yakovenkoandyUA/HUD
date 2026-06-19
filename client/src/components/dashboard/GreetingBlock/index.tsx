import React, { useEffect, useState } from 'react'
import { useProfileStore } from '../../../store/profileStore'
import { useUiStore } from '../../../store/uiStore'
import { useWeather } from '../../../hooks/useWeather'
import styles from './GreetingBlock.module.css'

/**
 * GreetingBlock
 * -------------
 * Персоналізований вітальний блок з іменем, часовим привітанням, датою
 * та тематичною SVG-ілюстрацією на фоні.
 */

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

/* ── Component ───────────────────────────────────────────────────── */

const THEME_PHOTOS: Partial<Record<string, string>> = {
  velvet: '/theme/lunar.webp',
  cyber:  '/theme/cyber.webp',
  noir:   '/theme/noir.webp',
  japan:  '/theme/japan.webp',
  pixel:  '/theme/pixel.webp',
  arctic: '/theme/arctic.webp',
}

const GreetingBlock: React.FC = () => {
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
        <span className={styles.greetText}>{greet}</span>
        <span className={styles.name}>{profile?.name ?? ''}</span>
        <span className={styles.date}>{dateStr}</span>
        {weather && (
          <div className={styles.weatherRow}>
            <img src={weather.icon} alt={weather.desc} className={styles.weatherIcon} />
            <div className={styles.weatherInfo}>
              <span className={styles.weatherTemp}>{weather.temp}°</span>
              <span className={styles.weatherDesc}>{weather.desc}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default GreetingBlock
