"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { ReportLayout } from "@/components/reports/report-layout"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

interface UserReportItem {
  id: string
  full_name: string
  username: string
  phone_number: string
  address: string
  age: number
  permission_type: string
  created_at: string
}

interface UserReportData {
  generatedBy: string
  date: string
  items: UserReportItem[]
  count: number
}

function UsersReportContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [reportData, setReportData] = useState<UserReportData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = () => {
      try {
        const token = searchParams.get("token")
        if (!token) {
          setError("رمز التقرير مفقود")
          return
        }

        const storageKey = `usersReportPayload:${token}`
        const cachedData = localStorage.getItem(storageKey)

        if (cachedData) {
          const parsedData = JSON.parse(cachedData)
          setReportData(parsedData)
        } else {
          setError("لا توجد بيانات للعرض أو انتهت صلاحية التقرير")
        }
      } catch (err) {
        console.error("Error loading report data:", err)
        setError("خطأ في تحميل بيانات التقرير")
      }
    }

    loadData()
  }, [searchParams])

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center p-8 bg-white rounded-lg shadow">
          <p className="text-red-500 text-xl mb-4">{error}</p>
          <Button onClick={() => router.back()}>
            <ArrowRight className="ml-2" />
            العودة
          </Button>
        </div>
      </div>
    )
  }

  if (!reportData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  const backPath = searchParams.get("back") || "/users-permissions"
  const shouldAutoPrint = searchParams.get("print") === "true"

  return (
    <ReportLayout 
      title="تقرير المستخدمين والصلاحيات" 
      storeName={"الشركة"} 
      autoPrint={shouldAutoPrint} 
      footer="" 
      hideHeader={true}
      backPath={backPath}
    >
      <div className="custom-header mb-6 text-center border-b pb-4">
        <h1 className="text-xl font-bold">كشف بأسماء المستخدمين وصلاحياتهم</h1>
      </div>

      <div className="header-info flex justify-between mb-6 text-sm">
        <div>
          <p>تاريخ التقرير: {new Date(reportData.date).toLocaleDateString("ar-EG")}</p>
          <p>بواسطة: {reportData.generatedBy}</p>
        </div>
        <div>
          <p>عدد المستخدمين: {reportData.count}</p>
        </div>
      </div>

      <table className="w-full border-collapse border mb-6 text-sm">
        <thead>
          <tr className="bg-gray-100 print:bg-gray-100">
            <th className="border p-2 text-center w-12">#</th>
            <th className="border p-2 text-right">الاسم الكامل</th>
            <th className="border p-2 text-right">اسم المستخدم</th>
            <th className="border p-2 text-right">رقم الهاتف</th>
            <th className="border p-2 text-right">العنوان</th>
            <th className="border p-2 text-center">العمر</th>
            <th className="border p-2 text-center">نوع الصلاحية</th>
          </tr>
        </thead>
        <tbody>
          {reportData.items.map((item, index) => (
            <tr key={item.id} className="border-b">
              <td className="border p-2 text-center">{index + 1}</td>
              <td className="border p-2 text-right font-bold">{item.full_name}</td>
              <td className="border p-2 text-right">{item.username}</td>
              <td className="border p-2 text-right">{item.phone_number || "-"}</td>
              <td className="border p-2 text-right">{item.address || "-"}</td>
              <td className="border p-2 text-center">{item.age || "-"}</td>
              <td className="border p-2 text-center">
                <span className={`px-2 py-0.5 rounded text-xs ${
                  item.permission_type === "مدير" ? "bg-red-100 text-red-700" :
                  item.permission_type === "محاسب" ? "bg-blue-100 text-blue-700" :
                  "bg-green-100 text-green-700"
                }`}>
                  {item.permission_type}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <style jsx global>{`
        @media print {
          table { width: 100% !important; border-collapse: collapse !important; }
          th, td { border: 1px solid #000 !important; padding: 8px !important; }
          .print-hidden { display: none !important; }
        }
      `}</style>
    </ReportLayout>
  )
}

export default function UsersReportPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <UsersReportContent />
    </Suspense>
  )
}
