"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Settings, Sun, Moon, Monitor, Languages, Palette, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSettings } from "@/components/providers/settings-provider"
import { themes } from "@/lib/themes"
import { languages } from "@/lib/i18n"
import { t } from "@/lib/translations"

export default function SettingsMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const [showThemes, setShowThemes] = useState(false)
  const { mode, setMode, currentLanguage, setLanguage, currentTheme, setTheme } = useSettings()

  const modes = [
    { value: "light" as const, label: t('lightMode', currentLanguage.code), icon: Sun },
    { value: "dark" as const, label: t('darkMode', currentLanguage.code), icon: Moon },
    { value: "system" as const, label: t('systemMode', currentLanguage.code), icon: Monitor },
  ]

  return (
    <div className="relative">
      {/* Settings Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="relative transition-all duration-200 hover:scale-110"
      >
        <Settings className={`h-5 w-5 transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`} />
      </Button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => {
                setIsOpen(false)
                setShowThemes(false)
              }}
            />

            {/* Menu */}
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="absolute left-0 mt-2 w-80 z-50 rounded-xl border shadow-2xl overflow-hidden"
              style={{
                backgroundColor: 'var(--theme-surface)',
                borderColor: 'var(--theme-border)',
              }}
            >
              {/* Theme Mode Section */}
              <div className="p-4 border-b" style={{ borderColor: 'var(--theme-border)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <Sun className="h-4 w-4" />
                  <span className="font-semibold text-sm">{t('basicMode', currentLanguage.code)}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {modes.map((m) => (
                    <Button
                      key={m.value}
                      variant={mode === m.value ? "default" : "outline"}
                      size="sm"
                      className="relative h-16 flex-col gap-1"
                      onClick={() => setMode(m.value)}
                    >
                      <m.icon className="h-4 w-4" />
                      <span className="text-xs">{m.label}</span>
                      {mode === m.value && (
                        <Check className="h-3 w-3 absolute top-1 right-1" />
                      )}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Language Section */}
              <div className="p-4 border-b" style={{ borderColor: 'var(--theme-border)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <Languages className="h-4 w-4" />
                  <span className="font-semibold text-sm">{t('language', currentLanguage.code)}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {languages.map((lang) => (
                    <Button
                      key={lang.code}
                      variant={currentLanguage.code === lang.code ? "default" : "outline"}
                      size="sm"
                      className="relative h-12"
                      onClick={() => setLanguage(lang.code)}
                    >
                      <span className="text-sm">{lang.name}</span>
                      {currentLanguage.code === lang.code && (
                        <Check className="h-3 w-3 absolute top-1 right-1" />
                      )}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Theme Selection Section */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    <span className="font-semibold text-sm">{t('coloredThemes', currentLanguage.code)}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowThemes(!showThemes)}
                    className="h-7 text-xs"
                  >
                    {showThemes ? t('hide', currentLanguage.code) : `${t('show', currentLanguage.code)} (30)`}
                  </Button>
                </div>

                <AnimatePresence>
                  {showThemes && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="grid grid-cols-5 gap-2 max-h-64 overflow-y-auto py-2">
                        {themes.map((theme) => (
                          <motion.button
                            key={theme.id}
                            onClick={() => {
                              setTheme(theme.id)
                            }}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            className="relative group"
                            title={theme.name}
                          >
                            <div
                              className="w-full aspect-square rounded-lg border-2 transition-all"
                              style={{
                                backgroundColor: theme.colors.background,
                                borderColor: currentTheme.id === theme.id
                                  ? theme.colors.primary
                                  : theme.colors.border || '#e0e0e0',
                                boxShadow: currentTheme.id === theme.id
                                  ? `0 0 0 2px ${theme.colors.primary}40`
                                  : 'none',
                              }}
                            >
                              {/* Color preview split */}
                              <div className="w-full h-full rounded-md overflow-hidden flex">
                                <div
                                  className="w-1/2 h-full"
                                  style={{ backgroundColor: theme.colors.primary }}
                                />
                                <div className="w-1/2 h-full flex flex-col">
                                  <div
                                    className="h-1/2"
                                    style={{ backgroundColor: theme.colors.secondary }}
                                  />
                                  <div
                                    className="h-1/2"
                                    style={{ backgroundColor: theme.colors.accent }}
                                  />
                                </div>
                              </div>

                              {/* Check mark for active theme */}
                              {currentTheme.id === theme.id && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="absolute inset-0 flex items-center justify-center"
                                >
                                  <div
                                    className="w-5 h-5 rounded-full flex items-center justify-center"
                                    style={{ backgroundColor: theme.colors.primary }}
                                  >
                                    <Check className="h-3 w-3" style={{ color: theme.colors.background }} />
                                  </div>
                                </motion.div>
                              )}
                            </div>

                            {/* Tooltip on hover */}
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10"
                                 style={{
                                   backgroundColor: theme.colors.surface,
                                   color: theme.colors.text,
                                   border: `1px solid ${theme.colors.border || '#e0e0e0'}`,
                                 }}>
                              {theme.name}
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {!showThemes && (
                  <div className="flex items-center gap-3 p-3 rounded-lg border" style={{ borderColor: 'var(--theme-border)' }}>
                    <div
                      className="w-12 h-12 rounded-lg border-2 shrink-0"
                      style={{
                        backgroundColor: currentTheme.colors.background,
                        borderColor: currentTheme.colors.primary,
                      }}
                    >
                      <div className="w-full h-full rounded-md overflow-hidden flex">
                        <div
                          className="w-1/2 h-full"
                          style={{ backgroundColor: currentTheme.colors.primary }}
                        />
                        <div className="w-1/2 h-full flex flex-col">
                          <div
                            className="h-1/2"
                            style={{ backgroundColor: currentTheme.colors.secondary }}
                          />
                          <div
                            className="h-1/2"
                            style={{ backgroundColor: currentTheme.colors.accent }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{currentTheme.name}</div>
                      <div className="text-xs opacity-60">{t('currentTheme', currentLanguage.code)}</div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
