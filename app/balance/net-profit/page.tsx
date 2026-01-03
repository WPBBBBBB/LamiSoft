"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { t } from "@/lib/translations"
import { useSettings } from "@/components/providers/settings-provider"
import { PermissionGuard } from "@/components/permission-guard"
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  AlertCircle,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

type PeriodType = "daily" | "weekly" | "monthly" | "yearly" | "all" | "custom"

interface SalesProfit {
  totalRevenue: number
  totalCost: number
  profit: number
}

interface ExpenseTotal {
  daily: number
  weekly: number
  monthly: number
  yearly: number
  once: number
  total: number
}

export default function NetProfitPage() {
  const { currentLanguage } = useSettings()
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>("all")
  const [isLoading, setIsLoading] = useState(false)
  
  const [salesProfit, setSalesProfit] = useState<SalesProfit>({ totalRevenue: 0, totalCost: 0, profit: 0 })
  const [expenses, setExpenses] = useState<ExpenseTotal>({
    daily: 0,
    weekly: 0,
    monthly: 0,
    yearly: 0,
    once: 0,
    total: 0
  })
  const [netProfit, setNetProfit] = useState(0)
  const [displayPeriod, setDisplayPeriod] = useState("")

  useEffect(() => {
    initializeDates()
  }, [])

  function initializeDates() {
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    setStartDate(today)
    setEndDate(today)
  }

  const normalizeDateOnly = (d: Date) => {
    const nd = new Date(d)
    nd.setHours(0, 0, 0, 0)
    return nd
  }

  async function getAllTimeRange(): Promise<{ start: Date; end: Date }> {
    const today = new Date()
    today.setHours(23, 59, 59, 999)

    const { data: minExpense, error: minExpenseError } = await supabase
      .from("expenses")
      .select("payment_date")
      .order("payment_date", { ascending: true })
      .limit(1)

    if (minExpenseError) throw minExpenseError

    const { data: minSale, error: minSaleError } = await supabase
      .from("tb_salesmain")
      .select("datetime")
      .order("datetime", { ascending: true })
      .limit(1)

    if (minSaleError) throw minSaleError

    const candidates: Date[] = []
    const expenseDate = minExpense?.[0]?.payment_date ? new Date(minExpense[0].payment_date) : null
    if (expenseDate && !Number.isNaN(expenseDate.getTime())) candidates.push(expenseDate)
    const saleDate = minSale?.[0]?.datetime ? new Date(minSale[0].datetime) : null
    if (saleDate && !Number.isNaN(saleDate.getTime())) candidates.push(saleDate)

    const start = candidates.length ? normalizeDateOnly(new Date(Math.min(...candidates.map(d => d.getTime())))) : normalizeDateOnly(new Date())
    return { start, end: today }
  }

  async function handlePeriodSelect(period: PeriodType) {
    setSelectedPeriod(period)
    const now = new Date()
    let start: Date, end: Date

    switch (period) {
      case "daily":
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
        break
      case "weekly":
        const dayOfWeek = now.getDay()
        const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1
        start = new Date(now.getTime() - diff * 24 * 60 * 60 * 1000)
        start.setHours(0, 0, 0, 0)
        end = new Date(now.getTime() + (6 - diff) * 24 * 60 * 60 * 1000)
        end.setHours(23, 59, 59, 999)
        break
      case "monthly":
        start = new Date(now.getFullYear(), now.getMonth(), 1)
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
        break
      case "yearly":
        start = new Date(now.getFullYear(), 0, 1)
        end = new Date(now.getFullYear(), 11, 31, 23, 59, 59)
        break
      case "all":
        ;({ start, end } = await getAllTimeRange())
        break
      default:
        return
    }

    setStartDate(start.toISOString().split('T')[0])
    setEndDate(end.toISOString().split('T')[0])
    
    await calculateProfit(start, end)
  }

  async function handleCustomPeriod() {
    if (!startDate || !endDate) {
      toast.error(t('selectStartEndDate', currentLanguage.code))
      return
    }

    const start = new Date(startDate)
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999)

    if (start > end) {
      toast.error(t('startDateBeforeEndDate', currentLanguage.code))
      return
    }

    setSelectedPeriod("custom")
    await calculateProfit(start, end)
  }

  async function calculateProfit(start: Date, end: Date) {
    setIsLoading(true)
    try {
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
      const weeks = Math.ceil(days / 7)
      const months = Math.ceil(days / 30)
      const years = Math.ceil(days / 365)

      setDisplayPeriod(`من ${start.toLocaleDateString('en-US')} إلى ${end.toLocaleDateString('en-US')}`)

      const salesProfitData = await calculateSalesProfit(start, end)
      setSalesProfit(salesProfitData)

      const expensesData = await calculateExpenses(start, end, days, weeks, months, years)
      setExpenses(expensesData)

      const netProfitValue = salesProfitData.profit - expensesData.total
      setNetProfit(netProfitValue)

      toast.success(t('netProfitCalculatedSuccess', currentLanguage.code))
    } catch (error) {
      console.error("Error calculating profit:", error)
      toast.error(t('netProfitCalculatedError', currentLanguage.code))
    } finally {
      setIsLoading(false)
    }
  }

  // Calculate sales profit by comparing revenue and cost
  async function calculateSalesProfit(start: Date, end: Date): Promise<SalesProfit> {
    try {
      const formatSupabaseError = (err: unknown) => {
        if (!err) return "(no error details)"
        if (typeof err === "string") return err
        const error = err as { message?: string; error_description?: string; hint?: string; details?: string; code?: string }
        const message = error?.message || error?.error_description || error?.hint || "(unknown error)"
        const details = error?.details ? ` | details: ${error.details}` : ""
        const code = error?.code ? ` | code: ${error.code}` : ""
        return `${message}${code}${details}`
      }

      const { data: sales, error: salesError } = await supabase
        .from("tb_salesmain")
        .select("id, datetime")
        .gte("datetime", start.toISOString())
        .lte("datetime", end.toISOString())

      if (salesError) {
        throw new Error(`tb_salesmain query failed: ${formatSupabaseError(salesError)}`)
      }

      if (!sales || sales.length === 0) {
        return { totalRevenue: 0, totalCost: 0, profit: 0 }
      }

      const saleIds = sales.map(s => s.id)

      const { data: salesDetails, error: detailsError } = await supabase
        .from("tb_salesdetails")
        .select("quantity, productcode, salemainid")
        .in("salemainid", saleIds)

      if (detailsError) {
        throw new Error(`tb_salesdetails query failed: ${formatSupabaseError(detailsError)}`)
      }

      if (!salesDetails || salesDetails.length === 0) {
        return { totalRevenue: 0, totalCost: 0, profit: 0 }
      }

      const { data: purchaseDetails, error: purchaseError } = await supabase
        .from("tb_purchaseproductsdetails")
        .select("productcode1, purchasesinglepriceiqd, sellsinglepriceiqd")

      if (purchaseError) {
        throw new Error(
          `tb_purchaseproductsdetails query failed: ${formatSupabaseError(purchaseError)}`
        )
      }

      let totalRevenue = 0
      let totalCost = 0

      const purchaseMap = new Map<string, { purchasePriceIQD: number; sellPriceIQD: number }>()
      for (const p of purchaseDetails || []) {
        const code = p.productcode1
        if (!code || purchaseMap.has(code)) continue
        purchaseMap.set(code, {
          purchasePriceIQD: Number(p.purchasesinglepriceiqd) || 0,
          sellPriceIQD: Number(p.sellsinglepriceiqd) || 0,
        })
      }

      for (const detail of salesDetails) {
        const quantity = Number(detail.quantity) || 0
        const prices = purchaseMap.get(detail.productcode)

        const sellPrice = Number(prices?.sellPriceIQD) || 0

        const purchasePrice = Number(prices?.purchasePriceIQD) || 0

        totalRevenue += quantity * sellPrice
        totalCost += quantity * purchasePrice
      }

      return {
        totalRevenue,
        totalCost,
        profit: totalRevenue - totalCost
      }
    } catch (error) {
      console.error(
        "Error calculating sales profit:",
        error instanceof Error ? error.message : String(error)
      )
      return { totalRevenue: 0, totalCost: 0, profit: 0 }
    }
  }

  async function calculateExpenses(
    start: Date,
    end: Date,
    days: number,
    weeks: number,
    months: number,
    years: number
  ): Promise<ExpenseTotal> {
    try {
      const lastDayOfMonth = (year: number, monthIndex0: number) => new Date(year, monthIndex0 + 1, 0).getDate()

      const dayDiffInclusive = (from: Date, to: Date) => {
        const a = normalizeDateOnly(from).getTime()
        const b = normalizeDateOnly(to).getTime()
        if (b < a) return 0
        return Math.floor((b - a) / (1000 * 60 * 60 * 24)) + 1
      }

      const countWeeklyOccurrences = (anchor: Date, rangeStart: Date, rangeEnd: Date) => {
        const anchorMs = normalizeDateOnly(anchor).getTime()
        const startMs = normalizeDateOnly(rangeStart).getTime()
        const endMs = normalizeDateOnly(rangeEnd).getTime()
        if (endMs < anchorMs) return 0
        const periodMs = 7 * 24 * 60 * 60 * 1000
        const k = Math.ceil((startMs - anchorMs) / periodMs)
        const firstMs = anchorMs + Math.max(0, k) * periodMs
        if (firstMs > endMs) return 0
        return 1 + Math.floor((endMs - firstMs) / periodMs)
      }

      const countMonthlyOccurrences = (anchor: Date, rangeStart: Date, rangeEnd: Date) => {
        const anchorDate = normalizeDateOnly(anchor)
        const startDate = normalizeDateOnly(rangeStart)
        const endDate = normalizeDateOnly(rangeEnd)
        if (endDate < anchorDate) return 0

        const anchorDay = anchorDate.getDate()
        let y = startDate.getFullYear()
        let m = startDate.getMonth()
        const endY = endDate.getFullYear()
        const endM = endDate.getMonth()
        let count = 0

        while (y < endY || (y === endY && m <= endM)) {
          const day = Math.min(anchorDay, lastDayOfMonth(y, m))
          const occ = new Date(y, m, day)
          if (occ >= anchorDate && occ >= startDate && occ <= endDate) count++
          m++
          if (m > 11) {
            m = 0
            y++
          }
        }
        return count
      }

      const countYearlyOccurrences = (anchor: Date, rangeStart: Date, rangeEnd: Date) => {
        const anchorDate = normalizeDateOnly(anchor)
        const startDate = normalizeDateOnly(rangeStart)
        const endDate = normalizeDateOnly(rangeEnd)
        if (endDate < anchorDate) return 0

        const anchorMonth = anchorDate.getMonth()
        const anchorDay = anchorDate.getDate()
        let y = startDate.getFullYear()
        const endY = endDate.getFullYear()
        let count = 0

        while (y <= endY) {
          const day = Math.min(anchorDay, lastDayOfMonth(y, anchorMonth))
          const occ = new Date(y, anchorMonth, day)
          if (occ >= anchorDate && occ >= startDate && occ <= endDate) count++
          y++
        }
        return count
      }

      const { data: allExpenses, error } = await supabase
        .from("expenses")
        .select("*")
        .order("payment_date", { ascending: true })

      if (error) throw error

      let dailyTotal = 0
      let weeklyTotal = 0
      let monthlyTotal = 0
      let yearlyTotal = 0
      let onceTotal = 0

      for (const expense of allExpenses || []) {
        const cost = Number(expense.cost) || 0
        if (!cost) continue

        const anchor = new Date(expense.payment_date)
        const anchorValid = !Number.isNaN(anchor.getTime())
        if (!anchorValid) continue
        
        switch (expense.recurrence) {
          case "يومي":
            dailyTotal += cost * dayDiffInclusive(new Date(Math.max(normalizeDateOnly(start).getTime(), normalizeDateOnly(anchor).getTime())), end)
            break

          case "أسبوعي":
            weeklyTotal += cost * countWeeklyOccurrences(anchor, start, end)
            break

          case "شهري":
            monthlyTotal += cost * countMonthlyOccurrences(anchor, start, end)
            break

          case "سنوي":
            yearlyTotal += cost * countYearlyOccurrences(anchor, start, end)
            break

          case "مرة واحدة":
            if (normalizeDateOnly(anchor) >= normalizeDateOnly(start) && normalizeDateOnly(anchor) <= normalizeDateOnly(end)) {
              onceTotal += cost
            }
            break
        }
      }

      const total = dailyTotal + weeklyTotal + monthlyTotal + yearlyTotal + onceTotal

      return {
        daily: dailyTotal,
        weekly: weeklyTotal,
        monthly: monthlyTotal,
        yearly: yearlyTotal,
        once: onceTotal,
        total
      }
    } catch (error) {
      console.error("Error calculating expenses:", error)
      return {
        daily: 0,
        weekly: 0,
        monthly: 0,
        yearly: 0,
        once: 0,
        total: 0
      }
    }
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  return (
    <PermissionGuard requiredPermission="view_statistics">
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold" style={{ color: "var(--theme-primary)" }}>
          {t('netProfit', currentLanguage.code)}
        </h1>
        <p className="text-muted-foreground mt-2">
          {t('netProfitSubtitle', currentLanguage.code)}
        </p>
      </div>

      {/* Period Selection */}
      <Card>
        <CardHeader>
          <CardTitle>{t('profitStatement', currentLanguage.code)}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="start-date">{t('fromDate', currentLanguage.code)}</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="end-date">{t('toDate', currentLanguage.code)}</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <Button
              onClick={handleCustomPeriod}
              disabled={isLoading}
              style={{
                backgroundColor: "var(--theme-primary)",
                color: "white",
              }}
            >
              <Calendar className="h-4 w-4 ml-2" />
              {t('generateStatement', currentLanguage.code)}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Period Buttons */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => handlePeriodSelect("daily")}
              variant={selectedPeriod === "daily" ? "default" : "outline"}
              disabled={isLoading}
              style={
                selectedPeriod === "daily"
                  ? { backgroundColor: "var(--theme-primary)", color: "white" }
                  : {}
              }
            >
              {t('dailyStatement', currentLanguage.code)}
            </Button>
            <Button
              onClick={() => handlePeriodSelect("weekly")}
              variant={selectedPeriod === "weekly" ? "default" : "outline"}
              disabled={isLoading}
              style={
                selectedPeriod === "weekly"
                  ? { backgroundColor: "var(--theme-primary)", color: "white" }
                  : {}
              }
            >
              {t('weeklyStatement', currentLanguage.code)}
            </Button>
            <Button
              onClick={() => handlePeriodSelect("monthly")}
              variant={selectedPeriod === "monthly" ? "default" : "outline"}
              disabled={isLoading}
              style={
                selectedPeriod === "monthly"
                  ? { backgroundColor: "var(--theme-primary)", color: "white" }
                  : {}
              }
            >
              {t('monthlyStatement', currentLanguage.code)}
            </Button>
            <Button
              onClick={() => handlePeriodSelect("yearly")}
              variant={selectedPeriod === "yearly" ? "default" : "outline"}
              disabled={isLoading}
              style={
                selectedPeriod === "yearly"
                  ? { backgroundColor: "var(--theme-primary)", color: "white" }
                  : {}
              }
            >
              {t('yearlyStatement', currentLanguage.code)}
            </Button>
            <Button
              onClick={() => handlePeriodSelect("all")}
              variant={selectedPeriod === "all" ? "default" : "outline"}
              disabled={isLoading}
              style={
                selectedPeriod === "all"
                  ? { backgroundColor: "var(--theme-primary)", color: "white" }
                  : {}
              }
            >
              {t('allTimeStatement', currentLanguage.code)}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Display Period */}
      {displayPeriod && (
        <div className="text-center p-4 bg-muted rounded-lg">
          <p className="text-lg font-medium">
            {t('netProfitForPeriod', currentLanguage.code)}: <span className="text-primary">{displayPeriod}</span>
          </p>
        </div>
      )}

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Sales Profit Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('salesProfitCard', currentLanguage.code)}</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(salesProfit.profit)} د.ع
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {t('revenue', currentLanguage.code)}: {formatCurrency(salesProfit.totalRevenue)}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('cost', currentLanguage.code)}: {formatCurrency(salesProfit.totalCost)}
            </p>
          </CardContent>
        </Card>

        {/* Daily Expenses Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dailySpending', currentLanguage.code)}</CardTitle>
            <Wallet className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(expenses.daily)} د.ع
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {t('recurringDaily', currentLanguage.code)}
            </p>
          </CardContent>
        </Card>

        {/* Weekly Expenses Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('weeklySpending', currentLanguage.code)}</CardTitle>
            <Wallet className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(expenses.weekly)} د.ع
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {t('recurringWeekly', currentLanguage.code)}
            </p>
          </CardContent>
        </Card>

        {/* Monthly Expenses Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('monthlySpending', currentLanguage.code)}</CardTitle>
            <Wallet className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(expenses.monthly)} د.ع
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {t('recurringMonthly', currentLanguage.code)}
            </p>
          </CardContent>
        </Card>

        {/* Yearly Expenses Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('yearlySpending', currentLanguage.code)}</CardTitle>
            <Wallet className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">
              {formatCurrency(expenses.yearly)} د.ع
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {t('recurringYearly', currentLanguage.code)}
            </p>
          </CardContent>
        </Card>

        {/* One-time Expenses Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('oneTimeSpending', currentLanguage.code)}</CardTitle>
            <AlertCircle className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">
              {formatCurrency(expenses.once)} د.ع
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {t('nonRecurring', currentLanguage.code)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-2" style={{ borderColor: netProfit >= 0 ? "#10b981" : "#ef4444" }}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-bold">{t('netProfit', currentLanguage.code)}</CardTitle>
          {netProfit >= 0 ? (
            <TrendingUp className="h-6 w-6 text-green-600" />
          ) : (
            <TrendingDown className="h-6 w-6 text-red-600" />
          )}
        </CardHeader>
        <CardContent>
          <div
            className={`text-4xl font-bold ${
              netProfit >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {formatCurrency(netProfit)} د.ع
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('salesProfitCard', currentLanguage.code)}:</span>
              <span className="font-medium text-green-600">
                +{formatCurrency(salesProfit.profit)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('totalExpenses', currentLanguage.code)}:</span>
              <span className="font-medium text-red-600">
                -{formatCurrency(expenses.total)}
              </span>
            </div>
            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between text-sm font-medium">
                <span>{t('net', currentLanguage.code)}:</span>
                <span className={netProfit >= 0 ? "text-green-600" : "text-red-600"}>
                  {formatCurrency(netProfit)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
    </PermissionGuard>
  )
}
