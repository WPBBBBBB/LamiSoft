export default function GlobalErrorFallbackPage() {
  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1 style={{ margin: 0, fontSize: 22 }}>صفحة خطأ</h1>
      <p style={{ marginTop: 12, color: "#666" }}>
        هذه صفحة احتياطية تُستخدم أثناء البناء/التصدير.
      </p>
    </main>
  )
}
