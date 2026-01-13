"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { CloudSun, Droplets, Wind, Thermometer, Plus, Search, MapPin, X, GripVertical, Minimize2, Maximize2 } from "lucide-react"
import { toast } from "sonner"
import Draggable from "react-draggable"
import { t } from "@/lib/translations"
import { useSettings } from "@/components/providers/settings-provider"
import { useWeather } from "@/components/providers/weather-provider"

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

type SavedLocation = {
  name: string
  lat: number
  lon: number
  country?: string
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

type WeatherErrorResponse = {
  error?: unknown
  attempts?: Array<{ status?: unknown; endpoint?: unknown; body?: unknown }>
}

function formatDay(dateIso: string, lang: string) {
  const date = new Date(dateIso)
  const today = new Date()
  
  if (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  ) {
    return t("today", lang)
  }
  
  const day = date.getDate()
  const month = date.getMonth() + 1
  return `${day}/${month}`
}

function formatHourlyTime(timeIso: string, lang: string) {
  const date = new Date(timeIso)
  const hours = date.getHours()
  const minutes = date.getMinutes()
  
  const normalized = (lang || "ar").toLowerCase().split(/[-_]/)[0]
  const period =
    normalized === "en" ? (hours >= 12 ? "PM" : "AM") :
    normalized === "ku" ? (hours >= 12 ? "د.ن" : "پ.ن") :
    (hours >= 12 ? "م" : "ص")
  const hours12 = hours % 12 || 12
  const minutesStr = minutes > 0 ? `:${minutes.toString().padStart(2, '0')}` : ''
  
  return `${hours12}${minutesStr}${period}`
}

export function WeatherDialog() {
  const { currentLanguage } = useSettings()
  const { isWeatherOpen, setIsWeatherOpen } = useWeather()
  const dialogRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<WeatherResponse | null>(null)
  const [locationStatus, setLocationStatus] = useState<"idle" | "requesting" | "granted" | "denied">("idle")
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([])
  const [activeLocationIndex, setActiveLocationIndex] = useState<number>(0)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SavedLocation[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [savedMinimizedPosition, setSavedMinimizedPosition] = useState<{x: number, y: number} | null>(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem("saved_weather_locations")
      if (saved) {
        setSavedLocations(JSON.parse(saved))
      }
    } catch {}
  }, [])

  const getUserLocation = (): Promise<{ lat: number; lon: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null)
        return
      }

      setLocationStatus("requesting")

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocationStatus("granted")
          const coords = {
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          }
          try {
            localStorage.setItem("user_location", JSON.stringify(coords))
          } catch {}
          resolve(coords)
        },
        (err) => {
          setLocationStatus("denied")
          resolve(null)
        },
        { timeout: 10000, maximumAge: 600000 }
      )
    })
  }

  const searchLocation = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    try {
      setSearchLoading(true)
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          query
        )}&format=json&limit=5&accept-language=en`
      )
      const results = await res.json() as Array<{
        display_name: string
        lat: string
        lon: string
      }>
      
      const locations: SavedLocation[] = results.map((r) => ({
        name: r.display_name.split(',')[0],
        lat: parseFloat(r.lat),
        lon: parseFloat(r.lon),
        country: r.display_name.split(',').slice(-1)[0]?.trim()
      }))
      
      setSearchResults(locations)
    } catch {
      toast.error(t("failedToSearchLocation", currentLanguage.code))
    } finally {
      setSearchLoading(false)
    }
  }

  const addLocation = (location: SavedLocation) => {
    const newLocations = [...savedLocations, location]
    setSavedLocations(newLocations)
    localStorage.setItem("saved_weather_locations", JSON.stringify(newLocations))
    setShowSearch(false)
    setSearchQuery("")
    setSearchResults([])
    
    setActiveLocationIndex(newLocations.length)
    loadWeatherForLocation(location.lat, location.lon)
  }

  const removeLocation = (index: number) => {
    const newLocations = savedLocations.filter((_, i) => i !== index)
    setSavedLocations(newLocations)
    localStorage.setItem("saved_weather_locations", JSON.stringify(newLocations))
    
    if (activeLocationIndex === index + 1) {
      setActiveLocationIndex(0)
      loadWeather()
    } else if (activeLocationIndex > index + 1) {
      setActiveLocationIndex(activeLocationIndex - 1)
    }
  }

  const buildWeatherDragPayload = (location: SavedLocation) => ({
    id: `weather-${Date.now()}`,
    name: location.name,
    lat: location.lat,
    lon: location.lon,
    country: location.country,
    position: { x: 100, y: 100 },
  })

  const setWeatherDragPayload = (payload: ReturnType<typeof buildWeatherDragPayload> | null) => {
    if (typeof window === "undefined") return
    ;(window as unknown as { __weatherDragPayload?: unknown }).__weatherDragPayload = payload ?? undefined
  }

  const handleDragLocation = (location: SavedLocation, e: React.DragEvent) => {
    const payload = buildWeatherDragPayload(location)

    e.dataTransfer.effectAllowed = "copy"
    e.dataTransfer.setData("application/json", JSON.stringify(payload))
    setWeatherDragPayload(payload)
  }

  const handlePointerDragStart = (location: SavedLocation) => {
    const payload = buildWeatherDragPayload(location)
    setWeatherDragPayload(payload)

    window.dispatchEvent(new Event("weather-drag-start"))

    const end = () => {
      const current = (window as unknown as { __weatherDragPayload?: unknown }).__weatherDragPayload
      if (current) {
        setWeatherDragPayload(null)
        window.dispatchEvent(new Event("weather-drag-end"))
      }
    }

    window.addEventListener("pointerup", end, { once: true })
    window.addEventListener("pointercancel", end, { once: true })
  }

  const createWidget = (location: SavedLocation) => {
    const widgetData = {
      id: `weather-${Date.now()}`,
      name: location.name,
      lat: location.lat,
      lon: location.lon,
      country: location.country,
      position: { x: 100, y: 100 }
    }
    
    const event = new CustomEvent('add-weather-widget', { detail: widgetData })
    window.dispatchEvent(event)
    toast.success(`${t("addedToHome", currentLanguage.code)} ${location.name}`)
  }

  const loadWeatherForLocation = async (lat: number, lon: number) => {
    if (loading) return

    try {
      setLoading(true)
      setError(null)

      const url = `/api/weather?lat=${lat}&lon=${lon}`
      const res = await fetch(url, { cache: "no-store" })
      if (!res.ok) {
        throw new Error(t("failedToLoadWeather", currentLanguage.code))
      }

      const json = (await res.json()) as WeatherResponse
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errorOccurred", currentLanguage.code))
    } finally {
      setLoading(false)
    }
  }

  const loadWeather = async (forceLocationRequest = false) => {
    try {
      setLoading(true)
      setError(null)

      let coords: { lat: number; lon: number } | null = null

      if (!forceLocationRequest) {
        try {
          const saved = localStorage.getItem("user_location")
          if (saved) {
            coords = JSON.parse(saved)
          }
        } catch {}
      }

      if (!coords || forceLocationRequest) {
        coords = await getUserLocation()
      }

      const url = coords
        ? `/api/weather?lat=${coords.lat}&lon=${coords.lon}`
        : "/api/weather"

      const res = await fetch(url, { cache: "no-store" })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as WeatherErrorResponse
        const base = body?.error ? String(body.error) : t("failedToLoadWeather", currentLanguage.code)
        const attempts = Array.isArray(body?.attempts) ? body.attempts : null

        const extra = attempts
          ? `\n\n${t("connectionDetails", currentLanguage.code)}:\n${attempts
              .slice(0, 3)
              .map((a) => {
                const endpoint = String(a.endpoint || "").split("?")[0]
                const bodySnippet = a.body ? String(a.body).slice(0, 160) : ""
                return `- ${String(a.status)}: ${endpoint}${bodySnippet ? `\n  ${bodySnippet}` : ""}`
              })
              .join("\n")}`
          : ""

        throw new Error(base + extra)
      }

      const json = (await res.json()) as WeatherResponse
      setData(json)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isWeatherOpen && !data) {
      loadWeather(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWeatherOpen])

  const handleMinimize = () => {
    setIsMinimized(true)
  }

  const handleMaximize = () => {
    setIsMinimized(false)
    setPosition({ x: 0, y: 0 })
  }

  const handleDragStop = (_e: unknown, data: { x: number; y: number }) => {
    setIsDragging(false)
    if (isMinimized) {
      setSavedMinimizedPosition({ x: data.x, y: data.y })
    }
  }

  if (!isWeatherOpen) return null

  return (
    <div className={`fixed inset-0 ${isMinimized ? 'z-40' : 'z-50'} ${!isMinimized ? 'bg-background/80 backdrop-blur-sm' : 'pointer-events-none'}`}>
      <Draggable
        nodeRef={dialogRef}
        handle=".drag-handle"
        onStart={() => setIsDragging(true)}
        onStop={handleDragStop}
        position={isMinimized && savedMinimizedPosition ? savedMinimizedPosition : position}
        onDrag={(_e, data) => setPosition({ x: data.x, y: data.y })}
        disabled={!isMinimized && position.x === 0 && position.y === 0}
      >
        <div 
          ref={dialogRef}
          className={`absolute ${isMinimized ? 'bottom-4 right-4' : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'} bg-background border rounded-lg shadow-lg ${isMinimized ? 'w-80' : 'max-w-2xl w-full max-h-[85vh]'} p-0 overflow-hidden flex flex-col pointer-events-auto ${isDragging ? 'cursor-grabbing' : ''}`}
          style={{ transition: isDragging ? 'none' : 'width 300ms, max-width 300ms, height 300ms, max-height 300ms' }}
        >
          <div className="weather-animated-bg p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setIsWeatherOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  onClick={() => isMinimized ? handleMaximize() : handleMinimize()}
                >
                  {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
                </Button>
                {!isMinimized && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    onClick={() => setShowSearch(!showSearch)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold">{t('weather', currentLanguage.code)}</span>
                <div className="drag-handle cursor-grab hover:bg-accent/50 p-1 rounded active:cursor-grabbing">
                  <GripVertical className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </div>

        {}
        {!isMinimized && showSearch && (
          <Card className="mt-3 p-3">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowSearch(false)
                  setSearchQuery("")
                  setSearchResults([])
                }}
              >
                <X className="h-4 w-4" />
              </Button>
              <Input
                placeholder={t('searchCity', currentLanguage.code)}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  searchLocation(e.target.value)
                }}
                className="text-right"
              />
              <Search className="h-4 w-4 text-muted-foreground mt-2" />
            </div>

            {searchLoading && (
              <div className="mt-2 text-sm text-muted-foreground text-center">{t('searching', currentLanguage.code)}</div>
            )}
            {searchResults.length > 0 && (
              <div className="mt-2 space-y-1">
                {searchResults.map((result, idx) => (
                  <Button
                    key={idx}
                    variant="ghost"
                    className="w-full justify-end text-right h-auto py-2"
                    onClick={() => addLocation(result)}
                  >
                    <div className="flex flex-col items-end">
                      <span className="font-semibold">{result.name}</span>
                      {result.country && (
                        <span className="text-xs text-muted-foreground">{result.country}</span>
                      )}
                    </div>
                  </Button>
                ))}
              </div>
            )}
          </Card>
        )}

        {}
        {!isMinimized && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
          <Button
            size="sm"
            variant={activeLocationIndex === 0 ? "default" : "outline"}
            className="flex items-center gap-2 whitespace-nowrap"
            onClick={() => {
              setActiveLocationIndex(0)
              loadWeather()
            }}
          >
            <MapPin className="h-3 w-3" />
            {t('currentLocation', currentLanguage.code)}
          </Button>
          {savedLocations.map((loc, idx) => (
            <div key={idx} className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={() => removeLocation(idx)}
              >
                <X className="h-3 w-3" />
              </Button>
              <div className="relative group">
                <Button
                  size="sm"
                  variant={activeLocationIndex === idx + 1 ? "default" : "outline"}
                  className="whitespace-nowrap"
                  onClick={() => {
                    setActiveLocationIndex(idx + 1)
                    loadWeatherForLocation(loc.lat, loc.lon)
                  }}
                >
                  {loc.name}
                </Button>
                <div
                  className="absolute inset-0 cursor-grab hover:cursor-grabbing opacity-0 hover:opacity-100 flex items-center justify-center bg-primary/10 rounded-md transition-opacity pointer-events-auto touch-none select-none"
                  draggable
                  onDragStart={(e) => {
                    e.stopPropagation()
                    handleDragLocation(loc, e)
                    window.dispatchEvent(new Event('weather-drag-start'))
                  }}
                  onDragEnd={() => {
                    setWeatherDragPayload(null)
                    window.dispatchEvent(new Event('weather-drag-end'))
                  }}
                  onPointerDown={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    handlePointerDragStart(loc)
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation()
                    createWidget(loc)
                  }}
                  title={t("weatherDragHint", currentLanguage.code)}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </div>
          ))}
        </div>
        )}

        {}
        {!isMinimized && data?.location.city && (
          <div className="mt-2 inline-flex items-center justify-end w-full">
            <span className="text-sm font-normal bg-primary/20 text-primary px-3 py-1 rounded-full backdrop-blur-sm border border-primary/30">
              {data.location.city}
              {data.location.country && `, ${data.location.country}`}
            </span>
          </div>
        )}
      </div>

      {!isMinimized && (
      <div className="overflow-y-auto px-4 pb-4">
        {locationStatus === "requesting" && (
          <Card className="mt-4 p-4 text-right">
            <div className="text-sm text-muted-foreground">
              {t("requestingLocationAccess", currentLanguage.code)}
            </div>
          </Card>
        )}

        {locationStatus === "denied" && (
          <Card className="mt-4 p-4 text-right border-orange-500/50">
            <div className="text-sm text-orange-600 dark:text-orange-400">
              {t("locationDeniedFallback", currentLanguage.code)}
            </div>
          </Card>
        )}

        {error ? (
          <Card className="mt-4 p-4 text-right">
            <div className="text-sm text-destructive">{error}</div>
          </Card>
        ) : !data ? (
          <Card className="mt-4 p-4 text-right">
            <div className="text-sm text-muted-foreground">{t("loading", currentLanguage.code)}</div>
          </Card>
        ) : (
          <div className="mt-4 space-y-4">
            {}
            <Card className="p-4">
              <div className="flex flex-col gap-2 text-right">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">{t("today", currentLanguage.code)}</div>
                  <div className="text-base font-semibold">{data.current.description || ""}</div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="flex items-center justify-between rounded-md border bg-background/60 p-2">
                    <span className="text-xs text-muted-foreground">{t("temperature", currentLanguage.code)}</span>
                    <span className="flex items-center gap-2">
                      <Thermometer className="h-4 w-4 text-red-500" />
                      <span className="font-semibold">{data.current.temp}°</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-md border bg-background/60 p-2">
                    <span className="text-xs text-muted-foreground">{t("humidity", currentLanguage.code)}</span>
                    <span className="flex items-center gap-2">
                      <Droplets className="h-4 w-4 text-blue-500" />
                      <span className="font-semibold">{data.current.humidity}%</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-md border bg-background/60 p-2">
                    <span className="text-xs text-muted-foreground">{t("wind", currentLanguage.code)}</span>
                    <span className="flex items-center gap-2">
                      <Wind className="h-4 w-4 text-green-500" />
                      <span className="font-semibold">{data.current.windSpeed}</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-md border bg-background/60 p-2">
                    <CloudSun className="h-8 w-8 text-yellow-500" />
                  </div>
                </div>
              </div>
            </Card>

            {}
            {data.hourly && data.hourly.length > 0 && (
              <Card className="p-4">
                <h3 className="text-sm font-semibold mb-3 text-right">{t('hourlyForecast', currentLanguage.code)} (24 {t('hours', currentLanguage.code)})</h3>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {data.hourly.map((h, i) => (
                    <Card key={i} className="shrink-0 p-3 min-w-20">
                      <div className="text-xs text-muted-foreground text-center mb-1">{formatHourlyTime(h.time, currentLanguage.code)}</div>
                      <div className="text-center font-semibold mb-1">{h.temp}°</div>
                      <div className="text-xs text-muted-foreground text-center">{h.humidity}%</div>
                    </Card>
                  ))}
                </div>
              </Card>
            )}

            {}
            <Card className="p-4">
              <h3 className="text-sm font-semibold mb-3 text-right">{t('dailyForecast', currentLanguage.code)} (5 {t('days', currentLanguage.code)})</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.daily.slice(0, 5).map((d) => (
                <Card key={d.date} className="p-3" dir="ltr">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold">{formatDay(d.date, currentLanguage.code)}</div>
                    <div className="text-xs text-muted-foreground">{d.description}</div>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{t('high', currentLanguage.code)}</span>
                      <span className="font-semibold">{d.max}°</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{t('low', currentLanguage.code)}</span>
                      <span className="font-semibold">{d.min}°</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{t('humidity', currentLanguage.code)}</span>
                      <span className="font-semibold">{d.humidity}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{t('wind', currentLanguage.code)}</span>
                      <span className="font-semibold">{d.windSpeed}</span>
                    </div>
                    {typeof d.pop === "number" ? (
                      <div className="col-span-2 flex items-center justify-between">
                        <span className="text-muted-foreground">{t('rainProbability', currentLanguage.code)}</span>
                        <span className="font-semibold">{d.pop}%</span>
                      </div>
                    ) : null}
                  </div>
                </Card>
              ))}
            </div>
            </Card>
          </div>
        )}
        </div>
        )}

        {}
        {isMinimized && data && (
          <div className="px-4 pb-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CloudSun className="h-8 w-8 text-primary" />
                <div className="text-right">
                  <div className="text-2xl font-bold">{data.current.temp}°</div>
                  <div className="text-xs text-muted-foreground">{data.current.description}</div>
                </div>
              </div>
              {data.location.city && (
                <div className="text-xs text-muted-foreground text-right">
                  {data.location.city}
                </div>
              )}
            </div>
          </div>
        )}
        </div>
      </Draggable>
    </div>
  )
}
