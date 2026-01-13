"use client";
import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { ReportLayout } from "@/components/reports/report-layout"
import { Button } from "@/components/ui/button"
import { Printer, ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"

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
    if (billion > 0) result += convertLessThanThousand(billion) + ' مليار';
    if (million > 0) { if (result) result += ' و'; result += convertLessThanThousand(million) + ' مليون'; }
    if (thousand > 0) { if (result) result += ' و'; result += convertLessThanThousand(thousand) + ' ألف'; }
    if (remainder > 0) { if (result) result += ' و'; result += convertLessThanThousand(remainder); }
    return result;
  }
  
  const integerPart = Math.floor(num);
  const decimalPart = Math.round((num - integerPart) * 1000);
  let result = convert(integerPart);
  if (decimalPart > 0) result += ' و' + convertLessThanThousand(decimalPart) + ' فلس';
  return result;
}

interface CustomerReportItem {
  id: string
  name: string
  type: string
  phone: string
  address: string
  balanceIQD: number
  balanceUSD: number
  notes: string
}

interface CustomerReportData {
  generatedBy: string
  date: string
  items: CustomerReportItem[]
  totalIQD: number
  totalUSD: number
  count: number
}

export default function CustomersReportPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [reportData, setReportData] = useState<CustomerReportData | null>(null)
  const [error, setError] = useState<string>("")

  useEffect(() => {
    const loadData = () => {
      try {
        const dataParam = searchParams.get("s");
        if (dataParam) {
          const decodedData = decodeURIComponent(dataParam)
          const binaryString = atob(decodedData)
          const bytes = Uint8Array.from(binaryString, char => char.charCodeAt(0))
          const jsonData = new TextDecoder().decode(bytes)
          const parsedData = JSON.parse(jsonData)
          setReportData(parsedData)
          return
        }

        const token = searchParams.get("token");
        if (token) {
           const storageKey = `customersReportPayload:${token}`
           const rawData = localStorage.getItem(storageKey)
           if (rawData) {
             const parsedData = JSON.parse(rawData);
             setReportData(parsedData);
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
  const shouldAutoPrint = searchParams.get("print") === "true"

  return (
    <>
      <ReportLayout 
        title="تقرير الأرصدة والزبائن" 
        storeName={"الشركة"} 
        autoPrint={shouldAutoPrint} 
        footer="" 
        hideHeader={true}
        backPath={backPath}
      >
        <div className="custom-header mb-6 text-center border-b pb-4">
          <h1 className="text-xl font-bold">كشف حسابات الزبائن</h1>
        </div>
        <div className="header-info">
          <div className="info-right">
            <div><strong>بواسطة:</strong> {reportData.generatedBy}</div>
            <div><strong>عدد القوائم:</strong> {reportData.count}</div>
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
                <th>#</th>
                <th style={{ width: '25%' }}>اسم الزبون</th>
                <th>رقم الهاتف</th>
                <th>العنوان</th>
                <th>النوع</th>
                <th>الرصيد (دينار)</th>
                <th>الرصيد (دولار)</th>
                <th>ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              {reportData.items.map((item, index) => (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td className="text-right">{item.name}</td>
                  <td dir="ltr">{item.phone}</td>
                  <td>{item.address}</td>
                  <td>{item.type}</td>
                  <td dir="ltr" style={{ fontWeight: 'bold' }}>{item.balanceIQD.toLocaleString()}</td>
                  <td dir="ltr" style={{ fontWeight: 'bold' }}>{item.balanceUSD.toLocaleString()}</td>
                  <td>{item.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="final-totals-section">
          <table className="final-totals-table">
            <tbody>
              <tr>
                <td className="label-cell">إجمالي الرصيد (دينار):</td>
                <td className="amount-cell" dir="ltr">{reportData.totalIQD.toLocaleString()}</td>
                <td className="words-cell" colSpan={2}>
                   {numberToArabicWords(reportData.totalIQD)} دينار
                </td>
              </tr>
              <tr>
                <td className="label-cell">إجمالي الرصيد (دولار):</td>
                <td className="amount-cell" dir="ltr">{reportData.totalUSD.toLocaleString()}</td>
                <td className="words-cell" colSpan={2}>
                  {numberToArabicWords(reportData.totalUSD)} دولار
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-8 text-center text-xs text-gray-500">
           نهاية التقرير - {reportData.count} سجل
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
          /* Removed vertical borders */
        }

        .items-table td {
          padding: 8px 8px;
          text-align: center;
          border-bottom: 1px solid #999; /* Only horizontal lines */
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
          padding: 8px 10px;
          border-bottom: 1px solid #999;
          border-top: 1px solid #999;
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
    </>
  );
}
