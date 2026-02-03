"use client";
import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Bell, RefreshCw, Eye, EyeOff, Trash2, Calendar, User, Phone, AlertTriangle, Trophy, Menu, MessageCircle, Send } from "lucide-react"
import { Confetti } from "@/components/ui/confetti"
import { toast } from "sonner"
import { useNotifications } from "@/components/providers/notification-provider"
import { useSettings } from "@/components/providers/settings-provider"
import { t } from "@/lib/translations"
import { formatIraqiPhoneNumber } from "@/lib/whatsapp-messaging-utils"
import { supabase } from "@/lib/supabase"

interface DebtNotification {
  id: string
  customer_id: string
  customer_name: string
  customer_phone?: string
  customer_avatar?: string | null
  notification_type: string
  metadata?: unknown
  message: string
  last_payment_date?: string
  last_payment_amount_iqd?: number
  last_payment_amount_usd?: number
  current_balance_iqd?: number
  current_balance_usd?: number
  due_date?: string
  is_read: boolean
  created_at: string
  updated_at: string
}

function metadataShowsConfetti(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== "object") return false
  return (metadata as Record<string, unknown>)["show_confetti"] === true
}

type RawNotificationRow = {
  id: string
  type?: string | null
  title?: string | null
  message?: string | null
  body?: string | null
  metadata?: unknown
  is_read?: boolean | null
  created_at: string
  updated_at?: string | null
}

type RawCustomerRow = {
  id: string
  customer_name?: string | null
  phone_number?: string | null
  balanceiqd?: number | null
  balanceusd?: number | null
  avatar_url?: string | null
}

type RawPaymentRow = {
  customer_id: string
  pay_date?: string | null
  amount_iqd?: number | null
  amount_usd?: number | null
  transaction_type?: string | null
}

function getMetaString(metadata: unknown, key: string): string | undefined {
  if (!metadata || typeof metadata !== "object") return undefined
  const v = (metadata as Record<string, unknown>)[key]
  if (typeof v === "string" && v.trim().length > 0) return v
  return undefined
}

function getMetaNumber(metadata: unknown, key: string): number | undefined {
  if (!metadata || typeof metadata !== "object") return undefined
  const v = (metadata as Record<string, unknown>)[key]
  if (typeof v === "number" && Number.isFinite(v)) return v
  if (typeof v === "string" && v.trim()) {
    const n = Number(v)
    if (Number.isFinite(n)) return n
  }
  return undefined
}

// دوال لجلب وتحديث إشعارات الديون
async function getAllDebtNotifications(includeRead: boolean = false) {
  try {
    let query = supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })

    if (!includeRead) {
      query = query.eq("is_read", false)
    }

    const { data, error } = await query

    if (error) {
      return { success: false, error: error.message, data: [] }
    }

    const rows = (data || []) as RawNotificationRow[]

    // تصفية الإشعارات المتعلقة بالديون فقط
    const debtNotifications = rows.filter((n) => {
      const title = String(n.title || "")
      const message = String(n.message || n.body || "")
      return (
        n.type === "debt_reminder" ||
        title.includes("دين") ||
        title.includes("تسديد") ||
        message.includes("دين") ||
        message.includes("تسديد")
      )
    })
    
    // جلب معلومات الزبائن لإضافة رقم الهاتف
    const customerIds = debtNotifications
      .map((n) => getMetaString(n.metadata, "customer_id"))
      .filter((x): x is string => Boolean(x))
    
    let customersMap: Record<string, RawCustomerRow> = {}
    let paymentsMap: Record<string, RawPaymentRow> = {}
    
    if (customerIds.length > 0) {
      // جلب معلومات الزبائن
      const { data: customersData } = await supabase
        .from("customers")
        .select("id, customer_name, phone_number, balanceiqd, balanceusd, avatar_url")
        .in("id", customerIds)
      
      const customers = (customersData || []) as RawCustomerRow[]
      if (customers.length > 0) {
        customersMap = customers.reduce<Record<string, RawCustomerRow>>((acc, c) => {
          acc[c.id] = c
          return acc
        }, {})
      }
      
      // جلب آخر دفعة (قبض) لكل زبون
      const { data: paymentsData } = await supabase
        .from("payments")
        .select("customer_id, pay_date, amount_iqd, amount_usd, transaction_type")
        .in("customer_id", customerIds)
        .eq("transaction_type", "قبض")
        .order("pay_date", { ascending: false })
      
      const payments = (paymentsData || []) as RawPaymentRow[]
      if (payments.length > 0) {
        // أخذ آخر دفعة لكل زبون
        paymentsMap = payments.reduce<Record<string, RawPaymentRow>>((acc, p) => {
          if (!acc[p.customer_id]) acc[p.customer_id] = p
          return acc
        }, {})
      }
    }
    
    // تحويل الإشعارات إلى التنسيق المطلوب
    const formattedNotifications = debtNotifications.map((n) => {
      const metaCustomerId = getMetaString(n.metadata, "customer_id")
      const customer = metaCustomerId ? customersMap[metaCustomerId] : undefined
      const lastPayment = metaCustomerId ? paymentsMap[metaCustomerId] : undefined
      
      return {
        id: n.id,
        customer_id: metaCustomerId || "",
        customer_name:
          customer?.customer_name ||
          getMetaString(n.metadata, "customer_name") ||
          String(n.title || ""),
        customer_phone:
          customer?.phone_number ||
          getMetaString(n.metadata, "customer_phone") ||
          getMetaString(n.metadata, "phone_number") ||
          "",
        customer_avatar: customer?.avatar_url || null,
        notification_type: n.type || "تنبيه_عام",
        metadata: n.metadata,
        message: String(n.message || n.body || ""),
        last_payment_date:
          lastPayment?.pay_date || getMetaString(n.metadata, "last_payment_date"),
        last_payment_amount_iqd:
          (lastPayment?.amount_iqd ?? getMetaNumber(n.metadata, "last_payment_iqd") ?? 0) || 0,
        last_payment_amount_usd:
          (lastPayment?.amount_usd ?? getMetaNumber(n.metadata, "last_payment_usd") ?? 0) || 0,
        current_balance_iqd:
          (customer?.balanceiqd ?? getMetaNumber(n.metadata, "balanceiqd") ?? 0) || 0,
        current_balance_usd:
          (customer?.balanceusd ?? getMetaNumber(n.metadata, "balanceusd") ?? 0) || 0,
        is_read: Boolean(n.is_read),
        created_at: n.created_at,
        updated_at: n.updated_at || n.created_at,
      }
    })

    return { success: true, data: formattedNotifications }
  } catch (error) {
    return { success: false, error: String(error), data: [] }
  }
}

