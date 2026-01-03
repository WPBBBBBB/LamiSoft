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

interface SaleItem {
  productname: string
  quantity: number
  unitpriceiqd: number
  unitpriceusd: number
  totalpriceiqd: number
  totalpriceusd: number
}

interface SaleReportData {
  type: "sale" | "purchase"
  storeName?: string
  customerName: string
  priceType?: string
  payType: string
  currencyType: string
  items: SaleItem[]
  totalIQD: number
  totalUSD: number
  discountIQD?: number
  discountUSD?: number
  amountReceivedIQD?: number
  amountReceivedUSD?: number
  previousBalanceIQD?: number
  previousBalanceUSD?: number
  nextBalanceIQD?: number
  nextBalanceUSD?: number
  datetime: string
  saleNumber?: string
  barcode?: string
}

function formatBalance(currencyType: string, iqd: number, usd: number) {
  if (currencyType === "دينار") return `${(iqd || 0).toLocaleString()} د.ع`
  if (currencyType === "دولار") return `${(usd || 0).toLocaleString()} $`
  return `${(iqd || 0).toLocaleString()} د.ع / ${(usd || 0).toLocaleString()} $`
}

export default function ReportPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [reportData, setReportData] = useState<SaleReportData | null>(null)
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
        console.error("Error parsing report data:", err)
        setError("خطأ في تحميل بيانات التقرير")
      }
    }

    loadData()
  }, [searchParams])

  // رسم QR Code عند تحميل البيانات
  useEffect(() => {
    if (reportData?.saleNumber && qrCodeCanvasRef.current) {
      try {
        // استخدام رقم القائمة فقط في QR Code
        const qrData = reportData.saleNumber
        drawQRCodeOnCanvas(qrData, qrCodeCanvasRef.current, {
          width: 200,
          errorCorrectionLevel: 'M'
        })
      } catch (error) {
        console.error('Error drawing QR code:', error)
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

  const getReportTitle = () => {
    if (reportData.type === "sale") return "فاتورة بيع"
    if (reportData.type === "purchase") return "فاتورة شراء"
    return "فاتورة"
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      {}
      <div className="no-print container mx-auto mb-4 flex gap-2 justify-center">
        <Button onClick={() => window.print()} className="gap-2">
          <Printer className="h-4 w-4" />
          طباعة
        </Button>
        <Button variant="outline" onClick={() => router.back()} className="gap-2">
          <ArrowRight className="h-4 w-4" />
          العودة
        </Button>
      </div>

      <ReportLayout title={getReportTitle()} storeName={reportData.storeName || "شركة الميسر"} autoPrint={false}>
        {}
        <div className="header-info">
          <div className="info-right">
            <div><strong>نوع العملة:</strong> {reportData.currencyType} موحد</div>
            <div><strong>{reportData.type === "sale" ? "اسم الزبون" : "اسم المجهز"}:</strong> {reportData.customerName}</div>
            <div><strong>نوع الدفع:</strong> {reportData.payType}</div>
          </div>
          <div className="info-left">
            {reportData.saleNumber && (
              <div><strong>رقم العملية:</strong> {reportData.saleNumber}</div>
            )}
            {reportData.priceType && (
              <div><strong>نوع القائمة:</strong> {reportData.priceType}</div>
            )}
            <div><strong>التاريخ:</strong> {new Date(reportData.datetime).toLocaleString('en-US', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            }).replace('AM', 'صباحاً').replace('PM', 'مساءً')}</div>
          </div>
        </div>

        {}
        <div className="info-section" style={{ display: 'none' }}>
          <div className="info-row">
            <span className="info-label">اسم {reportData.type === "sale" ? "الزبون" : "المجهز"}:</span>
            <span className="info-value">{reportData.customerName}</span>
          </div>
          
          {reportData.saleNumber && (
            <div className="info-row">
              <span className="info-label">رقم الفاتورة:</span>
              <span className="info-value">{reportData.saleNumber}</span>
            </div>
          )}

          {reportData.priceType && (
            <div className="info-row">
              <span className="info-label">نوع السعر:</span>
              <span className="info-value">{reportData.priceType}</span>
            </div>
          )}

          <div className="info-row">
            <span className="info-label">نوع الدفع:</span>
            <span className="info-value">{reportData.payType}</span>
          </div>

          <div className="info-row">
            <span className="info-label">نوع العملة:</span>
            <span className="info-value">{reportData.currencyType}</span>
          </div>

          <div className="info-row">
            <span className="info-label">التاريخ:</span>
            <span className="info-value">
              {new Date(reportData.datetime).toLocaleString('ar-IQ', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
        </div>

        {}
        <div className="table-container">
          <table className="items-table">
            <thead>
              <tr>
                <th>#</th>
                <th>اسم المادة</th>
                <th>الكمية</th>
                <th>السعر (دينار)</th>
                <th>السعر (دولار)</th>
                <th>المجموع (دينار)</th>
                <th>المجموع (دولار)</th>
              </tr>
            </thead>
            <tbody>
              {reportData.items.map((item, index) => (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td>{item.productname}</td>
                  <td>{item.quantity}</td>
                  <td>{item.unitpriceiqd.toLocaleString()}</td>
                  <td>{item.unitpriceusd.toLocaleString()}</td>
                  <td>{item.totalpriceiqd.toLocaleString()}</td>
                  <td>{item.totalpriceusd.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {}
        <div className="totals-section">
          {reportData.discountIQD && reportData.discountIQD > 0 && (
            <div className="total-row">
              <span className="total-label">الخصم:</span>
              <span className="total-value">
                {reportData.discountIQD.toLocaleString()} دينار
                {reportData.discountUSD && reportData.discountUSD > 0 && 
                  ` / ${reportData.discountUSD.toLocaleString()} دولار`
                }
              </span>
            </div>
          )}

          <div className="total-row final-total">
            <span className="total-label">المجموع الكلي:</span>
            <span className="total-value">
              {reportData.totalIQD.toLocaleString()} دينار / {reportData.totalUSD.toLocaleString()} دولار
            </span>
          </div>

          {reportData.payType === "آجل" && reportData.amountReceivedIQD && reportData.amountReceivedIQD > 0 && (
            <div className="total-row">
              <span className="total-label">المبلغ الواصل:</span>
              <span className="total-value">
                {reportData.amountReceivedIQD.toLocaleString()} دينار
                {reportData.amountReceivedUSD && reportData.amountReceivedUSD > 0 && 
                  ` / ${reportData.amountReceivedUSD.toLocaleString()} دولار`
                }
              </span>
            </div>
          )}

          {reportData.payType === "آجل" && (
            <div className="total-row">
              <span className="total-label">المبلغ المتبقي:</span>
              <span className="total-value remaining">
                {(reportData.totalIQD - (reportData.amountReceivedIQD || 0)).toLocaleString()} دينار / 
                {(reportData.totalUSD - (reportData.amountReceivedUSD || 0)).toLocaleString()} دولار
              </span>
            </div>
          )}
        </div>

        {}
        <div className="signature-qr-section">
          <div className="signature-box">
            <div className="signature-line"></div>
            <p>التوقيع:</p>
          </div>
          <div className="qr-box">
            {reportData.barcode ? (
              <>
                <canvas 
                  ref={qrCodeCanvasRef}
                  style={{ maxWidth: '100%', height: 'auto' }}
                />
                <p style={{ fontSize: '10px', marginTop: '5px', textAlign: 'center', color: '#666' }}>
                  رقم القائمة: {reportData.saleNumber}
                </p>
              </>
            ) : (
              <div style={{ fontSize: '12px', color: '#999', textAlign: 'center', padding: '20px' }}>
                لا يوجد QR Code
              </div>
            )}
          </div>
        </div>

        {}
        <div className="final-totals-section">
          <table className="final-totals-table">
            <tbody>
              <tr>
                <td className="label-cell">إجمالي السعر $:</td>
                <td className="amount-cell">{reportData.totalUSD.toLocaleString()}</td>
                <td className="words-cell" colSpan={2}>
                  الأرقام كتابةً: {numberToArabicWords(reportData.totalUSD)} دولار لاغير
                </td>
              </tr>
              <tr>
                <td className="label-cell">إجمالي السعر د.ع :</td>
                <td className="amount-cell">{reportData.totalIQD.toLocaleString()}</td>
                <td className="words-cell" colSpan={2}>
                  {numberToArabicWords(reportData.totalIQD)} ديناراً لاغير
                </td>
              </tr>
              <tr>
                <td className="label-cell">رصيد الزبون السابق:</td>
                <td className="amount-cell">
                  {formatBalance(
                    reportData.currencyType,
                    reportData.previousBalanceIQD || 0,
                    reportData.previousBalanceUSD || 0
                  )}
                </td>
                <td className="label-cell">رصيد الزبون الحالي:</td>
                <td className="amount-cell">
                  {formatBalance(
                    reportData.currencyType,
                    reportData.nextBalanceIQD || 0,
                    reportData.nextBalanceUSD || 0
                  )}
                </td>
              </tr>
            </tbody>
          </table>
          <div className="bottom-note">
            ملاحظة: البضاعة المباعة لا ترد ولا تستبدل
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
          flex: 1;
        }

        .info-section {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
          border: 1px solid #dee2e6;
        }

        .info-row {
          display: flex;
          padding: 8px 0;
          border-bottom: 1px solid #e9ecef;
        }

        .info-row:last-child {
          border-bottom: none;
        }

        .info-label {
          font-weight: 600;
          color: #495057;
          min-width: 150px;
        }

        .info-value {
          color: #212529;
          flex: 1;
        }

        .table-container {
          margin: 20px 0;
          overflow-x: auto;
          width: 100%;
        }

        .items-table {
          width: 100%;
          min-width: 100%;
          border-collapse: collapse;
          background: white;
          table-layout: auto;
          font-size: 11px;
        }

        .items-table th {
          background: #666;
          color: white;
          padding: 6px 8px;
          text-align: center;
          font-weight: 600;
          border: 1px solid #999;
          font-size: 12px;
        }

        .items-table td {
          padding: 6px 8px;
          text-align: center;
          border: 1px solid #999;
          background: white;
        }

        .items-table tbody tr:nth-child(even) {
          background: white;
        }

        .items-table tbody tr:hover {
          background: white;
        }

        .totals-section {
          margin-top: 15px;
          padding: 12px 15px;
          background: #f5f5f5;
          border: 1px solid #999;
          font-size: 11px;
        }

        .total-row {
          display: flex;
          justify-content: space-between;
          padding: 5px 0;
          border-bottom: 1px solid #ccc;
        }

        .total-row:last-child {
          border-bottom: none;
        }

        .total-label {
          font-weight: 600;
          color: #333;
          font-size: 11px;
        }

        .total-value {
          font-weight: 600;
          color: #000;
          font-size: 11px;
        }

        .final-total {
          margin-top: 5px;
          padding-top: 8px;
          border-top: 1px solid #999;
          font-size: 11px;
        }

        .final-total .total-label,
        .final-total .total-value {
          color: #000;
          font-size: 12px;
          font-weight: bold;
        }

        .remaining {
          color: #dc3545;
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
          align-items: center;
          justify-content: center;
        }

        .qr-code {
          width: 80px;
          height: 80px;
          border: 1px solid #999;
          padding: 5px;
          background: white;
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
          width: 15%;
        }

        .words-cell {
          background: white;
          text-align: right;
          padding-right: 15px;
        }

        .bottom-note {
          padding: 6px 10px;
          background: #f5f5f5;
          border-top: 1px solid #999;
          font-size: 9px;
          text-align: center;
        }

        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }

          body {
            margin: 0;
            padding: 0;
            background: white !important;
          }

          .info-section,
          .totals-section,
          .header-info,
          .final-totals-section {
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            page-break-inside: avoid;
          }

          .report-header {
            background: #e5e5e5 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .table-container {
            width: 100%;
            overflow: visible;
          }

          .items-table {
            width: 100% !important;
            min-width: 100% !important;
          }

          .items-table th {
            background: #666 !important;
            color: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            font-size: 11px;
            padding: 8px 4px;
          }

          .items-table td {
            font-size: 10px;
            padding: 6px 4px;
          }

          .items-table tbody tr:nth-child(even) {
            background: #f5f5f5 !important;
          }

          .signatures-section {
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  )
}
