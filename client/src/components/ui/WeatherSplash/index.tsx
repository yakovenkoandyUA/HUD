import React, { useEffect, useState } from 'react'
import { useUiStore } from '../../../store/uiStore'
import type { WeatherData } from '../../../store/uiStore'
import styles from './WeatherSplash.module.css'

// ─── SVG Weather Icons ────────────────────────────────────────────────────────
// All icons: viewBox 0 0 64 64, fill=none, stroke=currentColor, strokeWidth=2.5

// Cloud paths reused across rain/snow/thunder icons
const CLOUD_FULL = 'M10 42 Q6 42 6 36 Q6 28 12 27 Q13 17 22 16 Q28 11 34 17 Q40 11 46 17 Q55 17 55 27 Q61 29 59 36 Q58 42 52 42 Z'
const CLOUD_TOP  = 'M7 32 Q4 32 4 26 Q4 20 9 19 Q9 11 17 10 Q22 7 28 12 Q33 7 38 12 Q46 12 46 20 Q51 22 49 26 Q48 32 43 32 Z'

const IconSun = () => (
  <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <circle cx="32" cy="32" r="11"/>
    <line x1="32" y1="5"  x2="32" y2="14"/>
    <line x1="32" y1="50" x2="32" y2="59"/>
    <line x1="5"  y1="32" x2="14" y2="32"/>
    <line x1="50" y1="32" x2="59" y2="32"/>
    <line x1="14.1" y1="14.1" x2="20.2" y2="20.2"/>
    <line x1="43.8" y1="43.8" x2="49.9" y2="49.9"/>
    <line x1="49.9" y1="14.1" x2="43.8" y2="20.2"/>
    <line x1="20.2" y1="43.8" x2="14.1" y2="49.9"/>
  </svg>
)

const IconPartlyCloudy = () => (
  <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    {/* Sun — top-right */}
    <circle cx="46" cy="17" r="9" strokeWidth="2.2"/>
    <line x1="46" y1="3"  x2="46" y2="6"  strokeWidth="2.2"/>
    <line x1="46" y1="28" x2="46" y2="31" strokeWidth="2.2"/>
    <line x1="32" y1="17" x2="35" y2="17" strokeWidth="2.2"/>
    <line x1="57" y1="17" x2="60" y2="17" strokeWidth="2.2"/>
    <line x1="36.2" y1="7.2"  x2="38.3" y2="9.3"  strokeWidth="2.2"/>
    <line x1="53.7" y1="24.7" x2="55.8" y2="26.8" strokeWidth="2.2"/>
    <line x1="55.8" y1="7.2"  x2="53.7" y2="9.3"  strokeWidth="2.2"/>
    <line x1="38.3" y1="24.7" x2="36.2" y2="26.8" strokeWidth="2.2"/>
    {/* Cloud — lower, overlaps sun slightly */}
    <path d="M4 52 Q1 52 1 46 Q1 39 7 38 Q7 29 16 28 Q22 25 28 30 Q33 25 39 30 Q47 30 47 38 Q52 40 50 46 Q49 52 43 52 Z" strokeWidth="2.5"/>
  </svg>
)

const IconCloudy = () => (
  <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d={CLOUD_FULL}/>
  </svg>
)

const IconFog = () => (
  <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="8"  y1="18" x2="56" y2="18"/>
    <line x1="4"  y1="29" x2="60" y2="29"/>
    <line x1="8"  y1="40" x2="56" y2="40"/>
    <line x1="14" y1="51" x2="50" y2="51"/>
  </svg>
)

const IconDrizzle = () => (
  <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d={CLOUD_TOP}/>
    <line x1="16" y1="40" x2="13" y2="50"/>
    <line x1="26" y1="40" x2="23" y2="50"/>
    <line x1="36" y1="40" x2="33" y2="50"/>
  </svg>
)

const IconRain = () => (
  <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d={CLOUD_TOP}/>
    <line x1="12" y1="39" x2="8"  y2="55"/>
    <line x1="23" y1="39" x2="19" y2="55"/>
    <line x1="34" y1="39" x2="30" y2="55"/>
    <line x1="45" y1="39" x2="41" y2="55"/>
  </svg>
)

const IconSnow = () => (
  <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d={CLOUD_TOP} strokeLinejoin="round"/>
    {/* Two snowflake asterisks */}
    <line x1="20" y1="41" x2="20" y2="57"/>
    <line x1="12" y1="49" x2="28" y2="49"/>
    <line x1="14.3" y1="43.3" x2="25.7" y2="54.7"/>
    <line x1="25.7" y1="43.3" x2="14.3" y2="54.7"/>
    <line x1="42" y1="41" x2="42" y2="57"/>
    <line x1="34" y1="49" x2="50" y2="49"/>
    <line x1="36.3" y1="43.3" x2="47.7" y2="54.7"/>
    <line x1="47.7" y1="43.3" x2="36.3" y2="54.7"/>
  </svg>
)

