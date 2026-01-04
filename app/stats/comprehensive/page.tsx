"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { t } from "@/lib/translations"
import { useSettings } from "@/components/providers/settings-provider"
import {
  BarChart3,
  ShoppingCart,
  TrendingUp,
  Package,
  Users,
  LogIn,
  DollarSign,
  Activity,
  TrendingDown,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { PermissionGuard } from "@/components/permission-guard"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts"

interface StatsData {
  totalPurchases: number
  totalPurchasesAmount: number
  purchasesThisMonth: number
  purchasesThisMonthAmount: number
  
  totalSales: number
  totalSalesAmount: number
  salesThisMonth: number
  salesThisMonthAmount: number
  
  totalStores: number
  totalProducts: number
  lowStockProducts: number
  
  totalUsers: number
  activeUsers: number
  totalLogins: number
  loginsToday: number
  
  totalCustomers: number
  customersWithDebt: number
  totalDebtIQD: number
  totalDebtUSD: number
  customersCreditors: number
  totalCreditIQD: number
  totalCreditUSD: number
}

export default function ComprehensiveStatsPage() {
  const { currentLanguage } = useSettings()
  const [stats, setStats] = useState<StatsData>({
    totalPurchases: 0,
    totalPurchasesAmount: 0,
    purchasesThisMonth: 0,
    purchasesThisMonthAmount: 0,
    totalSales: 0,
    totalSalesAmount: 0,
    salesThisMonth: 0,
    salesThisMonthAmount: 0,
    totalStores: 0,
    totalProducts: 0,
    lowStockProducts: 0,
    totalUsers: 0,
    activeUsers: 0,
    totalLogins: 0,
    loginsToday: 0,
    totalCustomers: 0,
    customersWithDebt: 0,
    totalDebtIQD: 0,
    totalDebtUSD: 0,
    customersCreditors: 0,
    totalCreditIQD: 0,
    totalCreditUSD: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  
  const [loginsByMonth, setLoginsByMonth] = useState<{ day: string; loginCount: number }[]>([])
  const [loginsByYear, setLoginsByYear] = useState<{ month: string; loginCount: number }[]>([])
  const [salesPurchasesChart, setSalesPurchasesChart] = useState<{ month: string; sales: number; purchases: number; profit: number }[]>([])
  const [allTimeSalesPurchases, setAllTimeSalesPurchases] = useState<{ year: string; sales: number; purchases: number; profit: number }[]>([])

  useEffect(() => {
    loadStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadStats() {
    try {
      setIsLoading(true)
      
      const now = new Date()
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

      const { data: purchases } = await supabase
        .from("tb_purchasemain")
        .select("totalpurchaseiqd, totalpurchaseusd, datetime")
      
      const totalPurchases = purchases?.length || 0
      const totalPurchasesAmount = purchases?.reduce((sum, p) => sum + (p.totalpurchaseiqd || 0), 0) || 0
      const purchasesThisMonth = purchases?.filter(p => new Date(p.datetime) >= firstDayOfMonth).length || 0
      const purchasesThisMonthAmount = purchases?.filter(p => new Date(p.datetime) >= firstDayOfMonth)
        .reduce((sum, p) => sum + (p.totalpurchaseiqd || 0), 0) || 0

      const { data: sales } = await supabase
        .from("tb_salesmain")
        .select("finaltotaliqd, finaltotalusd, datetime")
      
      const totalSales = sales?.length || 0
      const totalSalesAmount = sales?.reduce((sum, s) => sum + (s.finaltotaliqd || 0), 0) || 0
      const salesThisMonth = sales?.filter(s => new Date(s.datetime) >= firstDayOfMonth).length || 0
      const salesThisMonthAmount = sales?.filter(s => new Date(s.datetime) >= firstDayOfMonth)
        .reduce((sum, s) => sum + (s.finaltotaliqd || 0), 0) || 0

      const { data: stores } = await supabase
        .from("tb_store")
        .select("id")
      
      const { data: products } = await supabase
        .from("tb_inventory")
        .select("quantity")
      
      const totalStores = stores?.length || 0
      const totalProducts = products?.length || 0
      const lowStockProducts = products?.filter(p => (p.quantity || 0) < 10).length || 0

      const { data: users } = await supabase
        .from("users")
        .select("id, is_active")
      
      const { data: loginLogs } = await supabase
        .from("login_logs")
        .select("created_at, success")
      
      const totalUsers = users?.length || 0
      const activeUsers = users?.filter(u => u.is_active).length || 0
      const totalLogins = loginLogs?.filter(l => l.success).length || 0
      const loginsToday = loginLogs?.filter(l => l.success && new Date(l.created_at) >= today).length || 0

      const { data: customers } = await supabase
        .from("customers")
        .select("id, balanceiqd, balanceusd")
      
      const totalCustomers = customers?.length || 0
      const customersWithDebt = customers?.filter(c => (c.balanceiqd || 0) > 0 || (c.balanceusd || 0) > 0).length || 0
      const totalDebtIQD = customers?.reduce((sum, c) => sum + Math.max(0, c.balanceiqd || 0), 0) || 0
      const totalDebtUSD = customers?.reduce((sum, c) => sum + Math.max(0, c.balanceusd || 0), 0) || 0
      
      const customersCreditors = customers?.filter(c => (c.balanceiqd || 0) < 0 || (c.balanceusd || 0) < 0).length || 0
      const totalCreditIQD = customers?.reduce((sum, c) => sum + Math.min(0, c.balanceiqd || 0), 0) || 0
      const totalCreditUSD = customers?.reduce((sum, c) => sum + Math.min(0, c.balanceusd || 0), 0) || 0
      
      const monthLoginData: { day: string; loginCount: number }[] = []
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
      for (let day = 1; day <= daysInMonth; day++) {
        const dayStart = new Date(now.getFullYear(), now.getMonth(), day)
        const dayEnd = new Date(now.getFullYear(), now.getMonth(), day + 1)
        const count = loginLogs?.filter(l => 
          l.success && 
          new Date(l.created_at) >= dayStart && 
          new Date(l.created_at) < dayEnd
        ).length || 0
        monthLoginData.push({ day: day.toString(), loginCount: count })
      }
      setLoginsByMonth(monthLoginData)

      const yearLoginData: { month: string; loginCount: number }[] = []
      const monthNames = ['كانون', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران', 'تموز', 'آب', 'أيلول', 'تشرينأ', 'تشرينب', 'كانون']
      for (let month = 0; month < 12; month++) {
        const monthStart = new Date(now.getFullYear(), month, 1)
        const monthEnd = new Date(now.getFullYear(), month + 1, 1)
        const count = loginLogs?.filter(l => 
          l.success && 
          new Date(l.created_at) >= monthStart && 
          new Date(l.created_at) < monthEnd
        ).length || 0
        yearLoginData.push({ month: monthNames[month], loginCount: count })
      }
      setLoginsByYear(yearLoginData)

      const salesPurchasesData: { month: string; sales: number; purchases: number; profit: number }[] = []
      for (let month = 0; month < 12; month++) {
        const monthStart = new Date(now.getFullYear(), month, 1)
        const monthEnd = new Date(now.getFullYear(), month + 1, 1)
        
        const monthlySales = sales?.filter(s => 
          new Date(s.datetime) >= monthStart && 
          new Date(s.datetime) < monthEnd
        ).reduce((sum, s) => sum + (s.finaltotaliqd || 0), 0) || 0
        
        const monthlyPurchases = purchases?.filter(p => 
          new Date(p.datetime) >= monthStart && 
          new Date(p.datetime) < monthEnd
        ).reduce((sum, p) => sum + (p.totalpurchaseiqd || 0), 0) || 0
        
        salesPurchasesData.push({ 
          month: monthNames[month], 
          sales: monthlySales,
          purchases: monthlyPurchases,
          profit: monthlySales - monthlyPurchases
        })
      }
      setSalesPurchasesChart(salesPurchasesData)

      const allTimeData: { year: string; sales: number; purchases: number; profit: number }[] = []
      
      const salesByYear: { [key: number]: number } = {}
      const purchasesByYear: { [key: number]: number } = {}
      
      sales?.forEach(s => {
        const year = new Date(s.datetime).getFullYear()
        if (!salesByYear[year]) salesByYear[year] = 0
        salesByYear[year] += s.finaltotaliqd || 0
      })
      
      purchases?.forEach(p => {
        const year = new Date(p.datetime).getFullYear()
        if (!purchasesByYear[year]) purchasesByYear[year] = 0
        purchasesByYear[year] += p.totalpurchaseiqd || 0
      })
      
      const allYears = Array.from(new Set([...Object.keys(salesByYear), ...Object.keys(purchasesByYear)])).map(Number).sort()
      
      allYears.forEach(year => {
        const yearSales = salesByYear[year] || 0
        const yearPurchases = purchasesByYear[year] || 0
        allTimeData.push({
          year: year.toString(),
          sales: yearSales,
          purchases: yearPurchases,
          profit: yearSales - yearPurchases
        })
      })
      setAllTimeSalesPurchases(allTimeData)

      setStats({
        totalPurchases,
        totalPurchasesAmount,
        purchasesThisMonth,
        purchasesThisMonthAmount,
        totalSales,
        totalSalesAmount,
        salesThisMonth,
        salesThisMonthAmount,
        totalStores,
        totalProducts,
        lowStockProducts,
        totalUsers,
        activeUsers,
        totalLogins,
        loginsToday,
        totalCustomers,
        customersWithDebt,
        totalDebtIQD,
        totalDebtUSD,
        customersCreditors,
        totalCreditIQD,
        totalCreditUSD,
      })
    } catch {
      toast.error(t('statsLoadError', currentLanguage.code))
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US").format(amount)
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: "var(--theme-primary)" }}>
            {t('comprehensiveStats', currentLanguage.code)}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t('systemOverview', currentLanguage.code)}
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          <Calendar className="h-4 w-4 ml-2" />
          {new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          })}
        </Badge>
      </div>

      {}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 theme-success" />
          {t('salesStats', currentLanguage.code)}
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
              <CardTitle className="text-sm font-medium">{t('monthlySales', currentLanguage.code)}</CardTitle>
              <ArrowUpRight className="h-4 w-4 theme-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.salesThisMonth)}</div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(stats.salesThisMonthAmount)} {t('dinar', currentLanguage.code)}
              </p>
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
              <CardTitle className="text-sm font-medium">{t('monthlyPurchases', currentLanguage.code)}</CardTitle>
              <ArrowDownRight className="h-4 w-4 theme-danger" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.purchasesThisMonth)}</div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(stats.purchasesThisMonthAmount)} {t('dinar', currentLanguage.code)}
              </p>
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
          {t('profitsAndLosses', currentLanguage.code)}
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="border-2 border-green-500/20 bg-green-500/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('netProfitAll', currentLanguage.code)}</CardTitle>
              <TrendingUp className="h-4 w-4 theme-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(stats.totalSalesAmount - stats.totalPurchasesAmount)}
              </div>
              <p className="text-xs text-muted-foreground">{t('iraqiDinar', currentLanguage.code)}</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-blue-500/20 bg-blue-500/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('netProfitMonth', currentLanguage.code)}</CardTitle>
              <TrendingUp className="h-4 w-4 theme-info" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(stats.salesThisMonthAmount - stats.purchasesThisMonthAmount)}
              </div>
              <p className="text-xs text-muted-foreground">{t('iraqiDinar', currentLanguage.code)}</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-purple-500/20 bg-purple-500/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('profitPercentage', currentLanguage.code)}</CardTitle>
              <BarChart3 className="h-4 w-4 theme-info" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {stats.totalPurchasesAmount > 0
                  ? ((((stats.totalSalesAmount - stats.totalPurchasesAmount) / stats.totalPurchasesAmount) * 100).toFixed(1))
                  : 0}%
              </div>
              <p className="text-xs text-muted-foreground">{t('ofTotalPurchases', currentLanguage.code)}</p>
            </CardContent>
          </Card>
        </div>

        {}
        <div className="grid gap-6 mt-6">
          {}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 theme-info" />
                {t('salesPurchasesChartYear', currentLanguage.code)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={salesPurchasesChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                  <Bar dataKey="sales" fill="#10b981" />
                  <Bar dataKey="purchases" fill="#ef4444" />
                  <Bar dataKey="profit" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 theme-success" />
                {t('salesPurchasesChartAllTime', currentLanguage.code)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={allTimeSalesPurchases}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.2}/>
                    </linearGradient>
                    <linearGradient id="colorPurchases" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.2}/>
                    </linearGradient>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="sales" 
                    stroke="#10b981" 
                    fillOpacity={1} 
                    fill="url(#colorSales)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="purchases" 
                    stroke="#ef4444" 
                    fillOpacity={1} 
                    fill="url(#colorPurchases)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="profit" 
                    stroke="#3b82f6" 
                    fillOpacity={1} 
                    fill="url(#colorProfit)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>

      {}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Package className="h-5 w-5 theme-warning" />
          {t('storesAndProductsStats', currentLanguage.code)}
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('totalStores', currentLanguage.code)}</CardTitle>
              <Package className="h-4 w-4 theme-icon" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalStores)}</div>
              <p className="text-xs text-muted-foreground">{t('activeStore', currentLanguage.code)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('totalProducts', currentLanguage.code)}</CardTitle>
              <BarChart3 className="h-4 w-4 theme-icon" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalProducts)}</div>
              <p className="text-xs text-muted-foreground">{t('productInSystem', currentLanguage.code)}</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-red-500/20 bg-red-500/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('lowStock', currentLanguage.code)}</CardTitle>
              <Activity className="h-4 w-4 theme-danger" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{formatCurrency(stats.lowStockProducts)}</div>
              <p className="text-xs text-muted-foreground">{t('quantityLessThan10', currentLanguage.code)}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 theme-info" />
          {t('usersAndActivityStats', currentLanguage.code)}
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
              <CardTitle className="text-sm font-medium">{t('activeUsers', currentLanguage.code)}</CardTitle>
              <Activity className="h-4 w-4 theme-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.activeUsers)}</div>
              <p className="text-xs text-muted-foreground">
                {stats.totalUsers > 0 ? ((stats.activeUsers / stats.totalUsers) * 100).toFixed(0) : 0}% {t('ofTotal', currentLanguage.code)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('totalLogins', currentLanguage.code)}</CardTitle>
              <LogIn className="h-4 w-4 theme-icon" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalLogins)}</div>
              <p className="text-xs text-muted-foreground">{t('loginOperation', currentLanguage.code)}</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-blue-500/20 bg-blue-500/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('todayLogins', currentLanguage.code)}</CardTitle>
              <LogIn className="h-4 w-4 theme-info" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{formatCurrency(stats.loginsToday)}</div>
              <p className="text-xs text-muted-foreground">{t('todayOperation', currentLanguage.code)}</p>
            </CardContent>
          </Card>
        </div>

        {}
        <div className="grid gap-6 md:grid-cols-2 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 theme-info" />
                {t('loginsCurrentMonth', currentLanguage.code)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={loginsByMonth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="loginCount" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 theme-info" />
                {t('loginsCurrentYear', currentLanguage.code)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={loginsByYear}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="loginCount" fill="#6366f1" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>

      {}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 theme-info" />
          {t('customersDebtsStats', currentLanguage.code)}
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('totalCustomers', currentLanguage.code)}</CardTitle>
              <Users className="h-4 w-4 theme-icon" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalCustomers)}</div>
              <p className="text-xs text-muted-foreground">{t('customerClient', currentLanguage.code)}</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-amber-500/20 bg-amber-500/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('debtorCustomers', currentLanguage.code)}</CardTitle>
              <Activity className="h-4 w-4 theme-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{formatCurrency(stats.customersWithDebt)}</div>
              <p className="text-xs text-muted-foreground">
                {stats.totalCustomers > 0 ? ((stats.customersWithDebt / stats.totalCustomers) * 100).toFixed(0) : 0}% {t('ofTotal', currentLanguage.code)}
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 border-red-500/20 bg-red-500/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('debtsInDinar', currentLanguage.code)}</CardTitle>
              <DollarSign className="h-4 w-4 theme-danger" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{formatCurrency(stats.totalDebtIQD)}</div>
              <p className="text-xs text-muted-foreground">{t('iraqiDinar', currentLanguage.code)}</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-red-500/20 bg-red-500/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('debtsInDollar', currentLanguage.code)}</CardTitle>
              <DollarSign className="h-4 w-4 theme-danger" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{formatCurrency(stats.totalDebtUSD)}</div>
              <p className="text-xs text-muted-foreground">{t('usDollar', currentLanguage.code)}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Wallet className="h-5 w-5 theme-success" />
          {t('creditorCustomers', currentLanguage.code)}
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="border-2 border-emerald-500/20 bg-emerald-500/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('creditorsCount', currentLanguage.code)}</CardTitle>
              <Users className="h-4 w-4 theme-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{formatCurrency(stats.customersCreditors)}</div>
              <p className="text-xs text-muted-foreground">
                {stats.totalCustomers > 0 ? ((stats.customersCreditors / stats.totalCustomers) * 100).toFixed(0) : 0}% {t('ofTotal', currentLanguage.code)}
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 border-emerald-500/20 bg-emerald-500/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('creditInDinar', currentLanguage.code)}</CardTitle>
              <DollarSign className="h-4 w-4 theme-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{formatCurrency(Math.abs(stats.totalCreditIQD))}</div>
              <p className="text-xs text-muted-foreground">{t('iraqiDinar', currentLanguage.code)}</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-emerald-500/20 bg-emerald-500/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('creditInDollar', currentLanguage.code)}</CardTitle>
              <DollarSign className="h-4 w-4 theme-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{formatCurrency(Math.abs(stats.totalCreditUSD))}</div>
              <p className="text-xs text-muted-foreground">{t('usDollar', currentLanguage.code)}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
    </PermissionGuard>
  )
}

