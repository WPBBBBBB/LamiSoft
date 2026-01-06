import { useEffect, ReactNode, useState } from "react"
import { getPrintSettings, type PrintSettings } from "@/lib/print-settings"
import { Button } from "@/components/ui/button"
import { Printer, ArrowRight } from "lucide-react"

interface ReportLayoutProps {
  children: ReactNode
  title: string
  storeName?: string
  autoPrint?: boolean
  footer?: string
  hideHeader?: boolean
  backPath?: string
}

export function ReportLayout({ 
  children, 
  title, 
  storeName = "AL-Lami Soft",
  autoPrint = true,
  footer,
  hideHeader = false,
  backPath = "/reports"
}: ReportLayoutProps) {
  const [printSettings] = useState<PrintSettings>(() => {
    // تحميل إعدادات الطباعة مرة واحدة عند التهيئة
    return getPrintSettings()
  })

  useEffect(() => {
    if (autoPrint) {
      const timer = setTimeout(() => {
        window.print()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [autoPrint])

  // استخدام الإعدادات المحملة أو القيم الافتراضية
  const displayStoreName = printSettings?.storeName || storeName
  const displaySubtitle = printSettings?.storeSubtitle || "للمطابخ الحديثة والديكورات وتجارة الأثاث والأكسسوارات"
  const displayContact = printSettings?.contactInfo || "للتواصل: 07XX XXX XXXX - العراق/بغداد - كرادة داخل - قرب النفق - كوت-نابي المصلى"
  // If footer prop is provided (even empty string), use it. Otherwise fall back to settings or default.
  const displayFooter = footer !== undefined ? footer : (printSettings?.footer || "شكراً لتعاملكم معنا")

  return (
    <div className="report-container" data-report-title={title}>
      {/* Controls Section - Hidden during print */}
      <div className="report-controls no-print flex justify-center items-center gap-4 py-4 mb-4 bg-gray-50 border-b sticky top-0 z-50">
        <Button 
          variant="outline"
          onClick={() => window.location.href = backPath}
          className="gap-2 absolute right-4"
        >
          <ArrowRight className="h-4 w-4" />
          رجوع
        </Button>
        <Button 
          onClick={() => window.print()}
          className="gap-2 px-8"
        >
          <Printer className="h-4 w-4" />
          طباعة التقرير
        </Button>
      </div>

      {/* Header Section */}
      {!hideHeader && (
        <div className="report-header">
          <h1 className="store-name">{displayStoreName}</h1>
          <p className="store-subtitle">{displaySubtitle}</p>
          <p className="contact-details">{displayContact}</p>
        </div>
      )}

      {}
      <div className="report-content">{children}</div>

      {}
      <div className="report-footer">
        <p style={{ whiteSpace: 'pre-line' }}>{displayFooter}</p>
      </div>

      <style jsx global>{`
        .no-print {
          display: flex !important;
        }

        @media print {
          .no-print {
            display: none !important;
          }
        }

        .report-container {
          width: 100%;
          max-width: 210mm;
          margin: 0 auto;
          padding: 10mm;
          background: white;
          font-family: 'Cairo', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          direction: rtl;
          color: #000;
        }

        .report-header {
          text-align: center;
          margin-bottom: 10px;
          padding: 8px 10px;
          background: #e5e5e5;
          border: 1px solid #999;
        }

        .store-name {
          font-size: 20px;
          font-weight: bold;
          color: #000;
          margin: 0 0 3px 0;
        }

        .store-subtitle {
          font-size: 10px;
          color: #333;
          margin: 0 0 3px 0;
          line-height: 1.3;
        }

        .contact-details {
          font-size: 9px;
          color: #555;
          margin: 0;
          line-height: 1.3;
        }

        .report-content {
          min-height: 400px;
        }

        .report-footer {
          margin-top: 15px;
          padding-top: 8px;
          border-top: 1px solid #999;
          text-align: center;
          font-size: 9px;
          color: #555;
        }

        .contact-info {
          margin-top: 2px;
          font-size: 8px;
        }

        @media screen {
          .report-container {
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
          }
        }

        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }

          html,
          body {
            background: #fff !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          body * {
            visibility: hidden !important;
          }

          .report-container,
          .report-container * {
            visibility: visible !important;
          }

          button,
          .no-print {
            display: none !important;
          }

          .report-container {
            position: relative !important;
            inset: auto !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            box-sizing: border-box;
            background: #fff !important;
          }

          .report-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            right: 0 !important;
          }

          .report-content {
            break-inside: auto;
            page-break-inside: auto;
          }
        }
      `}</style>
    </div>
  )
}
