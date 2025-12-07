"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useSettings } from "@/components/providers/settings-provider"
import { languages } from "@/lib/i18n"
import { Check, Globe } from "lucide-react"
import { cn } from "@/lib/utils"

export default function LanguagePage() {
  const { currentLanguage, setLanguage } = useSettings()

  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold mb-2" style={{ color: "var(--theme-primary)" }}>اللغات</h1>
        <p className="text-muted-foreground">
          اختر لغة التطبيق المفضلة لديك
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            اللغة المتاحة
          </CardTitle>
          <CardDescription>
            يدعم التطبيق 7 لغات مختلفة
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {languages.map((lang) => (
              <Button
                key={lang.code}
                variant={currentLanguage.code === lang.code ? "default" : "outline"}
                className={cn(
                  "h-20 flex-col gap-2 transition-all relative",
                  currentLanguage.code === lang.code && "ring-2 ring-primary"
                )}
                onClick={() => setLanguage(lang.code)}
              >
                {currentLanguage.code === lang.code && (
                  <Check className="h-4 w-4 absolute top-2 right-2" />
                )}
                <span className="text-lg font-semibold">{lang.nativeName}</span>
                <span className="text-xs text-muted-foreground">{lang.name}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>اللغة الحالية</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="text-lg font-semibold">{currentLanguage.nativeName}</div>
                <div className="text-sm text-muted-foreground">{currentLanguage.name}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">الاتجاه</div>
                <div className="text-sm text-muted-foreground">
                  {currentLanguage.direction === "rtl" ? "من اليمين إلى اليسار" : "من اليسار إلى اليمين"}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/50 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-primary">ملاحظة مهمة</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            عند تغيير اللغة، سيتم تطبيق التغييرات فوراً على جميع عناصر الواجهة.
            سيتم حفظ اختيارك تلقائياً وسيبقى مفعلاً في الزيارات القادمة.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
