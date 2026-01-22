"use client"
import { useState, useRef } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Upload, Send, Image as ImageIcon, FileSpreadsheet, Phone, X } from "lucide-react"
import { toast } from "sonner"
import * as XLSX from "xlsx"
import Image from "next/image"

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

export default function ReminderSendPage() {
  const [customers, setCustomers] = useState<CustomerData[]>([])
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
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
    if (selectedRows.size === customers.length) {
      setSelectedRows(new Set())
    } else {
      setSelectedRows(new Set(customers.map(c => c.id)))
    }
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

    setIsLoading(true)
    toast.info(`جاري إرسال ${customersWithPhone.length} رسالة...`)

    try {
      // إنشاء رسائل من القالب
      const recipients = await Promise.all(
        customersWithPhone.map(async (customer) => {
          // توليد رمز تحقق (يمكن تغييره حسب احتياجك)
          const code = Math.floor(100000 + Math.random() * 900000).toString()
          
          // طلب إنشاء رسالة من القالب
          const response = await fetch("/api/reminder-whatsapp/generate-message", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
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
        headers: { "Content-Type": "application/json" },
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
      toast.error("حدث خطأ أثناء إرسال الرسائل")
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

      setCampaignProgress(prev => ({
        ...prev,
        phase: "preparing",
        statusText: "تجهيز الصور (قراءة الملفات)...",
        totalCustomers: customersWithPhone.length,
        doneCustomers: 0,
      }))

      const dataUrls = await Promise.all(selectedImages.map((img) => fileToDataUrl(img.file)))

      setCampaignProgress(prev => ({
        ...prev,
        phase: "preparing",
        statusText: "رفع الصور إلى مزود الخدمة...",
      }))

      const prepareResp = await fetch("/api/reminder-whatsapp/prepare-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaUrls: dataUrls }),
      })

      const prepareData = await prepareResp.json()
      if (!prepareResp.ok) {
        throw new Error(prepareData?.error || prepareData?.details || "فشل تجهيز الصور")
      }

      const publicUrls: string[] = Array.isArray(prepareData?.publicUrls) ? prepareData.publicUrls : []
      if (!publicUrls.length) {
        throw new Error("فشل تجهيز الصور: لم يتم إرجاع روابط الصور")
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
            headers: { "Content-Type": "application/json" },
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
                  onClick={handleSendReminders}
                  disabled={isLoading || selectedRows.size === 0}
                  className="gap-2"
                  size="lg"
                >
                  <Send className="h-5 w-5" />
                  إرسال رسائل تذكير
                </Button>

                <Button
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
                قائمة العملاء ({customers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-auto max-h-[600px]">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="w-12 text-center">
                        <Checkbox
                          checked={selectedRows.size === customers.length && customers.length > 0}
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
                    {customers.map((customer) => (
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
                    ))}
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
                    <Image
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
              onClick={() => setIsMediaDialogOpen(false)}
              disabled={isLoading}
            >
              إلغاء
            </Button>
            <Button
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
