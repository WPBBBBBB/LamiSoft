import { supabase } from "./supabase"

export interface DebtNotification {
  id: string
  customer_id: string
  customer_name: string
  customer_phone?: string
  notification_type: 'تنبيه_قبل_3_ايام' | 'تنبيه_مرور_شهر' | 'تنبيه_عام'
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

export interface NotificationSettings {
  id: string
  enabled: boolean
  check_interval_hours: number
  notify_before_days: number
  notify_after_months: number
  created_at: string
  updated_at: string
}

/**
 * جلب جميع الإشعارات
 */
export async function getAllNotifications(includeRead: boolean = false): Promise<{
  success: boolean
  data?: DebtNotification[]
  error?: string
}> {
  try {
    let query = supabase
      .from("debt_notifications")
      .select("*")
      .order("created_at", { ascending: false })

    if (!includeRead) {
      query = query.eq("is_read", false)
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
      .from("debt_notifications")
      .select("*", { count: "exact", head: true })
      .eq("is_read", false)

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
      .from("debt_notifications")
      .update({ is_read: true })
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
      .from("debt_notifications")
      .update({ is_read: true })
      .eq("is_read", false)

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
 * حذف إشعار
 */
export async function deleteNotification(notificationId: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const { error } = await supabase
      .from("debt_notifications")
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
 * تفعيل/إيقاف نظام الإشعارات التلقائي
 */
export async function toggleDebtNotifications(enabled: boolean): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const { error } = await supabase.rpc("toggle_debt_notifications", {
      p_enabled: enabled,
    })

    if (error) {
      console.error("Error toggling debt notifications:", error)
      return {
        success: false,
        error: error.message,
      }
    }

    return { success: true }
  } catch (error) {
    console.error("Exception in toggleDebtNotifications:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
    }
  }
}

/**
 * تشغيل فحص الإشعارات يدوياً
 */
export async function runNotificationsCheck(): Promise<{
  success: boolean
  count?: number
  error?: string
}> {
  try {
    const { data, error } = await supabase.rpc("run_all_notification_checks")

    if (error) {
      console.error("Error running notifications check:", error)
      return {
        success: false,
        error: error.message || "فشل تشغيل فحص الإشعارات. تأكد من تنفيذ ملفات SQL في قاعدة البيانات.",
      }
    }

    return {
      success: true,
      count: data?.total || 0,
    }
  } catch (error) {
    console.error("Exception in runNotificationsCheck:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
    }
  }
}

/**
 * جلب إشعارات زبون معين
 */
export async function getCustomerNotifications(customerId: string): Promise<{
  success: boolean
  data?: DebtNotification[]
  error?: string
}> {
  try {
    const { data, error } = await supabase
      .from("debt_notifications")
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching customer notifications:", error)
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
    console.error("Exception in getCustomerNotifications:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
    }
  }
}