const IconThunder = () => (
  <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d={CLOUD_TOP}/>
    <polyline points="36,34 26,50 35,48 25,63"/>
  </svg>
)

// ─── WMO Code → label + icon ──────────────────────────────────────────────────

type WeatherIcon = React.FC

interface WeatherMeta { label: string; Icon: WeatherIcon }

function getWeatherMeta(code: number): WeatherMeta {
  if (code === 0)        return { label: 'Ясно',       Icon: IconSun }
  if (code <= 2)         return { label: 'Малохмарно', Icon: IconPartlyCloudy }
  if (code === 3)        return { label: 'Хмарно',     Icon: IconCloudy }
  if (code <= 48)        return { label: 'Туман',      Icon: IconFog }
  if (code <= 55)        return { label: 'Мряка',      Icon: IconDrizzle }
  if (code <= 65)        return { label: 'Дощ',        Icon: IconRain }
  if (code <= 77)        return { label: 'Сніг',       Icon: IconSnow }
  if (code <= 82)        return { label: 'Злива',      Icon: IconRain }
  if (code <= 86)        return { label: 'Снігопад',   Icon: IconSnow }
  return                        { label: 'Гроза',      Icon: IconThunder }
}

// ─── Geolocation helper ───────────────────────────────────────────────────────

function getCurrentPosition(): Promise<GeolocationCoordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('no-geo')); return }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      timeout: 6000,
      maximumAge: 300_000,
    })
  })
}

// ─── Formatting ───────────────────────────────────────────────────────────────

function formatDate(): string {
  return new Date().toLocaleDateString('uk-UA', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * WeatherSplash
 * -------------
 * Повноекранний splash-оверлей при запуску. Завантажує поточну погоду через
 * Open-Meteo API + Geolocation API, місто через Nominatim reverse-geocoding.
 * Анімація: fade-in 0.3s → показ 1.5s → fade-out 0.3s.
 * Погодні дані зберігаються в uiStore після завантаження.
 *
 * Props:
 * @prop {() => void} onDone — колбек після завершення анімації
 */
interface WeatherSplashProps {
  onDone: () => void
}

const WeatherSplash: React.FC<WeatherSplashProps> = ({ onDone }) => {
  const { setWeather } = useUiStore()
  const [phase, setPhase] = useState<'in' | 'hold' | 'out'>('in')
  const [data, setData]   = useState<WeatherData | null>(null)

  // Animation sequence — always runs, independent of data fetch
  useEffect(() => {
    const t1 = setTimeout(() => setPhase('hold'), 300)
    const t2 = setTimeout(() => setPhase('out'),  1800)  // 300 + 1500
    const t3 = setTimeout(onDone,                 2100)  // 300 + 1500 + 300
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [onDone])

  // Weather fetch — updates display if data arrives within animation window
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const pos = await getCurrentPosition()
        const { latitude: lat, longitude: lon } = pos.coords

        const [meteoRes, geoRes] = await Promise.all([
          fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`),
          fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=uk`),
        ])

        const meteo = await meteoRes.json()
        const geo   = await geoRes.json()

        const weatherData: WeatherData = {
          temp: Math.round(meteo.current.temperature_2m),
          code: meteo.current.weather_code,
          city: geo.address?.city ?? geo.address?.town ?? geo.address?.village ?? geo.address?.county ?? '—',
        }

        // Store is always updated (Zustand call is safe after unmount)
        setWeather(weatherData)
        // Component state only if still mounted
        if (!cancelled) setData(weatherData)
      } catch {
        // Fail silently — splash animates regardless of API availability
      }
    })()
    return () => { cancelled = true }
  }, [setWeather])

  const meta = data ? getWeatherMeta(data.code) : null

  return (
    <div className={`${styles.overlay} ${styles[phase]}`} aria-hidden="true">
      <div className={styles.logo}>HUD</div>

      <div className={styles.body}>
        {meta && data ? (
          <>
            <div className={styles.icon}><meta.Icon /></div>
            <div className={styles.temp}>{data.temp}°</div>
            <div className={styles.condition}>{meta.label}</div>
            <div className={styles.city}>{data.city}</div>
          </>
        ) : (
          <div className={styles.loading}>
            <span /><span /><span />
          </div>
        )}
      </div>

      <div className={styles.date}>{formatDate()}</div>
    </div>
  )
}

export default WeatherSplash
