"use client";
export const dynamic = "force-dynamic"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useSettings } from "@/components/providers/settings-provider"
import { themes, type Theme } from "@/lib/themes"
import { t } from "@/lib/translations"
import { Sun, Moon, Monitor, Check, Home, Settings, User, Mail, ShoppingCart, BarChart3, DollarSign, TrendingUp, Search, Plus, Warehouse, PackageOpen, Users, FileText, Wallet, Maximize, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import nextDynamic from "next/dynamic"

const HomePage = nextDynamic(() => import("@/app/home/page"), { ssr: false })
const Header = nextDynamic(() => import("@/components/layout/header"), { ssr: false })
const Sidebar = nextDynamic(() => import("@/components/layout/sidebar"), { ssr: false })

function ThemePreview({
  theme,
  lang,
  onMaximize,
  isFullscreen,
}: {
  theme: Theme
  lang: string
  onMaximize?: () => void
  isFullscreen?: boolean
}) {
  const handleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    const link = target.closest('a')
    const button = target.closest('button')
    
    if (link && link.href) {
      e.preventDefault()
      e.stopPropagation()
      }
    
    if (button && !button.closest('[data-preview-control]')) {
      e.stopPropagation()
    }
  }

  return (
    <div 
      className={cn(
        "overflow-hidden transition-all duration-300 relative",
        isFullscreen ? "w-full h-full" : "rounded-xl border-2 shadow-2xl w-full"
      )}
      style={{ 
        backgroundColor: theme.colors.background,
        color: theme.colors.text,
        borderColor: !isFullscreen ? theme.colors.primary : undefined,
        aspectRatio: !isFullscreen ? '16/11' : undefined,
        minHeight: !isFullscreen ? '500px' : undefined
      }}
      onClick={handleClick}
    >
      <style jsx global>{`
        :root {
          --theme-primary: ${theme.colors.primary};
          --theme-secondary: ${theme.colors.secondary};
          --theme-accent: ${theme.colors.accent};
          --theme-background: ${theme.colors.background};
          --theme-surface: ${theme.colors.surface};
          --theme-text: ${theme.colors.text};
          --theme-border: ${theme.colors.border};
          --theme-success: ${theme.colors.success};
          --theme-warning: ${theme.colors.warning};
          --theme-danger: ${theme.colors.danger};
          --theme-info: ${theme.colors.info};
        }
        .theme-preview-container a,
        .theme-preview-container button:not([data-preview-control]) {
          pointer-events: none !important;
          cursor: default !important;
        }
        .theme-preview-container [data-preview-control] {
          pointer-events: auto !important;
          cursor: pointer !important;
        }
      `}</style>
      <div 
        className={cn("flex theme-preview-container", isFullscreen ? "min-h-screen" : "h-full")}
        style={{
          pointerEvents: 'auto'
        }}
      >
        
        <div className={cn(isFullscreen ? "" : "scale-[0.8] origin-right")}>
          <Sidebar />
        </div>
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-auto">
            <div className={cn("mx-auto", isFullscreen ? "container p-4 sm:p-6" : "p-3")}>
              <div className={isFullscreen ? "" : "scale-[0.7] origin-top-right"}>
                <HomePage />
              </div>
            </div>
          </main>
        </div>
      </div>

      {onMaximize && !isFullscreen && (
        <button
          data-preview-control="true"
          onClick={onMaximize}
          className="absolute bottom-4 right-4 p-2 rounded-lg shadow-lg hover:scale-110 transition-all z-10"
          style={{ 
            backgroundColor: theme.colors.primary,
            color: theme.colors.background
          }}
          title={t('theme_fullscreenPreview', lang)}
        >
          <Maximize className="h-4 w-4" />
        </button>
      )}

      {isFullscreen && (
        <div 
          className="absolute top-4 right-4 z-40 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2"
          style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
          <span className="text-xs font-medium" style={{ color: theme.colors.text }}>
            {t('theme_previewMode', lang)}
          </span>
        </div>
      )}
    </div>
  );
}

