"use client"

import { useEffect } from "react"
import { useSettings } from "./settings-provider"
import { applyTheme, getThemeById } from "@/lib/themes"

export function ThemeApplier({ children }: { children: React.ReactNode }) {
  const { themeId } = useSettings()

  useEffect(() => {
    const theme = getThemeById(themeId)
    if (theme) {
      applyTheme(theme)
    }
  }, [themeId])

  return <>{children}</>
}
