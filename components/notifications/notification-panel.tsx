"use client"

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNotifications } from '@/components/providers/notification-provider'
import { useSettings } from '@/components/providers/settings-provider'
import { t } from '@/lib/translations'
import { Confetti } from '@/components/ui/confetti'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  Bell,
  BellOff,
  Check,
  Archive,
  Trash2,
  X,
  Trophy,
  AlertTriangle,
  Package,
  Award,
  Warehouse,
  TrendingUp,
  Info,
  CheckCircle,
  XCircle,
  User,
  Phone,
  DollarSign,
  Calendar,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Notification } from '@/lib/notification-system'

const iconMap: Record<string, React.ElementType> = {
  Trophy,
  AlertTriangle,
  Package,
  Award,
  Warehouse,
  TrendingUp,
  Info,
  CheckCircle,
  XCircle,
  User,
  Phone,
  DollarSign,
  Calendar,
  Sparkles,
  Bell,
}

const colorMap: Record<string, string> = {
  gold: 'from-yellow-400 via-yellow-500 to-amber-500',
  blue: 'from-blue-400 via-blue-500 to-blue-600',
  red: 'from-red-400 via-red-500 to-red-600',
  orange: 'from-orange-400 via-orange-500 to-orange-600',
  purple: 'from-purple-400 via-purple-500 to-purple-600',
  green: 'from-green-400 via-green-500 to-green-600',
}

const typeStyles: Record<Notification['type'], { icon: string; color: string; gradient: string }> = {
  milestone_customers: { icon: 'Trophy', color: 'text-yellow-500', gradient: 'gold' },
  milestone_inventory: { icon: 'Package', color: 'text-purple-500', gradient: 'purple' },
  milestone_sales: { icon: 'TrendingUp', color: 'text-green-500', gradient: 'green' },
  low_inventory: { icon: 'AlertTriangle', color: 'text-orange-500', gradient: 'orange' },
  debt_warning: { icon: 'DollarSign', color: 'text-red-500', gradient: 'red' },
  payment_due: { icon: 'Calendar', color: 'text-blue-500', gradient: 'blue' },
  success: { icon: 'CheckCircle', color: 'text-green-500', gradient: 'green' },
  warning: { icon: 'AlertTriangle', color: 'text-orange-500', gradient: 'orange' },
  error: { icon: 'XCircle', color: 'text-red-500', gradient: 'red' },
  system_info: { icon: 'Info', color: 'text-blue-500', gradient: 'blue' },
}

