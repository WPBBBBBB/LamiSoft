"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useSettings } from "@/components/providers/settings-provider"
import { themes, type Theme } from "@/lib/themes"
import { Sun, Moon, Monitor, Check, Home, Settings, User, Mail } from "lucide-react"
import { cn } from "@/lib/utils"

function ThemePreview({ theme }: { theme: Theme }) {
  return (
    <div 
      className="rounded-lg border-2 p-6 h-full flex flex-col gap-4"
      style={{ 
        backgroundColor: theme.colors.background,
        color: theme.colors.text,
        borderColor: theme.colors.primary
      }}
    >
      {/* Header */}
      <div 
        className="rounded-lg p-4 flex items-center justify-between"
        style={{ backgroundColor: theme.colors.surface }}
      >
        <div className="flex items-center gap-2">
          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: theme.colors.primary }}
          >
            <Home className="h-4 w-4" style={{ color: theme.colors.background }} />
          </div>
          <span className="font-bold text-sm">التطبيق</span>
        </div>
        <div className="flex gap-2">
          <div 
            className="w-6 h-6 rounded flex items-center justify-center"
            style={{ backgroundColor: theme.colors.accent }}
          >
            <Settings className="h-3 w-3" style={{ color: theme.colors.background }} />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 space-y-3">
        <div 
          className="rounded-lg p-4"
          style={{ backgroundColor: theme.colors.surface }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div 
              className="w-6 h-6 rounded-full"
              style={{ backgroundColor: theme.colors.primary }}
            />
            <div className="flex-1 h-2 rounded" style={{ backgroundColor: theme.colors.text, opacity: 0.7 }} />
          </div>
          <div className="space-y-1">
            <div className="h-2 rounded w-full" style={{ backgroundColor: theme.colors.text, opacity: 0.3 }} />
            <div className="h-2 rounded w-3/4" style={{ backgroundColor: theme.colors.text, opacity: 0.3 }} />
          </div>
        </div>

        <div className="flex gap-2">
          <div 
            className="flex-1 rounded-lg p-3 text-center text-xs font-medium"
            style={{ 
              backgroundColor: theme.colors.primary,
              color: theme.colors.background
            }}
          >
            زر أساسي
          </div>
          <div 
            className="flex-1 rounded-lg p-3 text-center text-xs font-medium"
            style={{ 
              backgroundColor: theme.colors.accent,
              color: theme.colors.background
            }}
          >
            زر ثانوي
          </div>
        </div>

        <div 
          className="rounded-lg p-3"
          style={{ backgroundColor: theme.colors.surface }}
        >
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4" style={{ color: theme.colors.accent }} />
            <div className="flex-1 h-2 rounded" style={{ backgroundColor: theme.colors.text, opacity: 0.5 }} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div 
        className="rounded-lg p-2 flex justify-around"
        style={{ backgroundColor: theme.colors.surface }}
      >
        {[Home, User, Settings].map((Icon, i) => (
          <div 
            key={i}
            className="w-8 h-8 rounded flex items-center justify-center"
            style={{ 
              backgroundColor: i === 0 ? theme.colors.primary : 'transparent',
              color: i === 0 ? theme.colors.background : theme.colors.text
            }}
          >
            <Icon className="h-4 w-4" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AppearancePage() {
  const { currentTheme, setTheme, mode, setMode } = useSettings()
  const [previewTheme, setPreviewTheme] = useState<Theme>(currentTheme)

  const modes = [
    { value: "light", label: "فاتح", icon: Sun },
    { value: "dark", label: "داكن", icon: Moon },
    { value: "system", label: "النظام", icon: Monitor },
  ] as const

  const handleThemeHover = (theme: Theme) => {
    setPreviewTheme(theme)
  }

  const handleThemeClick = (theme: Theme) => {
    setTheme(theme.id)
    setPreviewTheme(theme)
  }

  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold mb-2" style={{ color: "var(--theme-primary)" }}>المظهر</h1>
        <p className="text-muted-foreground">
          قم بتخصيص مظهر التطبيق. يمكنك اختيار الوضع (فاتح/داكن) أو اختيار ثيم ملون
        </p>
      </div>

      {/* Mode Selection */}
      <Card>
        <CardHeader>
          <CardTitle>الوضع الأساسي</CardTitle>
          <CardDescription>اختر الوضع الافتراضي (فاتح/داكن) - يعمل بشكل مستقل عن الثيمات الملونة</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {modes.map((m) => (
              <Button
                key={m.value}
                variant={mode === m.value ? "default" : "outline"}
                className={cn(
                  "h-24 flex-col gap-2 transition-all",
                  mode === m.value && "ring-2 ring-primary"
                )}
                onClick={() => setMode(m.value)}
              >
                <m.icon className="h-6 w-6" />
                <span>{m.label}</span>
                {mode === m.value && <Check className="h-4 w-4 absolute top-2 right-2" />}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Theme Selection with Preview */}
      <Card>
        <CardHeader>
          <CardTitle>الثيمات الملونة</CardTitle>
          <CardDescription>اختر من بين {themes.length} ثيم احترافي - الثيمات تعمل بشكل مستقل عن الوضع الفاتح/الداكن</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Themes List */}
            <div>
              <ScrollArea className="h-[600px] pr-4">
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
                            <span className="font-semibold">{theme.name}</span>
                            {currentTheme.id === theme.id && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                          </div>
                          
                          {/* Color Swatches */}
                          <div className="flex gap-1.5">
                            <div
                              className="w-6 h-6 rounded border"
                              style={{ backgroundColor: theme.colors.primary }}
                              title="الأساسي"
                            />
                            <div
                              className="w-6 h-6 rounded border"
                              style={{ backgroundColor: theme.colors.secondary }}
                              title="الثانوي"
                            />
                            <div
                              className="w-6 h-6 rounded border"
                              style={{ backgroundColor: theme.colors.accent }}
                              title="التمييز"
                            />
                            <div
                              className="w-6 h-6 rounded border"
                              style={{ backgroundColor: theme.colors.background }}
                              title="الخلفية"
                            />
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Theme Preview */}
            <div className="hidden lg:block">
              <div className="sticky top-8">
                <h3 className="text-sm font-medium mb-3 text-muted-foreground">معاينة الثيم</h3>
                <ThemePreview theme={previewTheme} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Theme Info */}
      <Card>
        <CardHeader>
          <CardTitle>الثيم الحالي</CardTitle>
          <CardDescription>معلومات عن الثيم المفعّل حالياً</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-2">{currentTheme.name}</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(currentTheme.colors).map(([key, value]) => (
                  <div key={key} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-10 h-10 rounded border"
                        style={{ backgroundColor: value }}
                      />
                      <div className="text-sm">
                        <div className="font-medium capitalize">{key}</div>
                        <div className="text-muted-foreground text-xs font-mono">{value}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
