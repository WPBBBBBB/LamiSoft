"use client"

import { useState, useEffect } from "react"

type SavedLocation = {
  name: string
  lat: number
  lon: number
  country?: string
}

type DroppedWeatherSlot = {
  id: string
  name: string
  lat: number
  lon: number
  country?: string
}

export function WeatherDropZones() {
  const [isDragging, setIsDragging] = useState(false)
  const [reserved, setReserved] = useState<boolean[]>([false, false, false, false])

  const getWeatherDragPayload = () => {
    if (typeof window === "undefined") return null
    const payload = (window as unknown as { __weatherDragPayload?: unknown }).__weatherDragPayload
    return payload ?? null
  }

  const clearWeatherDragPayload = () => {
    if (typeof window === "undefined") return
    ;(window as unknown as { __weatherDragPayload?: unknown }).__weatherDragPayload = undefined
  }
  
  useEffect(() => {
    const handleDragStart = () => setIsDragging(true)
    const handleDragEnd = () => setIsDragging(false)

    window.addEventListener('weather-drag-start', handleDragStart)
    window.addEventListener('weather-drag-end', handleDragEnd)

    return () => {
      window.removeEventListener('weather-drag-start', handleDragStart)
      window.removeEventListener('weather-drag-end', handleDragEnd)
    }
  }, [])

  useEffect(() => {
    if (!isDragging) return

    const loadReserved = () => {
      try {
        const slots = JSON.parse(localStorage.getItem("weather_slots") || "[null, null, null, null]") as Array<unknown>
        const flags = [0, 1, 2, 3].map((i) => Boolean(slots?.[i]))
        setReserved(flags)
      } catch {
        setReserved([false, false, false, false])
      }
    }

    loadReserved()
    window.addEventListener("weather-slots-updated", loadReserved)
    window.addEventListener("storage", loadReserved)

    return () => {
      window.removeEventListener("weather-slots-updated", loadReserved)
      window.removeEventListener("storage", loadReserved)
    }
  }, [isDragging])

  const handleDropZone = (event: React.DragEvent, slotIndex: number) => {
    event.preventDefault()

    const rawData =
      event.dataTransfer.getData("application/json") ||
      event.dataTransfer.getData("weather-location") ||
      event.dataTransfer.getData("text/plain")

    if (rawData) {
      try {
        const parsed = JSON.parse(rawData) as Partial<DroppedWeatherSlot & SavedLocation>

        const location: DroppedWeatherSlot = {
          id: String(parsed.id ?? `weather-${Date.now()}`),
          name: String(parsed.name ?? ""),
          lat: Number(parsed.lat),
          lon: Number(parsed.lon),
          country: parsed.country ? String(parsed.country) : undefined,
        }

        if (!location.name || Number.isNaN(location.lat) || Number.isNaN(location.lon)) {
          throw new Error("Invalid dropped weather location payload")
        }
        
        // تحديث الـ slot المحدد
        const slots = JSON.parse(localStorage.getItem('weather_slots') || '[null, null, null, null]')
        slots[slotIndex] = location
        localStorage.setItem('weather_slots', JSON.stringify(slots))
        
        // تحديث الواجهة
        window.dispatchEvent(new Event('weather-slots-updated'))
        window.dispatchEvent(new Event('focus'))
        
        setIsDragging(false)
      } catch (error) {
        console.error('Error parsing location data:', error)
      }
    }
  }

  const handlePointerDropZone = (slotIndex: number) => {
    const rawPayload = getWeatherDragPayload()
    if (!rawPayload) return

    try {
      const parsed = rawPayload as Partial<DroppedWeatherSlot & SavedLocation>

      const location: DroppedWeatherSlot = {
        id: String(parsed.id ?? `weather-${Date.now()}`),
        name: String(parsed.name ?? ""),
        lat: Number(parsed.lat),
        lon: Number(parsed.lon),
        country: parsed.country ? String(parsed.country) : undefined,
      }

      if (!location.name || Number.isNaN(location.lat) || Number.isNaN(location.lon)) {
        throw new Error("Invalid dropped weather location payload")
      }

      const slots = JSON.parse(localStorage.getItem('weather_slots') || '[null, null, null, null]') as Array<unknown>
      slots[slotIndex] = location
      localStorage.setItem('weather_slots', JSON.stringify(slots))

      window.dispatchEvent(new Event('weather-slots-updated'))
      window.dispatchEvent(new Event('focus'))

      clearWeatherDragPayload()
      setIsDragging(false)
      window.dispatchEvent(new Event('weather-drag-end'))
    } catch (error) {
      console.error('Error parsing location data:', error)
    }
  }

  if (!isDragging) return null

  return (
    <div className="fixed inset-0 z-9999 pointer-events-none">
      <div className="absolute inset-0 bg-background/20 backdrop-blur-md" />

      <div className="fixed left-2 top-2 flex gap-2 pointer-events-auto z-10">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className={
              reserved[index]
                ? "w-12 h-12 border-2 border-dashed border-red-500 bg-background/90 rounded-md flex items-center justify-center text-sm font-semibold text-red-600 cursor-not-allowed"
                : "w-12 h-12 border-2 border-dashed border-primary bg-background/90 rounded-md flex items-center justify-center text-sm font-semibold hover:bg-primary/10 hover:border-solid transition-all cursor-pointer"
            }
            onDragOver={(e) => {
              if (!reserved[index]) e.preventDefault()
            }}
            onDrop={(e) => {
              if (!reserved[index]) handleDropZone(e, index)
            }}
            onPointerUp={() => {
              if (!reserved[index]) handlePointerDropZone(index)
            }}
            title={reserved[index] ? `موقع ${index + 1} (محجوز)` : `موقع ${index + 1}`}
            aria-disabled={reserved[index]}
          >
            {reserved[index] ? "🔒" : index + 1}
          </div>
        ))}
      </div>

      <div className="fixed inset-0 flex items-center justify-center z-10">
        <div className="text-center text-sm sm:text-base font-medium text-foreground bg-background/80 backdrop-blur-sm border rounded-md px-4 py-2">
          اسحب واسقط موقع في احدى المراكز ليتم اضافتها للشاشة الرئيسية
        </div>
      </div>
    </div>
  )
}
