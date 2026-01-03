"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Bell, RefreshCw, Eye, EyeOff, Trash2, Calendar, User, Phone, AlertTriangle, Trophy } from "lucide-react"
import { Confetti } from "@/components/ui/confetti"
import { toast } from "sonner"
import { useNotifications } from "@/components/providers/notification-provider"
import {
  getAllNotifications,
  markNotificationAsRead,
  deleteNotification,
  DebtNotification,
} from "@/lib/notifications-operations"

export default function NotificationsPage() {
  const { runChecks, refreshNotifications, markAllAsRead: providerMarkAllAsRead } = useNotifications()
  const [notifications, setNotifications] = useState<DebtNotification[]>([])
  const [showRead, setShowRead] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)

  const fetchNotifications = async () => {
    setIsLoading(true)
    try {
      const result = await getAllNotifications(showRead)
      if (result.success) {
        setNotifications(result.data || [])
        
        // تشغيل الأنيميشن إذا كان هناك إشعار احتفالي جديد
        const hasConfettiNotification = result.data?.some(
          (n: any) => n.metadata?.show_confetti && !n.is_read
        )
        if (hasConfettiNotification) {
          setShowConfetti(true)
          // تشغيل صوت احتفالي
          const audio = new Audio('/sounds/celebration.mp3')
          audio.play().catch(() => {}) // تجاهل الخطأ إذا لم يكن الملف موجود
        }
      } else {
        toast.error(result.error || "فشل جلب الإشعارات")
      }
    } catch (error) {
      console.error("Error fetching notifications:", error)
      toast.error("حدث خطأ أثناء جلب الإشعارات")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showRead])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      // تشغيل فحص الإشعارات
      await runChecks()
      // تحديث الإشعارات في الـ provider (سيحدث الهيدر تلقائياً)
      await refreshNotifications()
      // تحديث القائمة المحلية
      await fetchNotifications()
    } catch (error) {
      console.error("Error refreshing notifications:", error)
      toast.error("حدث خطأ أثناء التحديث")
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleMarkAsRead = async (id: string) => {
    try {
      const result = await markNotificationAsRead(id)
      if (result.success) {
        toast.success("تم تعيين الإشعار كمقروء")
        // تحديث الـ provider (سيحدث الهيدر تلقائياً)
        await refreshNotifications()
        // تحديث القائمة المحلية
        await fetchNotifications()
      } else {
        toast.error(result.error || "فشل تعيين الإشعار")
      }
    } catch (error) {
      console.error("Error marking notification as read:", error)
      toast.error("حدث خطأ")
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      // استخدام دالة الـ provider (سيحدث الهيدر تلقائياً)
      await providerMarkAllAsRead()
      // تحديث القائمة المحلية
      await fetchNotifications()
    } catch (error) {
      console.error("Error marking all as read:", error)
      toast.error("حدث خطأ")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الإشعار؟")) return

    try {
      const result = await deleteNotification(id)
      if (result.success) {
        toast.success("تم حذف الإشعار")
        // تحديث الـ provider (سيحدث الهيدر تلقائياً)
        await refreshNotifications()
        // تحديث القائمة المحلية
        await fetchNotifications()
      } else {
        toast.error(result.error || "فشل الحذف")
      }
    } catch (error) {
      console.error("Error deleting notification:", error)
      toast.error("حدث خطأ")
    }
  }

  const getNotificationIcon = (type: string, metadata?: any) => {
    // إشعار احتفالي (معلم الزبائن)
    if (metadata?.show_confetti) {
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

  const getNotificationBadge = (type: string, metadata?: any) => {
    // إشعار احتفالي (معلم الزبائن)
    if (metadata?.show_confetti) {
      return <Badge className="bg-gradient-to-r from-amber-400 to-yellow-500 text-white border-none">🏆 إنجاز رائع</Badge>
    }
    
    switch (type) {
      case 'تنبيه_قبل_3_ايام':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">اقتراب موعد</Badge>
      case 'تنبيه_مرور_شهر':
        return <Badge variant="outline" className="bg-red-100 text-red-800">مرور شهر</Badge>
      default:
        return <Badge variant="outline">عام</Badge>
    }
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* أنيميشن الأوراق الملونة */}
      <Confetti active={showConfetti} onComplete={() => setShowConfetti(false)} />
      
      {/* الهيدر */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">إشعارات الديون</h1>
          <p className="text-muted-foreground mt-1">
            إدارة إشعارات مواعيد التسديد والديون المستحقة
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-lg px-3 py-1">
              {unreadCount} غير مقروء
            </Badge>
          )}
        </div>
      </div>

      {/* أزرار التحكم */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing}
              size="lg"
            >
              <RefreshCw className={`h-5 w-5 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
              تحديث الإشعارات
            </Button>

            <Button
              onClick={handleMarkAllAsRead}
              disabled={unreadCount === 0}
              variant="outline"
              size="lg"
            >
              <Eye className="h-5 w-5 mr-2" />
              تعيين الكل كمقروء
            </Button>

            <Button
              onClick={() => setShowRead(!showRead)}
              variant="outline"
              size="lg"
            >
              {showRead ? (
                <>
                  <EyeOff className="h-5 w-5 mr-2" />
                  إخفاء المقروءة
                </>
              ) : (
                <>
                  <Eye className="h-5 w-5 mr-2" />
                  عرض المقروءة
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* جدول الإشعارات */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-6 w-6" />
            قائمة الإشعارات ({notifications.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">جاري تحميل الإشعارات...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg text-muted-foreground">لا توجد إشعارات</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">النوع</TableHead>
                    <TableHead className="text-right">الزبون</TableHead>
                    <TableHead className="text-right">الهاتف</TableHead>
                    <TableHead className="text-right">الرسالة</TableHead>
                    <TableHead className="text-right">آخر دفعة</TableHead>
                    <TableHead className="text-right">المبلغ المسدد</TableHead>
                    <TableHead className="text-right">الرصيد الحالي</TableHead>
                    <TableHead className="text-right">التاريخ</TableHead>
                    <TableHead className="text-right">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notifications.map((notification) => (
                    <TableRow 
                      key={notification.id}
                      className={notification.is_read ? "opacity-50" : "bg-blue-50/50"}
                    >
                      <TableCell>
                        {notification.is_read ? (
                          <Badge variant="outline">مقروء</Badge>
                        ) : (
                          <Badge>جديد</Badge>
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
                              {new Date(notification.last_payment_date).toLocaleDateString('ar-IQ')}
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
                          {new Date(notification.created_at).toLocaleString('ar-IQ')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {!notification.is_read && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleMarkAsRead(notification.id)}
                              title="تعيين كمقروء"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(notification.id)}
                            title="حذف"
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
  )
}
