"use client";
import { useSearchParams } from "next/navigation"
import { useEffect, useState, Suspense } from "react"
import { ReportLayout } from "@/components/reports/report-layout"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"

interface ProductProfitItem {
  productCode: string
  productName: string
  salesCount: number
  totalQuantitySold: number
  purchasePriceIQD: number
  sellPriceIQD: number
  profitPerUnit: number
  totalProfit: number
}

interface SalesProfitReportData {
  generatedBy: string
  date: string
  period: string
  items: ProductProfitItem[]
  totalOverallProfit: number
  totalItems: number
}

function SalesProfitReportContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [reportData, setReportData] = useState<SalesProfitReportData | null>(null)
  const [error, setError] = useState<string>("")

  useEffect(() => {
    const loadData = () => {
      try {
        const token = searchParams.get("token")
        if (token) {
          const storageKey = `salesProfitReportPayload:${token}`
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
        title="تقرير أرباح المبيعات" 
        storeName={"الشركة"} 
        autoPrint={false} 
        footer="" 
        hideHeader={true}
        backPath={backPath}
      >
        <div className="custom-header mb-6 text-center border-b pb-4">
          <h1 className="text-xl font-bold">كشف أرباح المبيعات التفصيلي</h1>
          <p className="text-sm text-gray-600 mt-1">{reportData.period}</p>
        </div>

        <div className="header-info">
          <div className="info-right">
            <div><strong>بواسطة:</strong> {reportData.generatedBy}</div>
            <div><strong>عدد المواد:</strong> {reportData.totalItems}</div>
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
              <div><strong>إجمالي الأرباح:</strong> {reportData.totalOverallProfit.toLocaleString()} د.ع</div>
          </div>
        </div>

        <div className="table-container">
          <table className="items-table">
            <thead>
              <tr>
                <th style={{ width: '50px' }}>#</th>
                <th style={{ width: '12%' }}>رمز المادة</th>
                <th style={{ width: '20%' }}>اسم المادة</th>
                <th>مرات البيع</th>
                <th>الكمية المباعة</th>
                <th>سعر الشراء</th>
                <th>سعر البيع</th>
                <th>ربح المفرد</th>
                <th>مجموع الربح</th>
              </tr>
            </thead>
            <tbody>
              {reportData.items.map((item, index) => (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td className="font-mono">{item.productCode}</td>
                  <td className="text-right font-semibold">{item.productName}</td>
                  <td>{item.salesCount.toLocaleString()}</td>
                  <td className="font-bold text-blue-600">{item.totalQuantitySold.toLocaleString()}</td>
                  <td>{item.purchasePriceIQD.toLocaleString()}</td>
                  <td>{item.sellPriceIQD.toLocaleString()}</td>
                  <td className={item.profitPerUnit >= 0 ? "text-green-600" : "text-red-600"}>
                    {item.profitPerUnit.toLocaleString()}
                  </td>
                  <td className={item.totalProfit >= 0 ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                    {item.totalProfit.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
               <tr className="font-bold bg-gray-50 text-base">
                  <td colSpan={3} className="text-left py-4">الإجمالي الكلي للأرباح:</td>
                  <td colSpan={5}></td>
                  <td className={`text-center py-4 ${reportData.totalOverallProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {reportData.totalOverallProfit.toLocaleString()} د.ع
                  </td>
               </tr>
            </tfoot>
          </table>
        </div>
        
        <div className="mt-8 text-center text-xs text-gray-500">
           نهاية التقرير - {reportData.totalItems} مادة
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
          padding: 8px 4px;
          text-align: center;
          font-weight: 600;
          border-top: 1px solid #999;
          border-bottom: 1px solid #999;
        }

        .items-table td {
          padding: 8px 4px;
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

export default function SalesProfitReportPage() {
  return (
    <Suspense fallback={<div>جاري تحميل التقرير...</div>}>
      <SalesProfitReportContent />
    </Suspense>
  )
}
