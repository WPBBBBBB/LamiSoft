"use client";
import { useState, useEffect } from "react"
import { PermissionGuard } from "@/components/permission-guard"
import { useRouter } from "next/navigation"
import { useSettings } from "@/components/providers/settings-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Eye, EyeOff, Save } from "lucide-react"
import { toast } from "sonner"
import { t } from "@/lib/translations"

interface WhatsAppSettings {
  id?: string
  api_key: string
  per_message_base_delay_ms: number
  per_message_jitter_ms: number
  batch_size: number
  batch_pause_ms: number
  normal_message_title: string
  normal_message_body: string
  notification_message_title: string
  notification_message_body: string
  auto_send_enabled: boolean
}

export default function WhatsAppSettingsPage() {
  const router = useRouter()
  const { currentLanguage } = useSettings()
  const lang = currentLanguage.code

  const [showApiKey, setShowApiKey] = useState(false)
  const [activeTab, setActiveTab] = useState("notifications")

  const [settings, setSettings] = useState<WhatsAppSettings>(() => ({
    api_key: "",
    per_message_base_delay_ms: 3000,
    per_message_jitter_ms: 100,
    batch_size: 5,
    batch_pause_ms: 6000,
    normal_message_title: t("whatsappDefaultNormalTitle", lang),
    normal_message_body: t("whatsappDefaultNormalBody", lang),
    notification_message_title: t("whatsappDefaultNotificationTitle", lang),
    notification_message_body: t("whatsappDefaultNotificationBody", lang),
    auto_send_enabled: true,
  }))

  const [originalSettings, setOriginalSettings] = useState<WhatsAppSettings>(() => ({
    api_key: "",
    per_message_base_delay_ms: 3000,
    per_message_jitter_ms: 100,
    batch_size: 5,
    batch_pause_ms: 6000,
    normal_message_title: t("whatsappDefaultNormalTitle", lang),
    normal_message_body: t("whatsappDefaultNormalBody", lang),
    notification_message_title: t("whatsappDefaultNotificationTitle", lang),
    notification_message_body: t("whatsappDefaultNotificationBody", lang),
    auto_send_enabled: true,
  }))
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadSettings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadSettings() {
    try {
      setIsLoading(true)
      const response = await fetch('/api/whatsapp-settings')
      if (response.ok) {
        const data = await response.json()
        const normalizedData = {
          ...data,
          api_key: data.api_key || ""
        }
        setSettings(normalizedData)
        setOriginalSettings(normalizedData)
      } else {
        toast.error(t("whatsappSettingsLoadFailed", lang))
      }
    } catch (error) {
      toast.error(t("whatsappSettingsLoadError", lang))
    } finally {
      setIsLoading(false)
    }
  }

  function handleSettingChange(key: keyof WhatsAppSettings, value: string | number) {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }))
  }

  function hasChanges(): boolean {
    return JSON.stringify(settings) !== JSON.stringify(originalSettings)
  }

  async function handleSave() {
    await saveSettings(settings)
  }

  async function saveSettings(settingsToSave: WhatsAppSettings) {
    try {
      const savedUser = localStorage.getItem('currentUser')
      let username = 'user'
      let fullName = 'user'
      
      if (savedUser) {
        const user = JSON.parse(savedUser)
        username = user.username || 'user'
        fullName = user.full_name || user.fullName || user.name || username
      }

      const response = await fetch('/api/whatsapp-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          settings: {
            api_key: settingsToSave.api_key,
            per_message_base_delay_ms: settingsToSave.per_message_base_delay_ms,
            per_message_jitter_ms: settingsToSave.per_message_jitter_ms,
            batch_size: settingsToSave.batch_size,
            batch_pause_ms: settingsToSave.batch_pause_ms,
            normal_message_title: settingsToSave.normal_message_title,
            normal_message_body: settingsToSave.normal_message_body,
            notification_message_title: settingsToSave.notification_message_title,
            notification_message_body: settingsToSave.notification_message_body,
            auto_send_enabled: settingsToSave.auto_send_enabled,
          },
          updatedBy: username,
          fullName: fullName,
        }),
      })

      if (response.ok) {
        const updatedData = await response.json()
        setSettings({ ...settingsToSave, ...updatedData })
        setOriginalSettings({ ...settingsToSave, ...updatedData })
        toast.success(t("whatsappSettingsSaveSuccess", lang))
      } else {
        toast.error(t("whatsappSettingsSaveFailed", lang))
      }
    } catch (error) {
      toast.error(t("whatsappSettingsSaveError", lang))
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">{t("loading", lang)}</div>
      </div>
    )
  }

  return (
    <PermissionGuard requiredRole="مدير">
    <div className="h-full p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{t("whatsappService", lang)}</h1>
        <p className="text-muted-foreground mt-2">
          {t("whatsappServiceDescription", lang)}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-6">{t("whatsappConfigureSettings", lang)}</h2>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="apiKey">{t("whatsappServiceApiKey", lang)}</Label>
              <div className="flex gap-2">
                <Input
                  id="apiKey"
                  type={showApiKey ? "text" : "password"}
                  value={settings.api_key || ""}
                  onChange={(e) => handleSettingChange('api_key', e.target.value)}
                  className="font-mono"
                  placeholder={t("whatsappApiKeyPlaceholder", lang)}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="baseDelay">{t("whatsappBaseDelayLabel", lang)}</Label>
              <Input
                id="baseDelay"
                type="number"
                min={3000}
                max={15000}
                value={settings.per_message_base_delay_ms}
                onChange={(e) => handleSettingChange('per_message_base_delay_ms', parseInt(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">{t("whatsappBaseDelayHelp", lang)}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="jitter">{t("whatsappJitterLabel", lang)}</Label>
              <Input
                id="jitter"
                type="number"
                min={100}
                max={2000}
                value={settings.per_message_jitter_ms}
                onChange={(e) => handleSettingChange('per_message_jitter_ms', parseInt(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">{t("whatsappJitterHelp", lang)}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="batchSize">{t("whatsappBatchSizeLabel", lang)}</Label>
              <Input
                id="batchSize"
                type="number"
                min={5}
                max={50}
                value={settings.batch_size}
                onChange={(e) => handleSettingChange('batch_size', parseInt(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">{t("whatsappBatchSizeHelp", lang)}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="batchPause">{t("whatsappBatchPauseLabel", lang)}</Label>
              <Input
                id="batchPause"
                type="number"
                min={6000}
                max={2000000}
                value={settings.batch_pause_ms}
                onChange={(e) => handleSettingChange('batch_pause_ms', parseInt(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">{t("whatsappBatchPauseHelp", lang)}</p>
            </div>

            <Button
              onClick={handleSave}
              disabled={!hasChanges()}
              className="w-full gap-2"
            >
              <Save className="h-4 w-4" />
              {hasChanges() ? t("saveChanges", lang) : t("save", lang)}
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-6">{t("whatsappMessageStructure", lang)}</h2>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="notifications">{t("whatsappNotificationsMessages", lang)}</TabsTrigger>
              <TabsTrigger value="normal">{t("whatsappNormalMessages", lang)}</TabsTrigger>
            </TabsList>
            
            <TabsContent value="notifications" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-base font-semibold">{t("whatsappMessageTitleLabel", lang)}</Label>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {settings.notification_message_title}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label className="text-base font-semibold">{t("whatsappMessageBodyLabel", lang)}</Label>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {settings.notification_message_body}
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="normal" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-base font-semibold">{t("whatsappMessageTitleLabel", lang)}</Label>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {settings.normal_message_title}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label className="text-base font-semibold">{t("whatsappMessageBodyLabel", lang)}</Label>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {settings.normal_message_body}
                </p>
              </div>
            </TabsContent>
          </Tabs>
          
          <Button
            variant="outline"
            className="w-full mt-6"
            onClick={() => router.push(`/settings/whatsapp/edit-message?type=${activeTab === "notifications" ? "notification" : "normal"}`)}
          >
            {t("whatsappEditTemplate", lang)}
          </Button>
        </Card>
      </div>
    </div>
    </PermissionGuard>
  )
}