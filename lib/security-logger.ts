export type SecurityLogLevel = "info" | "warn" | "error"

export function logSecurityEvent(
  level: SecurityLogLevel,
  event: string,
  details?: Record<string, unknown>
): void {
  const payload = {
    ts: new Date().toISOString(),
    event,
    ...(details ? { details } : {}),
  }

  const line = `[security] ${JSON.stringify(payload)}\n`

  try {
    if (level === "error") {
      process.stderr.write(line)
    } else {
      process.stdout.write(line)
    }
  } catch {
    // Fallback if process streams are not available.
    const fn = level === "error" ? console.error : level === "warn" ? console.warn : console.log
    fn(payload)
  }
}
