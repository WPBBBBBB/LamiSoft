import { headers } from "next/headers"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

function getClientIpFromHeaders(h: Headers): string | null {
  const xForwardedFor = h.get("x-forwarded-for")
  if (xForwardedFor) {
    const first = xForwardedFor.split(",")[0]?.trim()
    if (first) return first
  }

  const candidates = [
    "x-real-ip",
    "cf-connecting-ip",
    "true-client-ip",
    "x-client-ip",
    "fastly-client-ip",
  ]

  for (const key of candidates) {
    const v = h.get(key)
    if (v?.trim()) return v.trim()
  }

  return null
}

export async function GET() {
  try {
    const h = await headers()
    const ip = getClientIpFromHeaders(h as unknown as Headers)

    return NextResponse.json(
      { ip: ip ?? null },
      {
        status: 200,
        headers: {
          "cache-control": "no-store",
        },
      }
    )
  } catch {
    return NextResponse.json(
      { ip: null },
      {
        status: 200,
        headers: {
          "cache-control": "no-store",
        },
      }
    )
  }
}
