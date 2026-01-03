function base64UrlEncode(input: Uint8Array): string {
  const base64 = Buffer.from(input).toString("base64")
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

function base64UrlDecode(input: string): Uint8Array {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/")
  const padLength = (4 - (base64.length % 4)) % 4
  const padded = base64 + "=".repeat(padLength)
  return new Uint8Array(Buffer.from(padded, "base64"))
}

function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET
  if (!secret) {
    // Dev fallback only. Set AUTH_SECRET in production.
    return "dev-insecure-auth-secret"
  }
  return secret
}

async function hmacSha256(message: Uint8Array, secret: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    secret as unknown as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )

  const sig = await crypto.subtle.sign("HMAC", key, message as unknown as BufferSource)
  return new Uint8Array(sig)
}

async function hmacSha256Verify(message: Uint8Array, signature: Uint8Array, secret: Uint8Array): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    "raw",
    secret as unknown as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  )

  return crypto.subtle.verify(
    "HMAC",
    key,
    signature as unknown as BufferSource,
    message as unknown as BufferSource
  )
}

export interface SessionPayload {
  sub: string
  iat: number
  exp: number
}

export async function createSessionToken(userId: string, maxAgeSeconds: number): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const payload: SessionPayload = {
    sub: userId,
    iat: now,
    exp: now + maxAgeSeconds,
  }

  const payloadBytes = new TextEncoder().encode(JSON.stringify(payload))
  const payloadB64 = base64UrlEncode(payloadBytes)

  const messageBytes = new TextEncoder().encode(payloadB64)
  const secretBytes = new TextEncoder().encode(getAuthSecret())
  const signatureBytes = await hmacSha256(messageBytes, secretBytes)
  const signatureB64 = base64UrlEncode(signatureBytes)

  return `${payloadB64}.${signatureB64}`
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  const [payloadB64, signatureB64] = token.split(".")
  if (!payloadB64 || !signatureB64) return null

  let payloadBytes: Uint8Array
  let signatureBytes: Uint8Array
  try {
    payloadBytes = base64UrlDecode(payloadB64)
    signatureBytes = base64UrlDecode(signatureB64)
  } catch {
    return null
  }

  const messageBytes = new TextEncoder().encode(payloadB64)
  const secretBytes = new TextEncoder().encode(getAuthSecret())

  const ok = await hmacSha256Verify(messageBytes, signatureBytes, secretBytes)
  if (!ok) return null

  let payload: SessionPayload
  try {
    payload = JSON.parse(new TextDecoder().decode(payloadBytes)) as SessionPayload
  } catch {
    return null
  }

  if (!payload?.sub || typeof payload.sub !== "string") return null
  if (typeof payload.exp !== "number") return null

  const now = Math.floor(Date.now() / 1000)
  if (payload.exp <= now) return null

  return payload
}

export const AUTH_SESSION_COOKIE = "als_session"
