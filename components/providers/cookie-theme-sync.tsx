"use client"

import { useEffect } from "react"
import { useTheme } from "next-themes"
import { getCookie, writePersistedValue } from "@/lib/cookie-utils"

const NEXT_THEME_LOCAL_KEY = "theme"
const NEXT_THEME_COOKIE_KEY = "als_next_theme"

export function CookieThemeSync() {
  const { theme, setTheme } = useTheme()

  // Apply cookie theme on first mount (especially useful on iOS).
  useEffect(() => {
    const cookieTheme = getCookie(NEXT_THEME_COOKIE_KEY)
    if (!cookieTheme) return
    if (cookieTheme === "light" || cookieTheme === "dark" || cookieTheme === "system") {
      setTheme(cookieTheme)
    }
  }, [setTheme])

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
