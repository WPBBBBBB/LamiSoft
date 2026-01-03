"use client"

import { createContext, useContext, useState, ReactNode } from "react"

type WeatherContextType = {
  isWeatherOpen: boolean
  setIsWeatherOpen: (open: boolean) => void
}

const WeatherContext = createContext<WeatherContextType | undefined>(undefined)

export function WeatherProvider({ children }: { children: ReactNode }) {
  const [isWeatherOpen, setIsWeatherOpen] = useState(false)

  return (
    <WeatherContext.Provider value={{ isWeatherOpen, setIsWeatherOpen }}>
      {children}
    </WeatherContext.Provider>
  )
}

export function useWeather() {
  const context = useContext(WeatherContext)
  if (!context) {
    throw new Error("useWeather must be used within WeatherProvider")
  }
  return context
}
