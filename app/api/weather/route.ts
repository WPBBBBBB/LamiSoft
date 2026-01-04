import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const revalidate = 600

type HourlyForecast = {
  time: string
  temp: number
  humidity: number
  windSpeed: number
  description: string
  icon: string
  pop?: number
}

type DailyForecast = {
  date: string
  min: number
  max: number
  humidity: number
  windSpeed: number
  description: string
  icon: string
  pop?: number
}

type WeatherResponse = {
  location: {
    lat: number
    lon: number
    city?: string
    country?: string
  }
  current: {
    temp: number
    humidity: number
    windSpeed: number
    description: string
    icon: string
  }
  hourly: HourlyForecast[]
  daily: DailyForecast[]
}

type OpenMeteoResponse = {
  current?: {
    temperature_2m?: number
    relative_humidity_2m?: number
    wind_speed_10m?: number
    weather_code?: number
  }
  hourly?: {
    time?: string[]
    temperature_2m?: number[]
    relative_humidity_2m?: number[]
    wind_speed_10m?: number[]
    weather_code?: number[]
    precipitation_probability?: number[]
  }
  daily?: {
    time?: string[]
    temperature_2m_max?: number[]
    temperature_2m_min?: number[]
    relative_humidity_2m_mean?: number[]
    wind_speed_10m_max?: number[]
    weather_code?: number[]
    precipitation_probability_max?: number[]
  }
}

function round(n: unknown): number {
  const num = Number(n)
  if (!Number.isFinite(num)) return 0
  return Math.round(num)
}

function getWeatherDescriptionAr(code: number): string {
  if (code === 0) return "صافي"
  if (code <= 3) return "غائم جزئياً"
  if (code <= 48) return "ضباب"
  if (code <= 67) return "أمطار"
  if (code <= 77) return "ثلوج"
  if (code <= 82) return "أمطار غزيرة"
  if (code <= 86) return "ثلوج كثيفة"
  if (code <= 99) return "عواصف رعدية"
  return "غير معروف"
}

function getWeatherIcon(code: number): string {
  if (code === 0) return "01d"
  if (code <= 3) return "02d"
  if (code <= 48) return "50d"
  if (code <= 67) return "10d"
  if (code <= 77) return "13d"
  if (code <= 82) return "09d"
  if (code <= 86) return "13d"
  if (code <= 99) return "11d"
  return "01d"
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const lat = Number(searchParams.get("lat") ?? "33.3152")
    const lon = Number(searchParams.get("lon") ?? "44.3661")

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return NextResponse.json({ error: "Invalid lat/lon" }, { status: 400 })
    }

    const url = new URL("https://api.open-meteo.com/v1/forecast")
    url.searchParams.set("latitude", String(lat))
    url.searchParams.set("longitude", String(lon))
    url.searchParams.set("current", "temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code")
    url.searchParams.set("hourly", "temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,precipitation_probability")
    url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,relative_humidity_2m_mean,wind_speed_10m_max,weather_code,precipitation_probability_max")
    url.searchParams.set("timezone", "auto")
    url.searchParams.set("forecast_days", "5")

    const res = await fetch(url.toString(), {
      next: { revalidate },
      headers: { Accept: "application/json" },
    })

    if (!res.ok) {
      const text = await res.text().catch(() => "")
      return NextResponse.json(
        {
          error: "فشل جلب بيانات الطقس من Open-Meteo",
          status: res.status,
          body: text.slice(0, 500),
        },
        { status: 502 }
      )
    }

    const data = (await res.json()) as OpenMeteoResponse

    const currentCode = data.current?.weather_code ?? 0

    const hourly: HourlyForecast[] = []
    const hourlyTimes = data.hourly?.time || []
    const hourlyTemps = data.hourly?.temperature_2m || []
    const hourlyHumidity = data.hourly?.relative_humidity_2m || []
    const hourlyWindSpeed = data.hourly?.wind_speed_10m || []
    const hourlyWeatherCodes = data.hourly?.weather_code || []
    const hourlyPrecipProb = data.hourly?.precipitation_probability || []

    for (let i = 0; i < Math.min(hourlyTimes.length, 24); i++) {
      const code = hourlyWeatherCodes[i] ?? 0
      hourly.push({
        time: hourlyTimes[i] || "",
        temp: round(hourlyTemps[i]),
        humidity: round(hourlyHumidity[i]),
        windSpeed: round(hourlyWindSpeed[i]),
        description: getWeatherDescriptionAr(code),
        icon: getWeatherIcon(code),
        pop: hourlyPrecipProb[i] !== undefined ? round(hourlyPrecipProb[i]) : undefined,
      })
    }

    const daily: DailyForecast[] = []
    const times = data.daily?.time || []
    const maxTemps = data.daily?.temperature_2m_max || []
    const minTemps = data.daily?.temperature_2m_min || []
    const humidity = data.daily?.relative_humidity_2m_mean || []
    const windSpeed = data.daily?.wind_speed_10m_max || []
    const weatherCodes = data.daily?.weather_code || []
    const precipProb = data.daily?.precipitation_probability_max || []

    for (let i = 0; i < Math.min(times.length, 5); i++) {
      const code = weatherCodes[i] ?? 0
      daily.push({
        date: new Date(times[i] + "T00:00:00Z").toISOString(),
        min: round(minTemps[i]),
        max: round(maxTemps[i]),
        humidity: round(humidity[i]),
        windSpeed: round(windSpeed[i]),
        description: getWeatherDescriptionAr(code),
        icon: getWeatherIcon(code),
        pop: precipProb[i] !== undefined ? round(precipProb[i]) : undefined,
      })
    }

    let city: string | undefined
    let country: string | undefined

    try {
      const geoUrl = new URL("https://nominatim.openstreetmap.org/reverse")
      geoUrl.searchParams.set("lat", String(lat))
      geoUrl.searchParams.set("lon", String(lon))
      geoUrl.searchParams.set("format", "json")
      geoUrl.searchParams.set("accept-language", "ar")

      const geoRes = await fetch(geoUrl.toString(), {
        next: { revalidate: 86400 },
        headers: {
          "User-Agent": "AL-LamiSoft-Weather-App",
        },
      })

      if (geoRes.ok) {
        const geoData = await geoRes.json()
        const address = geoData?.address || {}
        city =
          address.city ||
          address.town ||
          address.village ||
          address.state ||
          address.county ||
          geoData?.name
        country = address.country
      }
    } catch (e) {
      }

    const payload: WeatherResponse = {
      location: { lat, lon, city, country },
      current: {
        temp: round(data.current?.temperature_2m),
        humidity: round(data.current?.relative_humidity_2m),
        windSpeed: round(data.current?.wind_speed_10m),
        description: getWeatherDescriptionAr(currentCode),
        icon: getWeatherIcon(currentCode),
      },
      hourly,
      daily,
    }

    return NextResponse.json(payload)
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : (error && typeof error === "object" && "message" in error)
          ? String((error as { message?: unknown }).message)
          : String(error)

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
