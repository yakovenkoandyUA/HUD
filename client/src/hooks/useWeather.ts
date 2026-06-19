import { useEffect, useState } from 'react'

export interface WeatherData {
  temp: string
  desc: string
  icon: string  // path to /weather/*.svg
}

function getWeatherIcon(desc: string): string {
  const d = desc.toLowerCase()

  if (d.includes('blizzard') || d.includes('thunder') || d.includes('storm')) {
    return '/weather/storm.svg'
  }
  if (d.includes('thunder')) {
    return '/weather/thunder.svg'
  }
  if (d.includes('snow') || d.includes('sleet') || d.includes('ice') || d.includes('blizzard')) {
    return '/weather/overcast.svg'
  }
  if (d.includes('heavy rain') || d.includes('torrential')) {
    return '/weather/storm.svg'
  }
  if (d.includes('rain') || d.includes('drizzle') || d.includes('shower')) {
    if (d.includes('sunny') || d.includes('patchy')) return '/weather/sunshower.svg'
    return '/weather/rain.svg'
  }
  if (d.includes('fog') || d.includes('mist') || d.includes('overcast')) {
    return '/weather/overcast.svg'
  }
  if (d.includes('cloudy') || d.includes('cloud')) {
    if (d.includes('partly') || d.includes('partial')) return '/weather/partly-cloudy-day.svg'
    return '/weather/overcast.svg'
  }
  if (d.includes('sunny') || d.includes('clear')) return '/weather/sunny.svg'

  return '/weather/partly-cloudy-day.svg'
}

/** Fetches current weather from wttr.in by city name. No geolocation. */
export function useWeather(city: string | undefined): WeatherData | null {
  const [weather, setWeather] = useState<WeatherData | null>(null)

  useEffect(() => {
    const trimmed = city?.trim()
    if (!trimmed) return

    let cancelled = false
    const load = async () => {
      try {
        const url = `https://wttr.in/${encodeURIComponent(trimmed)}?format=j1`
        const res = await fetch(url, { signal: AbortSignal.timeout(6000) })
        if (!res.ok || cancelled) return
        const data = await res.json() as {
          current_condition: Array<{ temp_C: string; weatherDesc: Array<{ value: string }> }>
        }
        const cc = data.current_condition?.[0]
        if (cc && !cancelled) {
          const desc = cc.weatherDesc?.[0]?.value ?? ''
          setWeather({
            temp: cc.temp_C,
            desc,
            icon: getWeatherIcon(desc),
          })
        }
      } catch {
        // silent fail
      }
    }
    load()
    return () => { cancelled = true }
  }, [city])

  return weather
}
