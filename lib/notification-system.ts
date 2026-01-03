import { supabase } from "./supabase"

export interface Notification {
  id: string
  type: 'debt_warning' | 'low_inventory' | 'milestone_customers' | 'milestone_inventory' | 
        'milestone_sales' | 'system_info' | 'payment_due' | 'success' | 'warning' | 'error'
  priority: 'low' | 'normal' | 'high' | 'critical'
  title: string
  message: string
  icon?: string
  color: string
  metadata?: Record<string, unknown>
  is_read: boolean
  is_archived: boolean
  sound_enabled: boolean
  action_url?: string
  created_at: string
  read_at?: string
  archived_at?: string
}

export interface NotificationSettings {
  id: string
  sound_enabled: boolean
  show_desktop_notifications: boolean
  notification_types_enabled: Record<string, boolean>
  created_at: string
  updated_at: string
}

/**
 * جلب جميع الإشعارات
 */
export async function getAllNotifications(options?: {
  includeRead?: boolean
  includeArchived?: boolean
  limit?: number
}): Promise<{
  success: boolean
  data?: Notification[]
  error?: string
}> {
  try {
    let query = supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })

    if (!options?.includeRead) {
      query = query.eq("is_read", false)
    }

    if (!options?.includeArchived) {
      query = query.eq("is_archived", false)
    }

    if (options?.limit) {
      query = query.limit(options.limit)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching notifications:", error)
      return {
        success: false,
        error: error.message,
      }
    }

    return {
      success: true,
      data: data || [],
    }
  } catch (error) {
    console.error("Exception in getAllNotifications:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
    }
  }
}

/**
 * جلب عدد الإشعارات غير المقروءة
 */
export async function getUnreadNotificationsCount(): Promise<{
  success: boolean
  count?: number
  error?: string
}> {
  try {
    const { count, error } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("is_read", false)
      .eq("is_archived", false)

    if (error) {
      console.error("Error fetching unread count:", error)
      return {
        success: false,
        error: error.message,
      }
    }

    return {
      success: true,
      count: count || 0,
    }
  } catch (error) {
    console.error("Exception in getUnreadNotificationsCount:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
    }
  }
}

/**
 * تعيين إشعار كمقروء
 */
export async function markNotificationAsRead(notificationId: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const { error } = await supabase
      .from("notifications")
      .update({ 
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq("id", notificationId)

    if (error) {
      console.error("Error marking notification as read:", error)
      return {
        success: false,
        error: error.message,
      }
    }

    return { success: true }
  } catch (error) {
    console.error("Exception in markNotificationAsRead:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
    }
  }
}

/**
 * تعيين جميع الإشعارات كمقروءة
 */
export async function markAllNotificationsAsRead(): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const { error } = await supabase
      .from("notifications")
      .update({ 
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq("is_read", false)
      .eq("is_archived", false)

    if (error) {
      console.error("Error marking all notifications as read:", error)
      return {
        success: false,
        error: error.message,
      }
    }

    return { success: true }
  } catch (error) {
    console.error("Exception in markAllNotificationsAsRead:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
    }
  }
}

/**
 * أرشفة إشعار
 */
export async function archiveNotification(notificationId: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const { error } = await supabase
      .from("notifications")
      .update({ 
        is_archived: true,
        archived_at: new Date().toISOString()
      })
      .eq("id", notificationId)

    if (error) {
      console.error("Error archiving notification:", error)
      return {
        success: false,
        error: error.message,
      }
    }

    return { success: true }
  } catch (error) {
    console.error("Exception in archiveNotification:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
    }
  }
}

/**
 * أرشفة جميع الإشعارات المقروءة
 */
export async function archiveAllReadNotifications(): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const { error } = await supabase
      .from("notifications")
      .update({ 
        is_archived: true,
        archived_at: new Date().toISOString()
      })
      .eq("is_read", true)
      .eq("is_archived", false)

    if (error) {
      console.error("Error archiving notifications:", error)
      return {
        success: false,
        error: error.message,
      }
    }

    return { success: true }
  } catch (error) {
    console.error("Exception in archiveAllReadNotifications:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
    }
  }
}

/**
 * حذف إشعار
 */
export async function deleteNotification(notificationId: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notificationId)

    if (error) {
      console.error("Error deleting notification:", error)
      return {
        success: false,
        error: error.message,
      }
    }

    return { success: true }
  } catch (error) {
    console.error("Exception in deleteNotification:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
    }
  }
}

/**
 * جلب إعدادات الإشعارات
 */
export async function getNotificationSettings(): Promise<{
  success: boolean
  data?: NotificationSettings
  error?: string
}> {
  try {
    const { data, error } = await supabase
      .from("notification_settings")
      .select("*")
      .limit(1)
      .single()

    if (error) {
      console.error("Error fetching notification settings:", error)
      return {
        success: false,
        error: error.message,
      }
    }

    return {
      success: true,
      data: data,
    }
  } catch (error) {
    console.error("Exception in getNotificationSettings:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
    }
  }
}

/**
 * تحديث إعدادات الإشعارات
 */
export async function updateNotificationSettings(settings: Partial<NotificationSettings>): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const { error } = await supabase
      .from("notification_settings")
      .update(settings)
      .eq("id", settings.id!)

    if (error) {
      console.error("Error updating notification settings:", error)
      return {
        success: false,
        error: error.message,
      }
    }

    return { success: true }
  } catch (error) {
    console.error("Exception in updateNotificationSettings:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
    }
  }
}

/**
 * تشغيل فحص الإشعارات التلقائي
 */
export async function runNotificationsChecks(): Promise<{
  success: boolean
  data?: {
    total: number
    milestones: number
    low_inventory: number
    debts: number
  }
  error?: string
}> {
  try {
    const { data, error } = await supabase.rpc("run_all_notification_checks")

    if (error) {
      console.error("Error running notifications checks:", error)
      return {
        success: false,
        error: error.message,
      }
    }

    return {
      success: true,
      data: data,
    }
  } catch (error) {
    console.error("Exception in runNotificationsChecks:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
    }
  }
}

/**
 * إنشاء إشعار جديد
 */
export async function createNotification(notification: {
  type: Notification['type']
  title: string
  message: string
  priority?: Notification['priority']
  icon?: string
  color?: string
  metadata?: Record<string, unknown>
  action_url?: string
}): Promise<{
  success: boolean
  id?: string
  error?: string
}> {
  try {
    const { data, error } = await supabase.rpc("create_notification", {
      p_type: notification.type,
      p_title: notification.title,
      p_message: notification.message,
      p_priority: notification.priority || 'normal',
      p_icon: notification.icon || null,
      p_color: notification.color || 'blue',
      p_metadata: notification.metadata || null,
      p_action_url: notification.action_url || null,
    })

    if (error) {
      console.error("Error creating notification:", error)
      return {
        success: false,
        error: error.message,
      }
    }

    return {
      success: true,
      id: data,
    }
  } catch (error) {
    console.error("Exception in createNotification:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
    }
  }
}

/**
 * الاشتراك في الإشعارات الجديدة (Real-time)
 */
export function subscribeToNotifications(
  callback: (notification: Notification) => void
) {
  const channel = supabase
    .channel('notifications')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
      },
      (payload) => {
        callback(payload.new as Notification)
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
