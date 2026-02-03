"use client";
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Send, Image as ImageIcon, Megaphone, Eye, FileText, X, RefreshCw, Edit, Upload, Trash2, MessageCircle } from "lucide-react"
import { toast } from "sonner"
import { Textarea } from "@/components/ui/textarea"
import { PermissionGuard } from "@/components/permission-guard"
import { useSettings } from "@/components/providers/settings-provider"
import { t } from "@/lib/translations"

interface Customer {
  id: string
  customer_name: string
  phone_number: string
  last_payment_date: string | null
  last_payment_iqd: number
  last_payment_usd: number
  balanceiqd: number
  balanceusd: number
}

type SendCustomerProgress = {
  customerId: string
  name: string
  phone: string
  status: "pending" | "sending" | "done" | "error"
  success: boolean
  lastError?: string
  totalItems?: number
  doneItems?: number
}

type SendProgressState = {
  phase: "idle" | "preparing" | "sending" | "done" | "error"
  statusText: string
  totalCustomers: number
  doneCustomers: number
  totalSuccess: number
  totalFailed: number
  customers: SendCustomerProgress[]
  totalMessages?: number
  attemptedMessages?: number
}

type WhatsAppDelaySettings = {
  per_message_base_delay_ms: number
  per_message_jitter_ms: number
  batch_size: number
  batch_pause_ms: number
}

const ACCOUNT_PROTECTION_MIN_DELAY_MS = 5200

function safeNumber(value: unknown, fallback = 0) {
  const n = typeof value === "number" ? value : Number(value)
  return Number.isFinite(n) ? n : fallback
}

