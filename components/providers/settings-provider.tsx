"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { Theme, themes, applyTheme, getThemeById } from "@/lib/themes"
import { FontOption, fonts, applyFont, getFontById, loadGoogleFont } from "@/lib/fonts"
import { Language, languages } from "@/lib/i18n"

interface SettingsContextType {
  currentTheme: Theme
  themeId: string
  theme: string
  setTheme: (themeId: string) => void
  mode: "light" | "dark" | "system"
  setMode: (mode: "light" | "dark" | "system") => void
  
  currentLanguage: Language
  setLanguage: (langCode: string) => void
  
  currentFont: FontOption
  setFont: (fontId: string) => void
  
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
  const [themeId, setThemeIdState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const savedThemeId = localStorage.getItem("theme-id")
      return savedThemeId || themes[0].id
    }
    return themes[0].id
  })
  
  const [currentTheme, setCurrentThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const savedThemeId = localStorage.getItem("theme-id")
      if (savedThemeId) {
        const theme = getThemeById(savedThemeId)
        if (theme) return theme
      }
    }
    return themes[0]
  })
  
  const [mode, setModeState] = useState<"light" | "dark" | "system">(() => {
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem("theme-mode") as "light" | "dark" | "system" | null
      return savedMode || "system"
    }
    return "system"
  })
  
  const [currentLanguage, setCurrentLanguageState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const savedLangCode = localStorage.getItem("language")
      if (savedLangCode) {
        const lang = languages.find((l) => l.code === savedLangCode)
        if (lang) return lang
      }
    }
    return languages[0]
  })
  
  const [currentFont, setCurrentFontState] = useState<FontOption>(() => {
    if (typeof window !== 'undefined') {
      const savedFontId = localStorage.getItem("font-id")
      if (savedFontId) {
        const font = getFontById(savedFontId)
        if (font) return font
      }
    }
    return fonts[0]
  })
  
  const [mainSidebarWidth, setMainSidebarWidthState] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("main-sidebar-width")
      return saved ? parseInt(saved) : 288
    }
    return 288
  })
  
  const [mainSidebarCollapsed, setMainSidebarCollapsedState] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("main-sidebar-collapsed")
      return saved === "true"
    }
    return false
  })
  
  const [settingsSidebarWidth, setSettingsSidebarWidthState] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("settings-sidebar-width")
      return saved ? parseInt(saved) : 280
    }
    return 280
  })
  
  const [settingsSidebarCollapsed, setSettingsSidebarCollapsedState] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("settings-sidebar-collapsed")
      return saved === "true"
    }
    return false
  })
  
  const [mounted] = useState(true)

  useEffect(() => {
    const root = document.documentElement
    
    if (mode === "system") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      if (prefersDark) {
        root.classList.add("dark")
      } else {
        root.classList.remove("dark")
      }
    } else if (mode === "dark") {
      root.classList.add("dark")
    } else {
      root.classList.remove("dark")
    }

    document.documentElement.setAttribute("lang", currentLanguage.code)
    document.documentElement.setAttribute("dir", currentLanguage.direction)

    applyTheme(currentTheme)
    applyFont(currentFont.family)
    
    if (currentFont.category !== "universal" && currentFont.url) {
      loadGoogleFont(currentFont.name)
    }
  }, [mode, currentLanguage.code, currentLanguage.direction, currentTheme, currentFont.family, currentFont.category, currentFont.url, currentFont.name])

  useEffect(() => {
    if (currentTheme && mounted) {
      applyTheme(currentTheme)
    }
  }, [currentTheme, mounted])

  useEffect(() => {
    if (currentFont && mounted) {
      applyFont(currentFont.family)
      if (currentFont.url) {
        loadGoogleFont(currentFont.family)
      }
    }
  }, [currentFont, mounted])

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

  const setTheme = (id: string) => {
    const theme = getThemeById(id)
    if (theme) {
      setThemeIdState(id)
      setCurrentThemeState(theme)
      applyTheme(theme)
      localStorage.setItem("theme-id", id)
    }
  }

  const setMode = (newMode: "light" | "dark" | "system") => {
    console.log("Setting mode to:", newMode)
    setModeState(newMode)
    localStorage.setItem("theme-mode", newMode)
    
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
        themeId,
        theme: themeId,
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
