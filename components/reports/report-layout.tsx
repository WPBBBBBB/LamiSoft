"use client"

import { useEffect, ReactNode, useState } from "react"
import { getPrintSettings, type PrintSettings } from "@/lib/print-settings"

interface ReportLayoutProps {
  children: ReactNode
  title: string
  storeName?: string
  autoPrint?: boolean
}

export function ReportLayout({ 
  children, 
  title, 
  storeName = "AL-Lami Soft",
  autoPrint = true 
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
  const displayFooter = printSettings?.footer || "شكراً لتعاملكم معنا"

  return (
    <div className="report-container" data-report-title={title}>
      {}
      <div className="report-header">
        <h1 className="store-name">{displayStoreName}</h1>
        <p className="store-subtitle">{displaySubtitle}</p>
        <p className="contact-details">{displayContact}</p>
      </div>

      {}
      <div className="report-content">{children}</div>

      {}
      <div className="report-footer">
        <p style={{ whiteSpace: 'pre-line' }}>{displayFooter}</p>
      </div>

      <style jsx global>{`
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
