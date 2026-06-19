import React, { useRef } from 'react'
import Modal from '../../ui/Modal'
import type { WeatherData } from '../../../hooks/useWeather'
import styles from './WeatherModal.module.css'

/**
 * WeatherModal
 * ------------
 * Bottom-sheet деталі погоди: поточний стан, погодинна смужка, статистика, 2-денний прогноз.
 *
 * Props:
 * @prop {boolean}     isOpen
 * @prop {() => void}  onClose
 * @prop {WeatherData} weather — повний об'єкт погоди з useWeather
 */
interface WeatherModalProps {
  isOpen: boolean
  onClose: () => void
  weather: WeatherData
}

const WIND_DIR: Record<string, string> = {
  N: 'Північ', NNE: 'ПнПнСх', NE: 'ПнСх', ENE: 'СхПнСх',
  E: 'Схід', ESE: 'СхПдСх', SE: 'ПдСх', SSE: 'ПдПдСх',
  S: 'Південь', SSW: 'ПдПдЗх', SW: 'ПдЗх', WSW: 'ЗхПдЗх',
  W: 'Захід', WNW: 'ЗхПнЗх', NW: 'ПнЗх', NNW: 'ПнПнЗх',
}

// Wind direction → compass degrees for arrow rotation
const WIND_DEG: Record<string, number> = {
  N: 0, NNE: 22, NE: 45, ENE: 67,
  E: 90, ESE: 112, SE: 135, SSE: 157,
  S: 180, SSW: 202, SW: 225, WSW: 247,
  W: 270, WNW: 292, NW: 315, NNW: 337,
}

function uvLabel(uv: string): string {
  const n = parseInt(uv, 10)
  if (n <= 2) return 'Низький'
  if (n <= 5) return 'Помірний'
  if (n <= 7) return 'Високий'
  if (n <= 10) return 'Дуже високий'
  return 'Екстремальний'
}

function uvColor(uv: string): string {
  const n = parseInt(uv, 10)
  if (n <= 2) return 'var(--uv-low, #4caf50)'
  if (n <= 5) return 'var(--uv-mid, #f9a825)'
  if (n <= 7) return 'var(--uv-high, #ef6c00)'
  if (n <= 10) return 'var(--uv-vhigh, #e53935)'
  return 'var(--uv-ext, #7b1fa2)'
}

const IconThermometer = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/>
  </svg>
)

const IconDrop = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
  </svg>
)

const IconWind = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M9.59 4.59A2 2 0 1 1 11 8H2"/>
    <path d="M12.59 19.41A2 2 0 1 0 14 16H2"/>
    <path d="M6.91 12.91A2 2 0 1 0 9 16H2"/>
  </svg>
)

const IconSun = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/>
    <line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/>
    <line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
)

