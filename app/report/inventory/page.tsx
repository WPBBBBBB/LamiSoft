"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useState, useRef } from "react"
import { ReportLayout } from "@/components/reports/report-layout"
import { Button } from "@/components/ui/button"
import { Printer, ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { drawQRCodeOnCanvas } from "@/lib/barcode-utils"

function numberToArabicWords(num: number): string {
  if (num === 0) return 'صفر';
  
  const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
  const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const teens = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  const hundreds = ['', 'مائة', 'مئتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثماني مائة', 'تسعمائة'];
  
  function convertLessThanThousand(n: number): string {
    if (n === 0) return '';
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) {
      const tenPart = Math.floor(n / 10);
      const onePart = n % 10;
      return tens[tenPart] + (onePart > 0 ? ' و' + ones[onePart] : '');
    }
    const hundredPart = Math.floor(n / 100);
    const rest = n % 100;
    return hundreds[hundredPart] + (rest > 0 ? ' و' + convertLessThanThousand(rest) : '');
  }
  
  function convert(n: number): string {
    if (n === 0) return 'صفر';
    
    const billion = Math.floor(n / 1000000000);
    const million = Math.floor((n % 1000000000) / 1000000);
    const thousand = Math.floor((n % 1000000) / 1000);
    const remainder = n % 1000;
    
    let result = '';
    
    if (billion > 0) {
      result += convertLessThanThousand(billion) + ' مليار';
    }
    if (million > 0) {
      if (result) result += ' و';
      result += convertLessThanThousand(million) + ' مليون';
    }
    if (thousand > 0) {
      if (result) result += ' و';
      result += convertLessThanThousand(thousand) + ' ألف';
    }
    if (remainder > 0) {
      if (result) result += ' و';
      result += convertLessThanThousand(remainder);
    }
    
    return result;
  }
  
  const integerPart = Math.floor(num);
  const decimalPart = Math.round((num - integerPart) * 1000);
  
  let result = convert(integerPart);
  
  if (decimalPart > 0) {
    result += ' و' + convertLessThanThousand(decimalPart) + ' فلس';
  }
  
  return result;
}

interface InventoryItem {
  productName: string
  systemQty: number
  actualQty: number
  diffQty: number
  cost: number
  diffValue: number
  status: string
}

interface InventoryReportData {
  countId: string
  storeName: string
  managerName: string
  date: string
  items: InventoryItem[]
  totalDiffQty: number
  totalDiffValue: number
  notes?: string
}

