"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Bell, RefreshCw, Eye, Menu } from "lucide-react"
import { t } from "@/lib/translations"
import { useSettings } from "@/components/providers/settings-provider"
import {
  getUnreadNotificationsCount,
  markAllNotificationsAsRead,
  runNotificationsCheck,
} from "@/lib/notifications-operations"
import { toast } from "sonner"
import { useAuth } from "@/contexts/auth-context"

export function NotificationsCard() {
  const { currentLanguage } = useSettings()
  const { currentUser } = useAuth()
  const router = useRouter()
  const [debtUnreadCount, setDebtUnreadCount] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isMarkingRead, setIsMarkingRead] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const loadDebtUnreadCount = async () => {
    try {
      const result = await getUnreadNotificationsCount()
      if (!result.success) {
        throw new Error(result.error || "Failed to load debt notifications count")
      }
      setDebtUnreadCount(result.count || 0)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadDebtUnreadCount().catch((error) => {
      })
  }, [])

  // التحقق من صلاحية عرض الإشعارات
  const canViewNotifications = currentUser?.permission_type === 'مدير' || 
    (currentUser?.permission_type === 'موظف' && currentUser?.permissions?.view_notifications)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      const checkResult = await runNotificationsCheck()
      if (!checkResult.success) {
        throw new Error(checkResult.error || "Failed to run notifications check")
      }
      await loadDebtUnreadCount()
    } catch (error) {
      toast.error("حدث خطأ أثناء التحديث")
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleMarkAllAsRead = async () => {
    setIsMarkingRead(true)
    try {
      const result = await markAllNotificationsAsRead()
      if (!result.success) {
        throw new Error(result.error || "Failed to mark all notifications as read")
      }
      setDebtUnreadCount(0)
    } catch (error) {
      toast.error("حدث خطأ أثناء التعيين")
    } finally {
      setIsMarkingRead(false)
    }
  }

  // إخفاء البطاقة إذا لم تكن الصلاحية متاحة
  if (!canViewNotifications) {
    return null
  }

  if (isLoading) {
    return (
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-full" />
            <Skeleton className="h-6 w-48" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-full rounded-lg" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-32" />
          </div>
        </CardContent>
      </Card>
    )
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
            {t('youHave', currentLanguage.code)} <Badge variant="secondary" className="mx-1">{debtUnreadCount}</Badge> {t('unreadNotifications', currentLanguage.code)}
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
              disabled={isMarkingRead || debtUnreadCount === 0}
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
