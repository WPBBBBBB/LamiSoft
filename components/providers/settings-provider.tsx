"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { Theme, themes, applyTheme, getThemeById } from "@/lib/themes"
import { FontOption, fonts, applyFont, getFontById, loadGoogleFont } from "@/lib/fonts"
import { Language, languages } from "@/lib/i18n"

interface SettingsContextType {
  // Theme
  currentTheme: Theme
  setTheme: (themeId: string) => void
  mode: "light" | "dark" | "system"
  setMode: (mode: "light" | "dark" | "system") => void
  
  // Language
  currentLanguage: Language
  setLanguage: (langCode: string) => void
  
  // Font
  currentFont: FontOption
  setFont: (fontId: string) => void
  
  // Sidebar
  mainSidebarWidth: number
  setMainSidebarWidth: (width: number) => void
  mainSidebarCollapsed: boolean
  setMainSidebarCollapsed: (collapsed: boolean) => void
  
  settingsSidebarWidth: number
  setSettingsSidebarWidth: (width: number) => void
  settingsSidebarCollapsed: boolean
  setSettingsSidebarCollapsed: (collapsed: boolean) => void
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  // Initialize with defaults
  const [currentTheme, setCurrentThemeState] = useState<Theme>(themes[0])
  const [mode, setModeState] = useState<"light" | "dark" | "system">("system")
  const [currentLanguage, setCurrentLanguageState] = useState<Language>(languages[0])
  const [currentFont, setCurrentFontState] = useState<FontOption>(fonts[0])
  const [mainSidebarWidth, setMainSidebarWidthState] = useState(288) // 72 * 4 = 288px (w-72)
  const [mainSidebarCollapsed, setMainSidebarCollapsedState] = useState(false)
  const [settingsSidebarWidth, setSettingsSidebarWidthState] = useState(280)
  const [settingsSidebarCollapsed, setSettingsSidebarCollapsedState] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    const savedThemeId = localStorage.getItem("theme-id")
    const savedMode = localStorage.getItem("theme-mode") as "light" | "dark" | "system" | null
    const savedLangCode = localStorage.getItem("language")
    const savedFontId = localStorage.getItem("font-id")
    const savedMainSidebarWidth = localStorage.getItem("main-sidebar-width")
    const savedMainSidebarCollapsed = localStorage.getItem("main-sidebar-collapsed")
    const savedSettingsSidebarWidth = localStorage.getItem("settings-sidebar-width")
    const savedSettingsSidebarCollapsed = localStorage.getItem("settings-sidebar-collapsed")

    if (savedThemeId) {
      const theme = getThemeById(savedThemeId)
      if (theme) {
        setCurrentThemeState(theme)
        applyTheme(theme)
      }
    }

    if (savedMode) {
      console.log("Loading saved mode:", savedMode)
      setModeState(savedMode)
      // تطبيق الوضع المحفوظ
      const root = document.documentElement
      if (savedMode === "system") {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
        if (prefersDark) {
          root.classList.add("dark")
        } else {
          root.classList.remove("dark")
        }
      } else if (savedMode === "dark") {
        root.classList.add("dark")
      } else {
        root.classList.remove("dark")
      }
      console.log("Applied mode:", savedMode, "Dark class:", root.classList.contains("dark"))
    } else {
      // Detect system preference on first load
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      console.log("First load, system prefers dark:", prefersDark)
      setModeState("system")
      if (prefersDark) {
        document.documentElement.classList.add("dark")
      } else {
        document.documentElement.classList.remove("dark")
      }
    }

    if (savedLangCode) {
      const lang = languages.find((l) => l.code === savedLangCode)
      if (lang) {
        setCurrentLanguageState(lang)
        document.documentElement.setAttribute("lang", lang.code)
        document.documentElement.setAttribute("dir", lang.direction)
      }
    }

    if (savedFontId) {
      const font = getFontById(savedFontId)
      if (font) {
        setCurrentFontState(font)
        applyFont(font.family)
        if (font.category !== "universal") {
          loadGoogleFont(font.name)
        }
      }
    }

    if (savedMainSidebarWidth) {
      setMainSidebarWidthState(parseInt(savedMainSidebarWidth))
    }

    if (savedMainSidebarCollapsed) {
      setMainSidebarCollapsedState(savedMainSidebarCollapsed === "true")
    }

