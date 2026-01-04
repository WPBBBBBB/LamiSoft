"use client"

import { useEffect, useRef } from "react"
import { useTheme } from "next-themes"
import { getCookie, writePersistedValue } from "@/lib/cookie-utils"

const NEXT_THEME_LOCAL_KEY = "theme"
const NEXT_THEME_COOKIE_KEY = "als_next_theme"

export function CookieThemeSync() {
  const { theme, setTheme } = useTheme()
  const hasSetInitialTheme = useRef(false)

  // Apply cookie theme on first mount (especially useful on iOS).
  useEffect(() => {
    if (hasSetInitialTheme.current) return
    
    const cookieTheme = getCookie(NEXT_THEME_COOKIE_KEY)
    if (!cookieTheme) return
    if (cookieTheme === "light" || cookieTheme === "dark" || cookieTheme === "system") {
      if (cookieTheme !== theme) {
        setTheme(cookieTheme)
        hasSetInitialTheme.current = true
      }
    }
  }, [theme, setTheme])

  // Persist theme changes to cookie (and localStorage via next-themes), gated by consent.
  useEffect(() => {
    if (!theme) return
    if (theme !== "light" && theme !== "dark" && theme !== "system") return

    writePersistedValue(NEXT_THEME_LOCAL_KEY, NEXT_THEME_COOKIE_KEY, theme, {
      cookieMaxAgeDays: 365,
      requireConsent: true,
    })
  }, [theme])

  return null
}
