"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useSettings } from "@/components/providers/settings-provider"
import { fonts } from "@/lib/fonts"
import { Check, Type } from "lucide-react"
import { cn } from "@/lib/utils"

export default function FontsPage() {
  const { currentFont, setFont } = useSettings()

  const arabicFonts = fonts.filter((f) => f.category === "arabic")
  const latinFonts = fonts.filter((f) => f.category === "latin")
  const universalFonts = fonts.filter((f) => f.category === "universal")

  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold mb-2" style={{ color: "var(--theme-primary)" }}>الخطوط</h1>
        <p className="text-muted-foreground">
          اختر الخط المفضل لديك لتطبيقه على جميع عناصر الواجهة
        </p>
      </div>

      {/* Arabic Fonts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Type className="h-5 w-5" />
            الخطوط العربية
          </CardTitle>
          <CardDescription>خطوط مصممة خصيصاً للنصوص العربية</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {arabicFonts.map((font) => (
              <button
                key={font.id}
                onClick={() => setFont(font.id)}
                className={cn(
                  "relative text-right p-4 rounded-lg border-2 transition-all hover:scale-[1.02]",
                  currentFont.id === font.id
                    ? "border-primary ring-2 ring-primary ring-offset-2"
                    : "border-border hover:border-primary/50"
                )}
              >
                {currentFont.id === font.id && (
                  <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                    <Check className="h-4 w-4" />
                  </div>
                )}
                <div className="space-y-2">
                  <div className="font-semibold text-sm">{font.name}</div>
                  <div
                    className="text-2xl py-2"
                    style={{ fontFamily: font.family }}
                  >
                    مرحباً بك في لوحة التحكم
                  </div>
                  <div
                    className="text-sm text-muted-foreground"
                    style={{ fontFamily: font.family }}
                  >
                    The quick brown fox jumps over the lazy dog
                  </div>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Latin Fonts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Type className="h-5 w-5" />
            الخطوط اللاتينية
          </CardTitle>
          <CardDescription>خطوط مصممة للنصوص اللاتينية</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {latinFonts.map((font) => (
              <button
                key={font.id}
                onClick={() => setFont(font.id)}
                className={cn(
                  "relative text-right p-4 rounded-lg border-2 transition-all hover:scale-[1.02]",
                  currentFont.id === font.id
                    ? "border-primary ring-2 ring-primary ring-offset-2"
                    : "border-border hover:border-primary/50"
                )}
              >
                {currentFont.id === font.id && (
                  <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                    <Check className="h-4 w-4" />
                  </div>
                )}
                <div className="space-y-2">
                  <div className="font-semibold text-sm">{font.name}</div>
                  <div
                    className="text-2xl py-2"
                    style={{ fontFamily: font.family }}
                  >
                    Welcome to Dashboard
                  </div>
                  <div
                    className="text-sm text-muted-foreground"
                    style={{ fontFamily: font.family }}
                  >
                    The quick brown fox jumps over the lazy dog
                  </div>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Universal Fonts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Type className="h-5 w-5" />
            الخطوط العامة
          </CardTitle>
          <CardDescription>خطوط تدعم جميع اللغات</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {universalFonts.map((font) => (
              <button
                key={font.id}
                onClick={() => setFont(font.id)}
                className={cn(
                  "relative text-right p-4 rounded-lg border-2 transition-all hover:scale-[1.02]",
                  currentFont.id === font.id
                    ? "border-primary ring-2 ring-primary ring-offset-2"
                    : "border-border hover:border-primary/50"
                )}
              >
                {currentFont.id === font.id && (
                  <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                    <Check className="h-4 w-4" />
                  </div>
                )}
                <div className="space-y-2">
                  <div className="font-semibold text-sm">{font.name}</div>
                  <div
                    className="text-2xl py-2"
                    style={{ fontFamily: font.family }}
                  >
                    مرحباً - Welcome - مرحبا
                  </div>
                  <div
                    className="text-sm text-muted-foreground"
                    style={{ fontFamily: font.family }}
                  >
                    The quick brown fox jumps over the lazy dog
                  </div>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Current Font Info */}
      <Card>
        <CardHeader>
          <CardTitle>الخط الحالي</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="text-lg font-semibold mb-1">{currentFont.name}</div>
              <div className="text-sm text-muted-foreground mb-4">
                <Badge variant="secondary">{currentFont.category}</Badge>
              </div>
              <div
                className="text-3xl font-bold mb-2"
                style={{ fontFamily: currentFont.family }}
              >
                مرحباً بك في AL-LamiSoft
              </div>
              <div
                className="text-lg"
                style={{ fontFamily: currentFont.family }}
              >
                Welcome to AL-LamiSoft Dashboard
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
