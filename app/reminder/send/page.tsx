"use client"
import { useState, useRef } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Upload, Send, Image as ImageIcon, FileSpreadsheet, Phone, Search, X } from "lucide-react"
import { toast } from "sonner"
import * as XLSX from "xlsx"
import NextImage from "next/image"

interface CustomerData {
  id: number
  number: string
  name: string
  amount: string
  debt: string
  lastOperation: string
  lastPayment: string
  phone: string
}

type CampaignCustomerProgress = {
  customerId: number
  name: string
  phone: string
  totalImages: number
  doneImages: number
  success: number
  failed: number
  status: "pending" | "sending" | "done" | "error"
  lastError?: string
}

type CampaignProgressState = {
  phase: "idle" | "preparing" | "sending" | "done" | "error"
  statusText: string
  totalCustomers: number
  doneCustomers: number
  totalMessages: number
  attemptedMessages: number
  totalSuccess: number
  totalFailed: number
  customers: CampaignCustomerProgress[]
}

type BulkTextCustomerProgress = {
  customerId: number
  name: string
  phone: string
  status: "pending" | "sending" | "done" | "error"
  success: boolean
  lastError?: string
}

type BulkTextProgressState = {
  phase: "idle" | "sending" | "done" | "error"
  statusText: string
  totalCustomers: number
  doneCustomers: number
  totalSuccess: number
  totalFailed: number
  customers: BulkTextCustomerProgress[]
}

