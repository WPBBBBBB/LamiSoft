"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Bell, RefreshCw, Eye, EyeOff, Trash2, Calendar, User, Phone, AlertTriangle, Trophy } from "lucide-react"
import { Confetti } from "@/components/ui/confetti"
import { toast } from "sonner"
import { useNotifications } from "@/components/providers/notification-provider"
import { useSettings } from "@/components/providers/settings-provider"
import { t } from "@/lib/translations"
import {
  getAllNotifications,
  markNotificationAsRead,
  deleteNotification,
  DebtNotification,
} from "@/lib/notifications-operations"

function metadataShowsConfetti(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== "object") return false
  return (metadata as Record<string, unknown>)["show_confetti"] === true
}

export default function NotificationsPage() {
  const { currentLanguage } = useSettings()
  const { runChecks, refreshNotifications, markAllAsRead: providerMarkAllAsRead } = useNotifications()
  const [notifications, setNotifications] = useState<DebtNotification[]>([])
  const [showRead, setShowRead] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)

  const getLocaleFromLanguage = useCallback((code: string) => {
    const normalized = (code || "en").toLowerCase().split(/[-_]/)[0]
    if (normalized === "ar") return "ar-IQ"
    if (normalized === "ku") return "ckb-IQ"
    return "en-US"
  }, [])

  const locale = getLocaleFromLanguage(currentLanguage.code)

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await getAllNotifications(showRead)
      if (result.success) {
        setNotifications(result.data || [])
        
        // تشغيل الأنيميشن إذا كان هناك إشعار احتفالي جديد
        const hasConfettiNotification = result.data?.some(
          (n) => metadataShowsConfetti(n.metadata) && !n.is_read
        )
        if (hasConfettiNotification) {
          setShowConfetti(true)
          // تشغيل صوت احتفالي
          const audio = new Audio('/sounds/celebration.mp3')
          audio.play().catch(() => {}) // تجاهل الخطأ إذا لم يكن الملف موجود
        }
      } else {
        toast.error(result.error || t("failedToFetchNotifications", currentLanguage.code))
      }
    } catch (error) {
      toast.error(t("errorFetchingNotifications", currentLanguage.code))
    } finally {
      setIsLoading(false)
    }
  }, [showRead])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

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
      toast.error(t("errorRefreshing", currentLanguage.code))
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleMarkAsRead = async (id: string) => {
    try {
      const result = await markNotificationAsRead(id)
      if (result.success) {
        toast.success(t("notificationMarkedAsRead", currentLanguage.code))
        // تحديث الـ provider (سيحدث الهيدر تلقائياً)
        await refreshNotifications()
        // تحديث القائمة المحلية
        await fetchNotifications()
      } else {
        toast.error(result.error || t("failedToMarkNotification", currentLanguage.code))
      }
    } catch (error) {
      toast.error(t("errorOccurred", currentLanguage.code))
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      // استخدام دالة الـ provider (سيحدث الهيدر تلقائياً)
      await providerMarkAllAsRead()
      // تحديث القائمة المحلية
      await fetchNotifications()
    } catch (error) {
      toast.error(t("errorOccurred", currentLanguage.code))
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t("confirmDeleteNotification", currentLanguage.code))) return

    try {
      const result = await deleteNotification(id)
      if (result.success) {
        toast.success(t("notificationDeleted", currentLanguage.code))
        // تحديث الـ provider (سيحدث الهيدر تلقائياً)
        await refreshNotifications()
        // تحديث القائمة المحلية
        await fetchNotifications()
      } else {
        toast.error(result.error || t("deleteFailed", currentLanguage.code))
      }
    } catch (error) {
      toast.error(t("errorOccurred", currentLanguage.code))
    }
  }

  const getNotificationIcon = (type: string, metadata?: unknown) => {
    // إشعار احتفالي (معلم الزبائن)
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
    // إشعار احتفالي (معلم الزبائن)
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
      {/* أنيميشن الأوراق الملونة */}
      <Confetti active={showConfetti} onComplete={() => setShowConfetti(false)} />
      
      {/* الهيدر */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("debtNotificationsTitle", currentLanguage.code)}</h1>
          <p className="text-muted-foreground mt-1">
            {t("debtNotificationsDescription", currentLanguage.code)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-lg px-3 py-1">
              {unreadCount} {t("unread", currentLanguage.code)}
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
          </div>
        </CardContent>
      </Card>

      {/* جدول الإشعارات */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-6 w-6" />
            {t("notificationsList", currentLanguage.code)} ({notifications.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">{t("loadingNotifications", currentLanguage.code)}</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg text-muted-foreground">{t("noNotifications", currentLanguage.code)}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
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
                  {notifications.map((notification) => (
                    <TableRow 
                      key={notification.id}
                      className={notification.is_read ? "opacity-50" : "bg-blue-50/50"}
                    >
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
  )
}
