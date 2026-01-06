"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { ReportLayout } from "@/components/reports/report-layout"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"

interface WhatsAppCustomer {
  id: string
  customer_name: string
  phone_number: string
  last_payment_date: string | null
  last_payment_iqd: number
  last_payment_usd: number
  balanceiqd: number
  balanceusd: number
}

interface WhatsAppReportData {
  generatedBy: string
  date: string
  items: WhatsAppCustomer[]
  totalBalanceIQD: number
  totalBalanceUSD: number
  count: number
}

export default function WhatsAppReportPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [reportData, setReportData] = useState<WhatsAppReportData | null>(null)
  const [error, setError] = useState<string>("")

  useEffect(() => {
    const loadData = () => {
      try {
        const token = searchParams.get("token")
        if (!token) {
          setError("توكن التقرير مفقود")
          return
        }

        const storageKey = `whatsappReportPayload:${token}`
        const cachedData = localStorage.getItem(storageKey)
        
        if (cachedData) {
          const parsedData = JSON.parse(cachedData)
          setReportData(parsedData)
        } else {
          setError("لا توجد بيانات للعرض أو انتهت صلاحية التوكن")
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

  const backPath = searchParams.get("back") || "/reports"

  return (
    <>
      <ReportLayout 
        title="تقرير إدارة الواتساب" 
        storeName={"الشركة"} 
        autoPrint={false} 
        footer="" 
        hideHeader={true}
        backPath={backPath}
      >
        <div className="custom-header mb-6 text-center border-b pb-4">
          <h1 className="text-xl font-bold">كشف حسابات الواتساب والمطالبات</h1>
        </div>

        <div className="header-info">
          <div className="info-right">
            <div><strong>بواسطة:</strong> {reportData.generatedBy}</div>
            <div><strong>عدد الزبائن:</strong> {reportData.count}</div>
          </div>
          <div className="info-left">
            <div><strong>التاريخ:</strong> {new Date(reportData.date).toLocaleString('en-US', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            })}</div>
          </div>
        </div>

        <div className="table-container">
          <table className="items-table">
            <thead>
              <tr>
                <th>#</th>
                <th style={{ width: '25%' }}>اسم الزبون</th>
                <th>رقم الهاتف</th>
                <th>آخر تسديد</th>
                <th>مبلغ IQD</th>
                <th>مبلغ USD</th>
                <th>الرصيد IQD</th>
                <th>الرصيد USD</th>
              </tr>
            </thead>
            <tbody>
              {reportData.items.map((item, index) => (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td className="text-right">{item.customer_name}</td>
                  <td dir="ltr">{item.phone_number || '-'}</td>
                  <td dir="ltr">
                    {item.last_payment_date 
                      ? new Date(item.last_payment_date).toLocaleDateString('en-US')
                      : '-'
                    }
                  </td>
                  <td dir="ltr">
                    {item.last_payment_iqd > 0 
                      ? item.last_payment_iqd.toLocaleString()
                      : '-'
                    }
                  </td>
                  <td dir="ltr">
                    {item.last_payment_usd > 0 
                      ? item.last_payment_usd.toLocaleString(undefined, { minimumFractionDigits: 2 })
                      : '-'
                    }
                  </td>
                  <td className="font-bold" dir="ltr">{item.balanceiqd.toLocaleString()}</td>
                  <td className="font-bold" dir="ltr">{item.balanceusd.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="totals-row">
                <td colSpan={6} style={{ textAlign: "left", fontWeight: "bold" }}>المجموع الكلي:</td>
                <td style={{ textAlign: "right", fontWeight: "bold" }}>{reportData.totalBalanceIQD.toLocaleString()}</td>
                <td style={{ textAlign: "right", fontWeight: "bold" }}>{reportData.totalBalanceUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </ReportLayout>

      <style jsx global>{`
        .header-info {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
          font-size: 11px;
          border: 1px solid #999;
          background: #f5f5f5;
          padding: 10px;
        }

        .info-right, .info-left {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .table-container {
          margin: 20px 0;
          width: 100%;
        }

        .items-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 10px;
        }

        .items-table th {
          background: #666;
          color: white;
          padding: 8px;
          border: 1px solid #999;
          text-align: center;
        }

        .items-table td {
          padding: 8px;
          border: 1px solid #999;
          text-align: center;
        }

        .items-table .text-right {
          text-align: right;
        }

        .totals-row td {
          background: #eee;
          padding: 10px 8px;
        }

        @media print {
          .items-table th {
            background: #666 !important;
            color: white !important;
            -webkit-print-color-adjust: exact;
          }
          .totals-row td {
            background: #eee !important;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </>
  )
}
