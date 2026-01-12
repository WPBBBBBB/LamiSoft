import { NextResponse, type NextRequest } from "next/server"

type Counter = { count: number; resetAt: number }

const counters = new Map<string, Counter>()

function getClientIp(request: NextRequest): string {
  const xff = request.headers.get("x-forwarded-for")
  if (xff) return xff.split(",")[0]?.trim() || "unknown"
  return request.headers.get("x-real-ip") || "unknown"
}

function getEnvInt(name: string, fallback: number): number {
  const raw = process.env[name]
  if (!raw) return fallback
  const value = Number.parseInt(raw, 10)
  return Number.isFinite(value) ? value : fallback
}

function shouldRateLimit(request: NextRequest): boolean {
  if (process.env.NODE_ENV === "development") return false
  if (process.env.RATE_LIMIT_ENABLED === "false") return false
  if (request.method === "OPTIONS") return false
  return true
}

function applyNoStore(response: NextResponse): void {
  response.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"
  )
  response.headers.set("Pragma", "no-cache")
  response.headers.set("Expires", "0")
}

function isSensitiveApiPath(pathname: string): boolean {
  return (
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/api/send-otp") ||
    pathname.startsWith("/api/whatsapp-send") ||
    pathname.startsWith("/api/whatsapp-send-media")
  )
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only handle sensitive APIs.
  if (!isSensitiveApiPath(pathname)) return NextResponse.next()

  // Set anti-caching headers for sensitive endpoints.
  const next = NextResponse.next()
  applyNoStore(next)

  if (!shouldRateLimit(request)) return next

  // Basic in-memory rate limit (best-effort). For strongest protection use WAF/CDN.
  const windowMs = getEnvInt("RATE_LIMIT_WINDOW_MS", 60_000)
  const maxPerWindow = getEnvInt("RATE_LIMIT_MAX", 60)

  const ip = getClientIp(request)
  const key = `${ip}:${pathname}`
  const now = Date.now()

  const current = counters.get(key)
  if (!current || now >= current.resetAt) {
    counters.set(key, { count: 1, resetAt: now + windowMs })
    return next
  }

  current.count += 1
  counters.set(key, current)

  if (current.count > maxPerWindow) {
    const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000))
    const blocked = NextResponse.json(
      { success: false, error: "طلبات كثيرة جداً. حاول مرة أخرى بعد قليل." },
      { status: 429 }
    )
    applyNoStore(blocked)
    blocked.headers.set("Retry-After", String(retryAfterSeconds))
    return blocked
  }

  return next
}

export const config = {
  matcher: [
    "/api/auth/:path*",
    "/api/send-otp/:path*",
    "/api/whatsapp-send/:path*",
    "/api/whatsapp-send-media/:path*",
  ],
}
