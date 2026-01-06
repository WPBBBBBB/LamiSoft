import { NextResponse } from "next/server"
import { AUTH_SESSION_COOKIE } from "@/lib/auth-session"

const SAVED_USERNAME_COOKIE = "als_saved_username"

function buildDeleteCookieHeader(name: string, secure: boolean, httpOnly: boolean): string {
  // Delete cookie across common attribute variants.
  // Note: secure cookies can only be set/cleared over HTTPS; sending this header over HTTP is harmless (browser ignores it).
  const parts = [
    `${name}=`,
    "Path=/",
    "Max-Age=0",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    "SameSite=Lax",
  ]

  if (httpOnly) parts.push("HttpOnly")

  if (secure) parts.push("Secure")
  return parts.join("; ")
}

export async function POST() {
  const response = NextResponse.json({ success: true })

  // Clear both Secure and non-Secure variants to avoid cases where the session cookie was created under HTTPS behind a proxy.
  response.headers.append("Set-Cookie", buildDeleteCookieHeader(AUTH_SESSION_COOKIE, true, true))
  response.headers.append("Set-Cookie", buildDeleteCookieHeader(AUTH_SESSION_COOKIE, false, true))

  // Also clear remembered username cookie (used by the login "Remember login information" checkbox)
  response.headers.append("Set-Cookie", buildDeleteCookieHeader(SAVED_USERNAME_COOKIE, true, false))
  response.headers.append("Set-Cookie", buildDeleteCookieHeader(SAVED_USERNAME_COOKIE, false, false))

  return response
}
