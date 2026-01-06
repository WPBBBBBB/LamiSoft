"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { ReportLayout } from "@/components/reports/report-layout"
import { useSettings } from "@/components/providers/settings-provider"
import { t } from "@/lib/translations"

interface PaymentReportItem {
  id: string
  payDate: string
  transactionType: string
  customerName: string
  invoiceNumber: string
  amountIQD: number
  amountUSD: number
  currencyType: string
  notes: string
}

interface PaymentReportData {
  generatedBy: string
  date: string
  items: PaymentReportItem[]
  totalIQD: number
  totalUSD: number
  count: number
}

function PaymentsReportContent() {
  const searchParams = useSearchParams()
  const { currentLanguage } = useSettings()
  const [reportData, setReportData] = useState<PaymentReportData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = () => {
      try {
        const token = searchParams.get("token")
        if (token) {
          const storageKey = `paymentsReportPayload:${token}`
          const rawData = localStorage.getItem(storageKey)
          if (rawData) {
            const parsedData = JSON.parse(rawData)
            setReportData(parsedData)
            
            // Clean up localStorage after a short delay
            setTimeout(() => {
              localStorage.removeItem(storageKey)
            }, 5000)
            return
          }
        }
        setError("لا توجد بيانات للعرض")
      } catch (err) {
        console.error("Error loading report data:", err)
        setError("حدث خطأ أثناء تحميل البيانات")
      }
    }

    loadData()
  }, [searchParams])

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen text-destructive">
        {error}
      </div>
    )
  }

  if (!reportData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        جاري تحميل التقرير...
      </div>
    )
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      return `${year}-${month}-${day} ${hours}:${minutes}`
    } catch (e) {
      return dateString
    }
  }

  const backPath = searchParams.get("back") || "/reports"

  return (
    <>
      <ReportLayout
        title="تقرير شامل للدفعات"
        hideHeader={true}
        autoPrint={false}
        backPath={backPath}
      >
        <div className="custom-report-title">
          تقرير شامل للدفعات
        </div>

        <div className="report-header-info">
          <div className="info-item"><strong>بواسطة:</strong> {reportData.generatedBy}</div>
          <div className="info-item"><strong>تاريخ التقرير:</strong> {formatDate(reportData.date)}</div>
        </div>

        <div className="report-table-container">
          <table className="report-table">
            <thead>
              <tr>
                <th style={{ width: "50px" }}>#</th>
                <th>الاسم</th>
                <th>نوع العملية</th>
                <th>رقم القائمة</th>
                <th>المبلغ (د.ع)</th>
                <th>المبلغ ($)</th>
                <th>التاريخ</th>
                <th>ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              {reportData.items.map((item, index) => (
                <tr key={index}>
                  <td style={{ textAlign: "center" }}>{index + 1}</td>
                  <td>{item.customerName}</td>
                  <td>{item.transactionType}</td>
                  <td>{item.invoiceNumber}</td>
                  <td style={{ textAlign: "right" }}>{item.amountIQD.toLocaleString()}</td>
                  <td style={{ textAlign: "right" }}>{item.amountUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td dir="ltr" style={{ textAlign: "center" }}>{formatDate(item.payDate)}</td>
                  <td style={{ fontSize: "10px" }}>{item.notes}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="totals-row">
                <td colSpan={4} style={{ textAlign: "left", fontWeight: "bold" }}>المجموع الكلي:</td>
                <td style={{ textAlign: "right", fontWeight: "bold" }}>{reportData.totalIQD.toLocaleString()}</td>
                <td style={{ textAlign: "right", fontWeight: "bold" }}>{reportData.totalUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </ReportLayout>

      <style jsx global>{`
        .custom-report-title {
          text-align: center;
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 2px solid #333;
        }
        .report-header-info {
          display: flex;
          justify-content: space-between;
          background-color: #f9fafb;
          border: 1px solid #e5e7eb;
          padding: 10px 15px;
          border-radius: 4px;
          margin-bottom: 20px;
          font-size: 12px;
        }
        .info-item {
          display: flex;
          gap: 5px;
        }
        .report-table-container {
          margin-top: 20px;
          width: 100%;
        }
        .report-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
        }
        .report-table th {
          background-color: #f3f4f6 !important;
          -webkit-print-color-adjust: exact;
          border-top: 2px solid #333;
          border-bottom: 2px solid #333;
          padding: 8px 4px;
          text-align: center;
          font-weight: bold;
        }
        .report-table td {
          padding: 6px 4px;
          border-bottom: 1px solid #eee;
        }
        .report-table tr:last-child td {
          border-bottom: 2px solid #333;
        }
        .totals-row td {
          background-color: #f9fafb !important;
          -webkit-print-color-adjust: exact;
          border-top: 2px solid #333 !important;
          border-bottom: 2px solid #333 !important;
          padding: 8px 4px;
        }
        @media print {
          .report-table th {
            background-color: #f3f4f6 !important;
          }
          .totals-row td {
            background-color: #f9fafb !important;
          }
        }
      `}</style>
    </>
  )
}

export default function PaymentsReportPage() {
  return (
    <Suspense fallback={<div>جاري تحميل التقرير...</div>}>
      <PaymentsReportContent />
    </Suspense>
  )
}
