"use client";
import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Save, Eye, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { useSettings } from "@/components/providers/settings-provider"
import { t } from "@/lib/translations"

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
  const { currentLanguage } = useSettings()
  const lang = currentLanguage.code

  const [settings, setSettings] = useState<PrintSettings>(defaultSettings)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem("printSettings")
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings))
      }
    } catch (error) {
    }
  }, [])

  const handleSave = () => {
    setIsSaving(true)
    try {
      localStorage.setItem("printSettings", JSON.stringify(settings))
      toast.success(t('printSettingsSaveSuccess', lang))
    } catch (error) {
      toast.error(t('printSettingsSaveError', lang))
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    setSettings(defaultSettings)
    localStorage.removeItem("printSettings")
    toast.success(t('printSettingsResetSuccess', lang))
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">{t('printSettings', lang)}</h1>
        <p className="text-muted-foreground">
          {t('printSettingsDescription', lang)}
        </p>
      </div>
      <div className="space-y-6">

        <Card className="p-6 space-y-6 w-full">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Save className="h-5 w-5" />
              {t('storeInformation', lang)}
            </h2>
          </div>

          <div className="space-y-4">

            <div className="space-y-2">
              <Label htmlFor="storeName" className="text-base">
                {t('storeNameMainLabel', lang)}
              </Label>
              <Input
                id="storeName"
                value={settings.storeName}
                onChange={(e) => setSettings({ ...settings, storeName: e.target.value })}
                placeholder={t('storeNamePlaceholder', lang)}
                className="text-lg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="storeSubtitle" className="text-base">
                {t('storeSubtitleLabel', lang)}
              </Label>
              <Input
                id="storeSubtitle"
                value={settings.storeSubtitle}
                onChange={(e) => setSettings({ ...settings, storeSubtitle: e.target.value })}
                placeholder={t('storeSubtitlePlaceholder', lang)}
                className="text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactInfo" className="text-base">
                {t('storeContactLabel', lang)}
              </Label>
              <Textarea
                id="contactInfo"
                value={settings.contactInfo}
                onChange={(e) => setSettings({ ...settings, contactInfo: e.target.value })}
                placeholder={t('storeContactPlaceholder', lang)}
                className="min-h-20 text-sm resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="footer" className="text-base">
                {t('storeFooterLabel', lang)}
              </Label>
              <Textarea
                id="footer"
                value={settings.footer}
                onChange={(e) => setSettings({ ...settings, footer: e.target.value })}
                placeholder={t('storeFooterPlaceholder', lang)}
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
              {isSaving ? t('saving', lang) : t('saveSettings', lang)}
            </Button>
            
            <Button
              onClick={handleReset}
              disabled={isSaving}
              variant="outline"
              size="lg"
            >
              <RotateCcw className="h-5 w-5 ml-2" />
              {t('reset', lang)}
            </Button>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Eye className="h-5 w-5" />
              {t('printPreview', lang)}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t('printPreviewDescription', lang)}
            </p>
          </div>

          <div className="border rounded-lg bg-white p-8 space-y-6 shadow-sm min-h-[500px]">

            <div className="text-center space-y-2 border-b pb-4">
              <h1 className="text-2xl font-bold text-gray-900">
                {settings.storeName || t('storeNameFallback', lang)}
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

            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('invoiceNumber', lang)}:</span>
                <span className="font-semibold">S-00001</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('invoiceDate', lang)}:</span>
                <span className="font-semibold">2025-12-26</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('invoiceCustomer', lang)}:</span>
                <span className="font-semibold">{t('sampleCustomerName', lang)}</span>
              </div>
              
              <div className="border-t pt-4">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-right p-2">{t('invoiceItem', lang)}</th>
                      <th className="text-center p-2">{t('invoiceQuantity', lang)}</th>
                      <th className="text-right p-2">{t('invoiceTotal', lang)}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="p-2">{t('sampleItemName', lang)}</td>
                      <td className="text-center p-2">2</td>
                      <td className="text-right p-2">50,000 {t('currencyIQDAbbrev', lang)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between font-bold text-lg">
                  <span>{t('invoiceGrandTotal', lang)}:</span>
                  <span>50,000 {t('currencyIQDAbbrev', lang)}</span>
                </div>
              </div>
            </div>

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
  );
}
