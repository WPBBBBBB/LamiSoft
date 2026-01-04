"use client"

import { PermissionGuard } from "@/components/permission-guard"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { t } from "@/lib/translations"
import { useSettings } from "@/components/providers/settings-provider"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Calendar,
  ShoppingCart,
  TrendingUp,
  Users,
  DollarSign,
  Activity,
  TrendingDown,
  Wallet,
  BarChart3,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
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

type DateRange = "today" | "yesterday" | "last3days" | "thisweek"

interface StatsData {
  totalPurchases: number
  totalPurchasesAmount: number
  totalSales: number
  totalSalesAmount: number
  totalProfit: number
  totalCustomers: number
  totalUsers: number
  totalLogins: number
}

export default function DailyStatsPage() {
  const { currentLanguage } = useSettings()
  const [selectedRange, setSelectedRange] = useState<DateRange>("today")
  const [customStartDate, setCustomStartDate] = useState("")
  const [customEndDate, setCustomEndDate] = useState("")
  const [isCustomRange, setIsCustomRange] = useState(false)
  const [stats, setStats] = useState<StatsData>({
    totalPurchases: 0,
    totalPurchasesAmount: 0,
    totalSales: 0,
    totalSalesAmount: 0,
    totalProfit: 0,
    totalCustomers: 0,
    totalUsers: 0,
    totalLogins: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [dailyChart, setDailyChart] = useState<{ day: string; المبيعات: number; المشتريات: number; الربح: number }[]>([])

  useEffect(() => {
    if (!isCustomRange) {
      loadStats()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRange, isCustomRange])

  function getDateRange(range: DateRange, customStart?: string, customEnd?: string): { startDate: Date; endDate: Date } {
    if (customStart && customEnd) {
      return {
        startDate: new Date(customStart),
        endDate: new Date(new Date(customEnd).getTime() + 24 * 60 * 60 * 1000)
      }
    }
    
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    switch (range) {
      case "today":
        return {
          startDate: today,
          endDate: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        }
      case "yesterday":
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
        return {
          startDate: yesterday,
          endDate: today
        }
      case "last3days":
        const threeDaysAgo = new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000)
        return {
          startDate: threeDaysAgo,
          endDate: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        }
      case "thisweek":
        const dayOfWeek = now.getDay()
        const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1
        const monday = new Date(today.getTime() - diff * 24 * 60 * 60 * 1000)
        return {
          startDate: monday,
          endDate: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        }
    }
  }

  async function loadStats() {
    try {
      setIsLoading(true)
      
      const { startDate, endDate } = isCustomRange 
        ? getDateRange(selectedRange, customStartDate, customEndDate)
        : getDateRange(selectedRange)

      const { data: purchases } = await supabase
        .from("tb_purchasemain")
        .select("totalpurchaseiqd, datetime")
        .gte("datetime", startDate.toISOString())
        .lt("datetime", endDate.toISOString())
      
      const totalPurchases = purchases?.length || 0
      const totalPurchasesAmount = purchases?.reduce((sum, p) => sum + (p.totalpurchaseiqd || 0), 0) || 0

      const { data: sales } = await supabase
        .from("tb_salesmain")
        .select("finaltotaliqd, datetime")
        .gte("datetime", startDate.toISOString())
        .lt("datetime", endDate.toISOString())
      
      const totalSales = sales?.length || 0
      const totalSalesAmount = sales?.reduce((sum, s) => sum + (s.finaltotaliqd || 0), 0) || 0

      const { data: users } = await supabase
        .from("users")
        .select("id")
      
      const { data: loginLogs } = await supabase
        .from("login_logs")
        .select("created_at, success")
        .gte("created_at", startDate.toISOString())
        .lt("created_at", endDate.toISOString())
      
      const totalUsers = users?.length || 0
      const totalLogins = loginLogs?.filter(l => l.success).length || 0

      const { data: customers } = await supabase
        .from("customers")
        .select("id")
      
      const totalCustomers = customers?.length || 0

      const chartData: { day: string; المبيعات: number; المشتريات: number; الربح: number }[] = []
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000))
      
      for (let i = 0; i < daysDiff; i++) {
        const dayStart = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)
        
        const daySales = sales?.filter(s => 
          new Date(s.datetime) >= dayStart && new Date(s.datetime) < dayEnd
        ).reduce((sum, s) => sum + (s.finaltotaliqd || 0), 0) || 0
        
        const dayPurchases = purchases?.filter(p => 
          new Date(p.datetime) >= dayStart && new Date(p.datetime) < dayEnd
        ).reduce((sum, p) => sum + (p.totalpurchaseiqd || 0), 0) || 0
        
        chartData.push({
          day: dayStart.toLocaleDateString("ar-IQ", { month: "short", day: "numeric" }),
          المبيعات: daySales,
          المشتريات: dayPurchases,
          الربح: daySales - dayPurchases
        })
      }
      setDailyChart(chartData)

      setStats({
        totalPurchases,
        totalPurchasesAmount,
        totalSales,
        totalSalesAmount,
        totalProfit: totalSalesAmount - totalPurchasesAmount,
        totalCustomers,
        totalUsers,
        totalLogins,
      })
    } catch (error) {
      toast.error("حدث خطأ أثناء تحميل الإحصائيات")
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US").format(amount)
  }

  const getRangeLabel = () => {
    if (isCustomRange && customStartDate && customEndDate) {
      const start = new Date(customStartDate).toLocaleDateString("ar-IQ")
      const end = new Date(customEndDate).toLocaleDateString("ar-IQ")
      return `من ${start} إلى ${end}`
    }
    switch (selectedRange) {
      case "today": return "اليوم"
      case "yesterday": return "أمس"
      case "last3days": return "آخر 3 أيام"
      case "thisweek": return "هذا الأسبوع"
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
    setIsCustomRange(true)
    loadStats()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <Activity className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">{t('loadingStats', currentLanguage.code)}</p>
        </div>
      </div>
    )
  }

  return (
    <PermissionGuard requiredPermission="view_statistics">
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: "var(--theme-primary)" }}>
            {t('dailyStats', currentLanguage.code)}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('detailedStatsBySelectedPeriod', currentLanguage.code)}
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          <Calendar className="h-4 w-4 ml-2" />
          {getRangeLabel()}
        </Badge>
      </div>

      {}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3 items-end">
            <Button
              variant={selectedRange === "today" && !isCustomRange ? "default" : "outline"}
              onClick={() => {
                setSelectedRange("today")
                setIsCustomRange(false)
              }}
              className="gap-2"
            >
              <Calendar className="h-4 w-4" />
              {t('today', currentLanguage.code)}
            </Button>
            <Button
              variant={selectedRange === "yesterday" && !isCustomRange ? "default" : "outline"}
              onClick={() => {
                setSelectedRange("yesterday")
                setIsCustomRange(false)
              }}
              className="gap-2"
            >
              <Calendar className="h-4 w-4" />
              {t('yesterday', currentLanguage.code)}
            </Button>
            <Button
              variant={selectedRange === "last3days" && !isCustomRange ? "default" : "outline"}
              onClick={() => {
                setSelectedRange("last3days")
                setIsCustomRange(false)
              }}
              className="gap-2"
            >
              <Calendar className="h-4 w-4" />
              {t('last3Days', currentLanguage.code)}
            </Button>
            <Button
              variant={selectedRange === "thisweek" && !isCustomRange ? "default" : "outline"}
              onClick={() => {
                setSelectedRange("thisweek")
                setIsCustomRange(false)
              }}
              className="gap-2"
            >
              <Calendar className="h-4 w-4" />
              {t('thisWeek', currentLanguage.code)}
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
                variant={isCustomRange ? "default" : "outline"}
                className="gap-2"
              >
                <Calendar className="h-4 w-4" />
                {t('view', currentLanguage.code)}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 theme-success" />
          {t('salesStats', currentLanguage.code)}
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('totalSales', currentLanguage.code)}</CardTitle>
              <ShoppingCart className="h-4 w-4 theme-icon" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalSales)}</div>
              <p className="text-xs text-muted-foreground">{t('saleOperation', currentLanguage.code)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('salesValue', currentLanguage.code)}</CardTitle>
              <DollarSign className="h-4 w-4 theme-icon" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalSalesAmount)}</div>
              <p className="text-xs text-muted-foreground">{t('iraqiDinar', currentLanguage.code)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('averageSale', currentLanguage.code)}</CardTitle>
              <BarChart3 className="h-4 w-4 theme-icon" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(stats.totalSales > 0 ? Math.round(stats.totalSalesAmount / stats.totalSales) : 0)}
              </div>
              <p className="text-xs text-muted-foreground">{t('dinarPerOperation', currentLanguage.code)}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <TrendingDown className="h-5 w-5 theme-danger" />
          {t('purchasesStats', currentLanguage.code)}
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('totalPurchases', currentLanguage.code)}</CardTitle>
              <ShoppingCart className="h-4 w-4 theme-icon" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalPurchases)}</div>
              <p className="text-xs text-muted-foreground">{t('purchaseOperation', currentLanguage.code)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('purchasesValue', currentLanguage.code)}</CardTitle>
              <DollarSign className="h-4 w-4 theme-icon" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalPurchasesAmount)}</div>
              <p className="text-xs text-muted-foreground">{t('iraqiDinar', currentLanguage.code)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('averagePurchase', currentLanguage.code)}</CardTitle>
              <BarChart3 className="h-4 w-4 theme-icon" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(stats.totalPurchases > 0 ? Math.round(stats.totalPurchasesAmount / stats.totalPurchases) : 0)}
              </div>
              <p className="text-xs text-muted-foreground">{t('dinarPerOperation', currentLanguage.code)}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Wallet className="h-5 w-5 theme-info" />
          {t('profitAndLoss', currentLanguage.code)}
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="border-2 border-green-500/20 bg-green-500/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('netProfit', currentLanguage.code)}</CardTitle>
              <TrendingUp className="h-4 w-4 theme-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(stats.totalProfit)}
              </div>
              <p className="text-xs text-muted-foreground">{t('iraqiDinar', currentLanguage.code)}</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-blue-500/20 bg-blue-500/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('profitMargin', currentLanguage.code)}</CardTitle>
              <BarChart3 className="h-4 w-4 theme-info" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {stats.totalPurchasesAmount > 0
                  ? (((stats.totalProfit / stats.totalPurchasesAmount) * 100).toFixed(1))
                  : 0}%
              </div>
              <p className="text-xs text-muted-foreground">{t('ofTotalPurchases', currentLanguage.code)}</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-purple-500/20 bg-purple-500/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('profitMarginPercent', currentLanguage.code)}</CardTitle>
              <TrendingUp className="h-4 w-4 theme-info" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {stats.totalSalesAmount > 0
                  ? (((stats.totalProfit / stats.totalSalesAmount) * 100).toFixed(1))
                  : 0}%
              </div>
              <p className="text-xs text-muted-foreground">{t('ofTotalSales', currentLanguage.code)}</p>
            </CardContent>
          </Card>
        </div>

        {}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 theme-info" />
              {t('salesAndPurchasesChart', currentLanguage.code)} ({getRangeLabel()})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={dailyChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Legend />
                <Bar dataKey={t('sales', currentLanguage.code)} fill="#10b981" />
                <Bar dataKey={t('purchases', currentLanguage.code)} fill="#ef4444" />
                <Bar dataKey={t('profit', currentLanguage.code)} fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 theme-info" />
          {t('usersAndActivityStats', currentLanguage.code)}
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('totalUsers', currentLanguage.code)}</CardTitle>
              <Users className="h-4 w-4 theme-icon" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalUsers)}</div>
              <p className="text-xs text-muted-foreground">{t('registeredUser', currentLanguage.code)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('totalLogins', currentLanguage.code)}</CardTitle>
              <Activity className="h-4 w-4 theme-icon" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalLogins)}</div>
              <p className="text-xs text-muted-foreground">{t('loginOperation', currentLanguage.code)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('totalCustomers', currentLanguage.code)}</CardTitle>
              <Users className="h-4 w-4 theme-icon" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalCustomers)}</div>
              <p className="text-xs text-muted-foreground">{t('customer', currentLanguage.code)}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
    </PermissionGuard>
  )
}
