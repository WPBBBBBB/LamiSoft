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

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireReminderSession(request)
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: 401 })
    }

    const { id } = await context.params
    if (!id) {
      return NextResponse.json({ error: "معرف المستخدم مطلوب" }, { status: 400 })
    }

    const body = await request.json()
    const full_name = body?.full_name !== undefined ? String(body.full_name || "").trim() : undefined
    const username = body?.username !== undefined ? String(body.username || "").trim() : undefined
    const is_active = typeof body?.is_active === "boolean" ? body.is_active : undefined
    const password = body?.password !== undefined ? String(body.password || "") : undefined

    const updates: Record<string, unknown> = {}
    if (full_name !== undefined) {
      if (!full_name) return NextResponse.json({ error: "الاسم الكامل مطلوب" }, { status: 400 })
      updates.full_name = full_name
    }
    if (username !== undefined) {
      if (!username) return NextResponse.json({ error: "اسم المستخدم مطلوب" }, { status: 400 })
      updates.username = username
    }
    if (is_active !== undefined) updates.is_active = is_active
    if (password !== undefined) {
      // كلمة المرور اختيارية: إذا أُرسلت فارغة نُهملها
      if (password.trim().length > 0) {
        updates.password_hash = await bcrypt.hash(password, 10)
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "لا توجد بيانات للتحديث" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("reminder_users")
      .update(updates)
      .eq("id", id)
      .select("id, full_name, username, is_active, created_at, updated_at")
      .single()

    if (error) {
      const msg = String((error as { message?: string } | null)?.message || "")
      if (msg.toLowerCase().includes("duplicate") || msg.toLowerCase().includes("unique")) {
        return NextResponse.json({ error: "اسم المستخدم مستخدم مسبقاً" }, { status: 409 })
      }
      console.error("Error updating reminder user:", error)
      return NextResponse.json({ error: "فشل تحديث المستخدم" }, { status: 500 })
    }

    return NextResponse.json({ success: true, user: data })
  } catch (e) {
    console.error("Error in reminder-users PUT:", e)
    return NextResponse.json({ error: "حدث خطأ أثناء تحديث المستخدم" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireReminderSession(request)
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: 401 })
    }

    const { id } = await context.params
    if (!id) {
      return NextResponse.json({ error: "معرف المستخدم مطلوب" }, { status: 400 })
    }

    const { error } = await supabase.from("reminder_users").delete().eq("id", id)

    if (error) {
      console.error("Error deleting reminder user:", error)
      return NextResponse.json({ error: "فشل حذف المستخدم" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("Error in reminder-users DELETE:", e)
    return NextResponse.json({ error: "حدث خطأ أثناء حذف المستخدم" }, { status: 500 })
  }
}