    if (savedSettingsSidebarWidth) {
      setSettingsSidebarWidthState(parseInt(savedSettingsSidebarWidth))
    }

    if (savedSettingsSidebarCollapsed) {
      setSettingsSidebarCollapsedState(savedSettingsSidebarCollapsed === "true")
    }

    setMounted(true)
  }, [])

  // Apply theme whenever it changes
  useEffect(() => {
    if (currentTheme && mounted) {
      applyTheme(currentTheme)
    }
  }, [currentTheme, mounted])

  // Apply font whenever it changes
  useEffect(() => {
    if (currentFont && mounted) {
      applyFont(currentFont.family)
      if (currentFont.url) {
        loadGoogleFont(currentFont.family)
      }
    }
  }, [currentFont, mounted])

  // Listen to system theme changes when mode is "system"
  useEffect(() => {
    if (mode === "system" && mounted) {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
      
      const handleChange = (e: MediaQueryListEvent) => {
        console.log("System theme changed, dark:", e.matches)
        if (e.matches) {
          document.documentElement.classList.add("dark")
        } else {
          document.documentElement.classList.remove("dark")
        }
      }
      
      mediaQuery.addEventListener("change", handleChange)
      
      return () => mediaQuery.removeEventListener("change", handleChange)
    }
  }, [mode, mounted])

  const setTheme = (themeId: string) => {
    const theme = getThemeById(themeId)
    if (theme) {
      setCurrentThemeState(theme)
      applyTheme(theme)
      localStorage.setItem("theme-id", themeId)
    }
  }

  const setMode = (newMode: "light" | "dark" | "system") => {
    console.log("Setting mode to:", newMode)
    setModeState(newMode)
    localStorage.setItem("theme-mode", newMode)
    
    // Apply dark/light class to html element
    const root = document.documentElement
    if (newMode === "system") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      console.log("System prefers dark:", prefersDark)
      if (prefersDark) {
        root.classList.add("dark")
      } else {
        root.classList.remove("dark")
      }
    } else if (newMode === "dark") {
      console.log("Applying dark mode")
      root.classList.add("dark")
    } else {
      console.log("Applying light mode")
      root.classList.remove("dark")
    }
    console.log("HTML classes:", root.className)
  }

  const setLanguage = (langCode: string) => {
    const lang = languages.find((l) => l.code === langCode)
    if (lang) {
      setCurrentLanguageState(lang)
      localStorage.setItem("language", langCode)
      document.documentElement.setAttribute("lang", lang.code)
      document.documentElement.setAttribute("dir", lang.direction)
    }
  }

  const setFont = (fontId: string) => {
    const font = getFontById(fontId)
    if (font) {
      setCurrentFontState(font)
      applyFont(font.family)
      localStorage.setItem("font-id", fontId)
      if (font.category !== "universal") {
        loadGoogleFont(font.name)
      }
    }
  }

  const setMainSidebarWidth = (width: number) => {
    setMainSidebarWidthState(width)
    localStorage.setItem("main-sidebar-width", width.toString())
  }

  const setMainSidebarCollapsed = (collapsed: boolean) => {
    setMainSidebarCollapsedState(collapsed)
    localStorage.setItem("main-sidebar-collapsed", collapsed.toString())
  }

  const setSettingsSidebarWidth = (width: number) => {
    setSettingsSidebarWidthState(width)
    localStorage.setItem("settings-sidebar-width", width.toString())
  }

  const setSettingsSidebarCollapsed = (collapsed: boolean) => {
    setSettingsSidebarCollapsedState(collapsed)
    localStorage.setItem("settings-sidebar-collapsed", collapsed.toString())
  }

  if (!mounted) {
    return null
  }

  return (
    <SettingsContext.Provider
      value={{
        currentTheme,
        setTheme,
        mode,
        setMode,
        currentLanguage,
        setLanguage,
        currentFont,
        setFont,
        mainSidebarWidth,
        setMainSidebarWidth,
        mainSidebarCollapsed,
        setMainSidebarCollapsed,
        settingsSidebarWidth,
        setSettingsSidebarWidth,
        settingsSidebarCollapsed,
        setSettingsSidebarCollapsed,
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider")
  }
  return context
}
