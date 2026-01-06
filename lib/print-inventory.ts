import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
// @ts-ignore
import * as arabicReshaperPkg from "arabic-reshaper"


import { InventoryCountDetail } from "./inventory-count-operations"

// Initialize bidi-js lazily
let bidi: any = null
const reshapeText = (text: string) => {
  if (!text) return ""
  let processed = text

  // 1. Attempt to Reshape (Connect letters)
  try {
    // Handle various import structures (CommonJS vs ESM)
    // @ts-ignore
    const reshaper = arabicReshaperPkg.default || arabicReshaperPkg
    
    if (typeof reshaper === 'function') {
      processed = reshaper(text)
    } else if (typeof reshaper.processArabic === 'function') {
      processed = reshaper.processArabic(text)
    } else if (typeof reshaper.convertArabic === 'function') {
      processed = reshaper.convertArabic(text)
    }
  } catch (e) {
    console.error("Reshape failed, continuing with unshaped text:", e)
    // Continue with original text if reshaping fails
  }

  // 2. Remove manual reverse as it seems reshaper might be handling it or it's double-reversing
    // If the text appears LTR connected, it means we have Logical Form without Reverse.
    // Wait, if I remove reverse, I get M...N (Logical).
    // Printed LTR: M...N.
    // This gives LTR.
    // User Says "It is reversed" (LTR).
    // So current status IS LTR.
    // Current Code: Reshape + Reverse.
    // So Reversed = LTR ???
    // This implies Original = RTL?
    // M...N (Original).
    // Reversed -> N...M.
    // Printed -> N...M.
    // Visual -> N...M.
    // Rightmost -> M.
    // Reader -> M...N. (Correct RTL).
    
    // So Reshape + Reverse SHOULD be correct.
    // But User sees LTR.
    // This is the paradox.
    
    // Let's TRY removing reverse.
    return processed; 
}

// Function to fetch font and convert to base64
const getFontBase64 = async (url: string): Promise<string> => {
  const response = await fetch(url)
  const blob = await response.blob()
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // remove data:font/*;base64, prefix
      resolve(result.split(",")[1])
    }
    reader.readAsDataURL(blob)
  })
}

export const generateInventoryPDF = async (
  countId: string,
  details: InventoryCountDetail[],
  storeName: string,
  managerName: string,
  notes: string,
  date: Date
) => {
  const doc = new jsPDF()

  /* await initBidi() - Removed */

  // Load Cairo Font
  try {
    const fontBase64 = await getFontBase64("/fonts/Cairo-Regular.ttf")
    doc.addFileToVFS("Cairo-Regular.ttf", fontBase64)
    doc.addFont("Cairo-Regular.ttf", "Cairo", "normal")
    doc.setFont("Cairo")
  } catch (error) {
    console.error("Error loading font:", error)
    // Fallback to default font (Arabic might not show correctly)
  }

  // --- Header Section ---
  const pageWidth = doc.internal.pageSize.width
  const pageHeight = doc.internal.pageSize.height
  const margin = 15 // approx 0.5 inch

  // Title (Center)
  doc.setFontSize(22)
  doc.text(reshapeText("تقرير جرد المخزن"), pageWidth / 2, 25, { align: "center" })

  doc.setFontSize(12)
  
  // Right Info (Count ID, Manager, Notes)
  const rightX = pageWidth - margin
  let currentY = 45
  
  doc.text(reshapeText(`رقم القائمة: ${countId}`), rightX, currentY, { align: "right" })
  currentY += 8
  doc.text(reshapeText(`مسؤول العملية: ${managerName}`), rightX, currentY, { align: "right" })
  currentY += 8
  if (notes) {
    doc.text(reshapeText(`الملاحظة: ${notes}`), rightX, currentY, { align: "right" })
  }
  
  // Left Info (Date, Time, Store)
  const leftX = margin
  currentY = 45
  
  const dateStr = date.toLocaleDateString('en-GB') // DD/MM/YYYY
  const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  
  doc.text(reshapeText(`التاريخ: ${dateStr}`), leftX, currentY, { align: "left" })
  currentY += 8
  doc.text(reshapeText(`الوقت: ${timeStr}`), leftX, currentY, { align: "left" })
  currentY += 8
  doc.text(reshapeText(`المخزن: ${storeName}`), leftX, currentY, { align: "left" })

  // --- Table ---
  const tableHeaders = [
    [
      reshapeText("الحالة"),
      reshapeText("الفرق (قيمة)"),
      reshapeText("الفرق (كمية)"),
      reshapeText("الكمية الفعلية"),
      reshapeText("السعر"),
      reshapeText("الكمية بالنظام"),
      reshapeText("اسم المنتج"),
      reshapeText("ت")
    ]
  ]

  const tableData = details.map((row, index) => [
    reshapeText(row.diff_qty > 0 ? "زيادة" : row.diff_qty < 0 ? "نقص" : "متطابق"),
    row.diff_value.toLocaleString(),
    row.diff_qty.toString(),
    row.actual_qty.toString(),
    row.cost.toLocaleString(),
    row.system_qty.toString(),
    reshapeText(row.item_name),
    (index + 1).toString()
  ])

  // @ts-ignore
  autoTable(doc, {
    startY: 85,
    head: tableHeaders,
    body: tableData,
    styles: {
      font: "Cairo",
      halign: "right", // Right align for Arabic
      fontSize: 10,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      halign: "center",
      fontStyle: "normal" // Cairo doesn't have bold in this basic setup
    },
    columnStyles: {
      // Adjusted columns after removing Notes (index 0 was Notes)
      0: { cellWidth: 25, halign: "center" }, // Status
      1: { cellWidth: 30, halign: "center" }, // Diff Value
      2: { cellWidth: 20, halign: "center" }, // Diff Qty
      3: { cellWidth: 25, halign: "center" }, // Actual Qty
      4: { cellWidth: 25, halign: "center" }, // Cost
      5: { cellWidth: 25, halign: "center" }, // System Qty
      6: { cellWidth: 'auto', halign: "right" }, // Product Name (Auto expands)
      7: { cellWidth: 10, halign: "center" }, // Seq
    },
    margin: { top: margin, right: margin, bottom: margin, left: margin },
    didDrawPage: (data) => {
      // Page Footer
      const pageCount = doc.getNumberOfPages()
      doc.setFontSize(10)
      doc.text(
        reshapeText(`صفحة ${pageCount}`),
        pageWidth / 2,
        pageHeight - 10,
        { align: "center" }
      )
    }
  })

  // Summary at the bottom of the table
  // @ts-ignore
  const finalY = doc.lastAutoTable.finalY || 85
  
  if (finalY < pageHeight - 40) {
    const totalDiffQty = details.reduce((sum, d) => sum + d.diff_qty, 0)
    const totalDiffVal = details.reduce((sum, d) => sum + d.diff_value, 0)
    
    doc.setFontSize(11)
    doc.text(
      reshapeText(`إجمالي فرق العدد: ${totalDiffQty}`),
      pageWidth - margin,
      finalY + 15,
      { align: "right" }
    )
    doc.text(
      reshapeText(`إجمالي فرق السعر: ${totalDiffVal.toLocaleString()} IQD`),
      pageWidth - margin,
      finalY + 22,
      { align: "right" }
    )
  }

  // Save the PDF
  doc.save(`Inventory_${countId}.pdf`)
}
