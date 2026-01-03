"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { t } from "@/lib/translations"
import { useSettings } from "@/components/providers/settings-provider"
import { PermissionGuard } from "@/components/permission-guard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Calendar,
  TrendingUp,
  Printer,
  FileSpreadsheet,
  FileText,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import ExcelJS from "exceljs"
import jsPDF from "jspdf"
import "jspdf-autotable"

declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: {
      head?: unknown[][]
      body?: unknown[][]
      startY?: number
      [key: string]: unknown
    }) => jsPDF
  }
}

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

type PeriodType = "thisweek" | "thismonth" | "thisyear" | "all" | "custom"

interface ProductProfit {
  productCode: string
  productName: string
  salesCount: number
  totalQuantitySold: number
  purchasePriceIQD: number
  sellPriceIQD: number
  profitPerUnit: number
  totalProfit: number
}

export default function SalesProfitPage() {
  const { currentLanguage } = useSettings()
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>("all")
  const [customStartDate, setCustomStartDate] = useState("")
  const [customEndDate, setCustomEndDate] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [products, setProducts] = useState<ProductProfit[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [totalProfit, setTotalProfit] = useState(0)
  const [topSellingProducts, setTopSellingProducts] = useState<ProductProfit[]>([])
  const [topProfitProducts, setTopProfitProducts] = useState<ProductProfit[]>([])
  const [slowMovingProducts, setSlowMovingProducts] = useState<{
    productCode: string
    productName: string
    daysSinceLastSale: number
    lastSaleDate: string
  }[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  useEffect(() => {
    if (selectedPeriod !== "custom") {
      loadData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPeriod, customStartDate, customEndDate])

  function getDateRange(period: PeriodType): { startDate: Date; endDate: Date } | null {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    switch (period) {
      case "thisweek":
        const dayOfWeek = now.getDay()
        const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1
        const monday = new Date(today.getTime() - diff * 24 * 60 * 60 * 1000)
        return {
          startDate: monday,
          endDate: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        }
      case "thismonth":
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        return {
          startDate: firstDayOfMonth,
          endDate: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        }
      case "thisyear":
        const firstDayOfYear = new Date(now.getFullYear(), 0, 1)
        return {
          startDate: firstDayOfYear,
          endDate: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        }
      case "all":
        return null
      case "custom":
        if (customStartDate && customEndDate) {
          return {
            startDate: new Date(customStartDate),
            endDate: new Date(new Date(customEndDate).getTime() + 24 * 60 * 60 * 1000)
          }
        }
        return null
    }
  }

  async function loadData() {
    try {
      setIsLoading(true)

      const dateRange = getDateRange(selectedPeriod)

      const { data: inventoryProducts, error: invError } = await supabase
        .from("tb_inventory")
        .select("productcode, productname")

      if (invError) throw invError

      if (!inventoryProducts || inventoryProducts.length === 0) {
        setProducts([])
        setTotalItems(0)
        setTotalProfit(0)
        setIsLoading(false)
        return
      }

      let salesQuery = supabase
        .from("tb_salesdetails")
        .select("productcode, productname, quantity, salemainid")

      if (dateRange) {
        const mainSalesQuery = supabase
          .from("tb_salesmain")
          .select("id")
          .gte("datetime", dateRange.startDate.toISOString())
          .lt("datetime", dateRange.endDate.toISOString())

        const { data: mainSales } = await mainSalesQuery
        const saleIds = mainSales?.map(s => s.id) || []

        if (saleIds.length > 0) {
          salesQuery = salesQuery.in("salemainid", saleIds)
        } else {
          setProducts([])
          setTotalItems(0)
          setTotalProfit(0)
          setIsLoading(false)
          return
        }
      }

      const { data: salesDetails } = await salesQuery

      const { data: purchaseDetails } = await supabase
        .from("tb_purchaseproductsdetails")
        .select("productcode1, purchasesinglepriceiqd, sellsinglepriceiqd")

      const productMap = new Map<string, ProductProfit>()

      inventoryProducts.forEach(inv => {
        const productCode = inv.productcode
        const productName = inv.productname

        const salesCount = salesDetails?.filter(s => s.productcode === productCode).length || 0

        const totalQuantitySold = salesDetails
          ?.filter(s => s.productcode === productCode)
          .reduce((sum, s) => sum + (Number(s.quantity) || 0), 0) || 0

        const purchaseInfo = purchaseDetails?.find(p => p.productcode1 === productCode)
        const purchasePriceIQD = purchaseInfo?.purchasesinglepriceiqd || 0
        const sellPriceIQD = purchaseInfo?.sellsinglepriceiqd || 0

        const profitPerUnit = sellPriceIQD - purchasePriceIQD
        const totalProfit = profitPerUnit * totalQuantitySold

        productMap.set(productCode, {
          productCode,
          productName,
          salesCount,
          totalQuantitySold,
          purchasePriceIQD,
          sellPriceIQD,
          profitPerUnit,
          totalProfit
        })
      })

      const productsArray = Array.from(productMap.values())
      setProducts(productsArray)
      setTotalItems(productsArray.length)
      setTotalProfit(productsArray.reduce((sum, p) => sum + p.totalProfit, 0))

      const topSelling = [...productsArray]
        .filter(p => p.totalQuantitySold > 0)
        .sort((a, b) => b.totalQuantitySold - a.totalQuantitySold)
        .slice(0, 6)
      setTopSellingProducts(topSelling)

      const topProfit = [...productsArray]
        .filter(p => p.totalProfit > 0)
        .sort((a, b) => b.totalProfit - a.totalProfit)
        .slice(0, 6)
      setTopProfitProducts(topProfit)

      const oneMonthAgo = new Date()
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)

      const { data: allSalesDetails } = await supabase
        .from("tb_salesdetails")
        .select("productcode, salemainid")

      const { data: allSalesMain } = await supabase
        .from("tb_salesmain")
        .select("id, datetime")

      const salesMap = new Map(allSalesMain?.map(s => [s.id, s.datetime]) || [])

      const productLastSale = new Map<string, Date>()
      allSalesDetails?.forEach(sd => {
        const saleDate = salesMap.get(sd.salemainid)
        if (saleDate) {
          const currentLast = productLastSale.get(sd.productcode)
          const newDate = new Date(saleDate)
          if (!currentLast || newDate > currentLast) {
            productLastSale.set(sd.productcode, newDate)
          }
        }
      })

      const slowMoving = inventoryProducts
        .map(inv => {
          const lastSaleDate = productLastSale.get(inv.productcode)
          const daysSinceLastSale = lastSaleDate 
            ? Math.floor((new Date().getTime() - lastSaleDate.getTime()) / (1000 * 60 * 60 * 24))
            : 999
          
          return {
            productCode: inv.productcode,
            productName: inv.productname,
            daysSinceLastSale,
            lastSaleDate: lastSaleDate ? lastSaleDate.toLocaleDateString("ar-IQ") : "لم يبع أبداً"
          }
        })
        .filter(p => p.daysSinceLastSale > 30)
        .sort((a, b) => b.daysSinceLastSale - a.daysSinceLastSale)
        .slice(0, 10)
      
      setSlowMovingProducts(slowMoving)

    } catch (error) {
      console.error(error)
      toast.error("حدث خطأ أثناء تحميل البيانات")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCustomDateFilter = () => {
    if (!customStartDate || !customEndDate) {
      toast.error("الرجاء اختيار تاريخ البداية والنهاية")
      return
    }
    if (new Date(customStartDate) > new Date(customEndDate)) {
      toast.error("تاريخ البداية يجب أن يكون قبل تاريخ النهاية")
      return
    }
    setSelectedPeriod("custom")
    loadData()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US").format(amount)
  }

  const handlePrint = () => {
    window.print()
  }

  const handleExportExcel = async () => {
    const data = products.map(p => ({
      "رمز المادة": p.productCode,
      "اسم المادة": p.productName,
      "عدد مرات البيع": p.salesCount,
      "الكمية المباعة": p.totalQuantitySold,
      "سعر الشراء مفرد": p.purchasePriceIQD,
      "سعر البيع مفرد": p.sellPriceIQD,
      "ربح المفرد": p.profitPerUnit,
      "الربح الإجمالي": p.totalProfit
    }))

    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('أرباح المبيعات')
    
    // تحديد الأعمدة
    worksheet.columns = [
      { header: 'اسم المادة', key: 'اسم المادة', width: 30 },
      { header: 'عدد مرات البيع', key: 'عدد مرات البيع', width: 15 },
      { header: 'الكمية المباعة', key: 'الكمية المباعة', width: 15 },
      { header: 'سعر الشراء مفرد', key: 'سعر الشراء مفرد', width: 18 },
      { header: 'سعر البيع مفرد', key: 'سعر البيع مفرد', width: 18 },
      { header: 'ربح المفرد', key: 'ربح المفرد', width: 15 },
      { header: 'مجموع ربح المادة', key: 'مجموع ربح المادة', width: 20 },
    ]
    
    // إضافة البيانات
    worksheet.addRows(data)
    
    // تنسيق الهيدر
    worksheet.getRow(1).font = { bold: true }
    worksheet.getRow(1).alignment = { horizontal: 'center' }
    
    // حفظ الملف
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `أرباح_المبيعات_${new Date().toISOString().split('T')[0]}.xlsx`
    a.click()
    window.URL.revokeObjectURL(url)
    
    toast.success("تم تصدير الملف بنجاح")
  }

  const handleExportPDF = () => {
    const doc = new jsPDF()

    doc.text("أرباح المبيعات", 105, 15, { align: "center" })

    const tableData = products.map(p => [
      p.productCode,
      p.productName,
      p.salesCount,
      formatCurrency(p.totalQuantitySold),
      formatCurrency(p.purchasePriceIQD),
      formatCurrency(p.sellPriceIQD),
      formatCurrency(p.profitPerUnit),
      formatCurrency(p.totalProfit)
    ])

    doc.autoTable({
      head: [["رمز المادة", "اسم المادة", "عدد مرات البيع", "الكمية المباعة", "سعر الشراء", "سعر البيع", "ربح المفرد", "مجموع الربح"]],
      body: tableData,
      startY: 25
    })

    doc.save(`أرباح_المبيعات_${new Date().toISOString().split('T')[0]}.pdf`)
    toast.success(t('exportedSuccessfully', currentLanguage.code))
  }

  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case "thisweek": return t('profitThisWeek', currentLanguage.code)
      case "thismonth": return t('profitThisMonth', currentLanguage.code)
      case "thisyear": return t('profitThisYear', currentLanguage.code)
      case "all": return t('totalProfitAll', currentLanguage.code)
      case "custom": return `${t('profitFrom', currentLanguage.code)} ${new Date(customStartDate).toLocaleDateString("ar-IQ")} ${t('to', currentLanguage.code)} ${new Date(customEndDate).toLocaleDateString("ar-IQ")}`
    }
  }

  const totalPages = Math.ceil(products.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentProducts = products.slice(startIndex, endIndex)

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  useEffect(() => {
    setCurrentPage(1)
  }, [products.length])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <TrendingUp className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">{t('loadingData', currentLanguage.code)}</p>
        </div>
      </div>
    )
  }

  return (
    <PermissionGuard requiredPermission="view_statistics">
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold" style={{ color: "var(--theme-primary)" }}>
          {t('salesProfit', currentLanguage.code)}
        </h1>
        <p className="text-muted-foreground mt-2">
          {t('trackAndAnalyzeProfits', currentLanguage.code)}
          {getPeriodLabel()}
        </p>
      </div>

      {}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3 items-end">
            <Button
              variant={selectedPeriod === "thisweek" ? "default" : "outline"}
              onClick={() => setSelectedPeriod("thisweek")}
              className="gap-2"
            >
              <Calendar className="h-4 w-4" />
              {t('profitThisWeek', currentLanguage.code)}
            </Button>
            <Button
              variant={selectedPeriod === "thismonth" ? "default" : "outline"}
              onClick={() => setSelectedPeriod("thismonth")}
              className="gap-2"
            >
              <Calendar className="h-4 w-4" />
              {t('profitThisMonth', currentLanguage.code)}
            </Button>
            <Button
              variant={selectedPeriod === "thisyear" ? "default" : "outline"}
              onClick={() => setSelectedPeriod("thisyear")}
              className="gap-2"
            >
              <Calendar className="h-4 w-4" />
              {t('profitThisYear', currentLanguage.code)}
            </Button>
            <Button
              variant={selectedPeriod === "all" ? "default" : "outline"}
              onClick={() => setSelectedPeriod("all")}
              className="gap-2"
            >
              <TrendingUp className="h-4 w-4" />
              {t('totalProfitAll', currentLanguage.code)}
            </Button>

            <div className="flex-1 min-w-[300px]" />

            {}
            <div className="flex gap-2 items-end">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">{t('from', currentLanguage.code)}</label>
                <Input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-[150px]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">{t('to', currentLanguage.code)}</label>
                <Input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-[150px]"
                />
              </div>
              <Button
                onClick={handleCustomDateFilter}
                variant={selectedPeriod === "custom" ? "default" : "outline"}
                className="gap-2"
              >
                <Calendar className="h-4 w-4" />
                عرض
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3">
            <Button onClick={handlePrint} variant="outline" className="gap-2">
              <Printer className="h-4 w-4" />
              {t('printTable', currentLanguage.code)}
            </Button>
            <Button onClick={handleExportExcel} variant="outline" className="gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              {t('exportExcel', currentLanguage.code)}
            </Button>
            <Button onClick={handleExportPDF} variant="outline" className="gap-2">
              <FileText className="h-4 w-4" />
              {t('exportPDF', currentLanguage.code)}
            </Button>
          </div>
        </CardContent>
      </Card>

      {}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {t('profitDetails', currentLanguage.code)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('materialCode', currentLanguage.code)}</TableHead>
                  <TableHead>{t('materialName', currentLanguage.code)}</TableHead>
                  <TableHead>{t('salesCount', currentLanguage.code)}</TableHead>
                  <TableHead>{t('totalQuantitySold', currentLanguage.code)}</TableHead>
                  <TableHead>{t('purchasePrice', currentLanguage.code)}</TableHead>
                  <TableHead>{t('sellPrice', currentLanguage.code)}</TableHead>
                  <TableHead>{t('profitPerUnit', currentLanguage.code)}</TableHead>
                  <TableHead>{t('totalProductProfit', currentLanguage.code)}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {t('noDataToDisplay', currentLanguage.code)}
                    </TableCell>
                  </TableRow>
                ) : (
                  currentProducts.map((product) => (
                    <TableRow key={product.productCode}>
                      <TableCell className="font-medium">{product.productCode}</TableCell>
                      <TableCell>{product.productName}</TableCell>
                      <TableCell>{formatCurrency(product.salesCount)}</TableCell>
                      <TableCell className="font-semibold text-blue-600">{formatCurrency(product.totalQuantitySold)}</TableCell>
                      <TableCell>{formatCurrency(product.purchasePriceIQD)} د.ع</TableCell>
                      <TableCell>{formatCurrency(product.sellPriceIQD)} د.ع</TableCell>
                      <TableCell className={product.profitPerUnit >= 0 ? "text-green-600" : "text-red-600"}>
                        {formatCurrency(product.profitPerUnit)} د.ع
                      </TableCell>
                      <TableCell className={product.totalProfit >= 0 ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                        {formatCurrency(product.totalProfit)} د.ع
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between border-t pt-4">
              <div className="text-sm text-muted-foreground">
                {t('showing', currentLanguage.code)} {startIndex + 1} - {Math.min(endIndex, products.length)} {t('outOf', currentLanguage.code)} {products.length} {t('material', currentLanguage.code)}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                  className="gap-1"
                >
                  <ChevronRight className="h-4 w-4" />
                  {t('previous', currentLanguage.code)}
                </Button>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-medium">{t('page', currentLanguage.code)} {currentPage} {t('of', currentLanguage.code)} {totalPages}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className="gap-1"
                >
                  {t('next', currentLanguage.code)}
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {}
          <div className="mt-6 space-y-2 border-t pt-4">
            <div className="flex justify-between items-center text-lg">
              <span className="font-semibold">{t('totalMaterials', currentLanguage.code)}:</span>
              <span className="text-blue-600 font-bold">{formatCurrency(totalItems)} {t('material', currentLanguage.code)}</span>
            </div>
            <div className="flex justify-between items-center text-xl">
              <span className="font-semibold">{t('totalOverallProfit', currentLanguage.code)}:</span>
              <span className={`font-bold ${totalProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(totalProfit)} د.ع
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            {t('top6SellingProducts', currentLanguage.code)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topSellingProducts.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">{t('noDataToDisplay', currentLanguage.code)}</p>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
                {topSellingProducts.map((product, index) => (
                  <Card key={product.productCode} className="border-2 border-blue-500/20">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-2">
                        <div className="text-2xl font-bold text-blue-600">#{index + 1}</div>
                        <div className="text-right">
                          <div className="font-semibold text-sm">{product.productName}</div>
                          <div className="text-xs text-muted-foreground">{product.productCode}</div>
                        </div>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>{t('quantity', currentLanguage.code)}:</span>
                          <span className="font-bold text-blue-600">{formatCurrency(product.totalQuantitySold)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>{t('profit', currentLanguage.code)}:</span>
                          <span className="font-bold text-green-600">{formatCurrency(product.totalProfit)} د.ع</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {}
              <div className="mt-6 p-4 bg-linear-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 rounded-lg">
                <h3 className="text-lg font-semibold mb-4 text-center text-blue-900 dark:text-blue-100">مخطط الكميات المباعة</h3>
                <ResponsiveContainer width="100%" height={450}>
                  <BarChart 
                    data={topSellingProducts.map(p => ({
                      name: p.productName.length > 20 ? p.productName.substring(0, 20) + '...' : p.productName,
                      الكمية: p.totalQuantitySold,
                      الربح: p.totalProfit
                    }))}
                    margin={{ top: 20, right: 30, left: 20, bottom: 120 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" />
                    <XAxis 
                      dataKey="name" 
                      angle={-25} 
                      textAnchor="end" 
                      height={130}
                      tick={{ fontSize: 15, fill: '#0f172a', fontWeight: 700 }}
                      interval={0}
                      stroke="#475569"
                    />
                    <YAxis 
                      yAxisId="left"
                      tick={{ fontSize: 14, fill: '#0f172a', fontWeight: 600 }}
                      label={{ value: t('quantity', currentLanguage.code), angle: -90, position: 'insideLeft', style: { fontSize: 16, fontWeight: 'bold', fill: '#1e3a8a' } }}
                      stroke="#475569"
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 14, fill: '#0f172a', fontWeight: 600 }}
                      label={{ value: `${t('profit', currentLanguage.code)} (${t('iqd', currentLanguage.code)})`, angle: 90, position: 'insideRight', style: { fontSize: 16, fontWeight: 'bold', fill: '#065f46' } }}
                      stroke="#475569"
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                      formatter={(value: number | string) => formatCurrency(Number(value))}
                    />
                    <Legend 
                      wrapperStyle={{ paddingTop: '20px' }}
                      iconType="rect"
                    />
                    <Bar 
                      yAxisId="left"
                      dataKey={t('quantity', currentLanguage.code)} 
                      fill="#2563eb" 
                      radius={[8, 8, 0, 0]}
                      label={{ position: 'top', fontSize: 12, fill: '#1e3a8a', fontWeight: 'bold' }}
                    />
                    <Bar 
                      yAxisId="right"
                      dataKey={t('profit', currentLanguage.code)} 
                      fill="#059669" 
                      radius={[8, 8, 0, 0]}
                      opacity={0.85}
                      label={{ position: 'top', fontSize: 11, fill: '#065f46', fontWeight: 'bold' }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            {t('top6ProfitableProducts', currentLanguage.code)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topProfitProducts.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">{t('noDataToDisplay', currentLanguage.code)}</p>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
                {topProfitProducts.map((product, index) => (
                  <Card key={product.productCode} className="border-2 border-green-500/20">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-2">
                        <div className="text-2xl font-bold text-green-600">#{index + 1}</div>
                        <div className="text-right">
                          <div className="font-semibold text-sm">{product.productName}</div>
                          <div className="text-xs text-muted-foreground">{product.productCode}</div>
                        </div>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>{t('profitPerUnit', currentLanguage.code)}:</span>
                          <span className="font-semibold">{formatCurrency(product.profitPerUnit)} {t('iqd', currentLanguage.code)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>{t('totalProfit', currentLanguage.code)}:</span>
                          <span className="font-bold text-green-600">{formatCurrency(product.totalProfit)} {t('iqd', currentLanguage.code)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>{t('quantity', currentLanguage.code)}:</span>
                          <span className="text-muted-foreground">{formatCurrency(product.totalQuantitySold)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {}
              <div className="mt-6 p-4 bg-linear-to-br from-green-50 to-emerald-100 dark:from-green-950 dark:to-emerald-900 rounded-lg">
                <h3 className="text-lg font-semibold mb-4 text-center text-green-900 dark:text-green-100">{t('profitChart', currentLanguage.code)}</h3>
                <ResponsiveContainer width="100%" height={450}>
                  <BarChart 
                    data={topProfitProducts.map(p => ({
                      name: p.productName.length > 20 ? p.productName.substring(0, 20) + '...' : p.productName,
                      الربح: p.totalProfit,
                      ربح_المفرد: p.profitPerUnit,
                      الكمية: p.totalQuantitySold
                    }))}
                    margin={{ top: 20, right: 30, left: 20, bottom: 120 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" />
                    <XAxis 
                      dataKey="name" 
                      angle={-25} 
                      textAnchor="end" 
                      height={130}
                      tick={{ fontSize: 15, fill: '#0f172a', fontWeight: 700 }}
                      interval={0}
                      stroke="#475569"
                    />
                    <YAxis 
                      yAxisId="left"
                      tick={{ fontSize: 14, fill: '#0f172a', fontWeight: 600 }}
                      label={{ value: `${t('totalProfitLabel', currentLanguage.code)} (${t('iqd', currentLanguage.code)})`, angle: -90, position: 'insideLeft', style: { fontSize: 16, fontWeight: 'bold', fill: '#065f46' } }}
                      stroke="#475569"
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 14, fill: '#0f172a', fontWeight: 600 }}
                      label={{ value: `${t('unitProfitLabel', currentLanguage.code)} (${t('iqd', currentLanguage.code)})`, angle: 90, position: 'insideRight', style: { fontSize: 16, fontWeight: 'bold', fill: '#ea580c' } }}
                      stroke="#475569"
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                      formatter={(value: number | string) => formatCurrency(Number(value)) + ' د.ع'}
                    />
                    <Legend 
                      wrapperStyle={{ paddingTop: '20px' }}
                      iconType="rect"
                    />
                    <Bar 
                      yAxisId="left"
                      dataKey={t('totalProfit', currentLanguage.code)} 
                      fill="#059669" 
                      radius={[8, 8, 0, 0]}
                      label={{ position: 'top', fontSize: 12, fill: '#065f46', fontWeight: 'bold' }}
                    />
                    <Bar 
                      yAxisId="right"
                      dataKey={t('profitPerUnit', currentLanguage.code)} 
                      fill="#f97316" 
                      radius={[8, 8, 0, 0]}
                      opacity={0.85}
                      label={{ position: 'top', fontSize: 11, fill: '#ea580c', fontWeight: 'bold' }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            {t('slowMovingProductsFullTitle', currentLanguage.code)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {slowMovingProducts.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">{t('allProductsActive', currentLanguage.code)}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>{t('materialCode', currentLanguage.code)}</TableHead>
                    <TableHead>{t('materialName', currentLanguage.code)}</TableHead>
                    <TableHead>{t('lastSaleDate', currentLanguage.code)}</TableHead>
                    <TableHead>{t('numberOfDays', currentLanguage.code)}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slowMovingProducts.map((product, index) => (
                    <TableRow key={`${product.productCode}-${index}`}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>{product.productCode}</TableCell>
                      <TableCell>{product.productName}</TableCell>
                      <TableCell>{product.lastSaleDate}</TableCell>
                      <TableCell className="font-bold text-orange-600">
                        {product.daysSinceLastSale === 999 ? t('neverSold', currentLanguage.code) : `${product.daysSinceLastSale} ${t('day', currentLanguage.code)}`}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </PermissionGuard>
  )
}
