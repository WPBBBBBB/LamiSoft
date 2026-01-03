export type CookieConsent = "accepted" | "rejected"

type SameSite = "lax" | "strict" | "none"

const COOKIE_CONSENT_STORAGE_KEY = "als_cookie_consent"

function isBrowser(): boolean {
  return typeof document !== "undefined"
}

export function getCookie(name: string): string | null {
  if (!isBrowser()) return null

  const parts = document.cookie.split(";")
  for (const part of parts) {
    const [rawKey, ...rawValueParts] = part.trim().split("=")
    if (!rawKey) continue
    if (rawKey === name) {
      const rawValue = rawValueParts.join("=")
      return rawValue ? decodeURIComponent(rawValue) : ""
    }
  }
  return null
}

export function setCookie(
  name: string,
  value: string,
  options?: {
    maxAgeDays?: number
    path?: string
    sameSite?: SameSite
    secure?: boolean
  }
): void {
  if (!isBrowser()) return

  const path = options?.path ?? "/"
  const sameSite = options?.sameSite ?? "lax"
  const secure = options?.secure ?? window.location.protocol === "https:"

  const sameSiteAttr =
    sameSite === "lax" ? "Lax" : sameSite === "strict" ? "Strict" : "None"

  let cookie = `${name}=${encodeURIComponent(value)}; Path=${path}; SameSite=${sameSiteAttr}`

  if (typeof options?.maxAgeDays === "number") {
    const maxAgeSeconds = Math.floor(options.maxAgeDays * 24 * 60 * 60)
    cookie += `; Max-Age=${maxAgeSeconds}`
  }

  // If SameSite=None, Secure is required by modern browsers.
  if (secure || sameSite === "none") cookie += "; Secure"

  document.cookie = cookie
}

export function deleteCookie(name: string): void {
  if (!isBrowser()) return
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=lax`
}

export const COOKIE_CONSENT_NAME = "als_cookie_consent"

export function getCookieConsent(): CookieConsent | null {
  const value = getCookie(COOKIE_CONSENT_NAME)
  if (value === "accepted" || value === "rejected") return value

  // Fallback: if cookies are blocked/not persisted, use localStorage.
  const stored = safeLocalStorageGet(COOKIE_CONSENT_STORAGE_KEY)
  if (stored === "accepted" || stored === "rejected") return stored

  return null
}

export function hasAcceptedCookieConsent(): boolean {
  return getCookieConsent() === "accepted"
}

export function setCookieConsent(value: CookieConsent): void {
  safeLocalStorageSet(COOKIE_CONSENT_STORAGE_KEY, value)
  setCookie(COOKIE_CONSENT_NAME, value, { maxAgeDays: 365 })
}

export function isIOSLikeDevice(): boolean {
  if (typeof navigator === "undefined") return false

  const ua = navigator.userAgent || ""
  const iOS = /iPad|iPhone|iPod/i.test(ua)

  // iPadOS 13+ reports as Macintosh, but has touch points.
  const iPadOS = /Macintosh/i.test(ua) && (navigator.maxTouchPoints ?? 0) > 1

  return iOS || iPadOS
}

function safeLocalStorageGet(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeLocalStorageSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // ignore
  }
}

export function readPersistedValue(localStorageKey: string, cookieName: string): string | null {
  // On iOS/iPadOS, cookies tend to be more reliable than localStorage across certain contexts.
  if (isIOSLikeDevice()) {
    return getCookie(cookieName) ?? safeLocalStorageGet(localStorageKey)
  }

  return safeLocalStorageGet(localStorageKey) ?? getCookie(cookieName)
}

export function writePersistedValue(
  localStorageKey: string,
  cookieName: string,
  value: string,
  options?: {
    cookieMaxAgeDays?: number
    requireConsent?: boolean
  }
): void {
  safeLocalStorageSet(localStorageKey, value)

  const requireConsent = options?.requireConsent ?? true
  if (requireConsent && !hasAcceptedCookieConsent()) return

  setCookie(cookieName, value, { maxAgeDays: options?.cookieMaxAgeDays ?? 365 })
}