const WeatherModal: React.FC<WeatherModalProps> = ({ isOpen, onClose, weather }) => {
  const hourlyRef = useRef<HTMLDivElement>(null)
  const nowHour = new Date().getHours()
  const humidity = parseInt(weather.humidity, 10)
  const uvN = parseInt(weather.uvIndex, 10)
  const windDeg = WIND_DEG[weather.windDir] ?? 0

  return (
    <Modal isOpen={isOpen} onClose={onClose} draggable>
      <div className={styles.root}>

        {/* ── Current ──────────────────────────────── */}
        <div className={styles.current}>
          <img src={weather.icon} alt={weather.desc} className={styles.bigIcon} />
          <div className={styles.currentInfo}>
            <span className={styles.bigTemp}>{weather.temp}°</span>
            <span className={styles.desc}>{weather.desc}</span>
            <span className={styles.city}>{weather.city}</span>
          </div>
        </div>

        {/* ── Hourly ───────────────────────────────── */}
        <div className={styles.section}>
          <span className={styles.sectionLabel}>ПОГОДИННО</span>
          <div className={styles.hourlyTrack} ref={hourlyRef}>
            {weather.hourly.map(h => {
              const isCurrent = nowHour >= h.hour && nowHour < h.hour + 3
              return (
                <div key={h.time} className={`${styles.hourCard} ${isCurrent ? styles.hourCardNow : ''}`}>
                  <span className={styles.hourTime}>{h.time.slice(0, 5)}</span>
                  <img src={h.icon} alt={h.desc} className={styles.hourIcon} />
                  <span className={styles.hourTemp}>{h.temp}°</span>
                  <span className={styles.hourHum}>{h.humidity}%</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Stats grid ───────────────────────────── */}
        <div className={styles.statsGrid}>

          {/* Feels like */}
          <div className={`${styles.statCard} ${styles.statCardFeel}`}>
            <div className={styles.statHeader}>
              <span className={`${styles.statIcon} ${styles.statIconFeel}`}><IconThermometer /></span>
              <span className={styles.statLabel}>ВІДЧУВАЄТЬСЯ</span>
            </div>
            <span className={styles.statBigValue}>{weather.feelsLike}°</span>
            <span className={styles.statFooter}>
              {parseInt(weather.feelsLike, 10) < parseInt(weather.temp, 10) ? 'Холодніше за факт' : 'Тепліше за факт'}
            </span>
          </div>

          {/* Humidity */}
          <div className={`${styles.statCard} ${styles.statCardHum}`}>
            <div className={styles.statHeader}>
              <span className={`${styles.statIcon} ${styles.statIconHum}`}><IconDrop /></span>
              <span className={styles.statLabel}>ВОЛОГІСТЬ</span>
            </div>
            <span className={styles.statBigValue}>{weather.humidity}%</span>
            <div className={styles.humBar}>
              <div className={styles.humBarFill} style={{ width: `${humidity}%` }} />
            </div>
          </div>

          {/* Wind */}
          <div className={`${styles.statCard} ${styles.statCardWind}`}>
            <div className={styles.statHeader}>
              <span className={`${styles.statIcon} ${styles.statIconWind}`}><IconWind /></span>
              <span className={styles.statLabel}>ВІТЕР</span>
            </div>
            <div className={styles.windRow}>
              <span className={styles.statBigValue}>{weather.windKmph}</span>
              <span className={styles.windUnit}>км/г</span>
              <span
                className={styles.windArrow}
                style={{ transform: `rotate(${windDeg}deg)` }}
                title={WIND_DIR[weather.windDir]}
              >↑</span>
            </div>
            <span className={styles.statFooter}>{WIND_DIR[weather.windDir] ?? weather.windDir}</span>
          </div>

          {/* UV */}
          <div className={`${styles.statCard} ${styles.statCardUv}`}>
            <div className={styles.statHeader}>
              <span className={`${styles.statIcon} ${styles.statIconUv}`}><IconSun /></span>
              <span className={styles.statLabel}>UV ІНДЕКС</span>
            </div>
            <span className={styles.statBigValue} style={{ color: uvColor(weather.uvIndex) }}>
              {weather.uvIndex}
            </span>
            <div className={styles.uvBar}>
              {[1,2,3,4,5,6,7,8,9,10].map(i => (
                <div
                  key={i}
                  className={styles.uvSegment}
                  style={{ background: i <= uvN ? uvColor(weather.uvIndex) : undefined }}
                />
              ))}
            </div>
            <span className={styles.statFooter}>{uvLabel(weather.uvIndex)}</span>
          </div>

        </div>

        {/* ── Forecast ─────────────────────────────── */}
        {weather.forecast.length > 0 && (
          <div className={styles.section}>
            <span className={styles.sectionLabel}>ПРОГНОЗ</span>
            <div className={styles.forecastList}>
              {weather.forecast.map(d => (
                <div key={d.date} className={styles.forecastRow}>
                  <span className={styles.forecastDay}>{d.label}</span>
                  <img src={d.icon} alt={d.desc} className={styles.forecastIcon} />
                  <span className={styles.forecastDesc}>{d.desc}</span>
                  <div className={styles.forecastTemps}>
                    <span className={styles.forecastMax}>{d.maxTemp}°</span>
                    <span className={styles.forecastSep}>/</span>
                    <span className={styles.forecastMin}>{d.minTemp}°</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </Modal>
  )
}

export default WeatherModal
