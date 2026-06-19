import { useEffect, useState } from 'react'

export interface WeatherHour {
  time: string      // "06:00"
  hour: number      // 6
  temp: string
  desc: string
  icon: string
  humidity: string
  windKmph: string
}

export interface WeatherDay {
  date: string
  label: string     // "Завтра", "Вт"
  maxTemp: string
  minTemp: string
  icon: string
  desc: string
}

export interface WeatherData {
  temp: string
  feelsLike: string
  desc: string
  icon: string
  humidity: string
  windKmph: string
  windDir: string
  uvIndex: string
  city: string
  hourly: WeatherHour[]
  forecast: WeatherDay[]
}

const DAY_SHORT = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

function getWeatherIcon(desc: string, isNight = false): string {
  const d = desc.toLowerCase()

  if (d.includes('blizzard') || (d.includes('thunder') && d.includes('storm'))) {
    return isNight ? '/weather/night-thunder.svg' : '/weather/storm.svg'
  }
  if (d.includes('thunder')) {
    return isNight ? '/weather/night-thunder.svg' : '/weather/thunder.svg'
  }
  if (d.includes('snow') || d.includes('sleet') || d.includes('ice')) {
    return '/weather/overcast.svg'
  }
  if (d.includes('heavy rain') || d.includes('torrential')) {
    return isNight ? '/weather/night-rain.svg' : '/weather/storm.svg'
  }
  if (d.includes('rain') || d.includes('drizzle') || d.includes('shower')) {
    if (d.includes('sunny') || d.includes('patchy')) return '/weather/sunshower.svg'
    return isNight ? '/weather/night-rain.svg' : '/weather/rain.svg'
  }
  if (d.includes('fog') || d.includes('mist') || d.includes('overcast')) {
    return isNight ? '/weather/cloudy-night.svg' : '/weather/overcast.svg'
  }
  if (d.includes('cloudy') || d.includes('cloud')) {
    if (d.includes('partly') || d.includes('partial')) {
      return isNight ? '/weather/partly-cloudy-night.svg' : '/weather/partly-cloudy-day.svg'
    }
    return isNight ? '/weather/cloudy-night.svg' : '/weather/overcast.svg'
  }
  if (d.includes('sunny') || d.includes('clear')) {
    return isNight ? '/weather/clear-night.svg' : '/weather/sunny.svg'
  }
  return isNight ? '/weather/partly-cloudy-night.svg' : '/weather/partly-cloudy-day.svg'
}

function parseHour(time: string): number {
  return Math.floor(parseInt(time, 10) / 100)
}

function formatHour(time: string): string {
  const h = parseHour(time)
  return `${String(h).padStart(2, '0')}:00`
}

const CACHE_TTL = 30 * 60 * 1000 // 30 хв

function getCached(city: string): WeatherData | null {
  try {
    const raw = localStorage.getItem(`hud-weather-v1-${city.toLowerCase()}`)
    if (!raw) return null
    const { data, ts } = JSON.parse(raw) as { data: WeatherData; ts: number }
    if (Date.now() - ts > CACHE_TTL) return null
    return data
  } catch {
    return null
  }
}

function setCache(city: string, data: WeatherData) {
  try {
    localStorage.setItem(
      `hud-weather-v1-${city.toLowerCase()}`,
      JSON.stringify({ data, ts: Date.now() })
    )
  } catch {
    // ignore quota errors
  }
}

/** Fetches current weather + hourly + 3-day forecast from wttr.in. Caches 30 min in localStorage. */
export function useWeather(city: string | undefined): WeatherData | null {
  const [weather, setWeather] = useState<WeatherData | null>(() => {
    if (!city?.trim()) return null
    return getCached(city.trim())
  })

  useEffect(() => {
    const trimmed = city?.trim()
    if (!trimmed) return

    const cached = getCached(trimmed)
    if (cached) { setWeather(cached); return }

    let cancelled = false
    const load = async () => {
      try {
        const url = `https://wttr.in/${encodeURIComponent(trimmed)}?format=j1`
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
        if (!res.ok || cancelled) return

        const raw = await res.json() as {
          current_condition: Array<{
            temp_C: string
            FeelsLikeC: string
            humidity: string
            windspeedKmph: string
            winddir16Point: string
            uvIndex: string
            weatherDesc: Array<{ value: string }>
          }>
          weather: Array<{
            date: string
            maxtempC: string
            mintempC: string
            hourly: Array<{
              time: string
              tempC: string
              weatherDesc: Array<{ value: string }>
              humidity: string
              windspeedKmph: string
            }>
          }>
          nearest_area: Array<{
            areaName: Array<{ value: string }>
          }>
        }

        if (cancelled) return

        const cc = raw.current_condition?.[0]
        if (!cc) return

        const currentDesc = cc.weatherDesc?.[0]?.value ?? ''
        const nowHour = new Date().getHours()
        const isCurrentNight = nowHour < 6 || nowHour >= 21

        // Hourly for today (weather[0])
        const todayHourly: WeatherHour[] = (raw.weather?.[0]?.hourly ?? []).map(h => {
          const hr = parseHour(h.time)
          const desc = h.weatherDesc?.[0]?.value ?? ''
          return {
            time: formatHour(h.time),
            hour: hr,
            temp: h.tempC,
            desc,
            icon: getWeatherIcon(desc, hr < 6 || hr >= 21),
            humidity: h.humidity,
            windKmph: h.windspeedKmph,
          }
        })

        // Forecast: tomorrow + day after
        const forecast: WeatherDay[] = (raw.weather?.slice(1, 3) ?? []).map((d, i) => {
          const desc = d.hourly?.[4]?.weatherDesc?.[0]?.value ?? ''
          const dateObj = new Date(d.date)
          const label = i === 0 ? 'Завтра' : DAY_SHORT[dateObj.getDay()]
          return {
            date: d.date,
            label,
            maxTemp: d.maxtempC,
            minTemp: d.mintempC,
            icon: getWeatherIcon(desc),
            desc,
          }
        })

        const city = raw.nearest_area?.[0]?.areaName?.[0]?.value ?? trimmed

        const data: WeatherData = {
          temp: cc.temp_C,
          feelsLike: cc.FeelsLikeC,
          desc: currentDesc,
          icon: getWeatherIcon(currentDesc, isCurrentNight),
          humidity: cc.humidity,
          windKmph: cc.windspeedKmph,
          windDir: cc.winddir16Point,
          uvIndex: cc.uvIndex,
          city,
          hourly: todayHourly,
          forecast,
        }

        setCache(trimmed, data)
        if (!cancelled) setWeather(data)
      } catch {
        // silent fail
      }
    }
    load()
    return () => { cancelled = true }
  }, [city])

  return weather
}
