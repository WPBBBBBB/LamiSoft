import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function requireReminderSession(request: NextRequest) {
  const sessionToken = request.headers.get("x-reminder-session-token") || ""
  if (!sessionToken) {
    return { ok: false as const, error: "غير مصرح: يرجى تسجيل الدخول لنظام التذكير" }
  }

  const { data: session, error } = await supabase
    .from("reminder_sessions")
    .select(`*, reminder_users (*)`)
    .eq("session_token", sessionToken)
    .gt("expires_at", new Date().toISOString())
    .single()

  if (error || !session) {
    return { ok: false as const, error: "جلسة غير صالحة أو منتهية" }
  }

  const user = session.reminder_users as Record<string, unknown> | null
  if (!user || user.is_active === false) {
    return { ok: false as const, error: "المستخدم غير مفعل" }
  }

  return { ok: true as const }
}

function startOfTodayISO() {
  const now = new Date()
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return d.toISOString()
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireReminderSession(request)
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: 401 })
    }

    // Totals
    const [{ count: totalAttempted, error: totalErr }, { count: totalSuccess, error: succErr }, { count: totalFailed, error: failErr }] =
      await Promise.all([
        supabase
          .from("reminder_whatsapp_message_logs")
          .select("id", { count: "exact", head: true }),
        supabase
          .from("reminder_whatsapp_message_logs")
          .select("id", { count: "exact", head: true })
          .eq("success", true),
        supabase
          .from("reminder_whatsapp_message_logs")
          .select("id", { count: "exact", head: true })
          .eq("success", false),
      ])

    if (totalErr || succErr || failErr) {
      console.error("Error counting reminder whatsapp logs:", totalErr || succErr || failErr)
      return NextResponse.json({ error: "فشل جلب الإحصائيات" }, { status: 500 })
    }

    const todayIso = startOfTodayISO()
    const { count: todaySent, error: todayErr } = await supabase
      .from("reminder_whatsapp_message_logs")
      .select("id", { count: "exact", head: true })
      .eq("success", true)
      .gte("created_at", todayIso)

    if (todayErr) {
      console.error("Error counting today reminder whatsapp logs:", todayErr)
      return NextResponse.json({ error: "فشل جلب إحصائيات اليوم" }, { status: 500 })
    }

    const { count: activeUsers, error: usersErr } = await supabase
      .from("reminder_users")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)

    if (usersErr) {
      console.error("Error counting active reminder users:", usersErr)
      return NextResponse.json({ error: "فشل جلب المستخدمين النشطين" }, { status: 500 })
    }

    const { data: recent, error: recentErr } = await supabase
      .from("reminder_whatsapp_message_logs")
      .select("created_at, operation, phone, success, error_message")
      .order("created_at", { ascending: false })
      .limit(8)

    if (recentErr) {
      console.error("Error fetching recent reminder whatsapp logs:", recentErr)
      return NextResponse.json({ error: "فشل جلب النشاط الأخير" }, { status: 500 })
    }

    const attempted = Number(totalAttempted || 0)
    const success = Number(totalSuccess || 0)
    const failed = Number(totalFailed || 0)
    const successRate = attempted > 0 ? Math.round((success / attempted) * 1000) / 10 : 0

    return NextResponse.json({
      success: true,
      stats: {
        totalAttempted: attempted,
        totalSent: success,
        totalFailed: failed,
        successRate,
        todaySent: Number(todaySent || 0),
        activeUsers: Number(activeUsers || 0),
      },
      recentActivity: (recent || []).map(r => ({
        created_at: r.created_at,
        operation: r.operation,
        phone: r.phone,
        success: r.success,
        error_message: r.error_message,
      })),
    })
  } catch (e) {
    console.error("Error in reminder dashboard stats API:", e)
    return NextResponse.json({ error: "حدث خطأ أثناء جلب الإحصائيات" }, { status: 500 })
  }
}