function getSafeRandomDelayMs(baseDelayMs: number, jitterMs: number): number {
  const base = Math.max(safeNumber(baseDelayMs, 0), ACCOUNT_PROTECTION_MIN_DELAY_MS)
  const jitter = Math.max(safeNumber(jitterMs, 0), 0)
  const effectiveJitter = jitter > 0 ? jitter : 500
  const min = Math.ceil(base)
  const max = Math.floor(base + effectiveJitter)
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return min
  return Math.floor(Math.random() * (max - min + 1)) + min
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function safeReadJson(resp: Response): Promise<unknown | null> {
  try {
    return await resp.json()
  } catch {
    return null
  }
}

function mapStatusLabel(status: SendCustomerProgress["status"], lang: string) {
  switch (status) {
    case "pending":
      return t("whatsappProgressStatusPending", lang)
    case "sending":
      return t("whatsappProgressStatusSending", lang)
    case "done":
      return t("whatsappProgressStatusDone", lang)
    case "error":
      return t("whatsappProgressStatusError", lang)
    default:
      return status
  }
}

export default function WhatsappManagementPage() {
  const router = useRouter()
  const { currentLanguage } = useSettings()
  const lang = currentLanguage.code

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [messagePreview, setMessagePreview] = useState({
    title: "",
    body: ""
  })
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [sendErrors, setSendErrors] = useState<Array<{customer: string, error: string}>>([])
  const [showErrorDialog, setShowErrorDialog] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [pendingCustomers, setPendingCustomers] = useState<Customer[]>([])
  const [showMediaDialog, setShowMediaDialog] = useState(false)
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([])
  const [imageDescription, setImageDescription] = useState('')
  const [isSendingMedia, setIsSendingMedia] = useState(false)

  const [isSendProgressOpen, setIsSendProgressOpen] = useState(false)
  const [sendProgress, setSendProgress] = useState<SendProgressState>({
    phase: "idle",
    statusText: "",
    totalCustomers: 0,
    doneCustomers: 0,
    totalSuccess: 0,
    totalFailed: 0,
    customers: [],
  })

  const [isMediaProgressOpen, setIsMediaProgressOpen] = useState(false)
  const [mediaProgress, setMediaProgress] = useState<SendProgressState>({
    phase: "idle",
    statusText: "",
    totalCustomers: 0,
    doneCustomers: 0,
    totalSuccess: 0,
    totalFailed: 0,
    customers: [],
    totalMessages: 0,
    attemptedMessages: 0,
  })

  useEffect(() => {
    loadMessagePreview()
    loadCustomers()
  }, [])

  function handleOpenWhatsApp(phoneNumber: string) {
    const clean = String(phoneNumber || "").replace(/\D/g, "")
    if (!clean) {
      toast.error(t("whatsappSelectCustomers", lang))
      return
    }
    const whatsappAppUrl = `whatsapp://send?phone=${clean}`
    const whatsappWebUrl = `https://wa.me/${clean}`
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    if (isMobile) {
      window.location.href = whatsappAppUrl
      setTimeout(() => {
        window.open(whatsappWebUrl, "_blank")
      }, 800)
    } else {
      window.open(whatsappWebUrl, "_blank")
    }
  }

  async function loadCustomers() {
    try {
      setIsLoading(true)
      const response = await fetch("/api/whatsapp-customers")
      if (response.ok) {
        const data = await response.json()
        setCustomers(data)
        toast.success(t("whatsappCustomersLoaded", lang).replace("{count}", String(data.length)))
      } else {
        toast.error(t("whatsappCustomersLoadFailed", lang))
      }
    } catch {
      toast.error(t("whatsappCustomersLoadError", lang))
    } finally {
      setIsLoading(false)
    }
  }

  async function loadMessagePreview() {
    try {
      const response = await fetch("/api/whatsapp-settings")
      if (response.ok) {
        const data = await response.json()
        setMessagePreview({
          title: data.normal_message_title || "",
          body: data.normal_message_body || ""
        })
      }
    } catch {
      }
  }

  function handleSelectAll() {
    if (selectedIds.length === filteredCustomers.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredCustomers.map(c => c.id))
    }
  }

  function handleSelectOne(id: string) {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id))
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }

  function handleClearSearch() {
    setSearchQuery("")
  }

  async function handleRefresh() {
    await loadCustomers()
    toast.success(t("whatsappDataRefreshed", lang))
  }

  async function handleSendMessages() {
    if (selectedIds.length === 0) {
      toast.error(t("whatsappSelectAtLeastOneCustomer", lang))
      return
    }

    const selectedCustomers = customers.filter(c => selectedIds.includes(c.id))
    setPendingCustomers(selectedCustomers)
    setShowConfirmDialog(true)
  }

  async function confirmSendMessages() {
    setShowConfirmDialog(false)

    try {
      setIsSending(true)
      toast.info(t("whatsappSendingMessagesInfo", lang))

      const selected = pendingCustomers
      if (!selected || selected.length === 0) {
        toast.error(t("whatsappSelectAtLeastOneCustomer", lang))
        return
      }

      setIsSendProgressOpen(true)
      const progressCustomers: SendCustomerProgress[] = selected.map((c) => ({
        customerId: c.id,
        name: c.customer_name || "(بدون اسم)",
        phone: c.phone_number || "",
        status: "pending",
        success: false,
      }))

      setSendProgress({
        phase: "sending",
        statusText: t("whatsappProgressStarting", lang),
        totalCustomers: progressCustomers.length,
        doneCustomers: 0,
        totalSuccess: 0,
        totalFailed: 0,
        customers: progressCustomers,
      })

      // نجلب الإعدادات مرة واحدة لاستخدامها في التأخير الآمن (مثل نظام التذكير)
      const settingsResp = await fetch("/api/whatsapp-settings")
      const settingsData = await safeReadJson(settingsResp)
      const delaySettings: WhatsAppDelaySettings = {
        per_message_base_delay_ms: safeNumber(settingsData?.per_message_base_delay_ms, 0),
        per_message_jitter_ms: safeNumber(settingsData?.per_message_jitter_ms, 0),
        batch_size: Math.max(1, safeNumber(settingsData?.batch_size, 1) || 1),
        batch_pause_ms: safeNumber(settingsData?.batch_pause_ms, 0),
      }

      const errors: Array<{ customer: string; error: string }> = []

      for (let i = 0; i < selected.length; i++) {
        const customer = selected[i]
        const displayName = customer.customer_name || customer.phone_number || "(بدون رقم)"

        setSendProgress((prev) => ({
          ...prev,
          statusText: t("whatsappProgressSendingTo", lang).replace("{name}", String(displayName)),
          customers: prev.customers.map((pc) =>
            pc.customerId === customer.id ? { ...pc, status: "sending" } : pc
          ),
        }))

        const response = await fetch("/api/whatsapp-send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customers: [customer] }),
        })

        const result = await safeReadJson(response)

        // /api/whatsapp-send يرجع {success, failed, errors[]} حتى لو HTTP 200
        const failedCount = safeNumber(result?.failed, response.ok ? 0 : 1)
        const succeededCount = safeNumber(result?.success, 0)
        const firstErr =
          Array.isArray(result?.errors) && result.errors.length > 0
            ? String(result.errors[0]?.error || result.errors[0]?.message || "")
            : (!response.ok ? String(result?.error || result?.message || `HTTP ${response.status}`) : "")

        if (response.ok && failedCount === 0 && succeededCount > 0) {
          setSendProgress((prev) => ({
            ...prev,
            doneCustomers: prev.doneCustomers + 1,
            totalSuccess: prev.totalSuccess + 1,
            customers: prev.customers.map((pc) =>
              pc.customerId === customer.id ? { ...pc, status: "done", success: true } : pc
            ),
          }))
        } else {
          const errMsg = firstErr || t("whatsappSendMessagesFailed", lang)
          errors.push({ customer: customer.customer_name, error: errMsg })
          setSendProgress((prev) => ({
            ...prev,
            doneCustomers: prev.doneCustomers + 1,
            totalFailed: prev.totalFailed + 1,
            customers: prev.customers.map((pc) =>
              pc.customerId === customer.id
                ? { ...pc, status: "error", success: false, lastError: errMsg }
                : pc
            ),
          }))
        }

        // تأخير آمن بين الرسائل (لا نؤخر بعد آخر رسالة)
        if (i < selected.length - 1) {
          const delayMs = getSafeRandomDelayMs(
            delaySettings.per_message_base_delay_ms,
            delaySettings.per_message_jitter_ms
          )
          await sleep(delayMs)

          if ((i + 1) % delaySettings.batch_size === 0) {
            const pauseMs = Math.max(delaySettings.batch_pause_ms, ACCOUNT_PROTECTION_MIN_DELAY_MS)
            await sleep(pauseMs)
          }
        }
      }

      setSendProgress((prev) => ({
        ...prev,
        phase: "done",
        statusText: t("whatsappProgressCompleted", lang),
      }))

      if (errors.length === 0) {
        toast.success(t("whatsappMessagesSentSuccess", lang).replace("{count}", String(selected.length)))
      } else {
        toast.warning(
          t("whatsappMessagesSentWithFailures", lang)
            .replace("{success}", String(selected.length - errors.length))
            .replace("{failed}", String(errors.length))
        )
        setSendErrors(errors)
        setShowErrorDialog(true)
      }

      setSelectedIds([])
    } catch {
      toast.error(t("whatsappSendMessagesError", lang))
      setSendProgress((prev) => ({
        ...prev,
        phase: "error",
        statusText: t("whatsappSendMessagesError", lang),
      }))
    } finally {
      setIsSending(false)
      setPendingCustomers([])
    }
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const imageFiles = files.filter(f => f.type?.startsWith('image/'))
    if (imageFiles.length === 0) {
      toast.error(t("whatsappChooseImageOnly", lang))
      return
    }

    const remaining = Math.max(0, 2 - selectedImages.length)
    if (remaining <= 0) {
      toast.error("الحد الأقصى هو صورتين فقط")
      return
    }

    const toAdd = imageFiles.slice(0, remaining)
    if (imageFiles.length > remaining) {
      toast.warning("تم اختيار أكثر من صورتين، سيتم استخدام أول صورتين فقط")
    }

    setSelectedImages(prev => [...prev, ...toAdd])

    // previews
    toAdd.forEach((file) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreviewUrls(prev => [...prev, String(reader.result || "")])
      }
      reader.readAsDataURL(file)
    })

    // reset input value so selecting same file again triggers change
    e.target.value = ""
  }

  function clearImageSelection() {
    setSelectedImages([])
    setImagePreviewUrls([])
    setImageDescription('')
  }

  function removeSelectedImage(index: number) {
    setSelectedImages(prev => prev.filter((_, i) => i !== index))
    setImagePreviewUrls(prev => prev.filter((_, i) => i !== index))
  }

  async function handleSendMedia() {
    if (!selectedImages || selectedImages.length === 0) {
      toast.error(t("whatsappSelectImage", lang))
      return
    }

    if (selectedImages.length > 2) {
      toast.error("الحد الأقصى هو صورتين فقط")
      return
    }

    if (selectedIds.length === 0) {
      toast.error(t("whatsappSelectCustomers", lang))
      return
    }

    const selectedCustomers = customers.filter(c => selectedIds.includes(c.id))

    const fileToDataUrl = (file: File) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result || ""))
        reader.onerror = () => reject(new Error("فشل قراءة الصورة"))
        reader.readAsDataURL(file)
      })

    try {
      setIsSendingMedia(true)
      toast.info(t("whatsappSendingMediaInfo", lang))

      setShowMediaDialog(false)
      setIsMediaProgressOpen(true)

      const progressCustomers: SendCustomerProgress[] = selectedCustomers.map((c) => ({
        customerId: c.id,
        name: c.customer_name || "(بدون اسم)",
        phone: c.phone_number || "",
        status: "pending",
        success: false,
        totalItems: selectedImages.length,
        doneItems: 0,
      }))

      setMediaProgress({
        phase: "preparing",
        statusText: t("whatsappProgressPreparingMedia", lang),
        totalCustomers: progressCustomers.length,
        doneCustomers: 0,
        totalSuccess: 0,
        totalFailed: 0,
        customers: progressCustomers,
        totalMessages: progressCustomers.length * selectedImages.length,
        attemptedMessages: 0,
      })

      const settingsResp = await fetch("/api/whatsapp-settings")
      const settingsData = await safeReadJson(settingsResp)
      const delaySettings: WhatsAppDelaySettings = {
        per_message_base_delay_ms: safeNumber(settingsData?.per_message_base_delay_ms, 0),
        per_message_jitter_ms: safeNumber(settingsData?.per_message_jitter_ms, 0),
        batch_size: Math.max(1, safeNumber(settingsData?.batch_size, 1) || 1),
        batch_pause_ms: safeNumber(settingsData?.batch_pause_ms, 0),
      }

      const base64Images = await Promise.all(selectedImages.map(fileToDataUrl))

      // رفع الصور مرة واحدة ثم نرسل الـ publicUrls للجميع (مثل نظام التذكير)
      setMediaProgress((prev) => ({
        ...prev,
        phase: "preparing",
        statusText: t("whatsappProgressUploadingMedia", lang),
      }))

      const prepareResp = await fetch("/api/whatsapp-prepare-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: base64Images }),
      })

      const prepareData = await safeReadJson(prepareResp)
      if (!prepareResp.ok) {
        const errMsg = String(prepareData?.error || prepareData?.message || `HTTP ${prepareResp.status}`)
        throw new Error(errMsg)
      }

      const publicUrls: string[] = Array.isArray(prepareData?.publicUrls)
        ? prepareData.publicUrls
            .map((x: unknown) => String(x || ""))
            .filter((x: string) => x)
        : [String(prepareData?.publicUrl || "")].filter(Boolean)

      if (!publicUrls || publicUrls.length === 0) {
        throw new Error("فشل تجهيز الصور: publicUrls فارغ")
      }

      if (publicUrls.length > 2) {
        throw new Error("فشل تجهيز الصور: تم إرجاع أكثر من صورتين")
      }

      setMediaProgress((prev) => ({
        ...prev,
        phase: "sending",
        statusText: t("whatsappProgressStarting", lang),
      }))

      const errors: Array<{ customer: string; error: string }> = []

      for (let i = 0; i < selectedCustomers.length; i++) {
        const customer = selectedCustomers[i]
        const displayName = customer.customer_name || customer.phone_number || "(بدون رقم)"
        let customerFailed = 0

        setMediaProgress((prev) => ({
          ...prev,
          statusText: t("whatsappProgressSendingTo", lang).replace("{name}", String(displayName)),
          customers: prev.customers.map((pc) =>
            pc.customerId === customer.id ? { ...pc, status: "sending" } : pc
          ),
        }))

        for (let imgIdx = 0; imgIdx < publicUrls.length; imgIdx++) {
          const caption = imgIdx === 0 ? imageDescription : ""

          const resp = await fetch("/api/whatsapp-send-media", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              customers: [customer],
              image: publicUrls[imgIdx],
              caption,
            }),
          })

          const result = await safeReadJson(resp)
          const failedCount = safeNumber(result?.failed, resp.ok ? 0 : 1)
          const succeededCount = safeNumber(result?.success, 0)
          const firstErr =
            Array.isArray(result?.errors) && result.errors.length > 0
              ? String(result.errors[0]?.error || result.errors[0]?.message || "")
              : (!resp.ok ? String(result?.error || result?.message || `HTTP ${resp.status}`) : "")

          setMediaProgress((prev) => ({
            ...prev,
            attemptedMessages: (prev.attemptedMessages || 0) + 1,
          }))

          if (resp.ok && failedCount === 0 && succeededCount > 0) {
            setMediaProgress((prev) => ({
              ...prev,
              totalSuccess: prev.totalSuccess + 1,
              customers: prev.customers.map((pc) => {
                if (pc.customerId !== customer.id) return pc
                const doneItems = Math.min(pc.totalItems || publicUrls.length, (pc.doneItems || 0) + 1)
                return { ...pc, doneItems }
              }),
            }))
          } else {
            customerFailed += 1
            const errMsg = firstErr || t("whatsappSendImageFailed", lang)
            errors.push({ customer: customer.customer_name, error: errMsg })
            setMediaProgress((prev) => ({
              ...prev,
              totalFailed: prev.totalFailed + 1,
              customers: prev.customers.map((pc) => {
                if (pc.customerId !== customer.id) return pc
                const doneItems = Math.min(pc.totalItems || publicUrls.length, (pc.doneItems || 0) + 1)
                return { ...pc, doneItems, lastError: errMsg }
              }),
            }))
          }

          // تأخير آمن بين كل رسالة (أي بين كل صورة أيضاً)
          const isLastMessage = i === selectedCustomers.length - 1 && imgIdx === publicUrls.length - 1
          if (!isLastMessage) {
            const delayMs = getSafeRandomDelayMs(
              delaySettings.per_message_base_delay_ms,
              delaySettings.per_message_jitter_ms
            )
            await sleep(delayMs)
            const messageIndex = i * publicUrls.length + imgIdx
            if ((messageIndex + 1) % delaySettings.batch_size === 0) {
              const pauseMs = Math.max(delaySettings.batch_pause_ms, ACCOUNT_PROTECTION_MIN_DELAY_MS)
              await sleep(pauseMs)
            }
          }
        }

        setMediaProgress((prev) => ({
          ...prev,
          doneCustomers: prev.doneCustomers + 1,
          customers: prev.customers.map((pc) =>
            pc.customerId === customer.id
              ? { ...pc, status: customerFailed > 0 ? "error" : "done", success: customerFailed === 0 }
              : pc
          ),
        }))
      }

      setMediaProgress((prev) => ({
        ...prev,
        phase: "done",
        statusText: t("whatsappProgressCompleted", lang),
      }))

      if (errors.length === 0) {
        toast.success(t("whatsappImageSentSuccess", lang).replace("{count}", String(selectedCustomers.length)))
      } else {
        toast.warning(
          t("whatsappImageSentWithFailures", lang)
            .replace("{success}", String(selectedCustomers.length - errors.length))
            .replace("{failed}", String(errors.length))
        )
        setSendErrors(errors)
        setShowErrorDialog(true)
      }

      setSelectedIds([])
      clearImageSelection()
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : t("whatsappUnexpectedError", lang)
      toast.error(t("whatsappSendImageErrorWithMessage", lang).replace("{error}", String(errorMsg)))
      setMediaProgress((prev) => ({
        ...prev,
        phase: "error",
        statusText: String(errorMsg),
      }))
      setSendErrors([{ customer: t("whatsappSystem", lang), error: String(errorMsg) }])
      setShowErrorDialog(true)
    } finally {
      setIsSendingMedia(false)
    }
  }

  const filteredCustomers = customers.filter(customer =>
    customer.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.phone_number.includes(searchQuery)
  )

  const totalCustomers = filteredCustomers.length
  const totalBalanceIQD = filteredCustomers.reduce((sum, c) => sum + c.balanceiqd, 0)
  const totalBalanceUSD = filteredCustomers.reduce((sum, c) => sum + c.balanceusd, 0)

  const handleExportReport = async () => {
    try {
      toast.loading(t("whatsappPreparingReport", lang))
      
      const { data: { user } } = await fetch("/api/auth/user").then(res => res.json()).catch(() => ({ data: { user: null } }))
      const generatedBy = user?.user_metadata?.full_name || user?.email || t("unknownUser", lang)

      const payload = {
        generatedBy,
        date: new Date().toISOString(),
        items: filteredCustomers,
        totalBalanceIQD,
        totalBalanceUSD,
        count: totalCustomers
      }

      const jsonString = JSON.stringify(payload)
      const token = `${Date.now()}-${Math.random().toString(16).slice(2)}`
      const storageKey = `whatsappReportPayload:${token}`
      localStorage.setItem(storageKey, jsonString)

      toast.dismiss()
      toast.success(t("whatsappReportPrepared", lang))

      window.location.href = `/report/whatsapp?token=${token}&back=/services/whatsapp-management`
    } catch (error) {
      console.error("Error exporting report:", error)
      toast.dismiss()
      toast.error(t("whatsappReportExportError", lang))
    }
  }

  return (
    <PermissionGuard requiredPermission="view_services">
      <div className="h-full p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">{t("whatsappMessagesManagementTitle", lang)}</h1>
          <p className="text-muted-foreground mt-2">
            {t("whatsappMessagesManagementDescription", lang)}
          </p>
        </div>

        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <Button 
            className="gap-2"
            onClick={handleSendMessages}
            disabled={isSending || selectedIds.length === 0}
          >
            <Send className="h-4 w-4" />
            {isSending
              ? t("whatsappSending", lang)
              : t("whatsappSendMessageWithCount", lang).replace("{count}", String(selectedIds.length))}
          </Button>
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={() => {
              if (selectedIds.length === 0) {
                toast.error(t("whatsappSelectAtLeastOneCustomer", lang))
                return
              }
              setShowMediaDialog(true)
            }}
            disabled={selectedIds.length === 0}
          >
            <ImageIcon className="h-4 w-4" />
            {t("whatsappSendMediaWithCount", lang).replace("{count}", String(selectedIds.length))}
          </Button>
          <Button variant="outline" className="gap-2">
            <Megaphone className="h-4 w-4" />
            {t("whatsappAdCampaign", lang)}
          </Button>

          <div className="mr-auto">
            <Button
              variant="secondary"
              className="gap-2 bg-primary/10 hover:bg-primary/20"
              onClick={() => setShowPreview(true)}
            >
              <Eye className="h-4 w-4" />
              {t("whatsappPreviewDefaultMessage", lang)}
            </Button>
          </div>
        </div>

        <Card className="p-4 mb-6">
          <div className="flex items-center gap-3 flex-wrap">
            <Button 
              variant="outline" 
              size="icon"
              onClick={handleExportReport}
            >
              <FileText className="h-4 w-4" />
            </Button>

            <div className="flex-1 min-w-[200px] max-w-md flex gap-2">
              <Input
                placeholder={t("whatsappSearchNameOrPhonePlaceholder", lang)}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleClearSearch}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <Button
              variant="outline"
              onClick={handleSelectAll}
            >
              {selectedIds.length === filteredCustomers.length
                ? t("deselectAll", lang)
                : t("selectAll", lang)}
            </Button>

            <Button
              variant="outline"
              className="gap-2"
              onClick={handleRefresh}
            >
              <RefreshCw className="h-4 w-4" />
              {t("refresh", lang)}
            </Button>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px] text-right">{t("rowNumber", lang)}</TableHead>
                  <TableHead className="text-right">{t("customerName", lang)}</TableHead>
                  <TableHead className="text-right">{t("phoneNumber", lang)}</TableHead>
                  <TableHead className="text-right">{t("whatsappVarLastPaymentDate", lang)}</TableHead>
                  <TableHead className="text-right">{t("whatsappLastPaymentIQD", lang)}</TableHead>
                  <TableHead className="text-right">{t("whatsappLastPaymentUSD", lang)}</TableHead>
                  <TableHead className="text-right">{t("whatsappCurrentBalanceIQD", lang)}</TableHead>
                  <TableHead className="text-right">{t("whatsappCurrentBalanceUSD", lang)}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      {t("loading", lang)}
                    </TableCell>
                  </TableRow>
                ) : filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      {t("noResults", lang)}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers.map((customer, index) => (
                      <TableRow key={customer.id}>
                        <TableCell className="text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <span>{index + 1}</span>
                            <Checkbox
                              checked={selectedIds.includes(customer.id)}
                              onCheckedChange={() => handleSelectOne(customer.id)}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-right">{customer.customer_name}</TableCell>
                        <TableCell className="text-right" dir="ltr">
                          <div className="flex items-center gap-2 justify-end">
                            <span>{customer.phone_number || '-'}</span>
                            {customer.phone_number ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenWhatsApp(customer.phone_number)}
                                title="فتح واتساب"
                              >
                                <MessageCircle className="h-4 w-4 text-green-600" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                disabled
                                title="لا يوجد رقم"
                              >
                                <MessageCircle className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right" dir="ltr">
                          {customer.last_payment_date 
                            ? new Date(customer.last_payment_date).toLocaleDateString('en-US')
                            : '-'
                          }
                        </TableCell>
                        <TableCell className="text-right" dir="ltr">
                          {customer.last_payment_iqd > 0 
                            ? `${customer.last_payment_iqd.toLocaleString('en-US')} IQD` 
                            : '-'
                          }
                        </TableCell>
                        <TableCell className="text-right" dir="ltr">
                          {customer.last_payment_usd > 0 
                            ? `$${customer.last_payment_usd.toLocaleString('en-US')}` 
                            : '-'
                          }
                        </TableCell>
                        <TableCell className="font-semibold text-right" dir="ltr">
                          {customer.balanceiqd.toLocaleString('en-US')} IQD
                        </TableCell>
                        <TableCell className="font-semibold text-right" dir="ltr">
                          ${customer.balanceusd.toLocaleString('en-US')}
                        </TableCell>
                      </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="border-t p-4 bg-muted/30">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{t("totalCustomers", lang)}:</p>
                <p className="text-2xl font-bold">{totalCustomers}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("whatsappTotalDueAmountsIQD", lang)}</p>
                <p className="text-2xl font-bold text-orange-600">
                  {totalBalanceIQD.toLocaleString('en-US')} IQD
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("whatsappTotalDueAmountsUSD", lang)}</p>
                <p className="text-2xl font-bold text-green-600">
                  ${totalBalanceUSD.toLocaleString('en-US')}
                </p>
              </div>
            </div>
          </div>
        </Card>

        <Dialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {t("whatsappErrorsDetailsTitle", lang).replace("{count}", String(sendErrors.length))}
              </DialogTitle>
              <DialogDescription>
                {t("whatsappErrorsDetailsDescription", lang)}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {sendErrors.map((error, index) => (
                <Card key={index} className="p-3 bg-destructive/10">
                  <p className="font-semibold">{error.customer}</p>
                  <p className="text-sm text-muted-foreground">{error.error}</p>
                </Card>
              ))}
            </div>

            <Button onClick={() => setShowErrorDialog(false)} className="w-full">
              {t("close", lang)}
            </Button>
          </DialogContent>
        </Dialog>

        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t("whatsappDefaultMessagePreviewTitle", lang)}</DialogTitle>
              <DialogDescription>
                {t("whatsappDefaultMessagePreviewDescription", lang)}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <Card className="p-6 bg-muted/50">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{t("whatsappPreviewTitle", lang)}</p>
                    <p className="text-lg font-semibold">{messagePreview.title}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{t("whatsappPreviewBody", lang)}</p>
                    <p className="whitespace-pre-wrap">{messagePreview.body}</p>
                  </div>
                </div>
              </Card>

              <Button
                className="w-full gap-2"
                onClick={() => {
                  setShowPreview(false)
                  router.push("/settings/whatsapp/edit-message?type=normal")
                }}
              >
                <Edit className="h-4 w-4" />
                {t("whatsappEditMessage", lang)}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <Send className="h-6 w-6 text-primary" />
                {t("whatsappConfirmSendMessagesTitle", lang)}
              </DialogTitle>
              <DialogDescription>
                {t("whatsappConfirmSendMessagesDescription", lang)}
              </DialogDescription>
            </DialogHeader>

            <Card className="p-4 bg-primary/5 border-primary/20">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("whatsappCustomersCountLabel", lang)}</span>
                  <span className="text-2xl font-bold text-primary">{pendingCustomers.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("whatsappMessagesCountLabel", lang)}</span>
                  <span className="text-xl font-semibold">{pendingCustomers.length}</span>
                </div>
              </div>
            </Card>

            {pendingCustomers.length > 0 && (
              <div className="max-h-48 overflow-y-auto border rounded-md p-3 space-y-2">
                <p className="text-sm font-medium text-muted-foreground mb-2">{t("whatsappSelectedCustomersLabel", lang)}</p>
                {pendingCustomers.map((customer) => (
                  <div key={customer.id} className="flex items-center gap-2 text-sm">
                    <div className="h-2 w-2 rounded-full bg-primary"></div>
                    <span className="font-medium">{customer.customer_name}</span>
                    <span className="text-muted-foreground">({customer.phone_number})</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowConfirmDialog(false)
                  setPendingCustomers([])
                }}
              >
                {t("cancel", lang)}
              </Button>
              <Button
                className="flex-1 gap-2"
                onClick={confirmSendMessages}
                disabled={isSending}
              >
                {isSending ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    {t("whatsappSending", lang)}
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    {t("whatsappConfirmSend", lang)}
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showMediaDialog} onOpenChange={(open) => {
          setShowMediaDialog(open)
          if (!open) clearImageSelection()
        }}>
          <DialogContent className="max-w-5xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <ImageIcon className="h-6 w-6 text-primary" />
                {t("whatsappSendImageDialogTitle", lang)}
              </DialogTitle>
              <DialogDescription>
                {t("whatsappSendImageDialogDescription", lang)}
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-[calc(90vh-180px)] overflow-y-auto">

              <Card className="p-3 bg-primary/5 border-primary/20 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t("whatsappSelectedCustomersCountLabel", lang)}</span>
                  <span className="text-lg font-bold text-primary">{selectedIds.length}</span>
                </div>
              </Card>
              {selectedImages.length === 0 ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("whatsappChooseImageLabel", lang)}</label>
                  <label htmlFor="image-upload" className="block">
                    <Card className="p-8 border-2 border-dashed hover:border-primary/50 cursor-pointer transition-colors">
                      <div className="flex flex-col items-center gap-3 text-center">
                        <Upload className="h-12 w-12 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{t("whatsappClickToChooseImage", lang)}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {t("whatsappImageFormatsSupported", lang)}
                            <span className="block">الحد الأقصى: صورتين</span>
                          </p>
                        </div>
                      </div>
                    </Card>
                    <input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleImageChange}
                    />
                  </label>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">{t("whatsappSelectedImageLabel", lang)}</label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearImageSelection}
                      className="gap-1"
                    >
                      <Trash2 className="h-3 w-3" />
                      {t("remove", lang)}
                    </Button>
                    {selectedImages.length < 2 && (
                      <label htmlFor="image-upload-add" className="ml-auto">
                        <Button variant="outline" size="sm" className="gap-1" asChild>
                          <span>
                            <Upload className="h-3 w-3" />
                            إضافة صورة
                          </span>
                        </Button>
                        <input
                          id="image-upload-add"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageChange}
                        />
                      </label>
                    )}
                  </div>
                  
                  <Card className="p-4 bg-muted/50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedImages.map((file, idx) => (
                        <div key={`${file.name}-${idx}`} className="flex items-start gap-3">
                          {imagePreviewUrls[idx] && (
                            <div className="relative w-40 h-40 shrink-0 rounded-lg overflow-hidden border-2 border-primary/20">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={imagePreviewUrls[idx]}
                                alt={t("whatsappImagePreviewAlt", lang)}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <p className="text-sm text-muted-foreground">{t("whatsappFileNameLabel", lang)}</p>
                                <p className="font-medium break-all">{file.name}</p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeSelectedImage(idx)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">{t("whatsappFileSizeLabel", lang)}</p>
                              <p className="font-medium">{(file.size / 1024).toFixed(2)} KB</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t("whatsappImageDescriptionOptionalLabel", lang)}</label>
                    <Textarea
                      placeholder={t("whatsappImageDescriptionPlaceholder", lang)}
                      value={imageDescription}
                      onChange={(e) => setImageDescription(e.target.value)}
                      rows={4}
                      className="resize-none"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowMediaDialog(false)}
                disabled={isSendingMedia}
              >
                {t("cancel", lang)}
              </Button>
              <Button
                className="flex-1 gap-2"
                onClick={handleSendMedia}
                disabled={selectedImages.length === 0 || isSendingMedia}
              >
                {isSendingMedia ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    {t("whatsappSending", lang)}
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    {t("whatsappSendImageButton", lang)}
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Progress: Text messages */}
        <Dialog
          open={isSendProgressOpen}
          onOpenChange={(open) => {
            // اسمح بالإغلاق في أي وقت، لكن لا نعيد التهيئة أثناء الإرسال حتى لا نفقد التفاصيل.
            setIsSendProgressOpen(open)
            if (!open && (sendProgress.phase === "done" || sendProgress.phase === "error")) {
              setSendProgress({
                phase: "idle",
                statusText: "",
                totalCustomers: 0,
                doneCustomers: 0,
                totalSuccess: 0,
                totalFailed: 0,
                customers: [],
              })
            }
          }}
        >
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{t("whatsappProgressDialogTitleMessages", lang)}</DialogTitle>
              <DialogDescription>{t("whatsappProgressDialogDescription", lang)}</DialogDescription>
            </DialogHeader>

            <Card className="p-4 bg-muted/40">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm text-muted-foreground">{sendProgress.statusText}</div>
                  <div className="text-sm" dir="ltr">
                    {sendProgress.doneCustomers}/{sendProgress.totalCustomers}
                  </div>
                </div>
                <Progress
                  value={
                    sendProgress.totalCustomers > 0
                      ? Math.round((sendProgress.doneCustomers / sendProgress.totalCustomers) * 100)
                      : 0
                  }
                  indicatorClassName="bg-green-600"
                />
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="p-2 rounded-md bg-background/60 border">
                    <div className="text-muted-foreground">{t("whatsappProgressSuccessLabel", lang)}</div>
                    <div className="font-semibold" dir="ltr">{sendProgress.totalSuccess}</div>
                  </div>
                  <div className="p-2 rounded-md bg-background/60 border">
                    <div className="text-muted-foreground">{t("whatsappProgressFailedLabel", lang)}</div>
                    <div className="font-semibold" dir="ltr">{sendProgress.totalFailed}</div>
                  </div>
                  <div className="p-2 rounded-md bg-background/60 border">
                    <div className="text-muted-foreground">{t("whatsappProgressDoneLabel", lang)}</div>
                    <div className="font-semibold" dir="ltr">{sendProgress.doneCustomers}</div>
                  </div>
                </div>
              </div>
            </Card>

            <div className="space-y-2 max-h-[420px] overflow-y-auto">
              {sendProgress.customers.map((c) => (
                <Card
                  key={c.customerId}
                  className={`p-3 ${c.status === "error" ? "bg-destructive/10" : "bg-muted/30"}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-semibold">{c.name}</div>
                      <div className="text-sm text-muted-foreground" dir="ltr">
                        {c.phone || "-"}
                      </div>
                    </div>
                    <div className="text-sm whitespace-nowrap">
                      {mapStatusLabel(c.status, lang)}
                    </div>
                  </div>
                  {c.lastError && (
                    <div className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">{c.lastError}</div>
                  )}
                </Card>
              ))}
            </div>

            <Button onClick={() => setIsSendProgressOpen(false)} className="w-full">
              {t("close", lang)}
            </Button>
          </DialogContent>
        </Dialog>

        {/* Progress: Media */}
        <Dialog
          open={isMediaProgressOpen}
          onOpenChange={(open) => {
            setIsMediaProgressOpen(open)
            if (!open && (mediaProgress.phase === "done" || mediaProgress.phase === "error")) {
              setMediaProgress({
                phase: "idle",
                statusText: "",
                totalCustomers: 0,
                doneCustomers: 0,
                totalSuccess: 0,
                totalFailed: 0,
                customers: [],
                totalMessages: 0,
                attemptedMessages: 0,
              })
            }
          }}
        >
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{t("whatsappProgressDialogTitleMedia", lang)}</DialogTitle>
              <DialogDescription>{t("whatsappProgressDialogDescription", lang)}</DialogDescription>
            </DialogHeader>

            <Card className="p-4 bg-muted/40">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm text-muted-foreground">{mediaProgress.statusText}</div>
                  <div className="text-sm" dir="ltr">
                    {typeof mediaProgress.attemptedMessages === "number" && typeof mediaProgress.totalMessages === "number" && mediaProgress.totalMessages > 0
                      ? `${mediaProgress.attemptedMessages}/${mediaProgress.totalMessages}`
                      : `${mediaProgress.doneCustomers}/${mediaProgress.totalCustomers}`}
                  </div>
                </div>
                <Progress
                  value={
                    typeof mediaProgress.attemptedMessages === "number" && typeof mediaProgress.totalMessages === "number" && mediaProgress.totalMessages > 0
                      ? Math.round((mediaProgress.attemptedMessages / mediaProgress.totalMessages) * 100)
                      : (mediaProgress.totalCustomers > 0
                          ? Math.round((mediaProgress.doneCustomers / mediaProgress.totalCustomers) * 100)
                          : 0)
                  }
                  indicatorClassName="bg-green-600"
                />
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="p-2 rounded-md bg-background/60 border">
                    <div className="text-muted-foreground">{t("whatsappProgressSuccessLabel", lang)}</div>
                    <div className="font-semibold" dir="ltr">{mediaProgress.totalSuccess}</div>
                  </div>
                  <div className="p-2 rounded-md bg-background/60 border">
                    <div className="text-muted-foreground">{t("whatsappProgressFailedLabel", lang)}</div>
                    <div className="font-semibold" dir="ltr">{mediaProgress.totalFailed}</div>
                  </div>
                  <div className="p-2 rounded-md bg-background/60 border">
                    <div className="text-muted-foreground">{t("whatsappProgressDoneLabel", lang)}</div>
                    <div className="font-semibold" dir="ltr">{mediaProgress.doneCustomers}</div>
                  </div>
                </div>
              </div>
            </Card>

            <div className="space-y-2 max-h-[420px] overflow-y-auto">
              {mediaProgress.customers.map((c) => (
                <Card
                  key={c.customerId}
                  className={`p-3 ${c.status === "error" ? "bg-destructive/10" : "bg-muted/30"}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-semibold">{c.name}</div>
                      <div className="text-sm text-muted-foreground" dir="ltr">
                        {c.phone || "-"}
                      </div>
                      {typeof c.doneItems === "number" && typeof c.totalItems === "number" && c.totalItems > 0 && (
                        <div className="text-sm text-muted-foreground" dir="ltr">
                          {c.doneItems}/{c.totalItems}
                        </div>
                      )}
                    </div>
                    <div className="text-sm whitespace-nowrap">
                      {mapStatusLabel(c.status, lang)}
                    </div>
                  </div>
                  {c.lastError && (
                    <div className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">{c.lastError}</div>
                  )}
                </Card>
              ))}
            </div>

            <Button onClick={() => setIsMediaProgressOpen(false)} className="w-full">
              {t("close", lang)}
            </Button>
          </DialogContent>
        </Dialog>
      </div>
    </PermissionGuard>
  );
}