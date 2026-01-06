"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { ReportLayout } from "@/components/reports/report-layout"
import { Button } from "@/components/ui/button"
import { Printer, ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"

interface StoreTransferReportItem {
  id: string
  productCode: string
  productName: string
  quantity: number
  fromStoreName: string
  toStoreName: string
  transferDate: string
  note: string
}

interface StoreTransferReportData {
  generatedBy: string
  date: string
  items: StoreTransferReportItem[]
  count: number
}

export default function StoreTransfersReportPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [reportData, setReportData] = useState<StoreTransferReportData | null>(null)
  const [error, setError] = useState<string>("")

  useEffect(() => {
    const loadData = () => {
      try {
        const token = searchParams.get("token")
        if (token) {
           const storageKey = `storeTransfersReportPayload:${token}`
           const rawData = localStorage.getItem(storageKey)
           if (rawData) {
             const parsedData = JSON.parse(rawData)
             setReportData(parsedData)
             return
           }
        }
        
        setError("لا توجد بيانات للعرض")
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
        title="تقرير النقل المخزني" 
        storeName={"الشركة"} 
        autoPrint={false} 
        footer="" 
        hideHeader={true}
        backPath={backPath}
      >
        <div className="custom-header mb-6 text-center border-b pb-4">
          <h1 className="text-xl font-bold">كشف النقل بين المخازن</h1>
        </div>

        <div className="header-info">
          <div className="info-right">
            <div><strong>بواسطة:</strong> {reportData.generatedBy}</div>
            <div><strong>عدد العمليات:</strong> {reportData.count}</div>
          </div>
          <div className="info-left">
            <div><strong>التاريخ:</strong> {new Date(reportData.date).toLocaleString('en-US', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            }).replace('AM', 'صباحاً').replace('PM', 'مساءً')}</div>
          </div>
        </div>

        <div className="table-container">
          <table className="items-table">
            <thead>
              <tr>
                <th style={{ width: '50px' }}>#</th>
                <th>رمز المادة</th>
                <th>اسم المادة</th>
                <th>الكمية المنقولة</th>
                <th>من المخزن</th>
                <th>إلى المخزن</th>
                <th>تاريخ النقل</th>
                <th>ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              {reportData.items.map((item, index) => (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td className="font-semibold">{item.productCode}</td>
                  <td className="text-right">{item.productName}</td>
                  <td style={{fontWeight: 'bold'}} dir="ltr">{item.quantity}</td>
                  <td>{item.fromStoreName}</td>
                  <td>{item.toStoreName}</td>
                  <td dir="ltr">{new Date(item.transferDate).toLocaleDateString('en-GB')}</td>
                  <td>{item.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="mt-8 text-center text-xs text-gray-500">
           نهاية التقرير - {reportData.count} عملية نقل
        </div>

      </ReportLayout>

      <style jsx>{`
        .header-info {
          display: flex;
          justify-content: space-between;
          margin-bottom: 15px;
          font-size: 11px;
          border: 1px solid #999;
          background: #f5f5f5;
        }

        .info-right,
        .info-left {
          padding: 8px 15px;
          line-height: 1.8;
          flex: 1;
        }

        .info-right {
          text-align: right;
          border-left: 1px solid #999;
        }

        .info-left {
          text-align: left;
        }

        .table-container {
          margin: 20px 0;
          width: 100%;
        }

        .items-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
        }

        .items-table th {
          background: #666;
          color: white;
          padding: 8px 8px;
          text-align: center;
          font-weight: 600;
          border-top: 1px solid #999;
          border-bottom: 1px solid #999;
        }

        .items-table td {
          padding: 8px 8px;
          text-align: center;
          border-bottom: 1px solid #999;
        }
        
        .items-table td.text-right {
           text-align: right;
        }

        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }

          body {
            background: white !important;
          }

          .header-info,
          .items-table th {
             -webkit-print-color-adjust: exact !important;
             print-color-adjust: exact !important;
          }
          
           .items-table th {
            background: #666 !important;
            color: white !important;
          }
          
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </>
  )
}
