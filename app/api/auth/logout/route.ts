import { NextRequest, NextResponse } from "next/server"
import { AUTH_SESSION_COOKIE } from "@/lib/auth-session"

function isSecureRequest(request: NextRequest): boolean {
  const proto = request.headers.get("x-forwarded-proto")
  if (proto) return proto === "https"
  return new URL(request.url).protocol === "https:"
}

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ success: true })

  response.cookies.set({
    name: AUTH_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureRequest(request),
    path: "/",
    maxAge: 0,
  })

  return response
}
