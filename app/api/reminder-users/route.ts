import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import bcrypt from "bcryptjs"

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

export async function GET(request: NextRequest) {
  try {
    const auth = await requireReminderSession(request)
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: 401 })
    }

    const { data, error } = await supabase
      .from("reminder_users")
      .select("id, full_name, username, is_active, created_at, updated_at")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching reminder users:", error)
      return NextResponse.json({ error: "فشل جلب المستخدمين" }, { status: 500 })
    }

    return NextResponse.json({ success: true, users: data || [] })
  } catch (e) {
    console.error("Error in reminder-users GET:", e)
    return NextResponse.json({ error: "حدث خطأ أثناء جلب المستخدمين" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireReminderSession(request)
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: 401 })
    }

    const body = await request.json()
    const full_name = String(body?.full_name || "").trim()
    const username = String(body?.username || "").trim()
    const password = String(body?.password || "")
    const is_active = typeof body?.is_active === "boolean" ? body.is_active : true

    if (!full_name || !username || !password) {
      return NextResponse.json(
        { error: "الاسم الكامل واسم المستخدم وكلمة المرور مطلوبة" },
        { status: 400 }
      )
    }

    const password_hash = await bcrypt.hash(password, 10)

    const { data, error } = await supabase
      .from("reminder_users")
      .insert({ full_name, username, password_hash, is_active })
      .select("id, full_name, username, is_active, created_at, updated_at")
      .single()

    if (error) {
      const msg = String((error as { message?: string } | null)?.message || "")
      if (msg.toLowerCase().includes("duplicate") || msg.toLowerCase().includes("unique")) {
        return NextResponse.json({ error: "اسم المستخدم مستخدم مسبقاً" }, { status: 409 })
      }
      console.error("Error creating reminder user:", error)
      return NextResponse.json({ error: "فشل إنشاء المستخدم" }, { status: 500 })
    }

    return NextResponse.json({ success: true, user: data })
  } catch (e) {
    console.error("Error in reminder-users POST:", e)
    return NextResponse.json({ error: "حدث خطأ أثناء إنشاء المستخدم" }, { status: 500 })
  }
}