export default function ReminderSendPage() {
  const getReminderSessionToken = () =>
    localStorage.getItem("reminder_session_token") || sessionStorage.getItem("reminder_session_token")

  const buildHeaders = (extra?: Record<string, string>) => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(extra || {}),
    }
    const token = getReminderSessionToken()
    if (token) headers["x-reminder-session-token"] = token
    return headers
  }

  const [customers, setCustomers] = useState<CustomerData[]>([])
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // حالة الحملة الإعلانية
  const [isMediaDialogOpen, setIsMediaDialogOpen] = useState(false)
  const [selectedImages, setSelectedImages] = useState<{ file: File; preview: string; url?: string }[]>([])
  const [campaignMessage, setCampaignMessage] = useState("")
  const imageInputRef = useRef<HTMLInputElement>(null)

  const [isCampaignProgressOpen, setIsCampaignProgressOpen] = useState(false)
  const [campaignProgress, setCampaignProgress] = useState<CampaignProgressState>({
    phase: "idle",
    statusText: "",
    totalCustomers: 0,
    doneCustomers: 0,
    totalMessages: 0,
    attemptedMessages: 0,
    totalSuccess: 0,
    totalFailed: 0,
    customers: [],
  })

  const [isPhoneOnlySelected, setIsPhoneOnlySelected] = useState(false)
  const previousSelectionRef = useRef<Set<number> | null>(null)

  // إرسال رسالة جماعية (مخصصة)
  const [isBulkTextDialogOpen, setIsBulkTextDialogOpen] = useState(false)
  const [bulkTextMessage, setBulkTextMessage] = useState("")
  const [isBulkTextProgressOpen, setIsBulkTextProgressOpen] = useState(false)
  const [bulkTextProgress, setBulkTextProgress] = useState<BulkTextProgressState>({
    phase: "idle",
    statusText: "",
    totalCustomers: 0,
    doneCustomers: 0,
    totalSuccess: 0,
    totalFailed: 0,
    customers: [],
  })

  const normalizedSearch = searchQuery.trim().toLowerCase()
  const filteredCustomers = normalizedSearch
    ? customers.filter((c) => {
        const haystack = [
          c.id,
          c.number,
          c.name,
          c.amount,
          c.debt,
          c.lastOperation,
          c.lastPayment,
          c.phone,
        ]
          .map(v => String(v ?? "").toLowerCase())
          .join(" ")
        return haystack.includes(normalizedSearch)
      })
    : customers

  const visibleIds = filteredCustomers.map(c => c.id)
  const isAllVisibleSelected = filteredCustomers.length > 0 && visibleIds.every(id => selectedRows.has(id))

  const resetCampaignProgress = () => {
    setCampaignProgress({
      phase: "idle",
      statusText: "",
      totalCustomers: 0,
      doneCustomers: 0,
      totalMessages: 0,
      attemptedMessages: 0,
      totalSuccess: 0,
      totalFailed: 0,
      customers: [],
    })
  }

  const resetBulkTextProgress = () => {
    setBulkTextProgress({
      phase: "idle",
      statusText: "",
      totalCustomers: 0,
      doneCustomers: 0,
      totalSuccess: 0,
      totalFailed: 0,
      customers: [],
    })
  }

  const clearSelectedImages = () => {
    setSelectedImages(prev => {
      prev.forEach(img => {
        try {
          URL.revokeObjectURL(img.preview)
        } catch {
          // ignore
        }
      })
      return []
    })
  }

  // تحويل رقم تسلسلي Excel إلى تاريخ
  const excelDateToJSDate = (serial: number): string => {
    if (!serial || typeof serial !== 'number') return ""
    
    // Excel يبدأ العد من 1900/1/1
    const excelEpoch = new Date(1899, 11, 30)
    const days = Math.floor(serial)
    const date = new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000)
    
    // تنسيق التاريخ بصيغة M/D/YYYY
    const month = date.getMonth() + 1
    const day = date.getDate()
    const year = date.getFullYear()
    
    return `${month}/${day}/${year}`
  }

  // معالجة قيمة التاريخ (سواء كانت رقم أو نص)
  const processDateValue = (value: unknown): string => {
    if (!value) return ""
    
    // إذا كان رقم (Excel serial date)
    if (typeof value === 'number') {
      return excelDateToJSDate(value)
    }
    
    // إذا كان نص
    return value.toString()
  }

  // قراءة ملف Excel
  const handleFileUpload = async (file: File) => {
    try {
      setIsLoading(true)
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data, { type: "array", cellDates: true })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1,
        raw: false,
        dateNF: 'M/D/YYYY'
      }) as unknown[][]

      // تخطي الصف الأول (العناوين)
      const rows = jsonData.slice(1).filter(row => row && row.length > 0)

      const parsedCustomers: CustomerData[] = rows.map((row, index) => ({
        id: index + 1,
        number: row[0]?.toString() || "",
        name: row[1]?.toString() || "",
        amount: row[2]?.toString() || "",
        debt: row[3]?.toString() || "",
        lastOperation: processDateValue(row[4]),
        lastPayment: processDateValue(row[5]),
        phone: row[6]?.toString().trim() || "",
      }))

      setCustomers(parsedCustomers)
      setSelectedRows(new Set())
      setIsPhoneOnlySelected(false)
      previousSelectionRef.current = null
      toast.success(`تم تحميل ${parsedCustomers.length} عميل بنجاح`)
    } catch (error) {
      console.error("Error reading Excel file:", error)
      toast.error("فشل قراءة ملف Excel")
    } finally {
      setIsLoading(false)
    }
  }

  // التعامل مع رفع الملف من الزر
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls") || file.name.endsWith(".csv")) {
        handleFileUpload(file)
      } else {
        toast.error("يرجى اختيار ملف Excel (.xlsx, .xls, .csv)")
      }
    }
  }

  // التعامل مع السحب والإسقاط
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls") || file.name.endsWith(".csv")) {
        handleFileUpload(file)
      } else {
        toast.error("يرجى إسقاط ملف Excel (.xlsx, .xls, .csv)")
      }
    }
  }

  // اختيار/إلغاء اختيار صف
  const toggleRowSelection = (id: number) => {
    const newSelected = new Set(selectedRows)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedRows(newSelected)
  }

  // اختيار/إلغاء اختيار الكل
  const toggleSelectAll = () => {
    if (filteredCustomers.length === 0) return

    const next = new Set(selectedRows)
    if (isAllVisibleSelected) {
      // Unselect only visible rows
      for (const id of visibleIds) next.delete(id)
      setSelectedRows(next)
      return
    }

    // Select visible rows (keep existing selections)
    for (const id of visibleIds) next.add(id)
    setSelectedRows(next)
  }

  // تحديد/إلغاء تحديد العملاء الذين لديهم رقم هاتف فقط (Toggle)
  const toggleSelectOnlyCustomersWithPhones = () => {
    if (customers.length === 0) return

    if (!isPhoneOnlySelected) {
      // حفظ التحديد الحالي ثم تحديد ذوي الأرقام فقط
      previousSelectionRef.current = new Set(selectedRows)
      const withPhones = customers
        .filter(c => c.phone && c.phone.trim() !== "")
        .map(c => c.id)
      setSelectedRows(new Set(withPhones))
      setIsPhoneOnlySelected(true)
      toast.success(`تم تحديد ${withPhones.length} عميل لديهم أرقام هواتف`)
      return
    }

    // إلغاء وضع "ذوي الأرقام فقط" وإرجاع التحديد السابق إن وجد
    const previous = previousSelectionRef.current
    setSelectedRows(previous ? new Set(previous) : new Set())
    previousSelectionRef.current = null
    setIsPhoneOnlySelected(false)
    toast.info("تم إلغاء تحديد ذوي الأرقام فقط")
  }

  // إرسال رسائل تذكير
  const handleSendReminders = async () => {
    if (selectedRows.size === 0) {
      toast.error("يرجى اختيار عميل واحد على الأقل")
      return
    }

    const selectedCustomers = customers.filter(c => selectedRows.has(c.id))
    const customersWithPhone = selectedCustomers.filter(c => c.phone && c.phone.trim() !== "")

    if (customersWithPhone.length === 0) {
      toast.error("لا يوجد أرقام هواتف للعملاء المختارين")
      return
    }

    // حماية ضد الإرسال غير المقصود (قد يحدث بسبب submit تلقائي إذا كانت الصفحة ضمن <form> في أي مكان)
    const ok = window.confirm(
      `سيتم إرسال رسالة رمز تحقق (OTP) إلى ${customersWithPhone.length} عميل. هل تريد المتابعة؟`
    )
    if (!ok) return

    setIsLoading(true)
  toast.info(`جاري إرسال ${customersWithPhone.length} رسالة رمز تحقق...`)

    try {
      // إنشاء رسائل من القالب
      const recipients = await Promise.all(
        customersWithPhone.map(async (customer) => {
          // توليد رمز تحقق (يمكن تغييره حسب احتياجك)
          const code = Math.floor(100000 + Math.random() * 900000).toString()
          
          // طلب إنشاء رسالة من القالب
          const response = await fetch("/api/reminder-whatsapp/generate-message", {
            method: "POST",
            headers: buildHeaders(),
            body: JSON.stringify({ code }),
          })

          const data = await response.json()
          
          return {
            phone: customer.phone,
            message: data.message || `رمز التحقق الخاص بك: ${code}`,
          }
        })
      )

      // إرسال الرسائل الجماعية
      const response = await fetch("/api/reminder-whatsapp/send-bulk", {
        method: "POST",
        headers: buildHeaders(),
        body: JSON.stringify({ recipients }),
      })

      const result = await response.json()

      if (response.ok) {
        toast.success(`تم إرسال ${result.totalSent} رسالة بنجاح، فشل ${result.totalFailed} رسالة`)
      } else {
        toast.error(result.error || "فشل إرسال الرسائل")
      }
    } catch (error) {
      console.error("Error sending reminders:", error)
      toast.error("حدث خطأ أثناء إرسال رسائل رمز التحقق")
    } finally {
      setIsLoading(false)
    }
  }

  // إرسال صور (حملة إعلانية)
  const handleSendMedia = async () => {
    if (selectedRows.size === 0) {
      toast.error("يرجى اختيار عميل واحد على الأقل")
      return
    }

    // فتح dialog الحملة الإعلانية
    setIsMediaDialogOpen(true)
  }

  // إرسال رسالة جماعية للأرقام المحددة
  const handleSendBulkText = async () => {
    const message = bulkTextMessage.trim()

    if (selectedRows.size === 0) {
      toast.error("يرجى اختيار عميل واحد على الأقل")
      return
    }

    if (!message) {
      toast.error("يرجى كتابة الرسالة")
      return
    }

    const selectedCustomers = customers.filter(c => selectedRows.has(c.id))
    if (selectedCustomers.length === 0) {
      toast.error("لا يوجد عملاء محددين")
      return
    }

    setIsLoading(true)
    setIsBulkTextDialogOpen(false)
    setIsBulkTextProgressOpen(true)
    resetBulkTextProgress()

    try {
      const progressCustomers: BulkTextCustomerProgress[] = selectedCustomers.map(c => ({
        customerId: c.id,
        name: c.name || "(بدون اسم)",
        phone: c.phone || "",
        status: "pending",
        success: false,
      }))

      setBulkTextProgress({
        phase: "sending",
        statusText: "بدء الإرسال...",
        totalCustomers: progressCustomers.length,
        doneCustomers: 0,
        totalSuccess: 0,
        totalFailed: 0,
        customers: progressCustomers,
      })

      let totalSuccess = 0
      let totalFailed = 0

      for (let i = 0; i < selectedCustomers.length; i++) {
        const customer = selectedCustomers[i]
        const phone = (customer.phone || "").trim()

        setBulkTextProgress(prev => ({
          ...prev,
          statusText: `جاري الإرسال إلى: ${customer.name || phone || "(بدون رقم)"}`,
          customers: prev.customers.map(pc =>
            pc.customerId === customer.id ? { ...pc, status: "sending" } : pc
          ),
        }))

        // إذا لا يوجد رقم، اعتبرها فشل بدون استدعاء API
        if (!phone) {
          totalFailed += 1
          setBulkTextProgress(prev => ({
            ...prev,
            doneCustomers: prev.doneCustomers + 1,
            totalFailed: prev.totalFailed + 1,
            customers: prev.customers.map(pc =>
              pc.customerId === customer.id
                ? { ...pc, status: "error", success: false, lastError: "بدون رقم هاتف" }
                : pc
            ),
          }))
          continue
        }

        const resp = await fetch("/api/reminder-whatsapp/send-message", {
          method: "POST",
          headers: buildHeaders(),
          body: JSON.stringify({
            phoneNumber: phone,
            message,
            messageCount: i,
          }),
        })

        let data: any = null
        try {
          data = await resp.json()
        } catch {
          // ignore
        }

        if (resp.ok) {
          totalSuccess += 1
          setBulkTextProgress(prev => ({
            ...prev,
            doneCustomers: prev.doneCustomers + 1,
            totalSuccess: prev.totalSuccess + 1,
            customers: prev.customers.map(pc =>
              pc.customerId === customer.id
                ? { ...pc, status: "done", success: true }
                : pc
            ),
          }))
        } else {
          totalFailed += 1
          const errMsg = String(data?.error || data?.details || "فشل الإرسال")
          setBulkTextProgress(prev => ({
            ...prev,
            doneCustomers: prev.doneCustomers + 1,
            totalFailed: prev.totalFailed + 1,
            customers: prev.customers.map(pc =>
              pc.customerId === customer.id
                ? { ...pc, status: "error", success: false, lastError: errMsg }
                : pc
            ),
          }))
        }
      }

      setBulkTextProgress(prev => ({
        ...prev,
        phase: "done",
        statusText: "اكتمل الإرسال",
      }))

      toast.success(`اكتمل الإرسال الجماعي: نجاح ${totalSuccess} / فشل ${totalFailed}`)
      setBulkTextMessage("")
    } catch (error) {
      console.error("Error sending bulk text:", error)
      const errorMessage = error instanceof Error ? error.message : "خطأ غير معروف"
      setBulkTextProgress(prev => ({
        ...prev,
        phase: "error",
        statusText: `فشل الإرسال: ${errorMessage}`,
      }))
      toast.error(`حدث خطأ أثناء الإرسال الجماعي: ${errorMessage}`, { duration: 8000 })
    } finally {
      setIsLoading(false)
    }
  }

  // اختيار الصور
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    
    if (files.length === 0) return

    // فلترة الصور فقط
    const imageFiles = files.filter(file => file.type.startsWith("image/"))
    
    if (imageFiles.length === 0) {
      toast.error("يرجى اختيار ملفات صور فقط")
      return
    }

    // إنشاء معاينات للصور
    const newImages = imageFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }))

    setSelectedImages(prev => [...prev, ...newImages])
  }

  // حذف صورة
  const handleRemoveImage = (index: number) => {
    setSelectedImages(prev => {
      const newImages = [...prev]
      URL.revokeObjectURL(newImages[index].preview)
      newImages.splice(index, 1)
      return newImages
    })
  }

  // إرسال الحملة الإعلانية
  const handleSendCampaign = async () => {
    if (selectedImages.length === 0) {
      toast.error("يرجى اختيار صورة واحدة على الأقل")
      return
    }

    // ملاحظة: الرسالة (الكابشن) اختيارية. سيتم إرسالها مع أول صورة فقط.

    // إعداد قائمة المستلمين
    const selectedCustomers = customers.filter(c => selectedRows.has(c.id))
    const customersWithPhone = selectedCustomers.filter(c => c.phone && c.phone.trim() !== "")

    if (customersWithPhone.length === 0) {
      toast.error("لا يوجد أرقام هواتف للعملاء المختارين")
      return
    }

    setIsLoading(true)
    setIsCampaignProgressOpen(true)
    resetCampaignProgress()
    toast.info("جاري تجهيز الصور...")

    try {
      const fileToDataUrl = (file: File) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(String(reader.result || ""))
          reader.onerror = () => reject(new Error("فشل قراءة الصورة"))
          reader.readAsDataURL(file)
        })

      // ضغط الصور لتفادي 413 (Content Too Large) على بعض الاستضافات/الأجهزة
      const compressImageToJpegDataUrl = async (file: File): Promise<string> => {
        // fallback لو كانت ليست صورة
        if (!file.type?.startsWith("image/")) {
          return await fileToDataUrl(file)
        }

        const objectUrl = URL.createObjectURL(file)
        try {
          const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const el = new Image()
            el.onload = () => resolve(el)
            el.onerror = () => reject(new Error("فشل تحميل الصورة"))
            el.src = objectUrl
          })

          // حد أقصى للأبعاد (يحافظ على النسبة)
          const MAX_DIM = 1280
          const w = img.naturalWidth || img.width
          const h = img.naturalHeight || img.height
          const ratio = w && h ? Math.min(1, MAX_DIM / Math.max(w, h)) : 1
          const targetW = Math.max(1, Math.round(w * ratio))
          const targetH = Math.max(1, Math.round(h * ratio))

          const canvas = document.createElement("canvas")
          canvas.width = targetW
          canvas.height = targetH
          const ctx = canvas.getContext("2d")
          if (!ctx) {
            return await fileToDataUrl(file)
          }

          // خلفية بيضاء لصور PNG الشفافة عند التحويل إلى JPEG
          ctx.fillStyle = "#ffffff"
          ctx.fillRect(0, 0, targetW, targetH)
          ctx.drawImage(img, 0, 0, targetW, targetH)

          // حاول تقليل الجودة تدريجياً لتقليل الحجم
          const MAX_DATAURL_LENGTH = 1_250_000 // تقريباً ~0.9MB base64 بدون احتساب overhead كثير
          let quality = 0.85
          let dataUrl = canvas.toDataURL("image/jpeg", quality)

          while (dataUrl.length > MAX_DATAURL_LENGTH && quality > 0.55) {
            quality = Math.max(0.55, quality - 0.1)
            dataUrl = canvas.toDataURL("image/jpeg", quality)
          }

          return dataUrl
        } finally {
          try {
            URL.revokeObjectURL(objectUrl)
          } catch {
            // ignore
          }
        }
      }

      const safeReadResponse = async (resp: Response): Promise<{ json: any | null; text: string }> => {
        const text = await resp.text()
        if (!text) return { json: null, text: "" }
        try {
          return { json: JSON.parse(text), text }
        } catch {
          return { json: null, text }
        }
      }

      setCampaignProgress(prev => ({
        ...prev,
        phase: "preparing",
        statusText: "تجهيز الصور (ضغط/تحسين)...",
        totalCustomers: customersWithPhone.length,
        doneCustomers: 0,
      }))

      const dataUrls: string[] = []
      for (let i = 0; i < selectedImages.length; i++) {
        const img = selectedImages[i]
        const dataUrl = await compressImageToJpegDataUrl(img.file)
        dataUrls.push(dataUrl)
      }

      setCampaignProgress(prev => ({
        ...prev,
        phase: "preparing",
        statusText: "رفع الصور إلى مزود الخدمة...",
      }))

      // نرفع كل صورة على حدة لتقليل حجم الطلب وتفادي 413
      const publicUrls: string[] = []
      for (let i = 0; i < dataUrls.length; i++) {
        setCampaignProgress(prev => ({
          ...prev,
          statusText: `رفع الصورة ${i + 1}/${dataUrls.length}...`,
        }))

        const prepareResp = await fetch("/api/reminder-whatsapp/prepare-media", {
          method: "POST",
          headers: buildHeaders(),
          body: JSON.stringify({ mediaUrls: [dataUrls[i]] }),
        })

        const { json: prepareData, text } = await safeReadResponse(prepareResp)

        if (!prepareResp.ok) {
          if (prepareResp.status === 413) {
            throw new Error(
              "حجم الصورة كبير جداً (413). جرّب تصغير/ضغط الصورة قبل الإرسال، أو استخدم صور أقل حجماً."
            )
          }
          throw new Error(prepareData?.error || prepareData?.details || text || "فشل تجهيز الصور")
        }

        const url = Array.isArray(prepareData?.publicUrls) ? String(prepareData.publicUrls[0] || "") : ""
        if (!url) {
          throw new Error("فشل تجهيز الصور: لم يتم إرجاع رابط للصورة")
        }
        publicUrls.push(url)
      }

      const perCustomer: CampaignCustomerProgress[] = customersWithPhone.map(c => ({
        customerId: c.id,
        name: c.name || "(بدون اسم)",
        phone: c.phone,
        totalImages: publicUrls.length,
        doneImages: 0,
        success: 0,
        failed: 0,
        status: "pending",
      }))

      setCampaignProgress({
        phase: "sending",
        statusText: "بدء الإرسال...",
        totalCustomers: customersWithPhone.length,
        doneCustomers: 0,
        totalMessages: customersWithPhone.length * publicUrls.length,
        attemptedMessages: 0,
        totalSuccess: 0,
        totalFailed: 0,
        customers: perCustomer,
      })

      let startIndex = 0
      let totalSuccess = 0
      let totalFailed = 0

      for (let customerIdx = 0; customerIdx < customersWithPhone.length; customerIdx++) {
        const customer = customersWithPhone[customerIdx]
        let customerFailed = 0

        setCampaignProgress(prev => ({
          ...prev,
          statusText: `جاري الإرسال إلى: ${customer.name || customer.phone}`,
          customers: prev.customers.map(c =>
            c.customerId === customer.id
              ? { ...c, status: "sending" }
              : c
          ),
        }))

        for (let imgIdx = 0; imgIdx < publicUrls.length; imgIdx++) {
          const caption = imgIdx === 0 ? (campaignMessage || "") : ""

          const sendResp = await fetch("/api/reminder-whatsapp/send-bulk-media", {
            method: "POST",
            headers: buildHeaders(),
            body: JSON.stringify({
              recipients: [{ phone: customer.phone, mediaUrl: publicUrls[imgIdx], caption }],
              startIndex,
            }),
          })

          const sendData = await sendResp.json()

          const sent = Number(sendData?.totalSent || 0)
          let failed = Number(sendData?.totalFailed || 0)
          const firstError = Array.isArray(sendData?.errors) && sendData.errors.length > 0
            ? String(sendData.errors[0]?.error || "")
            : ""

          // إذا كان الرد غير OK ولم يُرجع totals، اعتبرها رسالة فاشلة واحدة على الأقل.
          if (!sendResp.ok && sent === 0 && failed === 0) {
            failed = 1
          }

          totalSuccess += Number.isFinite(sent) ? sent : 0
          totalFailed += Number.isFinite(failed) ? failed : 0
          customerFailed += Number.isFinite(failed) ? failed : 0

          setCampaignProgress(prev => ({
            ...prev,
            attemptedMessages: prev.attemptedMessages + 1,
            totalSuccess: prev.totalSuccess + (Number.isFinite(sent) ? sent : 0),
            totalFailed: prev.totalFailed + (Number.isFinite(failed) ? failed : 0),
            customers: prev.customers.map(c => {
              if (c.customerId !== customer.id) return c
              const nextDone = Math.min(c.totalImages, c.doneImages + 1)
              const nextSuccess = c.success + (Number.isFinite(sent) ? sent : 0)
              const nextFailed = c.failed + (Number.isFinite(failed) ? failed : 0)
              return {
                ...c,
                doneImages: nextDone,
                success: nextSuccess,
                failed: nextFailed,
                ...(failed > 0 && firstError ? { lastError: firstError } : {}),
              }
            }),
          }))

          startIndex += 1

          // إذا كان هناك خطأ HTTP غير متوقع، اعتبرها فشل لهذه الرسالة.
          if (!sendResp.ok) {
            // نكتفي بتسجيل آخر خطأ داخل شاشة التقدم بدل الإغراق بـ toasts.
            setCampaignProgress(prev => ({
              ...prev,
              customers: prev.customers.map(c =>
                c.customerId === customer.id
                  ? { ...c, status: "error", lastError: String(sendData?.error || sendData?.details || "فشل الإرسال") }
                  : c
              ),
            }))
          }
        }

        // تم إنهاء هذا العميل
        setCampaignProgress(prev => ({
          ...prev,
          doneCustomers: prev.doneCustomers + 1,
          customers: prev.customers.map(c =>
            c.customerId === customer.id
              ? { ...c, status: customerFailed > 0 ? "error" : "done" }
              : c
          ),
        }))
      }

      setCampaignProgress(prev => ({
        ...prev,
        phase: "done",
        statusText: "اكتمل الإرسال",
      }))

      toast.success(`اكتمل الإرسال: نجاح ${totalSuccess} / فشل ${totalFailed}`)

      // إعادة تعيين الحالة (نُبقي شاشة التقدم مفتوحة للمراجعة)
      setIsMediaDialogOpen(false)
      clearSelectedImages()
      setCampaignMessage("")
    } catch (error) {
      console.error("Error sending campaign:", error)
      const errorMessage = error instanceof Error ? error.message : "خطأ غير معروف"
      setCampaignProgress(prev => ({
        ...prev,
        phase: "error",
        statusText: `فشل الإرسال: ${errorMessage}`,
      }))
      toast.error(`حدث خطأ أثناء إرسال الحملة الإعلانية: ${errorMessage}`, { duration: 8000 })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <FileSpreadsheet className="h-6 w-6" />
              إرسال رسائل تذكير تلقائية
            </CardTitle>
            <CardDescription>
              قم برفع ملف Excel يحتوي على بيانات العملاء لإرسال رسائل التذكير
            </CardDescription>
          </CardHeader>
        </Card>
      </motion.div>

      {/* Upload Area - يظهر فقط عندما لا توجد بيانات */}
      {customers.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card
            className={`border-2 border-dashed transition-colors ${
              isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <CardContent className="p-8">
              <div className="flex flex-col items-center justify-center space-y-4">
                {/* نص مميز */}
                <div className="text-center">
                  <p className="text-lg font-semibold text-primary mb-2">
                    يمكنك إدراج أو سحب وإسقاط ملف إكسل هنا
                  </p>
                  <p className="text-sm text-muted-foreground">
                    الملفات المدعومة: .xlsx, .xls, .csv
                  </p>
                </div>

                {/* أيقونة رفع الملف */}
                <div className="p-6 bg-muted/50 rounded-full">
                  <Upload className="h-12 w-12 text-muted-foreground" />
                </div>

                {/* زر رفع الملف */}
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                  <Button
                    size="lg"
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                    className="gap-2"
                  >
                    <Upload className="h-5 w-5" />
                    اختر ملف Excel من الجهاز
                  </Button>
                </div>

                {/* عدد العملاء المحملين */}
                {customers.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    تم تحميل {customers.length} عميل • محدد {selectedRows.size} عميل
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* زر إعادة رفع ملف - يظهر عندما توجد بيانات */}
      {customers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">تم تحميل {customers.length} عميل</p>
                    <p className="text-sm text-muted-foreground">محدد {selectedRows.size} عميل</p>
                  </div>
                </div>
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                    className="gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    إعادة رفع ملف آخر
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* أزرار الإرسال */}
      {customers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  onClick={handleSendReminders}
                  disabled={isLoading || selectedRows.size === 0}
                  className="gap-2"
                  size="lg"
                >
                  <Send className="h-5 w-5" />
                  إرسال رسائل رمز التحقق
                </Button>

                <Button
                  type="button"
                  onClick={() => setIsBulkTextDialogOpen(true)}
                  disabled={isLoading || selectedRows.size === 0}
                  variant="outline"
                  className="gap-2"
                  size="lg"
                >
                  <Send className="h-5 w-5" />
                  إرسال رسالة جماعية
                </Button>

                <Button
                  type="button"
                  onClick={handleSendMedia}
                  disabled={isLoading || selectedRows.size === 0}
                  variant="secondary"
                  className="gap-2"
                  size="lg"
                >
                  <ImageIcon className="h-5 w-5" />
                  إرسال صور (حملة إعلانية)
                </Button>

                <Button
                  type="button"
                  onClick={toggleSelectOnlyCustomersWithPhones}
                  disabled={isLoading || customers.length === 0}
                  variant="outline"
                  className="gap-2"
                  size="lg"
                >
                  <Phone className="h-5 w-5" />
                  {isPhoneOnlySelected ? "إلغاء تحديد ذوي الأرقام فقط" : "تحديد ذوي الأرقام فقط"}
                </Button>
              </div>

              <div className="mt-3 text-xs text-muted-foreground text-right">
                ملاحظة: زر <span className="font-medium">إرسال رسائل رمز التحقق</span> يولّد رمزًا مختلفًا لكل عميل.
                لإرسال رسالة تكتبها بنفسك استخدم <span className="font-medium">إرسال رسالة جماعية</span>.
              </div>

              {/* مربع البحث */}
              <div className="mt-4">
                <div className="relative max-w-md">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="بحث في الجدول (اسم، رقم، هاتف...)"
                    className="pr-10 pl-10"
                    dir="rtl"
                    aria-label="بحث في جدول العملاء"
                  />

                  {searchQuery.trim().length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute left-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
                      aria-label="مسح البحث"
                      title="مسح"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {normalizedSearch && (
                  <div className="text-xs text-muted-foreground mt-2">
                    النتائج: {filteredCustomers.length} من {customers.length}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* جدول البيانات */}
      {customers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                قائمة العملاء ({filteredCustomers.length}{normalizedSearch ? ` من ${customers.length}` : ""})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-auto max-h-[600px]">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="w-12 text-center">
                        <Checkbox
                          checked={isAllVisibleSelected}
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead className="text-center">#</TableHead>
                      <TableHead className="text-right">الرقم</TableHead>
                      <TableHead className="text-right">الاسم</TableHead>
                      <TableHead className="text-right">المبلغ</TableHead>
                      <TableHead className="text-right">الدين</TableHead>
                      <TableHead className="text-right">تاريخ آخر عملية</TableHead>
                      <TableHead className="text-right">تاريخ آخر دفع</TableHead>
                      <TableHead className="text-right">رقم الهاتف</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground py-10">
                          لا توجد نتائج مطابقة
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredCustomers.map((customer) => (
                        <TableRow
                          key={customer.id}
                          className={selectedRows.has(customer.id) ? "bg-muted/50" : ""}
                        >
                          <TableCell className="text-center">
                            <Checkbox
                              checked={selectedRows.has(customer.id)}
                              onCheckedChange={() => toggleRowSelection(customer.id)}
                            />
                          </TableCell>
                          <TableCell className="text-center font-mono text-sm">
                            {customer.id}
                          </TableCell>
                          <TableCell className="text-right">{customer.number}</TableCell>
                          <TableCell className="text-right font-medium">{customer.name}</TableCell>
                          <TableCell className="text-right" dir="ltr">{customer.amount}</TableCell>
                          <TableCell className="text-right">{customer.debt}</TableCell>
                          <TableCell className="text-right">{customer.lastOperation}</TableCell>
                          <TableCell className="text-right">{customer.lastPayment}</TableCell>
                          <TableCell className="text-right font-mono" dir="ltr">
                            {customer.phone || <span className="text-muted-foreground">-</span>}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Dialog الحملة الإعلانية */}
      <Dialog open={isMediaDialogOpen} onOpenChange={setIsMediaDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-right">حملة إعلانية - إرسال صور</DialogTitle>
            <DialogDescription className="text-right">
              قم برفع الصور واكتب رسالة لإرسالها للعملاء المحددين ({selectedRows.size} عميل)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* اختيار الصور */}
            <div className="space-y-2">
              <label className="text-sm font-medium">الصور</label>
              <div className="flex gap-2">
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => imageInputRef.current?.click()}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  اختر صور من الجهاز
                </Button>
                <span className="text-sm text-muted-foreground self-center">
                  {selectedImages.length} صورة محددة
                </span>
              </div>
            </div>

            {/* عرض الصور المختارة */}
            {selectedImages.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {selectedImages.map((img, index) => (
                  <div key={index} className="relative group">
                    <NextImage
                      src={img.preview}
                      alt={`صورة ${index + 1}`}
                      width={150}
                      height={150}
                      className="w-full h-32 object-cover rounded-md border"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* رسالة الحملة */}
            <div className="space-y-2">
              <label className="text-sm font-medium">رسالة الحملة</label>
              <Textarea
                placeholder="اكتب رسالة الحملة الإعلانية هنا..."
                value={campaignMessage}
                onChange={(e) => setCampaignMessage(e.target.value)}
                rows={4}
                className="text-right"
                dir="rtl"
              />
              <p className="text-xs text-muted-foreground text-right">
                الرسالة اختيارية. سيتم إرسالها مع أول صورة فقط.
              </p>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => setIsMediaDialogOpen(false)}
              disabled={isLoading}
            >
              إلغاء
            </Button>
            <Button
              type="button"
              onClick={handleSendCampaign}
              disabled={isLoading || selectedImages.length === 0}
              className="gap-2"
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
                  جاري الإرسال...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  إرسال الحملة
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog إرسال رسالة جماعية */}
      <Dialog open={isBulkTextDialogOpen} onOpenChange={setIsBulkTextDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-right">إرسال رسالة جماعية</DialogTitle>
            <DialogDescription className="text-right">
              اكتب الرسالة لإرسالها إلى العملاء المحددين ({selectedRows.size} عميل)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">الرسالة</label>
              <Textarea
                placeholder="اكتب الرسالة هنا..."
                value={bulkTextMessage}
                onChange={(e) => setBulkTextMessage(e.target.value)}
                rows={5}
                className="text-right"
                dir="rtl"
              />
              <p className="text-xs text-muted-foreground text-right">
                سيتم الإرسال تسلسلياً مع تأخير عشوائي بين الرسائل حسب إعدادات النظام.
              </p>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => setIsBulkTextDialogOpen(false)}
              disabled={isLoading}
            >
              إلغاء
            </Button>
            <Button
              type="button"
              onClick={handleSendBulkText}
              disabled={isLoading || selectedRows.size === 0 || bulkTextMessage.trim().length === 0}
              className="gap-2"
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
                  جاري الإرسال...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  إرسال
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog تقدم الإرسال الجماعي */}
      <Dialog
        open={isBulkTextProgressOpen}
        onOpenChange={(open) => {
          if (bulkTextProgress.phase === "sending") return
          setIsBulkTextProgressOpen(open)
          if (!open) resetBulkTextProgress()
        }}
      >
        <DialogContent className="sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle className="text-right">تقدم الإرسال الجماعي</DialogTitle>
            <DialogDescription className="text-right">
              {bulkTextProgress.statusText || "..."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-md border p-3">
                <div className="text-muted-foreground text-right">النجاح</div>
                <div className="text-right font-semibold" dir="ltr">{bulkTextProgress.totalSuccess}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-muted-foreground text-right">الفشل</div>
                <div className="text-right font-semibold" dir="ltr">{bulkTextProgress.totalFailed}</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground" dir="ltr">
                  {bulkTextProgress.doneCustomers}/{bulkTextProgress.totalCustomers} عميل
                </span>
                <span className="font-medium text-right">تقدم الإرسال</span>
              </div>
              <Progress
                value={
                  bulkTextProgress.totalCustomers > 0
                    ? (bulkTextProgress.doneCustomers / bulkTextProgress.totalCustomers) * 100
                    : 0
                }
                indicatorClassName={
                  bulkTextProgress.phase === "sending"
                    ? "bg-emerald-500 animate-pulse"
                    : "bg-emerald-500"
                }
              />
            </div>

            <div className="rounded-md border p-3 max-h-[300px] overflow-auto">
              <div className="space-y-3">
                {bulkTextProgress.customers.map((c) => {
                  const statusLabel =
                    c.status === "pending" ? "بانتظار" :
                    c.status === "sending" ? "جاري" :
                    c.status === "done" ? "مكتمل" :
                    "به أخطاء"

                  const statusClass =
                    c.status === "done"
                      ? "text-emerald-600"
                      : c.status === "error"
                        ? "text-red-600"
                        : "text-muted-foreground"

                  return (
                    <div key={c.customerId} className="space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="text-right">
                          <div className="font-medium">{c.name}</div>
                          <div className="text-xs text-muted-foreground" dir="ltr">{c.phone || "-"}</div>
                        </div>
                        <div className="text-right text-xs">
                          <div className={statusClass}>{statusLabel}</div>
                        </div>
                      </div>

                      {c.lastError && c.status === "error" && (
                        <div className="text-xs text-red-600 text-right">
                          آخر خطأ: {c.lastError}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setIsBulkTextProgressOpen(false)
                resetBulkTextProgress()
              }}
              disabled={bulkTextProgress.phase === "sending"}
            >
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog تقدم الإرسال */}
      <Dialog
        open={isCampaignProgressOpen}
        onOpenChange={(open) => {
          // منع الإغلاق أثناء الإرسال لتجنب الالتباس
          if (campaignProgress.phase === "sending" || campaignProgress.phase === "preparing") return
          setIsCampaignProgressOpen(open)
          if (!open) {
            resetCampaignProgress()
          }
        }}
      >
        <DialogContent className="sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle className="text-right">تقدم إرسال الحملة</DialogTitle>
            <DialogDescription className="text-right">
              {campaignProgress.statusText || "..."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-md border p-3">
                <div className="text-muted-foreground text-right">النجاح</div>
                <div className="text-right font-semibold" dir="ltr">{campaignProgress.totalSuccess}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-muted-foreground text-right">الفشل</div>
                <div className="text-right font-semibold" dir="ltr">{campaignProgress.totalFailed}</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground" dir="ltr">
                  {campaignProgress.doneCustomers}/{campaignProgress.totalCustomers} عميل
                </span>
                <span className="font-medium text-right">تقدم العملاء</span>
              </div>
              <Progress
                value={
                  campaignProgress.totalCustomers > 0
                    ? (campaignProgress.doneCustomers / campaignProgress.totalCustomers) * 100
                    : 0
                }
                indicatorClassName={
                  campaignProgress.phase === "sending" || campaignProgress.phase === "preparing"
                    ? "bg-emerald-500 animate-pulse"
                    : "bg-emerald-500"
                }
              />
              <div className="text-xs text-muted-foreground" dir="ltr">
                {campaignProgress.attemptedMessages}/{campaignProgress.totalMessages} رسالة
              </div>
            </div>

            <div className="rounded-md border p-3 max-h-[300px] overflow-auto">
              <div className="space-y-3">
                {campaignProgress.customers.map((c) => {
                  const pct = c.totalImages > 0 ? (c.doneImages / c.totalImages) * 100 : 0
                  const statusLabel =
                    c.status === "pending" ? "بانتظار" :
                    c.status === "sending" ? "جاري" :
                    c.status === "done" ? "مكتمل" :
                    "به أخطاء"

                  const statusClass =
                    c.status === "done"
                      ? "text-emerald-600"
                      : c.status === "error"
                        ? "text-red-600"
                        : "text-muted-foreground"

                  return (
                    <div key={c.customerId} className="space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="text-right">
                          <div className="font-medium">{c.name}</div>
                          <div className="text-xs text-muted-foreground" dir="ltr">{c.phone}</div>
                        </div>
                        <div className="text-right text-xs">
                          <div className={statusClass}>{statusLabel}</div>
                          <div className="text-muted-foreground" dir="ltr">
                            نجاح {c.success} • فشل {c.failed}
                          </div>
                        </div>
                      </div>

                      <Progress
                        value={pct}
                        className="h-3"
                        indicatorClassName={
                          c.status === "error" ? "bg-red-500" : "bg-emerald-500"
                        }
                      />

                      {c.lastError && c.status === "error" && (
                        <div className="text-xs text-red-600 text-right">
                          آخر خطأ: {c.lastError}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setIsCampaignProgressOpen(false)
                resetCampaignProgress()
              }}
              disabled={campaignProgress.phase === "sending" || campaignProgress.phase === "preparing"}
            >
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
