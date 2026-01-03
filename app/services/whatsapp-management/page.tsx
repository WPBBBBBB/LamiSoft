"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
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
import { Send, Image as ImageIcon, Megaphone, Eye, FileText, X, RefreshCw, Edit, Upload, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Textarea } from "@/components/ui/textarea"
import { PermissionGuard } from "@/components/permission-guard"

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

export default function WhatsappManagementPage() {
  const router = useRouter()
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
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>('')
  const [imageDescription, setImageDescription] = useState('')
  const [isSendingMedia, setIsSendingMedia] = useState(false)

  useEffect(() => {
    loadMessagePreview()
    loadCustomers()
  }, [])

  async function loadCustomers() {
    try {
      console.log('loadCustomers: Starting fetch...')
      setIsLoading(true)
      const response = await fetch("/api/whatsapp-customers")
      console.log('loadCustomers: Response status:', response.status)
      if (response.ok) {
        const data = await response.json()
        console.log('loadCustomers: Received data:', data.length, 'customers')
        setCustomers(data)
        toast.success(`تم تحميل ${data.length} زبون`)
      } else {
        const errorText = await response.text()
        console.error('loadCustomers: Error response:', errorText)
        toast.error("فشل تحميل بيانات الزبائن")
      }
    } catch (error) {
      console.error("Error loading customers:", error)
      toast.error("خطأ في تحميل بيانات الزبائن")
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
    } catch (error) {
      console.error("Error loading message preview:", error)
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
    toast.success("تم تحديث البيانات")
  }

  async function handleSendMessages() {
    if (selectedIds.length === 0) {
      toast.error("يرجى تحديد زبائن على الأقل")
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
      toast.info("جاري إرسال الرسائل...")

      const response = await fetch("/api/whatsapp-send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customers: pendingCustomers,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        
        if (result.failed === 0) {
          toast.success(`تم إرسال ${result.success} رسالة بنجاح! ✓`)
        } else {
          toast.warning(
            `تم إرسال ${result.success} رسالة. فشل ${result.failed} رسالة.`
          )
        }
        
        if (result.errors && result.errors.length > 0) {
          console.log("Send errors details:", result.errors)
          setSendErrors(result.errors)
          setShowErrorDialog(true)
        }
        
        setSelectedIds([])
      } else {
        toast.error("فشل إرسال الرسائل")
      }
    } catch (error) {
      console.error("Error sending messages:", error)
      toast.error("خطأ في إرسال الرسائل")
    } finally {
      setIsSending(false)
    }
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error("يرجى اختيار صورة فقط")
      return
    }

    setSelectedImage(file)
    
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreviewUrl(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  function clearImageSelection() {
    setSelectedImage(null)
    setImagePreviewUrl('')
    setImageDescription('')
  }

  async function handleSendMedia() {
    if (!selectedImage) {
      toast.error("يرجى اختيار صورة")
      return
    }

    if (selectedIds.length === 0) {
      toast.error("يرجى تحديد زبائن")
      return
    }

    const selectedCustomers = customers.filter(c => selectedIds.includes(c.id))

    try {
      setIsSendingMedia(true)
      toast.info("جاري تحميل الصورة وإرسالها...")

      const reader = new FileReader()
      reader.readAsDataURL(selectedImage)
      
      reader.onloadend = async () => {
        const base64Image = reader.result as string

        const response = await fetch("/api/whatsapp-send-media", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            customers: selectedCustomers,
            image: base64Image,
            caption: imageDescription,
          }),
        })

        if (response.ok) {
          const result = await response.json()
          
          if (result.failed === 0) {
            toast.success(`تم إرسال الصورة إلى ${result.success} زبون بنجاح! ✓`)
          } else {
            toast.warning(
              `تم إرسال ${result.success} صورة. فشل ${result.failed}.`
            )
          }
          
          if (result.errors && result.errors.length > 0) {
            setSendErrors(result.errors)
            setShowErrorDialog(true)
          }
          
          setSelectedIds([])
          setShowMediaDialog(false)
          clearImageSelection()
        } else {
          let errorMessage = "فشل إرسال الصورة"
          let errorDetails = ""
          
          try {
            const responseText = await response.text()
            console.log('📝 رد الخادم (نص):', responseText)
            console.log('📊 حالة الرد:', response.status, response.statusText)
            
            if (responseText && responseText.trim()) {
              try {
                const errorData = JSON.parse(responseText)
                console.log('📦 بيانات الخطأ (JSON):', errorData)
                
                errorMessage = errorData.error || 
                               errorData.message || 
                               errorData.msg || 
                               errorData.detail ||
                               errorData.description ||
                               (typeof errorData === 'string' ? errorData : null) ||
                               errorMessage
                
                errorDetails = JSON.stringify(errorData, null, 2)
                console.log('💬 رسالة الخطأ المستخرجة:', errorMessage)
              } catch {
                console.log('⚠️ فشل parse JSON، استخدام النص الخام')
                errorMessage = responseText.substring(0, 200)
                errorDetails = responseText
              }
            } else {
              console.log('⚠️ رد فارغ من الخادم')
              errorMessage = `خطأ HTTP ${response.status}: ${response.statusText}`
              errorDetails = `HTTP ${response.status} - ${response.statusText}\nلم يتم إرجاع محتوى من الخادم`
            }
          } catch (e) {
            console.error('❌ فشل قراءة رد الخادم:', e)
            errorMessage = `خطأ ${response.status}: ${response.statusText}`
            errorDetails = `HTTP ${response.status} - ${response.statusText}\nخطأ في القراءة: ${e}`
          }
          
          console.log('📋 رسالة الخطأ:', errorMessage)
          toast.error(errorMessage)
          
          setSendErrors([{
            customer: "تفاصيل الخطأ",
            error: `${errorMessage}\n\nالتفاصيل:\n${errorDetails}`
          }])
          setShowErrorDialog(true)
        }
      }
    } catch (error) {
      console.error("Error sending media:", error)
      const errorMsg = error instanceof Error ? error.message : "خطأ غير متوقع"
      
      toast.error(`خطأ في إرسال الصورة: ${errorMsg}`)
      
      setSendErrors([{
        customer: "النظام",
        error: errorMsg
      }])
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

  return (
    <PermissionGuard requiredPermission="view_services">
    <div className="h-full p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">إدارة رسائل الواتساب</h1>
        <p className="text-muted-foreground mt-2">
          إدارة وإرسال رسائل الواتساب للزبائن
        </p>
      </div>

      {}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <Button 
          className="gap-2"
          onClick={handleSendMessages}
          disabled={isSending || selectedIds.length === 0}
        >
          <Send className="h-4 w-4" />
          {isSending ? "جاري الإرسال..." : `إرسال رسالة (${selectedIds.length})`}
        </Button>

        <Button 
          variant="outline" 
          className="gap-2"
          onClick={() => {
            if (selectedIds.length === 0) {
              toast.error("يرجى تحديد زبائن على الأقل")
              return
            }
            setShowMediaDialog(true)
          }}
          disabled={selectedIds.length === 0}
        >
          <ImageIcon className="h-4 w-4" />
          إرسال وسائط ({selectedIds.length})
        </Button>

        <Button variant="outline" className="gap-2">
          <Megaphone className="h-4 w-4" />
          حملة إعلانية
        </Button>

        {}
        <div className="mr-auto">
          <Button
            variant="secondary"
            className="gap-2 bg-primary/10 hover:bg-primary/20"
            onClick={() => setShowPreview(true)}
          >
            <Eye className="h-4 w-4" />
            معاينة الرسالة الافتراضية
          </Button>
        </div>
      </div>

      {}
      <Card className="p-4 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="outline" size="icon">
            <FileText className="h-4 w-4" />
          </Button>

          <div className="flex-1 min-w-[200px] max-w-md flex gap-2">
            <Input
              placeholder="البحث بالاسم أو رقم الهاتف..."
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
            {selectedIds.length === filteredCustomers.length ? "إلغاء التحديد" : "تحديد الكل"}
          </Button>

          <Button
            variant="outline"
            className="gap-2"
            onClick={handleRefresh}
          >
            <RefreshCw className="h-4 w-4" />
            تحديث
          </Button>
        </div>
      </Card>

      {}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px] text-right">#</TableHead>
                <TableHead className="text-right">اسم الزبون</TableHead>
                <TableHead className="text-right">رقم الهاتف</TableHead>
                <TableHead className="text-right">تاريخ آخر تسديد</TableHead>
                <TableHead className="text-right">آخر مبلغ مسدد دينار</TableHead>
                <TableHead className="text-right">آخر مبلغ مسدد $</TableHead>
                <TableHead className="text-right">الرصيد الحالي دينار</TableHead>
                <TableHead className="text-right">الرصيد الحالي $</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    جاري التحميل...
                  </TableCell>
                </TableRow>
              ) : filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    لا توجد نتائج
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
                      <TableCell className="text-right" dir="ltr">{customer.phone_number || '-'}</TableCell>
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

        {}
        <div className="border-t p-4 bg-muted/30">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">إجمالي الزبائن:</p>
              <p className="text-2xl font-bold">{totalCustomers}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">إجمالي المبالغ المستحقة:</p>
              <p className="text-2xl font-bold text-orange-600">
                {totalBalanceIQD.toLocaleString('en-US')} IQD
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">إجمالي المبالغ المستحقة دولار:</p>
              <p className="text-2xl font-bold text-green-600">
                ${totalBalanceUSD.toLocaleString('en-US')}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {}
      <Dialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>تفاصيل الأخطاء ({sendErrors.length})</DialogTitle>
            <DialogDescription>
              قائمة بالزبائن الذين فشل إرسال الرسائل إليهم
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
            إغلاق
          </Button>
        </DialogContent>
      </Dialog>

      {}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>معاينة الرسالة الافتراضية</DialogTitle>
            <DialogDescription>
              عرض الرسالة المحفوظة في الإعدادات
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Card className="p-6 bg-muted/50">
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">عنوان الرسالة:</p>
                  <p className="text-lg font-semibold">{messagePreview.title}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">نص الرسالة:</p>
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
              تعديل الرسالة
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Send className="h-6 w-6 text-primary" />
              تأكيد إرسال الرسائل
            </DialogTitle>
            <DialogDescription>
              يرجى التأكيد قبل إرسال الرسائل
            </DialogDescription>
          </DialogHeader>

          <Card className="p-4 bg-primary/5 border-primary/20">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">عدد الزبائن:</span>
                <span className="text-2xl font-bold text-primary">{pendingCustomers.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">عدد الرسائل:</span>
                <span className="text-xl font-semibold">{pendingCustomers.length}</span>
              </div>
            </div>
          </Card>

          {pendingCustomers.length > 0 && (
            <div className="max-h-48 overflow-y-auto border rounded-md p-3 space-y-2">
              <p className="text-sm font-medium text-muted-foreground mb-2">الزبائن المحددون:</p>
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
              إلغاء
            </Button>
            <Button
              className="flex-1 gap-2"
              onClick={confirmSendMessages}
              disabled={isSending}
            >
              {isSending ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  جاري الإرسال...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  تأكيد الإرسال
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {}
      <Dialog open={showMediaDialog} onOpenChange={(open) => {
        setShowMediaDialog(open)
        if (!open) clearImageSelection()
      }}>
        <DialogContent className="max-w-5xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <ImageIcon className="h-6 w-6 text-primary" />
              إرسال صورة إلى الزبائن
            </DialogTitle>
            <DialogDescription>
              اختر صورة وأضف وصفاً لها قبل الإرسال
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[calc(90vh-180px)] overflow-y-auto">
            {}
            <Card className="p-3 bg-primary/5 border-primary/20 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">عدد الزبائن المحددين:</span>
                <span className="text-lg font-bold text-primary">{selectedIds.length}</span>
              </div>
            </Card>

            {!selectedImage ? (
              <div className="space-y-2">
                <label className="text-sm font-medium">اختر الصورة</label>
                <label htmlFor="image-upload" className="block">
                  <Card className="p-8 border-2 border-dashed hover:border-primary/50 cursor-pointer transition-colors">
                    <div className="flex flex-col items-center gap-3 text-center">
                      <Upload className="h-12 w-12 text-muted-foreground" />
                      <div>
                        <p className="font-medium">اضغط لاختيار صورة</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          يدعم جميع صيغ الصور (JPG, PNG, GIF, WEBP, إلخ)
                        </p>
                      </div>
                    </div>
                  </Card>
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                </label>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">الصورة المختارة</label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearImageSelection}
                    className="gap-1"
                  >
                    <Trash2 className="h-3 w-3" />
                    إزالة
                  </Button>
                </div>
                
                <Card className="p-4 bg-muted/50">
                  <div className="flex items-start gap-4">
                    {imagePreviewUrl && (
                      <div className="relative w-48 h-48 shrink-0 rounded-lg overflow-hidden border-2 border-primary/20">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={imagePreviewUrl}
                          alt="معاينة الصورة"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1 space-y-2">
                      <div>
                        <p className="text-sm text-muted-foreground">اسم الملف:</p>
                        <p className="font-medium">{selectedImage.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">الحجم:</p>
                        <p className="font-medium">{(selectedImage.size / 1024).toFixed(2)} KB</p>
                      </div>
                    </div>
                  </div>
                </Card>

                <div className="space-y-2">
                  <label className="text-sm font-medium">الوصف (اختياري)</label>
                  <Textarea
                    placeholder="أضف وصفاً للصورة..."
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
              إلغاء
            </Button>
            <Button
              className="flex-1 gap-2"
              onClick={handleSendMedia}
              disabled={!selectedImage || isSendingMedia}
            >
              {isSendingMedia ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  جاري الإرسال...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  إرسال الصورة
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </PermissionGuard>
  )
}