"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Save, Eye, RotateCcw } from "lucide-react"
import { toast } from "sonner"

interface PrintSettings {
  storeName: string
  storeSubtitle: string
  contactInfo: string
  footer: string
}

const defaultSettings: PrintSettings = {
  storeName: "شركة الميسر",
  storeSubtitle: "للمطابخ الحديثة والديكورات وتجارة الأثاث والأكسسوارات",
  contactInfo: "للتواصل: 07XX XXX XXXX - العراق/بغداد - كرادة داخل - قرب النفق - كوت-نابي المصلى",
  footer: "شكراً لتعاملكم معنا - نتمنى لكم تجربة ممتعة"
}

export default function PrintSettingsPage() {
  const [settings, setSettings] = useState<PrintSettings>(defaultSettings)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem("printSettings")
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings))
      }
    } catch (error) {
      console.error("Error loading print settings:", error)
    }
  }, [])

  const handleSave = () => {
    setIsSaving(true)
    try {
      localStorage.setItem("printSettings", JSON.stringify(settings))
      toast.success("تم حفظ إعدادات الطباعة بنجاح")
    } catch (error) {
      console.error("Error saving print settings:", error)
      toast.error("فشل حفظ الإعدادات")
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    setSettings(defaultSettings)
    localStorage.removeItem("printSettings")
    toast.success("تم إعادة تعيين الإعدادات للقيم الافتراضية")
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">إعدادات الطباعة</h1>
        <p className="text-muted-foreground">
          قم بتخصيص معلومات المتجر التي ستظهر في الفواتير المطبوعة
        </p>
      </div>

      <div className="space-y-6">
        {/* نموذج الإدخال */}
        <Card className="p-6 space-y-6 w-full">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Save className="h-5 w-5" />
              معلومات المتجر
            </h2>
          </div>

          <div className="space-y-4">
            {/* اسم المتجر */}
            <div className="space-y-2">
              <Label htmlFor="storeName" className="text-base">
                اسم المتجر / العنوان الرئيسي
              </Label>
              <Input
                id="storeName"
                value={settings.storeName}
                onChange={(e) => setSettings({ ...settings, storeName: e.target.value })}
                placeholder="مثال: شركة الميسر"
                className="text-lg"
              />
            </div>

            {/* العنوان الثانوي */}
            <div className="space-y-2">
              <Label htmlFor="storeSubtitle" className="text-base">
                العنوان الثانوي / التخصص
              </Label>
              <Input
                id="storeSubtitle"
                value={settings.storeSubtitle}
                onChange={(e) => setSettings({ ...settings, storeSubtitle: e.target.value })}
                placeholder="مثال: للمطابخ الحديثة والديكورات وتجارة الأثاث"
                className="text-sm"
              />
            </div>

            {/* معلومات التواصل */}
            <div className="space-y-2">
              <Label htmlFor="contactInfo" className="text-base">
                رقم الهاتف والعنوان
              </Label>
              <Textarea
                id="contactInfo"
                value={settings.contactInfo}
                onChange={(e) => setSettings({ ...settings, contactInfo: e.target.value })}
                placeholder="مثال: للتواصل: 07XX XXX XXXX - العراق/بغداد - كرادة داخل"
                className="min-h-20 text-sm resize-none"
              />
            </div>

            {/* الفوتر */}
            <div className="space-y-2">
              <Label htmlFor="footer" className="text-base">
                نص التذييل (Footer)
              </Label>
              <Textarea
                id="footer"
                value={settings.footer}
                onChange={(e) => setSettings({ ...settings, footer: e.target.value })}
                placeholder="مثال: شكراً لتعاملكم معنا"
                className="min-h-[60px] text-sm resize-none"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1"
              size="lg"
            >
              <Save className="h-5 w-5 ml-2" />
              {isSaving ? "جاري الحفظ..." : "حفظ الإعدادات"}
            </Button>
            
            <Button
              onClick={handleReset}
              disabled={isSaving}
              variant="outline"
              size="lg"
            >
              <RotateCcw className="h-5 w-5 ml-2" />
              إعادة تعيين
            </Button>
          </div>
        </Card>

        {/* معاينة الطباعة */}
        <Card className="p-6 space-y-4">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Eye className="h-5 w-5" />
              معاينة شكل الطباعة
            </h2>
            <p className="text-sm text-muted-foreground">
              هذه معاينة لكيفية ظهور البيانات في الفاتورة المطبوعة
            </p>
          </div>

          <div className="border rounded-lg bg-white p-8 space-y-6 shadow-sm min-h-[500px]">
            {/* الهيدر */}
            <div className="text-center space-y-2 border-b pb-4">
              <h1 className="text-2xl font-bold text-gray-900">
                {settings.storeName || "اسم المتجر"}
              </h1>
              {settings.storeSubtitle && (
                <p className="text-sm text-gray-600">
                  {settings.storeSubtitle}
                </p>
              )}
              {settings.contactInfo && (
                <p className="text-xs text-gray-500 whitespace-pre-line">
                  {settings.contactInfo}
                </p>
              )}
            </div>

            {/* محتوى مثالي */}
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">رقم الفاتورة:</span>
                <span className="font-semibold">S-00001</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">التاريخ:</span>
                <span className="font-semibold">2025-12-26</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">الزبون:</span>
                <span className="font-semibold">اسم الزبون</span>
              </div>
              
              <div className="border-t pt-4">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-right p-2">المادة</th>
                      <th className="text-center p-2">الكمية</th>
                      <th className="text-right p-2">المجموع</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="p-2">مادة مثالية</td>
                      <td className="text-center p-2">2</td>
                      <td className="text-right p-2">50,000 د.ع</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between font-bold text-lg">
                  <span>المجموع الكلي:</span>
                  <span>50,000 د.ع</span>
                </div>
              </div>
            </div>

            {/* الفوتر */}
            {settings.footer && (
              <div className="border-t pt-4 mt-auto">
                <p className="text-center text-xs text-gray-500 whitespace-pre-line">
                  {settings.footer}
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