export default function InventoryReportPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [reportData, setReportData] = useState<InventoryReportData | null>(null)
  const [error, setError] = useState<string>("")
  const qrCodeCanvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const loadData = () => {
      try {
        const dataParam = searchParams.get("s")
        if (!dataParam) {
          setError("لا توجد بيانات للعرض")
          return
        }

        const decodedData = decodeURIComponent(dataParam)
        const binaryString = atob(decodedData)
        const bytes = Uint8Array.from(binaryString, char => char.charCodeAt(0))
        const jsonData = new TextDecoder().decode(bytes)
        const parsedData = JSON.parse(jsonData)
        
        setReportData(parsedData)
      } catch (err) {
        setError("خطأ في تحميل بيانات التقرير")
      }
    }

    loadData()
  }, [searchParams])

  // رسم QR Code
  useEffect(() => {
    if (reportData?.countId && qrCodeCanvasRef.current) {
      try {
        const qrData = reportData.countId
        drawQRCodeOnCanvas(qrData, qrCodeCanvasRef.current, {
          width: 200,
          errorCorrectionLevel: 'M'
        })
      } catch (error) {
      }
    }
  }, [reportData])

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
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="no-print container mx-auto mb-4 flex gap-2 justify-center">
        <Button onClick={() => window.print()} className="gap-2">
          <Printer className="h-4 w-4" />
          طباعة
        </Button>
      </div>

      <ReportLayout 
        title="تقرير جرد مخزني" 
        storeName={reportData.storeName || "الشركة"} 
        autoPrint={true} 
        footer="" 
        hideHeader={true}
        backPath={backPath}
      >
        <div className="custom-header mb-6 text-center border-b pb-4">
          <h1 className="text-xl font-bold">تقرير حول الجرد المخزني</h1>
        </div>
        <div className="header-info">
          <div className="info-right">
            <div><strong>رقم القائمة:</strong> {reportData.countId}</div>
            <div><strong>المسؤول:</strong> {reportData.managerName}</div>
            {reportData.notes && (
              <div><strong>ملاحظة:</strong> {reportData.notes}</div>
            )}
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
             <div><strong>المخزن:</strong> {reportData.storeName}</div>
          </div>
        </div>

        <div className="table-container">
          <table className="items-table">
            <thead>
              <tr>
                <th>#</th>
                <th style={{ width: '30%' }}>اسم المادة</th>
                <th>ك. النظام</th>
                <th>ك. الفعلية</th>
                <th>الفرق</th>
                <th>السعر</th>
                <th>قيمة الفرق</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {reportData.items.map((item, index) => (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td className="text-right">{item.productName}</td>
                  <td>{item.systemQty}</td>
                  <td>{item.actualQty}</td>
                  <td dir="ltr">{item.diffQty}</td>
                  <td>{item.cost.toLocaleString()}</td>
                  <td>{item.diffValue.toLocaleString()}</td>
                  <td>{item.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="final-totals-section">
          <table className="final-totals-table">
            <tbody>
              <tr>
                <td className="label-cell">إجمالي فرق العدد:</td>
                <td className="amount-cell" dir="ltr">{reportData.totalDiffQty}</td>
                <td className="words-cell" colSpan={2}>
                   {/* مساحة فارغة أو ملاحظة */}
                </td>
              </tr>
              <tr>
                <td className="label-cell">إجمالي فرق القيمة:</td>
                <td className="amount-cell">{reportData.totalDiffValue.toLocaleString()}</td>
                <td className="words-cell" colSpan={2}>
                  {numberToArabicWords(Math.abs(reportData.totalDiffValue))} دينار {reportData.totalDiffValue < 0 ? '(عجز)' : reportData.totalDiffValue > 0 ? '(زيادة)' : ''}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="signature-qr-section">
          {/* Signature removed as per request */}
          <div className="qr-box" style={{ width: '100%', alignItems: 'center' }}>
            {reportData.countId ? (
              <>
                <canvas 
                  ref={qrCodeCanvasRef}
                  style={{ maxWidth: '100%', height: 'auto' }}
                />
              </>
            ) : null}
          </div>
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
        }

        .info-right {
          text-align: right;
          border-left: 1px solid #999;
          flex: 1;
        }

        .info-left {
          text-align: left;
           border-right: 1px solid #999; /* Added border right for RTL layout if needed, though flex handles it. Actually visually in RTL right is first. */
          flex: 1;
        }
        
        /* Fix border logic for RTL: Right div is visually on right. Left div is visually on left. */
        /* In HTML (LTR structure but RTL direction): 
           .info-right is first element -> Right side.
           .info-left is second element -> Left side.
        */

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
          padding: 6px 8px;
          text-align: center;
          font-weight: 600;
          border: 1px solid #999;
        }

        .items-table td {
          padding: 6px 8px;
          text-align: center;
          border: 1px solid #999;
        }
        
        .items-table td.text-right {
           text-align: right;
        }

        .final-totals-section {
          margin-top: 20px;
          border: 1px solid #999;
        }

        .final-totals-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 10px;
        }

        .final-totals-table td {
          padding: 6px 10px;
          border: 1px solid #999;
        }

        .label-cell {
          background: #f5f5f5;
          font-weight: 600;
          text-align: right;
          width: 20%;
        }

        .amount-cell {
          background: white;
          text-align: center;
          font-weight: bold;
          width: 20%;
        }

        .words-cell {
          background: white;
          text-align: right;
          padding-right: 15px;
        }

        .signature-qr-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 30px;
          padding: 15px 20px;
        }

        .signature-box {
          flex: 1;
        }

        .signature-line {
          border-top: 1px solid #666;
          margin-bottom: 8px;
          width: 200px;
        }

        .signature-box p {
          color: #333;
          font-weight: 600;
          font-size: 11px;
          text-align: right;
        }

        .qr-box {
          display: flex;
          flex-direction: column;
          align-items: center;
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
          .final-totals-section,
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
    </div>
  )
}
