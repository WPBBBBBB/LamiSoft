"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSettings } from "@/components/providers/settings-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Save, User, Calendar, DollarSign, Clock, Building2, CreditCard, ArrowRight } from "lucide-react"
import { toast } from "sonner"
import { t } from "@/lib/translations"

export default function EditMessagePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { currentLanguage } = useSettings()
  const lang = currentLanguage.code
  const type = searchParams.get("type") as "normal" | "notification" || "normal"
  
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const variables = [
    { labelKey: "whatsappVarCustomerName", code: "{CustomerName}", icon: User },
    { labelKey: "whatsappVarLastPaymentDate", code: "{LastPaymentDate}", icon: Calendar },
    { labelKey: "whatsappVarLastAmount", code: "{LastAmount}", icon: DollarSign },
    { labelKey: "whatsappVarRemainingBalance", code: "{RemainingBalance}", icon: CreditCard },
    { labelKey: "whatsappVarCurrentDate", code: "{CurrentDate}", icon: Calendar },
    { labelKey: "whatsappVarCurrentTime", code: "{CurrentTime}", icon: Clock },
    { labelKey: "whatsappVarCompanyName", code: "{CompanyName}", icon: Building2 },
  ]

  useEffect(() => {
    loadCurrentTemplate()
  }, [])

  async function loadCurrentTemplate() {
    try {
      const response = await fetch("/api/whatsapp-settings")
      if (response.ok) {
        const data = await response.json()
        if (type === "normal") {
          setTitle(data.normal_message_title || "")
          setBody(data.normal_message_body || "")
        } else {
          setTitle(data.notification_message_title || "")
          setBody(data.notification_message_body || "")
        }
      }
    } catch (error) {
      toast.error(t("whatsappDataLoadFailed", lang))
    } finally {
      setIsLoading(false)
    }
  }

  function insertVariable(code: string) {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const newBody = body.substring(0, start) + code + body.substring(end)
    
    setBody(newBody)
    
    setTimeout(() => {
      textarea.focus()
      const newPosition = start + code.length
      textarea.setSelectionRange(newPosition, newPosition)
    }, 0)
  }

  async function handleSave() {
    if (!title.trim()) {
      toast.error(t("whatsappTemplateTitleRequired", lang))
      return
    }

    if (!body.trim()) {
      toast.error(t("whatsappTemplateBodyRequired", lang))
      return
    }

    try {
      const savedUser = localStorage.getItem('currentUser')
      let username = 'user'
      let fullName = 'user'
      
      if (savedUser) {
        const user = JSON.parse(savedUser)
        username = user.username || 'user'
        fullName = user.full_name || user.fullName || user.name || username
      }

      const currentResponse = await fetch("/api/whatsapp-settings")
      const currentSettings = await currentResponse.json()

      const { apiKey, ...settingsWithoutApiKey } = currentSettings

      const updatedSettings = {
        ...settingsWithoutApiKey,
        ...(type === "normal"
          ? {
              normal_message_title: title,
              normal_message_body: body,
            }
          : {
              notification_message_title: title,
              notification_message_body: body,
            }),
      }

      const response = await fetch('/api/whatsapp-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          settings: updatedSettings,
          updatedBy: username,
          fullName: fullName,
        }),
      })

      if (response.ok) {
        toast.success(t("whatsappTemplateSaveSuccess", lang))
        router.push("/settings/whatsapp")
      } else {
        const errorData = await response.json()
        toast.error(`${t("whatsappTemplateSaveFailed", lang)}: ${errorData.error || t("unknownError", lang)}`)
      }
    } catch (error) {
      toast.error(`${t("whatsappTemplateSaveFailed", lang)}: ${error instanceof Error ? error.message : t("unknownError", lang)}`)
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
    <div className="h-full p-6">
      {}
      <div className="mb-6 flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.push("/settings/whatsapp")}
        >
          <ArrowRight className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">
            {type === "normal" ? t("whatsappEditNormalTemplateTitle", lang) : t("whatsappEditNotificationTemplateTitle", lang)}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("whatsappEditMessageDescription", lang)}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {}
        <Card className="p-6">
          <div className="space-y-2">
            <Label htmlFor="messageTitle" className="text-base font-semibold">
              {t("whatsappMessageTitleLabel", lang)}
            </Label>
            <Input
              id="messageTitle"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("whatsappMessageTitlePlaceholder", lang)}
              className="text-base"
            />
          </div>
        </Card>

        {}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {}
          <Card className="lg:col-span-2 p-6">
            <div className="space-y-2">
              <Label htmlFor="messageBody" className="text-base font-semibold">
                {t("whatsappMessageBodyLabel", lang)}
              </Label>
              <Textarea
                id="messageBody"
                ref={textareaRef}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={t("whatsappMessageBodyPlaceholder", lang)}
                className="min-h-[400px] text-base"
                dir="rtl"
              />
              <p className="text-xs text-muted-foreground">
                {t("whatsappMessageBodyHint", lang)}
              </p>
            </div>
          </Card>

          {}
          <Card className="p-6">
            <h3 className="text-base font-semibold mb-3">{t("whatsappAvailableVariables", lang)}</h3>
            <p className="text-xs text-muted-foreground mb-4">
              {t("whatsappClickVariableToInsert", lang)}
            </p>
            <div className="space-y-2">
              {variables.map((variable) => (
                <Button
                  key={variable.code}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-sm gap-2"
                  onClick={() => insertVariable(variable.code)}
                >
                  <variable.icon className="h-4 w-4" />
                  {t(variable.labelKey, lang)}
                </Button>
              ))}
            </div>

            <div className="mt-6 p-3 bg-muted rounded text-xs">
              <p className="font-semibold mb-2">{t("whatsappExampleLabel", lang)}</p>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {t("whatsappExampleText", lang)}
              </p>
            </div>
          </Card>
        </div>

        {}
        <Card className="p-6 bg-muted/50">
          <h3 className="text-base font-semibold mb-4">{t("whatsappMessagePreview", lang)}</h3>
          <div className="space-y-3">
            <div>
              <span className="text-sm text-muted-foreground">{t("whatsappPreviewTitle", lang)}</span>
              <p className="font-semibold text-lg mt-1">{title || "---"}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">{t("whatsappPreviewBody", lang)}</span>
              <p className="whitespace-pre-wrap mt-1">{body || "---"}</p>
            </div>
          </div>
        </Card>

        {}
        <div className="flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={() => router.push("/settings/whatsapp")}
          >
            {t("cancel", lang)}
          </Button>
          <Button
            onClick={handleSave}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {t("saveChanges", lang)}
          </Button>
        </div>
      </div>
    </div>
  )
}
