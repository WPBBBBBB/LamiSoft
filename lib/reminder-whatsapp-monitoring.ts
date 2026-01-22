import type { NextRequest } from "next/server"
import { reminderSupabaseServer } from "@/lib/reminder-supabase-server"

export type ReminderWhatsAppOperation = "send_text" | "send_media"

export type ReminderWhatsAppLogRow = {
  operation: ReminderWhatsAppOperation
  phone: string
  success: boolean
  error_message?: string | null
  media_url?: string | null
  caption?: string | null
  meta?: Record<string, unknown> | null
}

async function tryGetReminderUserIdFromRequest(request: NextRequest): Promise<string | null> {
  const sessionToken = request.headers.get("x-reminder-session-token") || ""
  if (!sessionToken) return null

  try {
    const { data: session, error } = await reminderSupabaseServer
      .from("reminder_sessions")
      .select("user_id, expires_at")
      .eq("session_token", sessionToken)
      .gt("expires_at", new Date().toISOString())
      .single()

    if (error || !session) return null
    const userId = (session as { user_id?: string | null }).user_id
    return userId || null
  } catch {
    return null
  }
}

export async function logReminderWhatsAppSends(
  request: NextRequest,
  rows: ReminderWhatsAppLogRow[]
): Promise<void> {
  if (!rows || rows.length === 0) return

  try {
    const reminder_user_id = await tryGetReminderUserIdFromRequest(request)

    const payload = rows
      .filter(r => r && typeof r.phone === "string" && r.phone.trim() !== "")
      .map(r => ({
        reminder_user_id: reminder_user_id,
        operation: r.operation,
        phone: r.phone,
        success: Boolean(r.success),
        error_message: r.error_message ? String(r.error_message) : null,
        media_url: r.media_url ? String(r.media_url) : null,
        caption: r.caption ? String(r.caption) : null,
        meta: r.meta && typeof r.meta === "object" ? r.meta : {},
      }))

    if (payload.length === 0) return

    const { error } = await reminderSupabaseServer
      .from("reminder_whatsapp_message_logs")
      .insert(payload)

    if (error) {
      // Monitoring must never break sending.
      console.error("Failed to log reminder WhatsApp sends:", error)
    }
  } catch (e) {
    // Monitoring must never break sending.
    console.error("Failed to log reminder WhatsApp sends (exception):", e)
  }
}
