"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bell, RefreshCw, Eye, Menu } from "lucide-react"
import { t } from "@/lib/translations"
import { useSettings } from "@/components/providers/settings-provider"
import { useNotifications } from "@/components/providers/notification-provider"
import { toast } from "sonner"
import { useAuth } from "@/contexts/auth-context"

export function NotificationsCard() {
  const { currentLanguage } = useSettings()
  const { currentUser } = useAuth()
  const router = useRouter()
  const { unreadCount, runChecks, refreshNotifications, markAllAsRead } = useNotifications()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isMarkingRead, setIsMarkingRead] = useState(false)

  // التحقق من صلاحية عرض الإشعارات
  const canViewNotifications = currentUser?.permission_type === 'مدير' || 
    (currentUser?.permission_type === 'موظف' && currentUser?.permissions?.view_notifications)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      // تشغيل فحص الإشعارات وتحديث الـ provider
      await runChecks()
      // تحديث الإشعارات في الـ provider (سيحدث الهيدر تلقائياً)
      await refreshNotifications()
    } catch (error) {
      console.error("Error refreshing notifications:", error)
      toast.error("حدث خطأ أثناء التحديث")
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleMarkAllAsRead = async () => {
    setIsMarkingRead(true)
    try {
      // استخدام دالة الـ provider (سيحدث الهيدر تلقائياً)
      await markAllAsRead()
    } catch (error) {
      console.error("Error marking notifications as read:", error)
      toast.error("حدث خطأ أثناء التعيين")
    } finally {
      setIsMarkingRead(false)
    }
  }

  // إخفاء البطاقة إذا لم تكن الصلاحية متاحة
  if (!canViewNotifications) {
    return null
  }

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <div className="rounded-full p-2" style={{ backgroundColor: 'var(--theme-surface)' }}>
            <Bell className="h-5 w-5" style={{ color: 'var(--theme-primary)' }} />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold">{t('monthlyPaymentNotifications', currentLanguage.code)}</h3>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--theme-surface)' }}>
          <p className="text-sm text-muted-foreground text-center">
            {t('youHave', currentLanguage.code)} <Badge variant="secondary" className="mx-1">{unreadCount}</Badge> {t('unreadNotifications', currentLanguage.code)}
          </p>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
              {t('refresh', currentLanguage.code)}
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={isMarkingRead || unreadCount === 0}
            >
              <Eye className="h-4 w-4 mr-2" />
              {t('markAsRead', currentLanguage.code)}
            </Button>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/notifications')}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
