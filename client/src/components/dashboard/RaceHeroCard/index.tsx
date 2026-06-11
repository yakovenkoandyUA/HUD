import React, { useEffect, useState } from 'react'
import Card from '../../ui/Card'
import { CIRCUIT_DATA, ROUND_TO_CIRCUIT_ID } from '../../../data/circuitData'
import type { F1Race } from '../../../data/f1Season2026'
import styles from './RaceHeroCard.module.css'

/**
 * RaceHeroCard
 * ------------
 * Повноширокий герой-блок на тижні гонки.
 * Показує: прапор + назва GP (Furore), великий таймер зворотнього відліку,
 * силует траси, погоду.
 *
 * Props:
 * @prop {F1Race} race — гонка цього тижня
 */
interface RaceHeroCardProps {
  race: F1Race
  onClick?: () => void
}

interface Countdown { d: number; h: number; m: number; s: number }

function getCountdown(dateStr: string): Countdown | null {
  const diff = new Date(dateStr + 'T14:00:00Z').getTime() - Date.now()
  if (diff <= 0) return null
  const s = Math.floor(diff / 1000)
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 }
}

function pad(n: number) { return String(n).padStart(2, '0') }

function weatherIcon(desc: string): string {
  const d = desc.toLowerCase()
  if (d.includes('thunder'))                          return '⛈'
  if (d.includes('rain') || d.includes('shower'))     return '🌧'
  if (d.includes('snow'))                             return '🌨'
  if (d.includes('fog') || d.includes('mist'))        return '🌫'
  if (d.includes('partly') || d.includes('overcast')) return '⛅'
  if (d.includes('cloud'))                            return '☁️'
  if (d.includes('sun') || d.includes('clear'))       return '☀️'
  return '🌤'
}

interface WeatherData { tempC: string; desc: string }

function useWeather(city: string): WeatherData | null {
  const [data, setData] = useState<WeatherData | null>(null)
  useEffect(() => {
    if (!city) return
    let cancelled = false
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 6000)
    fetch(`https://wttr.in/${encodeURIComponent(city.split(',')[0].trim())}?format=j1`, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json' },
    })
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((json: any) => {
        if (cancelled) return
        const c = json?.current_condition?.[0]
        if (!c) return
        setData({ tempC: c.temp_C ?? '?', desc: c.weatherDesc?.[0]?.value ?? '' })
      })
      .catch(() => {})
      .finally(() => clearTimeout(t))
    return () => { cancelled = true; ctrl.abort() }
  }, [city])
  return data
}

const RaceHeroCard: React.FC<RaceHeroCardProps> = ({ race, onClick }) => {
  const [cd, setCd] = useState<Countdown | null>(() => getCountdown(race.date))

  useEffect(() => {
    const id = setInterval(() => setCd(getCountdown(race.date)), 1000)
    return () => clearInterval(id)
  }, [race.date])

  const circuitId = ROUND_TO_CIRCUIT_ID[race.round]
  const circuitInfo = circuitId ? CIRCUIT_DATA[circuitId] : null
  const city = circuitInfo?.city ?? race.country
  const weather = useWeather(city)

  const gpLabel = race.name.replace(' GP', '').replace(' Grand Prix', '').toUpperCase()

  return (
    <Card variant="accent" className={styles.card} onClick={onClick}>
      {race.trackSvg && (
        <img src={race.trackSvg} className={styles.watermark} aria-hidden="true" alt="" />
      )}

      <div className={styles.header}>
        <span className={styles.flag}>{race.flag}</span>
        <span className={styles.gpName}>{gpLabel}</span>
      </div>
      <div className={styles.circuit}>{race.circuit}</div>

      {cd ? (
        <div className={styles.countdownRow}>
          <div className={styles.unit}>
            <span className={`${styles.num} ${cd.d === 0 ? styles.numAccent : ''}`}>{cd.d}</span>
            {/* <span className={styles.sub}>д</span> */}
          </div>
          <span className={styles.sep}>:</span>
          <div className={styles.unit}>
            <span className={styles.num}>{pad(cd.h)}</span>
            {/* <span className={styles.sub}>г</span> */}
          </div>
          <span className={styles.sep}>:</span>
          <div className={styles.unit}>
            <span className={styles.num}>{pad(cd.m)}</span>
            {/* <span className={styles.sub}>хв</span> */}
          </div>
          <span className={styles.sep}>:</span>
          <div className={styles.unit}>
            <span className={styles.num}>{pad(cd.s)}</span>
            {/* <span className={styles.sub}>с</span> */}
          </div>
        </div>
      ) : (
        <div className={styles.raceDay}>
          <span className={styles.raceDayText}>RACE DAY!</span>
          <span className={styles.raceDayFlag}>🏁</span>
        </div>
      )}

      <div className={styles.meta}>
        {race.sprint && <span className={styles.sprintBadge}>SPRINT</span>}
        {weather && (
          <div className={styles.weather}>
            <span className={styles.weatherIcon}>{weatherIcon(weather.desc)}</span>
            <span>{weather.tempC}°C</span>
          </div>
        )}
      </div>
    </Card>
  )
}

export default RaceHeroCard
