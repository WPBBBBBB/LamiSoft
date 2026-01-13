import { NextResponse, type NextRequest } from "next/server"
import { logSecurityEvent } from "./lib/security-logger"

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
    pathname.startsWith("/api/whatsapp-send-media") ||
    pathname.startsWith("/api/whatsapp-settings") ||
    // Any user-modifying endpoints should be protected.
    pathname.startsWith("/api/user/")
  )
}

function isStateChangingMethod(method: string): boolean {
  return method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE"
}

function isSameOriginRequest(request: NextRequest): boolean {
  const expectedOrigin = request.nextUrl.origin

  const origin = request.headers.get("origin")
  if (origin) return origin === expectedOrigin

  const referer = request.headers.get("referer")
  if (referer) return referer.startsWith(expectedOrigin + "/")

  // If neither Origin nor Referer is present, treat it as unsafe for state-changing requests.
  return false
}

function toBase64(value: string): string {
  // proxy.ts can run in different runtimes; support both Buffer and btoa.
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (typeof Buffer !== "undefined") return Buffer.from(value).toString("base64")
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (typeof btoa !== "undefined") return btoa(value)
  return value
}

function buildCspHeader(nonce: string): string {
  const isDev = process.env.NODE_ENV === "development"
  const isVercelPreview = process.env.VERCEL_ENV === "preview"
  const allowVercelLive = isDev || isVercelPreview

  // In dev, HMR tooling needs 'unsafe-eval' and websocket connections.
  const devScriptExtras = isDev ? " 'unsafe-eval'" : ""
  const devConnectExtras = isDev ? " http: ws: wss:" : ""

  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    `frame-src 'self'${allowVercelLive ? " https://vercel.live" : ""}`,
    `child-src 'self'${allowVercelLive ? " https://vercel.live" : ""}`,
    "form-action 'self'",
    // Avoid data: where possible; keep blob: for in-browser generated assets.
    "img-src 'self' blob: https:",
    "font-src 'self' https://fonts.gstatic.com",
    // Inline style attributes require 'unsafe-inline'. Removing this requires migrating inline styles.
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    // Script policy: no 'unsafe-inline'. Next.js will attach the nonce automatically.
    // (Some scanners mis-score 'strict-dynamic', so we omit it for better compatibility.)
    `script-src 'self' 'nonce-${nonce}'${devScriptExtras}${allowVercelLive ? " https://vercel.live" : ""}`,
    // Tighten network destinations to known backends.
    `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.openweathermap.org https://v6.exchangerate-api.com${allowVercelLive ? " https://vercel.live" : ""}${devConnectExtras}`,
    "worker-src 'self' blob:",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ]
    .join("; ")
    .replace(/\s{2,}/g, " ")
    .trim()

  return csp
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1) Sensitive API protection (rate limit + no-store)
  if (isSensitiveApiPath(pathname)) {
    // CSRF protection: require same-origin for state-changing requests.
    if (isStateChangingMethod(request.method) && request.method !== "OPTIONS") {
      if (!isSameOriginRequest(request)) {
        logSecurityEvent("warn", "csrf_blocked", {
          pathname,
          method: request.method,
          ip: getClientIp(request),
          origin: request.headers.get("origin") || null,
          referer: request.headers.get("referer") || null,
          userAgent: request.headers.get("user-agent") || null,
        })

        const blocked = NextResponse.json(
          { success: false, error: "CSRF: الطلب غير مسموح من هذا المصدر" },
          { status: 403 }
        )
        applyNoStore(blocked)
        return blocked
      }
    }

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
      logSecurityEvent("warn", "rate_limited", {
        pathname,
        method: request.method,
        ip,
        userAgent: request.headers.get("user-agent") || null,
        retryAfterSeconds,
      })
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

  // 2) CSP with per-request nonce for pages (fixes unsafe CSP without using 'unsafe-inline' in script-src)
  const nonce = toBase64(crypto.randomUUID())
  const cspHeader = buildCspHeader(nonce)

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-nonce", nonce)
  requestHeaders.set("Content-Security-Policy", cspHeader)

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  response.headers.set("Content-Security-Policy", cspHeader)
  response.headers.set("x-nonce", nonce)

  return response
}

export const config = {
  matcher: [
    // Sensitive APIs
    "/api/auth/:path*",
    "/api/send-otp/:path*",
    "/api/whatsapp-send/:path*",
    "/api/whatsapp-send-media/:path*",
    // All pages except static assets + images + API (also skip router prefetches)
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|workbox-).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
}