function NotificationItem({ notification }: { notification: Notification }) {
  const { currentLanguage } = useSettings()
  const { markAsRead, archiveNotif } = useNotifications()
  const style = typeStyles[notification.type] || typeStyles.system_info
  const Icon = iconMap[notification.icon || style.icon] || Bell
  const gradient = colorMap[notification.color] || colorMap[style.gradient]

  const isMilestone = notification.type.startsWith('milestone_')

  const normalized = (currentLanguage.code || 'en').toLowerCase().split(/[-_]/)[0]
  const locale = normalized === 'ar' ? 'ar-IQ' : normalized === 'ku' ? 'ckb-IQ' : 'en-US'

  // Handle click on notification to mark as read
  const handleNotificationClick = () => {
    if (!notification.is_read) {
      markAsRead(notification.id)
    }
    // If there's an action URL, navigate to it
    if (notification.action_url) {
      window.location.href = notification.action_url
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      onClick={handleNotificationClick}
      className={cn(
        "relative overflow-hidden rounded-lg border p-4 cursor-pointer transition-all hover:shadow-md",
        !notification.is_read ? "bg-blue-50/50 border-blue-200" : "bg-background",
        isMilestone && "border-2"
      )}
      style={
        isMilestone
          ? {
              backgroundImage: `linear-gradient(135deg, ${
                notification.color === 'gold'
                  ? '#fef3c7 0%, #fde68a 50%, #fcd34d 100%'
                  : 'transparent'
              })`,
            }
          : undefined
      }
    >
      {/* Gradient border effect for milestones */}
      {isMilestone && (
        <div
          className={cn("absolute inset-0 opacity-20 bg-linear-to-br", gradient)}
        />
      )}

      <div className="relative flex gap-3">
        {/* Icon */}
        <div
          className={cn(
            "shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
            isMilestone
              ? cn("bg-linear-to-br", gradient)
              : "bg-muted"
          )}
        >
          <Icon
            className={cn(
              "h-5 w-5",
              isMilestone ? "text-white" : style.color
            )}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h4 className={cn(
                "font-semibold text-sm leading-tight",
                isMilestone && "text-lg"
              )}>
                {notification.title}
                {isMilestone && (
                  <span className="inline-block mr-1">
                    <Sparkles className="h-4 w-4 inline text-yellow-500 animate-pulse" />
                  </span>
                )}
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                {new Date(notification.created_at).toLocaleString(locale, {
                  hour: '2-digit',
                  minute: '2-digit',
                  day: 'numeric',
                  month: 'short',
                })}
              </p>
            </div>

            {/* Priority badge */}
            {notification.priority !== 'normal' && (
              <Badge
                variant={
                  notification.priority === 'critical'
                    ? 'destructive'
                    : notification.priority === 'high'
                    ? 'default'
                    : 'secondary'
                }
                className="text-xs"
              >
                {notification.priority === 'critical'
                  ? t('urgent', currentLanguage.code)
                  : notification.priority === 'high'
                  ? t('important', currentLanguage.code)
                  : t('low', currentLanguage.code)}
              </Badge>
            )}
          </div>

          {/* Message */}
          <p className={cn(
            "text-sm text-foreground/90",
            isMilestone && "font-medium"
          )}>
            {notification.message}
          </p>

          {/* Actions */}
          <div className="flex items-center gap-1 pt-1" onClick={(e) => e.stopPropagation()}>
            {!notification.is_read && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAsRead(notification.id)}
                className="h-7 text-xs"
              >
                <Check className="h-3 w-3 mr-1" />
                {t('readAction', currentLanguage.code)}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => archiveNotif(notification.id)}
              className="h-7 text-xs"
            >
              <Archive className="h-3 w-3 mr-1" />
              {t('hide', currentLanguage.code)}
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export function NotificationPanel() {
  const { currentLanguage } = useSettings()
  const {
    notifications,
    unreadCount,
    isLoading,
    soundEnabled,
    isPanelOpen,
    togglePanel,
    markAllAsRead,
    archiveAllRead,
    toggleSound,
    refreshNotifications,
  } = useNotifications()
  
  const [showConfetti, setShowConfetti] = useState(false)

  // تشغيل الأنيميشن عند فتح البانل إذا كان هناك إشعارات احتفالية غير مقروءة
  useEffect(() => {
    if (isPanelOpen) {
      const hasConfettiNotification = notifications.some(
        (n) => n.metadata?.show_confetti && !n.is_read
      )
      if (hasConfettiNotification) {
        const timer = setTimeout(() => setShowConfetti(true), 0)
        return () => clearTimeout(timer)
      }
    }
  }, [isPanelOpen, notifications])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (isPanelOpen) {
      const interval = setInterval(refreshNotifications, 30000)
      return () => clearInterval(interval)
    }
  }, [isPanelOpen, refreshNotifications])

  if (!isPanelOpen) return null

  return (
    <>
      {/* أنيميشن الأوراق الملونة */}
      <Confetti active={showConfetti} onComplete={() => setShowConfetti(false)} />
      
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={togglePanel}
        className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
      />

      {/* Panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed top-0 right-0 h-full w-full sm:w-[480px] bg-background border-l shadow-2xl z-50 flex flex-col"
      >
        {/* Header */}
        <div className="p-4 border-b space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              <h2 className="text-xl font-bold">{t('notifications', currentLanguage.code)}</h2>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="rounded-full">
                  {unreadCount}
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={togglePanel}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleSound}
              className="flex-1"
            >
              {soundEnabled ? (
                <>
                  <Bell className="h-4 w-4 mr-1" />
                  {t('soundEnabled', currentLanguage.code)}
                </>
              ) : (
                <>
                  <BellOff className="h-4 w-4 mr-1" />
                  {t('soundMuted', currentLanguage.code)}
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
            >
              <Check className="h-4 w-4 mr-1" />
              {t('readAll', currentLanguage.code)}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={archiveAllRead}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              {t('cleanUp', currentLanguage.code)}
            </Button>
          </div>
        </div>

        {/* Notifications List */}
        <ScrollArea className="flex-1 h-[calc(100vh-200px)]">
          <div className="p-4 space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Bell className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-lg font-medium text-muted-foreground">
                  {t('noNotifications', currentLanguage.code)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('wellNotifyWhenNew', currentLanguage.code)}
                </p>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                  />
                ))}
              </AnimatePresence>
            )}
          </div>
        </ScrollArea>
      </motion.div>
    </>
  )
}
