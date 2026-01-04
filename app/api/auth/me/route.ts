import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { AUTH_SESSION_COOKIE, verifySessionToken } from "@/lib/auth-session"

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_SESSION_COOKIE)?.value
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifySessionToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = payload.sub

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: permissions, error: permError } = await supabase
      .from("user_permissions")
      .select("*")
      .eq("user_id", userId)
      .single()

    if (permError && permError.code !== "PGRST116") {
      return NextResponse.json({ error: "Failed to fetch permissions" }, { status: 500 })
    }

    const userWithoutPassword = { ...(user as Record<string, unknown>) }
    delete userWithoutPassword.password

    return NextResponse.json({
      ...userWithoutPassword,
      permissions: permissions || {
        view_statistics: false,
        view_reports: false,
        view_services: false,
        view_people: false,
        view_notifications: false,
        add_purchase: false,
        view_stores: false,
        view_store_transfer: false,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}
