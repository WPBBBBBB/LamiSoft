"use client"

import { useEffect, useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CloudSun, X, Droplets, Wind } from "lucide-react"
import { toast } from "sonner"
import { t } from "@/lib/translations"
import { useSettings } from "@/components/providers/settings-provider"

type WeatherWidgetData = {
  id: string
  name: string
  lat: number
  lon: number
  country?: string
  position: { x: number; y: number }
}

type CurrentWeather = {
  temp: number
  humidity: number
  windSpeed: number
  description: string
  icon: string
}

interface WeatherWidgetProps {
  data: WeatherWidgetData
  onRemove: (id: string) => void
  onPositionChange?: (id: string, position: { x: number; y: number }) => void
}

export function WeatherWidget({ data, onRemove }: WeatherWidgetProps) {
  const { currentLanguage } = useSettings()
  const nodeRef = useRef<HTMLDivElement>(null)
  const [weather, setWeather] = useState<CurrentWeather | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadWeather()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.lat, data.lon])

  const loadWeather = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/weather?lat=${data.lat}&lon=${data.lon}`)
      if (!response.ok) throw new Error(t("failedToLoadWeather", currentLanguage.code))
      const result = await response.json()
      setWeather(result.current)
    } catch (error) {
      toast.error(t("failedToLoadWeather", currentLanguage.code))
      } finally {
      setLoading(false)
    }
  }

  return (
    <div ref={nodeRef} className="h-full">
      <Card className="h-full p-2 shadow-sm border bg-background/95 backdrop-blur hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <CloudSun className="h-3 w-3 text-primary shrink-0" />
              <h3 className="font-semibold text-xs truncate">{data.name}</h3>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4 p-0 hover:bg-destructive/10 hover:text-destructive shrink-0"
            onClick={() => onRemove(data.id)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-3">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
          </div>
        ) : weather ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-center">
              <span className="text-2xl font-bold text-primary">{weather.temp}°</span>
            </div>

            <p className="text-[10px] text-muted-foreground text-center truncate">{weather.description}</p>

            <div className="flex justify-around text-[10px] pt-1 border-t">
              <div className="flex flex-col items-center gap-0.5">
                <Droplets className="h-3 w-3 text-blue-500" />
                <span>{weather.humidity}%</span>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <Wind className="h-3 w-3 text-green-500" />
                <span>{weather.windSpeed}</span>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-center text-[10px] text-muted-foreground py-2">
            {t("noData", currentLanguage.code)}
          </p>
        )}
      </Card>
    </div>
  )
}
