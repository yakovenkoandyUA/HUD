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

const WEATHER_UA: Record<string, string> = {
  'sunny': 'Сонячно',
  'clear': 'Ясно',
  'partly cloudy': 'Мінлива хмарність',
  'cloudy': 'Хмарно',
  'overcast': 'Похмуро',
  'mist': 'Туман',
  'fog': 'Туман',
  'freezing fog': 'Крижаний туман',
  'light drizzle': 'Легка мряка',
  'freezing drizzle': 'Крижана мряка',
  'heavy freezing drizzle': 'Сильна крижана мряка',
  'patchy light drizzle': 'Місцями мряка',
  'light rain': 'Невеликий дощ',
  'moderate rain': 'Помірний дощ',
  'heavy rain': 'Сильний дощ',
  'light freezing rain': 'Невеликий крижаний дощ',
  'moderate or heavy freezing rain': 'Крижаний дощ',
  'light sleet': 'Невеликий мокрий сніг',
  'moderate or heavy sleet': 'Мокрий сніг',
  'patchy light rain': 'Місцями невеликий дощ',
  'patchy rain possible': 'Місцями можливий дощ',
  'patchy rain nearby': 'Дощ поблизу',
  'light rain shower': 'Невеликий злива',
  'moderate or heavy rain shower': 'Сильна злива',
  'torrential rain shower': 'Зливові опади',
  'light snow': 'Невеликий сніг',
  'moderate snow': 'Помірний сніг',
  'heavy snow': 'Сильний сніг',
  'patchy snow possible': 'Місцями можливий сніг',
  'blowing snow': 'Метіль',
  'blizzard': 'Хуртовина',
  'light snow showers': 'Невеликий снігопад',
  'moderate or heavy snow showers': 'Сильний снігопад',
  'ice pellets': 'Крижана крупа',
  'patchy light rain with thunder': 'Гроза з невеликим дощем',
  'moderate or heavy rain with thunder': 'Гроза з дощем',
  'patchy light snow with thunder': 'Гроза зі снігом',
  'moderate or heavy snow with thunder': 'Сильна гроза зі снігом',
  'thundery outbreaks possible': 'Можлива гроза',
  'thunderstorms': 'Гроза',
  'thunder': 'Гроза',
  'storm': 'Шторм',
  'partly sunny': 'Мінлива хмарність',
  'mostly sunny': 'Переважно сонячно',
  'mostly cloudy': 'Переважно хмарно',
  'night rain': 'Нічний дощ',
  'night thunder': 'Нічна гроза',
}

export function localizeWeatherDesc(desc: string): string {
  const key = desc.toLowerCase().trim()
  if (WEATHER_UA[key]) return WEATHER_UA[key]
  // partial match
  for (const [en, ua] of Object.entries(WEATHER_UA)) {
    if (key.includes(en)) return ua
  }
  return desc
}

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

    let cancelled = false
    const load = async () => {
      const cached = getCached(trimmed)
      if (cached) { if (!cancelled) setWeather(cached); return }
      try {
        const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'
        const url = `${apiUrl}/api/weather?city=${encodeURIComponent(trimmed)}`
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

        const currentDescRaw = cc.weatherDesc?.[0]?.value ?? ''
        const currentDesc = localizeWeatherDesc(currentDescRaw)
        const nowHour = new Date().getHours()
        const isCurrentNight = nowHour < 6 || nowHour >= 21

        // Hourly for today (weather[0])
        const todayHourly: WeatherHour[] = (raw.weather?.[0]?.hourly ?? []).map(h => {
          const hr = parseHour(h.time)
          const descRaw = h.weatherDesc?.[0]?.value ?? ''
          return {
            time: formatHour(h.time),
            hour: hr,
            temp: h.tempC,
            desc: localizeWeatherDesc(descRaw),
            icon: getWeatherIcon(descRaw, hr < 6 || hr >= 21),
            humidity: h.humidity,
            windKmph: h.windspeedKmph,
          }
        })

        // Forecast: tomorrow + day after
        const forecast: WeatherDay[] = (raw.weather?.slice(1, 3) ?? []).map((d, i) => {
          const descRaw = d.hourly?.[4]?.weatherDesc?.[0]?.value ?? ''
          const dateObj = new Date(d.date)
          const label = i === 0 ? 'Завтра' : DAY_SHORT[dateObj.getDay()]
          return {
            date: d.date,
            label,
            maxTemp: d.maxtempC,
            minTemp: d.mintempC,
            icon: getWeatherIcon(descRaw),
            desc: localizeWeatherDesc(descRaw),
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
