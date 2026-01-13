"use client";
import { useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type CustomerReportRow = {
  id: string
  customer_name: string | null
  type: string | null
  phone_number: string | null
  address: string | null
  notes: string | null
  balance_iqd?: number | null
  balance_usd?: number | null
  created_at?: string | null
}

type CustomersReportPayload = {
  generatedAtISO: string
  generatedBy: string
  customers: CustomerReportRow[]
}

const STORAGE_PREFIX = "customersReportPayload:"
const LATEST_TOKEN_KEY = "customersReportLatestToken"

export default function CustomersReportPage() {
  const searchParams = useSearchParams()

  const { payload, storageKey } = useMemo(() => {
    if (typeof window === "undefined") return { payload: null as CustomersReportPayload | null, storageKey: null as string | null }

    const tokenFromUrl = searchParams.get("token")
    const token = tokenFromUrl || window.localStorage.getItem(LATEST_TOKEN_KEY)
    if (!token) return { payload: null as CustomersReportPayload | null, storageKey: null as string | null }

    const key = `${STORAGE_PREFIX}${token}`
    const raw = window.localStorage.getItem(key)
    if (!raw) return { payload: null as CustomersReportPayload | null, storageKey: key }

    try {
      return { payload: JSON.parse(raw) as CustomersReportPayload, storageKey: key }
    } catch {
      return { payload: null as CustomersReportPayload | null, storageKey: key }
    }
  }, [searchParams])

  const totals = useMemo(() => {
    const customers = payload?.customers ?? []
    const totalIQD = customers.reduce((sum, c) => sum + (Number(c.balance_iqd) || 0), 0)
    const totalUSD = customers.reduce((sum, c) => sum + (Number(c.balance_usd) || 0), 0)
    return { count: customers.length, totalIQD, totalUSD }
  }, [payload])

  const generatedAt = useMemo(() => {
    if (!payload?.generatedAtISO) return null
    const dt = new Date(payload.generatedAtISO)
    return {
      date: dt.toLocaleDateString("ar-IQ", { year: "numeric", month: "long", day: "numeric" }),
      time: dt.toLocaleTimeString("ar-IQ", { hour: "2-digit", minute: "2-digit" }),
    }
  }, [payload])

  const handleDownload = () => {
    window.print()
  }

  const handleClear = () => {
    if (typeof window === "undefined") return
    if (storageKey) window.localStorage.removeItem(storageKey)
  }

  if (!payload) {
    return (
      <div className="space-y-4" dir="rtl">
        <Card>
          <CardHeader>
            <CardTitle>تقرير الزبائن</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              ماكو بيانات واصلة للتقرير. ارجع لصفحة التقارير واضغط زر الزبائن مرة ثانية.
            </p>
            <Button onClick={() => window.close()} variant="outline">إغلاق</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div dir="rtl" className="space-y-4">
      <div className="flex gap-2 print:hidden">
        <Button onClick={handleDownload}>تحميل</Button>
        <Button onClick={handleClear} variant="outline">تفريغ البيانات</Button>
      </div>

      <div className="bg-white text-black rounded-md border print:border-0">
        <div className="p-6" style={{ minHeight: "297mm" }}>
          <div className="flex items-start justify-between">
            <div className="text-sm">
              <div>تاريخ التقرير: {generatedAt?.date ?? "-"}</div>
              <div>الوقت: {generatedAt?.time ?? "-"}</div>
            </div>
            <div className="text-sm text-right">تقرير بواسطة: {payload.generatedBy || "-"}</div>
          </div>

          <div className="mt-4 text-center">
            <h1 className="text-xl font-bold">تقرير شامل للزبائن</h1>
            <div className="mt-2 border-t" />
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse" style={{ fontSize: "12px" }}>
              <thead>
                <tr className="bg-slate-700 text-white">
                  <th className="border px-2 py-2 text-center">ت</th>
                  <th className="border px-2 py-2 text-right">اسم الزبون</th>
                  <th className="border px-2 py-2 text-center">النوع</th>
                  <th className="border px-2 py-2 text-center">رقم الهاتف</th>
                  <th className="border px-2 py-2 text-right">العنوان</th>
                  <th className="border px-2 py-2 text-right">رصيد دينار</th>
                  <th className="border px-2 py-2 text-right">رصيد دولار</th>
                  <th className="border px-2 py-2 text-center">تاريخ الإضافة</th>
                  <th className="border px-2 py-2 text-right">الملاحظة</th>
                </tr>
              </thead>
              <tbody>
                {payload.customers.map((c, idx) => (
                  <tr key={c.id || idx}>
                    <td className="border px-2 py-2 text-center">{idx + 1}</td>
                    <td className="border px-2 py-2 text-right">{c.customer_name || "-"}</td>
                    <td className="border px-2 py-2 text-center">{c.type || "-"}</td>
                    <td className="border px-2 py-2 text-center" dir="ltr">{c.phone_number || "-"}</td>
                    <td className="border px-2 py-2 text-right">{c.address || "-"}</td>
                    <td className="border px-2 py-2 text-right">{(Number(c.balance_iqd) || 0).toLocaleString("en-US")} د.ع</td>
                    <td className="border px-2 py-2 text-right">{(Number(c.balance_usd) || 0).toLocaleString("en-US")} $</td>
                    <td className="border px-2 py-2 text-center">{c.created_at ? new Date(c.created_at).toLocaleDateString("ar-IQ") : "-"}</td>
                    <td className="border px-2 py-2 text-right">{c.notes || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 text-sm font-semibold">
            <div>إجمالي عدد الزبائن: {totals.count}</div>
            <div>إجمالي الأرصدة بالدينار: {totals.totalIQD.toLocaleString("en-US")} د.ع</div>
            <div>إجمالي الأرصدة بالدولار: {totals.totalUSD.toLocaleString("en-US")} $</div>
          </div>

          <div className="mt-6 text-center text-xs text-gray-600">
            صفحة 1 من 1
          </div>
        </div>
      </div>
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 12mm;
          }
          html, body {
            background: white !important;
          }
          .container, main { max-width: none !important; }
        }
      `}</style>
    </div>
  );
}
