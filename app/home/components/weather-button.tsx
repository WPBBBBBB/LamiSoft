"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { CloudSun } from "lucide-react"
import { useWeather } from "@/components/providers/weather-provider"
import { useSettings } from "@/components/providers/settings-provider"
import { t } from "@/lib/translations"

type WeatherResponse = {
  current: {
    temp: number
  }
}

export function WeatherButton() {
  const { currentLanguage } = useSettings()
  const { setIsWeatherOpen } = useWeather()
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<WeatherResponse | null>(null)

  const todayTempText = useMemo(() => {
    if (loading) return "..."
    if (!data) return "—"
    return `${data.current.temp}°`
  }, [data, loading])

  const loadWeather = async () => {
    try {
      setLoading(true)
      let coords: { lat: number; lon: number } | null = null
      
      try {
        const saved = localStorage.getItem("user_location")
        if (saved) {
          coords = JSON.parse(saved)
        }
      } catch {}

      const url = coords
        ? `/api/weather?lat=${coords.lat}&lon=${coords.lon}`
        : "/api/weather"

      const res = await fetch(url, { cache: "no-store" })
      if (!res.ok) throw new Error(t("failedToLoadWeather", currentLanguage.code))

      const json = (await res.json()) as WeatherResponse
      setData(json)
    } catch (e) {
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadWeather()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Button
      variant="secondary"
      className="h-10 px-3 justify-between gap-2"
      onClick={() => setIsWeatherOpen(true)}
      disabled={loading}
    >
      <span className="flex items-center gap-2">
        <CloudSun className="h-4 w-4 theme-icon" />
        {t("weather", currentLanguage.code)}
      </span>
      <span className="text-sm font-semibold">{todayTempText}</span>
    </Button>
  )
}
