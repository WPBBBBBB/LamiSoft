"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CloudSun } from "lucide-react"
import { toast } from "sonner"
import { t } from "@/lib/translations"
import { useSettings } from "@/components/providers/settings-provider"

type WeatherSlot = {
  id: string
  name: string
  lat: number
  lon: number
  country?: string
}

type CurrentWeather = {
  temp: number
  humidity: number
  windSpeed: number
  description: string
  icon: string
}

export function WeatherSlots() {
  const { currentLanguage } = useSettings()
  const [slots, setSlots] = useState<(WeatherSlot | null)[]>([null, null, null, null])
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null)
  const [weather, setWeather] = useState<CurrentWeather | null>(null)
  const [loading, setLoading] = useState(false)
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lon: number } | null>(null)
  const [slotTemperatures, setSlotTemperatures] = useState<{ [key: number]: number | null }>({})
  const [loadingTemps, setLoadingTemps] = useState(false)

  const loadSlotTemperatures = async () => {
    setLoadingTemps(true)
    const temps: { [key: number]: number | null } = {}
    
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i]
      if (slot) {
        try {
          const response = await fetch(`/api/weather?lat=${slot.lat}&lon=${slot.lon}`)
          if (response.ok) {
            const result = await response.json()
            temps[i] = result.current?.temp || null
          } else {
            temps[i] = null
          }
        } catch (error) {
          temps[i] = null
        }
      }
    }
    
    setSlotTemperatures(temps)
    setLoadingTemps(false)
  }

  useEffect(() => {
    const reloadSlots = () => {
      const saved = localStorage.getItem('weather_slots')
      if (saved) {
        setSlots(JSON.parse(saved))
      }
    }

    reloadSlots()

    window.addEventListener('focus', reloadSlots)
    window.addEventListener('weather-slots-updated', reloadSlots)
    
    return () => {
      window.removeEventListener('focus', reloadSlots)
      window.removeEventListener('weather-slots-updated', reloadSlots)
    }
  }, [])

  useEffect(() => {
    if (slots.some(s => s !== null)) {
      loadSlotTemperatures()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots])

  useEffect(() => {
    const savedLoc = localStorage.getItem('user_location')
    if (savedLoc) {
      setCurrentLocation(JSON.parse(savedLoc))
    }

    const handleAddWidget = (event: Event) => {
      const customEvent = event as CustomEvent<WeatherSlot>
      const newLocation = customEvent.detail
      setSlots(prev => {
        const firstEmpty = prev.findIndex(s => s === null)
        if (firstEmpty === -1) {
          toast.error(t('allLocationsFull', currentLanguage.code))
          return prev
        }
        const updated = [...prev]
        updated[firstEmpty] = newLocation
        localStorage.setItem('weather_slots', JSON.stringify(updated))
        toast.success(`${t('locationAdded', currentLanguage.code)} ${newLocation.name}`)
        return updated
      })
    }

    window.addEventListener('add-weather-widget', handleAddWidget)
    return () => window.removeEventListener('add-weather-widget', handleAddWidget)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadWeather = async (lat: number, lon: number) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/weather?lat=${lat}&lon=${lon}`)
      if (!response.ok) throw new Error(t('failedToLoadWeather', currentLanguage.code))
      const result = await response.json()
      setWeather(result.current)
    } catch (error) {
      toast.error(t('failedToLoadWeather', currentLanguage.code))
      } finally {
      setLoading(false)
    }
  }

  const handleSlotClick = (index: number) => {
    if (index === -1) {
      if (currentLocation) {
        setSelectedSlot(-1)
        loadWeather(currentLocation.lat, currentLocation.lon)
      } else {
        toast.error(t('locationNotFound', currentLanguage.code))
      }
    } else {
      const slot = slots[index]
      if (slot) {
        setSelectedSlot(index)
        loadWeather(slot.lat, slot.lon)
      }
    }
  }

  const removeSlot = (index: number) => {
    setSlots(prev => {
      const updated = [...prev]
      updated[index] = null
      localStorage.setItem('weather_slots', JSON.stringify(updated))
      return updated
    })
    setSelectedSlot(null)
    toast.success(t('locationRemoved', currentLanguage.code))
  }

  const getSlotName = (index: number) => {
    const slot = slots[index]
    return slot?.name || ""
  }

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        {}
        {slots.map((slot, index) => 
          slot ? (
            <Button
              key={index}
              variant="default"
              size="sm"
              className="h-9 px-3 gap-2 min-w-fit"
              onClick={() => handleSlotClick(index)}
            >
              <CloudSun className="h-3.5 w-3.5 shrink-0" />
              <span className="text-xs whitespace-nowrap">{slot.name}</span>
              {slotTemperatures[index] !== undefined && slotTemperatures[index] !== null && (
                <span className="text-xs font-semibold" dir="ltr">
                  {slotTemperatures[index]}°
                </span>
              )}
            </Button>
          ) : null
        )}
      </div>

      {}
      <Dialog open={selectedSlot !== null} onOpenChange={() => setSelectedSlot(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-right">
              {selectedSlot === -1 ? t('currentLocation', currentLanguage.code) : getSlotName(selectedSlot ?? 0)}
            </DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : weather ? (
            <div className="space-y-4 py-4" dir="ltr">
              <div className="flex items-center justify-center gap-4">
                <CloudSun className="h-16 w-16 text-primary" />
                <span className="text-6xl font-bold text-primary">{weather.temp}°</span>
              </div>

              <p className="text-center text-lg text-muted-foreground">{weather.description}</p>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">{t('humidity', currentLanguage.code)}</p>
                  <p className="text-2xl font-semibold">{weather.humidity}%</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">{t('wind', currentLanguage.code)}</p>
                  <p className="text-2xl font-semibold">{weather.windSpeed} km/h</p>
                </div>
              </div>

              {selectedSlot !== null && selectedSlot >= 0 && (
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => removeSlot(selectedSlot)}
                >
                  {t('removeLocation', currentLanguage.code)}
                </Button>
              )}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              {t('noData', currentLanguage.code)}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
