import { NextRequest, NextResponse } from "next/server"
import { loginWithPassword } from "@/lib/auth-operations"
import { AUTH_SESSION_COOKIE, createSessionToken } from "@/lib/auth-session"
import { logSecurityEvent } from "@/lib/security-logger"

const REMEMBER_MAX_AGE_SECONDS = 30 * 24 * 60 * 60
const SESSION_MAX_AGE_SECONDS = 12 * 60 * 60

function getCookieDomain(): string | null {
  const domain = (process.env.AUTH_COOKIE_DOMAIN || "").trim()
  if (!domain) return null

  // Basic hardening to avoid header injection.
  if (domain.includes(";") || domain.includes("\n") || domain.includes("\r") || domain.includes(" ")) return null

  return domain
}

function buildSessionCookieHeader(token: string, maxAge: number, secure: boolean): string {
  const parts = [
    `${AUTH_SESSION_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    `Max-Age=${maxAge}`,
    "HttpOnly",
    "SameSite=Lax",
  ]

  const domain = getCookieDomain()
  if (domain) parts.push(`Domain=${domain}`)

  if (secure) parts.push("Secure")
  return parts.join("; ")
}

export async function POST(request: NextRequest) {
  try {
    if (process.env.NODE_ENV === "production") {
      const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET
      if (!secret) {
        logSecurityEvent("error", "login_misconfigured", {
          reason: "missing_auth_secret",
        })
        return NextResponse.json(
          { success: false, error: "خطأ في إعدادات الخادم (AUTH_SECRET)" },
          { status: 500 }
        )
      }
    }

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
      logSecurityEvent("warn", "login_rejected", {
        reason: "missing_credentials",
        ip: body.ipAddress || null,
        userAgent: request.headers.get("user-agent") || null,
      })
      return NextResponse.json({ success: false, error: "بيانات الدخول غير مكتملة" }, { status: 400 })
    }

    const result = await loginWithPassword({ username, password }, body.ipAddress)
    if (!result.success || !result.user) {
      logSecurityEvent("warn", "login_failed", {
        username,
        ip: body.ipAddress || null,
        userAgent: request.headers.get("user-agent") || null,
        error: result.error || null,
        hasSupabaseEnv: !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      })
      return NextResponse.json({ success: false, error: result.error || "فشل تسجيل الدخول" }, { status: 401 })
    }

    const maxAge = rememberMe ? REMEMBER_MAX_AGE_SECONDS : SESSION_MAX_AGE_SECONDS
    const token = await createSessionToken(result.user.id, maxAge)

    const { password: _pw, ...safeUser } = result.user as unknown as Record<string, unknown>

    const response = NextResponse.json({ success: true, user: safeUser })

    // Set both non-Secure and Secure variants to support deployments where the
    // app may be accessed over HTTP, HTTPS, or behind proxies with inconsistent proto headers.
    // Order matters: secure last so HTTPS ends up with Secure cookie.
    response.headers.append("Set-Cookie", buildSessionCookieHeader(token, maxAge, false))
    response.headers.append("Set-Cookie", buildSessionCookieHeader(token, maxAge, true))

    logSecurityEvent("info", "login_success", {
      userId: String(result.user.id),
      username,
      rememberMe,
      ip: body.ipAddress || null,
    })

    return response
  } catch (error) {
    logSecurityEvent("error", "login_error", {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ success: false, error: "حدث خطأ أثناء تسجيل الدخول" }, { status: 500 })
  }
}
