import { NextRequest, NextResponse } from "next/server"
import { loginWithPassword } from "@/lib/auth-operations"
import { AUTH_SESSION_COOKIE, createSessionToken } from "@/lib/auth-session"

const REMEMBER_MAX_AGE_SECONDS = 30 * 24 * 60 * 60
const SESSION_MAX_AGE_SECONDS = 12 * 60 * 60

function isSecureRequest(request: NextRequest): boolean {
  const proto = request.headers.get("x-forwarded-proto")
  if (proto) return proto === "https"
  return new URL(request.url).protocol === "https:"
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      username?: string
      password?: string
      rememberMe?: boolean
      ipAddress?: string
    }

    const username = (body.username || "").trim()
    const password = body.password || ""
    const rememberMe = !!body.rememberMe

    if (!username || !password) {
      return NextResponse.json({ success: false, error: "بيانات الدخول غير مكتملة" }, { status: 400 })
    }

    const result = await loginWithPassword({ username, password }, body.ipAddress)
    if (!result.success || !result.user) {
      return NextResponse.json({ success: false, error: result.error || "فشل تسجيل الدخول" }, { status: 401 })
    }

    const maxAge = rememberMe ? REMEMBER_MAX_AGE_SECONDS : SESSION_MAX_AGE_SECONDS
    const token = await createSessionToken(result.user.id, maxAge)

    const { password: _pw, ...safeUser } = result.user as unknown as Record<string, unknown>

    const response = NextResponse.json({ success: true, user: safeUser })
    response.cookies.set({
      name: AUTH_SESSION_COOKIE,
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: isSecureRequest(request),
      path: "/",
      maxAge,
    })

    return response
  } catch (error) {
    return NextResponse.json({ success: false, error: "حدث خطأ أثناء تسجيل الدخول" }, { status: 500 })
  }
}
