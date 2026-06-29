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
  const [retry, setRetry] = useState(0)
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
      .catch(() => {
        // Cold PWA start often loses this race (SW activating, slow first connect) — retry once.
        if (!cancelled && retry < 1) setTimeout(() => { if (!cancelled) setRetry(r => r + 1) }, 2000)
      })
      .finally(() => clearTimeout(t))
    return () => { cancelled = true; ctrl.abort() }
  }, [city, retry])
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
      <div className={styles.topRow}>
        <div className={styles.titleGroup}>
          <span className={styles.flag}>{race.flag}</span>
          <span className={styles.gpName}>{gpLabel}</span>
        </div>

        {cd ? (
          <div className={styles.countdownRow}>
            {cd.d > 0 && <><span className={styles.num}>{cd.d}</span><span className={styles.sep}>:</span></>}
            <span className={styles.num}>{pad(cd.h)}</span>
            <span className={styles.sep}>:</span>
            <span className={styles.num}>{pad(cd.m)}</span>
            <span className={styles.sep}>:</span>
            <span className={styles.num}>{pad(cd.s)}</span>
          </div>
        ) : (
          <div className={styles.raceDay}>
            <span className={styles.raceDayText}>RACE DAY</span>
            <span className={styles.raceDayFlag}>🏁</span>
          </div>
        )}
      </div>

      <div className={styles.subRow}>
        <span className={styles.circuit}>{race.circuit}</span>
        {race.sprint && <span className={styles.sprintBadge}>SPRINT</span>}
        {weather && (
          <span className={styles.weather}>
            <span className={styles.weatherIcon}>{weatherIcon(weather.desc)}</span>
            {weather.tempC}°C
          </span>
        )}
      </div>
    </Card>
  )
}

export default RaceHeroCard