async function markDebtNotificationAsRead(id: string) {
  try {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true, updated_at: new Date().toISOString() })
      .eq("id", id)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

async function markAllDebtNotificationsAsRead() {
  try {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true, updated_at: new Date().toISOString() })
      .eq("is_read", false)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

async function deleteDebtNotification(id: string) {
  try {
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", id)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export default function NotificationsPage() {
  const { currentLanguage } = useSettings()
  const { runChecks, refreshNotifications } = useNotifications()
  const [notifications, setNotifications] = useState<DebtNotification[]>([])
  const [showRead, setShowRead] = useState(true) // تغيير القيمة الافتراضية لعرض الكل
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [viewMode, setViewMode] = useState<'table' | 'list'>('list')
  const [sendingMessageFor, setSendingMessageFor] = useState<string | null>(null)

  // استخدام الأرقام الإنجليزية دائماً
  const locale = "en-US"

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await getAllDebtNotifications(showRead)
      if (result.success) {
        const allData = result.data || []
        
        setNotifications(allData);
        
        const hasConfettiNotification = allData.some(
          (n: DebtNotification) => metadataShowsConfetti(n.metadata) && !n.is_read
        );
        if (hasConfettiNotification) {
          setShowConfetti(true);
          const audio = new Audio('/sounds/celebration.mp3');
          audio.play().catch(() => {});
        }
      } else {
        toast.error(result.error || t("failedToFetchNotifications", currentLanguage.code))
      }
    } catch {
      toast.error(t("errorFetchingNotifications", currentLanguage.code))
    } finally {
      setIsLoading(false)
    }
  }, [showRead, currentLanguage.code])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await runChecks();
      await refreshNotifications();
      await fetchNotifications();
    } catch {
      toast.error(t("errorRefreshing", currentLanguage.code))
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleMarkAsRead = async (id: string) => {
    try {
      const result = await markDebtNotificationAsRead(id)
      if (result.success) {
        toast.success(t("notificationMarkedAsRead", currentLanguage.code));
        await refreshNotifications();
        await fetchNotifications();
      } else {
        toast.error(result.error || t("failedToMarkNotification", currentLanguage.code))
      }
    } catch {
      toast.error(t("errorOccurred", currentLanguage.code))
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await markAllDebtNotificationsAsRead();
      await fetchNotifications();
    } catch {
      toast.error(t("errorOccurred", currentLanguage.code))
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t("confirmDeleteNotification", currentLanguage.code))) return

    try {
      const result = await deleteDebtNotification(id)
      if (result.success) {
        toast.success(t("notificationDeleted", currentLanguage.code));
        await refreshNotifications();
        await fetchNotifications();
      } else {
        toast.error(result.error || t("deleteFailed", currentLanguage.code))
      }
    } catch {
      toast.error(t("errorOccurred", currentLanguage.code))
    }
  }

  const handleOpenWhatsApp = (phoneNumber: string) => {
    if (!phoneNumber) {
      toast.error("رقم الهاتف غير متوفر")
      return
    }

    const formattedPhone = formatIraqiPhoneNumber(phoneNumber)
    const cleanPhone = formattedPhone.replace('+', '')
    
    // محاولة فتح التطبيق
    const whatsappAppUrl = `whatsapp://send?phone=${cleanPhone}`
    const whatsappWebUrl = `https://wa.me/${cleanPhone}`
    
    // محاولة فتح التطبيق أولاً
    window.location.href = whatsappAppUrl
    
    // إذا لم يفتح التطبيق خلال ثانية، افتح الويب
    setTimeout(() => {
      window.open(whatsappWebUrl, '_blank')
    }, 1000)
  }

  const handleSendReminder = async (notification: DebtNotification) => {
    if (!notification.customer_phone) {
      toast.error("رقم الهاتف غير متوفر")
      return
    }

    try {
      setSendingMessageFor(notification.id)
      
      // تجهيز بيانات الزبون
      const customerData = {
        customer_name: notification.customer_name,
        last_payment_date: notification.last_payment_date || null,
        last_payment_iqd: notification.last_payment_amount_iqd || 0,
        last_payment_usd: notification.last_payment_amount_usd || 0,
        balanceiqd: notification.current_balance_iqd || 0,
        balanceusd: notification.current_balance_usd || 0,
      }
      
      // إرسال الرسالة
      const sendResponse = await fetch("/api/whatsapp-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customers: [{
            id: notification.customer_id,
            phone_number: notification.customer_phone,
            ...customerData
          }]
        })
      })
      
      if (sendResponse.ok) {
        const result = await sendResponse.json()
        if (result.success > 0) {
          toast.success("تم إرسال رسالة التذكير بنجاح")
        } else {
          const errorMsg = result.errors?.[0]?.error || result.error || "فشل إرسال الرسالة"
          toast.error(`فشل الإرسال: ${errorMsg}`)
        }
      } else {
        const errorData = await sendResponse.json().catch(() => ({}))
        const errorMsg = errorData.error || errorData.message || `خطأ HTTP ${sendResponse.status}`
        toast.error(`فشل إرسال رسالة التذكير: ${errorMsg}`)
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      toast.error(`حدث خطأ أثناء إرسال الرسالة: ${errorMsg}`)
    } finally {
      setSendingMessageFor(null)
    }
  }

  const getNotificationIcon = (type: string, metadata?: unknown) => {
    if (metadataShowsConfetti(metadata)) {
      return <Trophy className="h-5 w-5 text-amber-500" />
    }
    
    switch (type) {
      case 'تنبيه_قبل_3_ايام':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      case 'تنبيه_مرور_شهر':
        return <Bell className="h-5 w-5 text-red-500" />
      default:
        return <Bell className="h-5 w-5 text-blue-500" />
    }
  }

  const getNotificationBadge = (type: string, metadata?: unknown) => {
    if (metadataShowsConfetti(metadata)) {
      return (
        <Badge className="bg-linear-to-r from-amber-400 to-yellow-500 text-white border-none">
          🏆 {t("amazingAchievement", currentLanguage.code)}
        </Badge>
      )
    }
    
    switch (type) {
      case 'تنبيه_قبل_3_ايام':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">{t("dueSoon", currentLanguage.code)}</Badge>
      case 'تنبيه_مرور_شهر':
        return <Badge variant="outline" className="bg-red-100 text-red-800">{t("monthPassed", currentLanguage.code)}</Badge>
      default:
        return <Badge variant="outline">{t("general", currentLanguage.code)}</Badge>
    }
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <div className="container mx-auto p-6 space-y-6">

      <Confetti active={showConfetti} onComplete={() => setShowConfetti(false)} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("debtNotificationsTitle", currentLanguage.code)}</h1>
          <p className="text-muted-foreground mt-1">
            لديك {unreadCount} إشعارات غير مقروءة لمواعيد التسديد والديون المستحقة
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-lg px-3 py-1">
              {unreadCount} {t("unread", currentLanguage.code)}
            </Badge>
          )}
          <Badge className="text-lg px-3 py-1 bg-blue-500">
            {notifications.length} إشعار
          </Badge>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing}
              size="lg"
            >
              <RefreshCw className={`h-5 w-5 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
              {t("refreshNotifications", currentLanguage.code)}
            </Button>

            <Button
              onClick={handleMarkAllAsRead}
              disabled={unreadCount === 0}
              variant="outline"
              size="lg"
            >
              <Eye className="h-5 w-5 mr-2" />
              {t("markAllAsRead", currentLanguage.code)}
            </Button>

            <Button
              onClick={() => setShowRead(!showRead)}
              variant="outline"
              size="lg"
            >
              {showRead ? (
                <>
                  <EyeOff className="h-5 w-5 mr-2" />
                  {t("hideRead", currentLanguage.code)}
                </>
              ) : (
                <>
                  <Eye className="h-5 w-5 mr-2" />
                  {t("showRead", currentLanguage.code)}
                </>
              )}
            </Button>

            <Button
              onClick={() => setViewMode(viewMode === 'table' ? 'list' : 'table')}
              variant="outline"
              size="lg"
            >
              <Menu className="h-5 w-5 mr-2" />
              {viewMode === 'table' ? 'عرض القائمة' : 'عرض الجدول'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-6 w-6" />
            {t("notificationsList", currentLanguage.code)} ({notifications.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                  <Skeleton className="h-5 w-5 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-9 w-24" />
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg text-muted-foreground">{t("noNotifications", currentLanguage.code)}</p>
            </div>
          ) : viewMode === 'list' ? (
            // عرض القائمة المفصلة
            <div className="space-y-4">
              {notifications.map((notification) => (
                <Card 
                  key={notification.id}
                  className={`w-full ${notification.is_read ? "opacity-60" : "border-2 border-blue-500 shadow-lg"}`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-6">
                      {/* صورة الزبون واسمه - الجهة اليمنى */}
                      <div className="flex flex-col items-center gap-3 min-w-[120px]">
                        <Avatar className="h-20 w-20">
                          <AvatarImage src={notification.customer_avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${notification.customer_name}`} />
                          <AvatarFallback className="text-2xl bg-blue-600 text-white">
                            {notification.customer_name.substring(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="text-center">
                          <p className="font-bold text-lg">{notification.customer_name}</p>
                          {notification.customer_phone && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1 justify-center">
                              <Phone className="h-3 w-3" />
                              {notification.customer_phone}
                            </p>
                          )}
                        </div>
                        {!notification.is_read && (
                          <Badge className="bg-red-500">جديد</Badge>
                        )}
                      </div>

                      {/* الرسالة - الوسط */}
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-2">
                          {getNotificationIcon(notification.notification_type, notification.metadata)}
                          {getNotificationBadge(notification.notification_type, notification.metadata)}
                        </div>
                        
                        <p className="text-lg leading-relaxed">{notification.message}</p>
                        
                        <div className="grid grid-cols-2 gap-4 mt-4 p-4 bg-muted rounded-lg">
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">آخر دفعة</p>
                            {notification.last_payment_date ? (
                              <>
                                <p className="font-semibold">
                                  {new Date(notification.last_payment_date).toLocaleDateString(locale)}
                                </p>
                                {notification.last_payment_amount_iqd && notification.last_payment_amount_iqd > 0 && (
                                  <p className="text-sm">{notification.last_payment_amount_iqd.toLocaleString()} د.ع</p>
                                )}
                                {notification.last_payment_amount_usd && notification.last_payment_amount_usd > 0 && (
                                  <p className="text-sm text-green-600">${notification.last_payment_amount_usd.toLocaleString()}</p>
                                )}
                              </>
                            ) : (
                              <p className="text-muted-foreground">-</p>
                            )}
                          </div>
                          
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">الرصيد الحالي</p>
                            {notification.current_balance_iqd && notification.current_balance_iqd > 0 && (
                              <p className="font-bold text-xl text-red-600">
                                {notification.current_balance_iqd.toLocaleString()} د.ع
                              </p>
                            )}
                            {notification.current_balance_usd && notification.current_balance_usd > 0 && (
                              <p className="font-bold text-xl text-red-600">
                                ${notification.current_balance_usd.toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* الأزرار - الجهة اليسرى */}
                      <div className="flex flex-col gap-3 min-w-[200px]">
                        {notification.customer_phone && (
                          <>
                            <Button
                              onClick={() => handleOpenWhatsApp(notification.customer_phone!)}
                              className="w-full bg-green-600 hover:bg-green-700"
                              size="lg"
                            >
                              <MessageCircle className="h-5 w-5 mr-2" />
                              فتح واتساب
                            </Button>
                            
                            <Button
                              onClick={() => handleSendReminder(notification)}
                              disabled={sendingMessageFor === notification.id}
                              variant="outline"
                              className="w-full"
                              size="lg"
                            >
                              <Send className="h-5 w-5 mr-2" />
                              {sendingMessageFor === notification.id ? "جاري الإرسال..." : "إرسال تذكير"}
                            </Button>
                          </>
                        )}
                        
                        {!notification.is_read && (
                          <Button
                            onClick={() => handleMarkAsRead(notification.id)}
                            variant="outline"
                            className="w-full"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            تعيين كمقروء
                          </Button>
                        )}
                        
                        <Button
                          onClick={() => handleDelete(notification.id)}
                          variant="destructive"
                          className="w-full"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          حذف
                        </Button>
                        
                        <p className="text-xs text-muted-foreground text-center mt-2">
                          {new Date(notification.created_at).toLocaleString(locale)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            // عرض الجدول الأصلي
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">#</TableHead>
                    <TableHead className="text-right">{t("status", currentLanguage.code)}</TableHead>
                    <TableHead className="text-right">{t("type", currentLanguage.code)}</TableHead>
                    <TableHead className="text-right">{t("customer", currentLanguage.code)}</TableHead>
                    <TableHead className="text-right">{t("phone", currentLanguage.code)}</TableHead>
                    <TableHead className="text-right">{t("message", currentLanguage.code)}</TableHead>
                    <TableHead className="text-right">{t("lastPayment", currentLanguage.code)}</TableHead>
                    <TableHead className="text-right">{t("paidAmount", currentLanguage.code)}</TableHead>
                    <TableHead className="text-right">{t("currentBalance", currentLanguage.code)}</TableHead>
                    <TableHead className="text-right">{t("date", currentLanguage.code)}</TableHead>
                    <TableHead className="text-right">{t("actions", currentLanguage.code)}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notifications.map((notification, index) => (
                    <TableRow 
                      key={notification.id}
                      className={notification.is_read ? "opacity-50" : "bg-blue-50/50"}
                    >
                      <TableCell>
                        <span className="font-semibold text-muted-foreground">{index + 1}</span>
                      </TableCell>
                      <TableCell>
                        {notification.is_read ? (
                          <Badge variant="outline">{t("read", currentLanguage.code)}</Badge>
                        ) : (
                          <Badge>{t("new", currentLanguage.code)}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getNotificationIcon(notification.notification_type, notification.metadata)}
                          {getNotificationBadge(notification.notification_type, notification.metadata)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{notification.customer_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {notification.customer_phone ? (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{notification.customer_phone}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-md">
                        <p className="text-sm">{notification.message}</p>
                      </TableCell>
                      <TableCell>
                        {notification.last_payment_date ? (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              {new Date(notification.last_payment_date).toLocaleDateString(locale)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {notification.last_payment_amount_iqd && notification.last_payment_amount_iqd > 0 && (
                            <div className="text-sm">
                              {notification.last_payment_amount_iqd.toLocaleString()} د.ع
                            </div>
                          )}
                          {notification.last_payment_amount_usd && notification.last_payment_amount_usd > 0 && (
                            <div className="text-sm text-green-600">
                              ${notification.last_payment_amount_usd.toLocaleString()}
                            </div>
                          )}
                          {!notification.last_payment_amount_iqd && !notification.last_payment_amount_usd && (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {notification.current_balance_iqd && notification.current_balance_iqd > 0 && (
                            <div className="text-sm font-semibold text-red-600">
                              {notification.current_balance_iqd.toLocaleString()} د.ع
                            </div>
                          )}
                          {notification.current_balance_usd && notification.current_balance_usd > 0 && (
                            <div className="text-sm font-semibold text-red-600">
                              ${notification.current_balance_usd.toLocaleString()}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {new Date(notification.created_at).toLocaleString(locale)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {notification.customer_phone ? (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenWhatsApp(notification.customer_phone!)}
                                title="فتح واتساب"
                              >
                                <MessageCircle className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleSendReminder(notification)}
                                disabled={sendingMessageFor === notification.id}
                                title={sendingMessageFor === notification.id ? "جاري الإرسال..." : "إرسال تذكير"}
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled
                              title="لا يوجد رقم واتساب"
                            >
                              <MessageCircle className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          )}
                          {!notification.is_read && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleMarkAsRead(notification.id)}
                              title={t("setAsReadTooltip", currentLanguage.code)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(notification.id)}
                            title={t("delete", currentLanguage.code)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