function OldThemePreview({ theme }: { theme: Theme }) {
  return (
    <div 
      className="rounded-xl border-2 shadow-2xl overflow-hidden transition-all duration-300 w-full relative"
      style={{ 
        backgroundColor: theme.colors.background,
        color: theme.colors.text,
        borderColor: theme.colors.primary,
        aspectRatio: '16/11',
        minHeight: '500px'
      }}
    >

      <div className="flex h-full">

        <div className="flex-1 flex flex-col">

          <div 
            className="p-4 border-b flex items-center justify-between"
            style={{ 
              backgroundColor: theme.colors.background,
              borderColor: theme.colors.border
            }}
          >
            <div>
              <h2 className="font-bold text-lg" style={{ color: theme.colors.primary }}>
                الرئيسية
              </h2>
              <p className="text-xs opacity-60" style={{ color: theme.colors.text }}>
                مرحباً بك في نظام الإدارة
              </p>
            </div>
            <div className="flex gap-2">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: theme.colors.surface }}
              >
                <Settings className="h-4 w-4" style={{ color: theme.colors.text, opacity: 0.6 }} />
              </div>
            </div>
          </div>

          <div className="flex-1 p-4 space-y-4 overflow-y-auto">

            <div 
              className="rounded-lg p-3 flex items-center gap-2"
              style={{ backgroundColor: theme.colors.surface }}
            >
              <Search className="h-4 w-4" style={{ color: theme.colors.text, opacity: 0.4 }} />
              <div className="h-2 rounded-full flex-1" style={{ backgroundColor: theme.colors.text, opacity: 0.1 }} />
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: ShoppingCart, label: 'المبيعات', value: '1.2K', color: theme.colors.success },
                { icon: DollarSign, label: 'الإيرادات', value: '850', color: theme.colors.info },
                { icon: TrendingUp, label: 'النمو', value: '+15%', color: theme.colors.warning }
              ].map((stat, i) => (
                <div 
                  key={i}
                  className="rounded-lg p-3 shadow-sm"
                  style={{ backgroundColor: theme.colors.surface }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: stat.color, opacity: 0.2 }}
                    >
                      <stat.icon className="h-4 w-4" style={{ color: stat.color }} />
                    </div>
                  </div>
                  <div className="text-xs opacity-60 mb-1" style={{ color: theme.colors.text }}>
                    {stat.label}
                  </div>
                  <div className="text-base font-bold" style={{ color: theme.colors.text }}>
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <div className="text-xs font-medium opacity-60 mb-2" style={{ color: theme.colors.text }}>
                العمليات الرئيسية
              </div>
              <div className="space-y-2">
                {[
                  { icon: TrendingUp, label: 'إضافة بيع', color: theme.colors.success },
                  { icon: ShoppingCart, label: 'إضافة شراء', color: theme.colors.danger },
                  { icon: Wallet, label: 'الصندوق', color: theme.colors.warning },
                ].map((action, i) => (
                  <button 
                    key={i}
                    className="w-full rounded-lg p-3 flex items-center gap-3 text-sm font-medium transition-all"
                    style={{ 
                      backgroundColor: theme.colors.primary,
                      color: theme.colors.background
                    }}
                  >
                    <action.icon className="h-5 w-5" style={{ color: action.color }} />
                    {action.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-medium opacity-60 mb-2" style={{ color: theme.colors.text }}>
                إدارة المخزون
              </div>
              <div className="space-y-2">
                {[
                  { icon: Warehouse, label: 'المخازن' },
                  { icon: PackageOpen, label: 'نقل بين المخازن' },
                ].map((action, i) => (
                  <button 
                    key={i}
                    className="w-full rounded-lg p-3 flex items-center gap-3 text-sm font-medium transition-all"
                    style={{ 
                      backgroundColor: theme.colors.surface,
                      color: theme.colors.text
                    }}
                  >
                    <action.icon className="h-5 w-5" style={{ color: theme.colors.accent }} />
                    {action.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: Users, label: 'الأشخاص' },
                { icon: FileText, label: 'التقارير' },
              ].map((action, i) => (
                <button 
                  key={i}
                  className="rounded-lg p-3 flex flex-col items-center gap-2 text-xs font-medium transition-all"
                  style={{ 
                    backgroundColor: theme.colors.surface,
                    color: theme.colors.text
                  }}
                >
                  <action.icon className="h-5 w-5" style={{ color: theme.colors.info }} />
                  {action.label}
                </button>
              ))}
            </div>

            <div 
              className="rounded-xl p-4 shadow-sm"
              style={{ backgroundColor: theme.colors.surface }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Mail className="h-5 w-5" style={{ color: theme.colors.accent }} />
                <span className="font-semibold text-sm" style={{ color: theme.colors.text }}>
                  الإشعارات
                </span>
              </div>
              <div className="space-y-2">
                {[1, 2].map((_, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="h-2 rounded-full w-full" style={{ backgroundColor: theme.colors.text, opacity: 0.15 }} />
                    <div className="h-2 rounded-full w-2/3" style={{ backgroundColor: theme.colors.text, opacity: 0.1 }} />
                  </div>
                ))}
              </div>
            </div>

            <div 
              className="rounded-xl p-4 shadow-sm"
              style={{ backgroundColor: theme.colors.surface }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold" style={{ color: theme.colors.text }}>
                  التقدم اليومي
                </span>
                <span className="text-xs font-medium" style={{ color: theme.colors.accent }}>
                  65%
                </span>
              </div>
              <div 
                className="h-2 rounded-full overflow-hidden"
                style={{ backgroundColor: theme.colors.text, opacity: 0.1 }}
              >
                <div 
                  className="h-full rounded-full"
                  style={{ 
                    backgroundColor: theme.colors.accent,
                    width: '65%'
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div 
          className="w-16 flex flex-col border-r"
          style={{ 
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border
          }}
        >

          <div className="p-3 border-b" style={{ borderColor: theme.colors.border }}>
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
              style={{ backgroundColor: theme.colors.primary }}
            >
              <span className="text-xs font-bold" style={{ color: theme.colors.background }}>AL</span>
            </div>
          </div>

          <div className="flex-1 py-4 space-y-2">
            {[
              { icon: Home, active: true },
              { icon: ShoppingCart, active: false },
              { icon: BarChart3, active: false },
              { icon: Settings, active: false },
            ].map((item, i) => (
              <div 
                key={i}
                className="flex justify-center"
              >
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center transition-all"
                  style={{ 
                    backgroundColor: item.active ? theme.colors.primary : 'transparent',
                  }}
                >
                  <item.icon 
                    className="h-5 w-5" 
                    style={{ 
                      color: item.active ? theme.colors.background : theme.colors.text,
                      opacity: item.active ? 1 : 0.4
                    }} 
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 border-t" style={{ borderColor: theme.colors.border }}>
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: theme.colors.accent }}
            >
              <User className="h-5 w-5" style={{ color: theme.colors.background }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AppearancePage() {
  const { currentTheme, setTheme, mode, setMode, currentLanguage } = useSettings()
  const [previewTheme, setPreviewTheme] = useState<Theme>(currentTheme)
  const [isFullscreenPreview, setIsFullscreenPreview] = useState(false)

  const themeLabel = (theme: Theme) => {
    const key = `theme_${theme.id}`
    const translated = t(key, currentLanguage.code)
    return translated === key ? theme.name : translated
  }

  const modes = [
    { value: "light", label: t('lightMode', currentLanguage.code), icon: Sun },
    { value: "dark", label: t('darkMode', currentLanguage.code), icon: Moon },
    { value: "system", label: t('systemMode', currentLanguage.code), icon: Monitor },
  ] as const

  const handleThemeHover = (theme: Theme) => {
    setPreviewTheme(theme)
  }

  const handleThemeClick = (theme: Theme) => {
    setTheme(theme.id)
    setPreviewTheme(theme)
  }

  return (
    <div className="space-y-6 sm:space-y-8 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: "var(--theme-primary)" }}>{t('appearance', currentLanguage.code)}</h1>
        <p className="text-muted-foreground">
          {t('customizeAppearanceDescription', currentLanguage.code)}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('basicMode', currentLanguage.code)}</CardTitle>
          <CardDescription>{t('basicModeDescription', currentLanguage.code)}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {modes.map((m) => (
              <Button
                key={m.value}
                variant={mode === m.value ? "default" : "outline"}
                className={cn(
                  "h-20 sm:h-24 flex-col gap-2 transition-all",
                  mode === m.value && "ring-2 ring-primary"
                )}
                onClick={() => setMode(m.value)}
              >
                <m.icon className="h-5 w-5 sm:h-6 sm:w-6" />
                <span>{m.label}</span>
                {mode === m.value && <Check className="h-4 w-4 absolute top-2 right-2" />}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('coloredThemes', currentLanguage.code)}</CardTitle>
          <CardDescription>{t('coloredThemesDescription', currentLanguage.code).replace('{count}', themes.length.toString())}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-4 sm:gap-6">

            <div className="order-2 lg:order-1">
              <ScrollArea className="h-[400px] sm:h-[500px] pr-2 sm:pr-4">
                <div className="space-y-2">
                  {themes.map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => handleThemeClick(theme)}
                      onMouseEnter={() => handleThemeHover(theme)}
                      className={cn(
                        "w-full text-right rounded-lg border-2 p-4 transition-all hover:scale-[1.02]",
                        currentTheme.id === theme.id
                          ? "border-primary bg-primary/5 ring-2 ring-primary ring-offset-2"
                          : "border-border hover:border-primary/50 hover:bg-accent/5"
                      )}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold">{themeLabel(theme)}</span>
                            {currentTheme.id === theme.id && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                          </div>

                          <div className="flex gap-1.5">
                            <div
                              className="w-6 h-6 rounded border"
                              style={{ backgroundColor: theme.colors.primary }}
                              title={t('primaryColor', currentLanguage.code)}
                            />
                            <div
                              className="w-6 h-6 rounded border"
                              style={{ backgroundColor: theme.colors.secondary }}
                              title={t('secondaryColor', currentLanguage.code)}
                            />
                            <div
                              className="w-6 h-6 rounded border"
                              style={{ backgroundColor: theme.colors.accent }}
                              title={t('accentColor', currentLanguage.code)}
                            />
                            <div
                              className="w-6 h-6 rounded border"
                              style={{ backgroundColor: theme.colors.background }}
                              title={t('backgroundColor', currentLanguage.code)}
                            />
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <div className="order-1 lg:order-2">
              <div className="sticky top-4 sm:top-8">
                <h3 className="text-sm font-medium mb-2 sm:mb-3 text-muted-foreground">{t('themePreview', currentLanguage.code)}</h3>
                <ThemePreview theme={previewTheme} lang={currentLanguage.code} onMaximize={() => setIsFullscreenPreview(true)} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('currentTheme', currentLanguage.code)}</CardTitle>
          <CardDescription>{t('currentThemeInfo', currentLanguage.code)}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">{themeLabel(currentTheme)}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {Object.entries(currentTheme.colors).map(([key, value]) => {
                  const colorNames: Record<string, string> = {
                    primary: t('primaryColor', currentLanguage.code),
                    secondary: t('secondaryColor', currentLanguage.code),
                    accent: t('accentColor', currentLanguage.code),
                    background: t('backgroundColor', currentLanguage.code),
                    surface: t('surfaceColor', currentLanguage.code),
                    text: t('textColor', currentLanguage.code),
                    border: t('borderColor', currentLanguage.code),
                    success: t('successColor', currentLanguage.code),
                    warning: t('warningColor', currentLanguage.code),
                    danger: t('dangerColor', currentLanguage.code),
                    info: t('infoColor', currentLanguage.code),
                  }
                  return (
                  <div key={key} className="space-y-1.5 sm:space-y-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded border shrink-0"
                        style={{ backgroundColor: value }}
                      />
                      <div className="text-xs sm:text-sm min-w-0">
                        <div className="font-medium truncate">{colorNames[key] || key}</div>
                        <div className="text-muted-foreground text-[10px] sm:text-xs font-mono truncate">{value}</div>
                      </div>
                    </div>
                  </div>
                )})
                }
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {isFullscreenPreview && (
        <div 
          className="fixed inset-0 z-9999 flex items-center justify-center overflow-hidden"
          style={{
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsFullscreenPreview(false)
            }
          }}
        >

          <button
            data-preview-control="true"
            onClick={() => setIsFullscreenPreview(false)}
            className="fixed top-4 left-4 z-10000 p-3 sm:p-4 rounded-full shadow-2xl hover:scale-110 transition-all"
            style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <ArrowRight className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: previewTheme.colors.primary }} />
          </button>

          <button
            data-preview-control="true"
            onClick={() => setIsFullscreenPreview(false)}
            className="fixed bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 z-10000 px-4 py-2 sm:px-6 sm:py-3 rounded-full shadow-2xl hover:scale-110 transition-all flex items-center gap-2"
            style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: previewTheme.colors.primary }} />
            <span className="text-xs sm:text-sm font-medium" style={{ color: previewTheme.colors.primary }}>
              {t('theme_minimizePreview', currentLanguage.code)}
            </span>
          </button>

          <div className="w-full h-full overflow-auto p-4">
            <div className="max-w-[1920px] mx-auto h-full">
              <ThemePreview theme={previewTheme} lang={currentLanguage.code} isFullscreen={true} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
