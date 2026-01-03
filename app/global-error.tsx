"use client"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <div style={{ padding: 24, fontFamily: "system-ui" }}>
          <h1 style={{ margin: 0, fontSize: 22 }}>حدث خطأ غير متوقع</h1>
          <p style={{ marginTop: 12, color: "#666" }}>
            حاول إعادة المحاولة. إذا استمرت المشكلة تواصل مع الدعم.
          </p>
          {process.env.NODE_ENV !== "production" && (
            <pre
              style={{
                marginTop: 12,
                padding: 12,
                background: "#f5f5f5",
                overflow: "auto",
                whiteSpace: "pre-wrap",
              }}
            >
              {String(error?.message || error)}
            </pre>
          )}
          <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{ padding: "10px 14px", cursor: "pointer" }}
            >
              إعادة المحاولة
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{ padding: "10px 14px", cursor: "pointer" }}
            >
              تحديث الصفحة
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
