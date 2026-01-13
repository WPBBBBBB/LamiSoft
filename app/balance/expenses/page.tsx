"use client";
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { t } from "@/lib/translations"
import { useSettings } from "@/components/providers/settings-provider"
import { PermissionGuard } from "@/components/permission-guard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { logAction } from "@/lib/system-log-operations"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import {
  Plus,
  Trash2,
  FileText,
  Search,
  X,
  RefreshCw,
  Edit,
  Eye,
} from "lucide-react"

interface Expense {
  id: number
  expense_name: string
  cost: number
  recurrence: string
  payment_date: string
  details: string
  created_at: string
}

type RecurrenceType = "مرة واحدة" | "يومي" | "أسبوعي" | "شهري" | "سنوي"

export default function ExpensesPage() {
  const { currentLanguage } = useSettings()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedExpenses, setSelectedExpenses] = useState<number[]>([])
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [selectedDetails, setSelectedDetails] = useState("")
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const [expenseName, setExpenseName] = useState("")
  const [cost, setCost] = useState("")
  const [recurrence, setRecurrence] = useState<RecurrenceType>("مرة واحدة")
  const [paymentDate, setPaymentDate] = useState("")
  const [details, setDetails] = useState("")

  const fetchExpenses = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error
      setExpenses(data || [])
      setFilteredExpenses(data || [])
    } catch (error) {
      toast.error(t('loadingExpensesFailed', currentLanguage.code))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchExpenses()
  }, [])

  useEffect(() => {
    if (searchTerm === "") {
      setFilteredExpenses(expenses)
    } else {
      const filtered = expenses.filter((expense) =>
        expense.expense_name.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredExpenses(filtered)
    }
  }, [searchTerm, expenses])

  const calculateStats = () => {
    const dailyExpenses = filteredExpenses.filter(
      (exp) => exp.recurrence === "يومي"
    )

    const weeklyExpenses = filteredExpenses.filter(
      (exp) => exp.recurrence === "أسبوعي"
    )

    const monthlyExpenses = filteredExpenses.filter(
      (exp) => exp.recurrence === "شهري"
    )

    const yearlyExpenses = filteredExpenses.filter(
      (exp) => exp.recurrence === "سنوي"
    )

    const oneTimeExpenses = filteredExpenses.filter(
      (exp) => exp.recurrence === "مرة واحدة"
    )

    return {
      total: filteredExpenses.length,
      totalCost: filteredExpenses.reduce((sum, exp) => sum + exp.cost, 0),
      daily: dailyExpenses.reduce((sum, exp) => sum + exp.cost, 0),
      weekly: weeklyExpenses.reduce((sum, exp) => sum + exp.cost, 0),
      monthly: monthlyExpenses.reduce((sum, exp) => sum + exp.cost, 0),
      yearly: yearlyExpenses.reduce((sum, exp) => sum + exp.cost, 0),
      oneTime: oneTimeExpenses.reduce((sum, exp) => sum + exp.cost, 0),
    }
  }

  const stats = calculateStats()

  const handleAdd = async () => {
    if (!expenseName || !cost || !paymentDate) {
      toast.error(t('fillAllRequiredFields', currentLanguage.code))
      return
    }

    try {
      const { error } = await supabase.from("expenses").insert({
        expense_name: expenseName,
        cost: parseFloat(cost),
        recurrence,
        payment_date: paymentDate,
        details,
      })

      if (error) throw error

      await logAction(
        "إضافة",
        `تمت إضافة مصروف: ${expenseName} بقيمة ${parseFloat(cost)} - ${recurrence}`,
        "المصاريف",
        undefined,
        undefined,
        {
          expense_name: expenseName,
          cost: parseFloat(cost),
          recurrence,
          payment_date: paymentDate,
          details
        }
      )

      toast.success(t('expenseAddedSuccess', currentLanguage.code))
      setShowAddDialog(false)
      resetForm()
      fetchExpenses()
    } catch (error) {
      toast.error(t('expenseAddFailed', currentLanguage.code))
    }
  }

  const handleEdit = async () => {
    if (!editingExpense || !expenseName || !cost || !paymentDate) {
      toast.error(t('fillAllRequiredFields', currentLanguage.code))
      return
    }

    try {
      const { error } = await supabase
        .from("expenses")
        .update({
          expense_name: expenseName,
          cost: parseFloat(cost),
          recurrence,
          payment_date: paymentDate,
          details,
        })
        .eq("id", editingExpense.id)

      if (error) throw error

      await logAction(
        "تعديل",
        `تم تعديل المصروف: ${expenseName}`,
        "المصاريف",
        undefined,
        {
          expense_name: editingExpense.expense_name,
          cost: editingExpense.cost,
          recurrence: editingExpense.recurrence,
          payment_date: editingExpense.payment_date,
          details: editingExpense.details
        },
        {
          expense_name: expenseName,
          cost: parseFloat(cost),
          recurrence,
          payment_date: paymentDate,
          details
        }
      )

      toast.success(t('expenseUpdatedSuccess', currentLanguage.code))
      setShowEditDialog(false)
      setEditingExpense(null)
      resetForm()
      fetchExpenses()
    } catch (error) {
      toast.error(t('expenseUpdateFailed', currentLanguage.code))
    }
  }

  const handleDelete = async () => {
    if (selectedExpenses.length === 0) {
      toast.error(t('selectExpensesToDelete', currentLanguage.code))
      return
    }

    if (!confirm(t('confirmDeleteExpensePlural', currentLanguage.code).replace('{count}', selectedExpenses.length.toString()))) {
      return
    }

    try {
      const expensesToDelete = expenses.filter(exp => selectedExpenses.includes(exp.id))
      
      const { error } = await supabase
        .from("expenses")
        .delete()
        .in("id", selectedExpenses)

      if (error) throw error

      for (const expense of expensesToDelete) {
        await logAction(
          "حذف",
          `تم حذف المصروف: ${expense.expense_name} بقيمة ${expense.cost}`,
          "المصاريف",
          undefined,
          {
            expense_name: expense.expense_name,
            cost: expense.cost,
            recurrence: expense.recurrence,
            payment_date: expense.payment_date,
            details: expense.details
          },
          undefined
        )
      }

      toast.success(t('expensesDeletedSuccess', currentLanguage.code))
      setSelectedExpenses([])
      fetchExpenses()
    } catch (error) {
      toast.error(t('expensesDeleteFailed', currentLanguage.code))
    }
  }

  const handleDeleteOne = async (id: number) => {
    if (!confirm(t('confirmDeleteExpense', currentLanguage.code))) {
      return
    }

    try {
      const expenseToDelete = expenses.find(exp => exp.id === id)
      
      const { error } = await supabase.from("expenses").delete().eq("id", id)

      if (error) throw error

      if (expenseToDelete) {
        await logAction(
          "حذف",
          `تم حذف المصروف: ${expenseToDelete.expense_name} بقيمة ${expenseToDelete.cost}`,
          "المصاريف",
          undefined,
          {
            expense_name: expenseToDelete.expense_name,
            cost: expenseToDelete.cost,
            recurrence: expenseToDelete.recurrence,
            payment_date: expenseToDelete.payment_date,
            details: expenseToDelete.details
          },
          undefined
        )
      }

      toast.success(t('expenseDeletedSuccess', currentLanguage.code))
      fetchExpenses()
    } catch (error) {
      toast.error(t('expenseDeleteFailed', currentLanguage.code))
    }
  }

  const resetForm = () => {
    setExpenseName("")
    setCost("")
    setRecurrence("مرة واحدة")
    setPaymentDate("")
    setDetails("")
  }

  const openEditDialog = (expense: Expense) => {
    setEditingExpense(expense)
    setExpenseName(expense.expense_name)
    setCost(expense.cost.toString())
    setRecurrence(expense.recurrence as RecurrenceType)
    setPaymentDate(expense.payment_date)
    setDetails(expense.details)
    setShowEditDialog(true)
  }

  const toggleSelectAll = () => {
    if (selectedExpenses.length === filteredExpenses.length) {
      setSelectedExpenses([])
    } else {
      setSelectedExpenses(filteredExpenses.map((exp) => exp.id))
    }
  }

  const handleExportReport = async () => {
    try {
      if (filteredExpenses.length === 0) {
        toast.error("لا توجد بيانات لتصديرها")
        return
      }

      toast.loading("جاري تجهيز التقرير...");
      
      const { data: { user } } = await supabase.auth.getUser();
      const generatedBy = user?.user_metadata?.full_name || user?.email || "غير معروف"

      const reportItems = filteredExpenses.map(item => ({
        id: item.id,
        expenseName: item.expense_name,
        cost: item.cost,
        recurrence: item.recurrence,
        paymentDate: item.payment_date,
        details: item.details,
        createdAt: item.created_at
      }))

      const payload = {
        generatedBy,
        date: new Date().toISOString(),
        items: reportItems,
        totalCost: stats.totalCost,
        count: reportItems.length
      }

      const jsonString = JSON.stringify(payload)
      const token = `${Date.now()}-${Math.random().toString(16).slice(2)}`
      const storageKey = `expensesReportPayload:${token}`
      localStorage.setItem(storageKey, jsonString)

      toast.dismiss()
      toast.success("تم تجهيز التقرير");

      window.location.href = `/report/expenses?token=${token}&back=/balance/expenses`;

      await logAction(
        "تصدير",
        `تصدير تقرير المصاريف - عدد السجلات: ${reportItems.length}`,
        "المصاريف",
        undefined,
        { expensesCount: reportItems.length }
      )
    } catch (error) {
      console.error("Error exporting report:", error)
      toast.dismiss()
      toast.error("حدث خطأ أثناء تصدير التقرير")
    }
  }

  return (
    <PermissionGuard requiredPermission="view_statistics">
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl" style={{ color: "var(--theme-primary)" }}>{t('expenseManagement', currentLanguage.code)}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">

            <div className="flex gap-2">
              <Button onClick={() => setShowAddDialog(true)} size="sm">
                <Plus className="ml-2 h-4 w-4 theme-success" />
                {t('add', currentLanguage.code)}
              </Button>
              <Button
                onClick={handleDelete}
                variant="destructive"
                size="sm"
                disabled={selectedExpenses.length === 0}
              >
                <Trash2 className="ml-2 h-4 w-4 theme-danger" />
                {t('delete', currentLanguage.code)}
              </Button>
            </div>

            <div className="flex gap-2 items-center">
              <Button 
                onClick={handleExportReport}
                variant="outline" 
                size="sm"
              >
                <FileText className="ml-2 h-4 w-4 theme-info" />
                {t('file', currentLanguage.code)}
              </Button>
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 theme-icon" />
                <Input
                  placeholder={t('searchExpense', currentLanguage.code)}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
              <Button
                onClick={() => setSearchTerm("")}
                variant="outline"
                size="sm"
              >
                <X className="ml-2 h-4 w-4 theme-danger" />
                {t('clean', currentLanguage.code)}
              </Button>
              <Button onClick={fetchExpenses} variant="outline" size="sm">
                <RefreshCw className="ml-2 h-4 w-4 theme-info" />
                {t('refresh', currentLanguage.code)}
              </Button>
            </div>

            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">#</TableHead>
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={
                          selectedExpenses.length === filteredExpenses.length &&
                          filteredExpenses.length > 0
                        }
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>{t('expenseName', currentLanguage.code)}</TableHead>
                    <TableHead>{t('cost', currentLanguage.code)}</TableHead>
                    <TableHead>{t('recurrenceStatus', currentLanguage.code)}</TableHead>
                    <TableHead>{t('paymentDate', currentLanguage.code)}</TableHead>
                    <TableHead>{t('details', currentLanguage.code)}</TableHead>
                    <TableHead>{t('addedDate', currentLanguage.code)}</TableHead>
                    <TableHead>{t('actions', currentLanguage.code)}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        {t('noExpenses', currentLanguage.code)}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredExpenses.map((expense, index) => (
                      <TableRow key={expense.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>
                          <Checkbox
                            checked={selectedExpenses.includes(expense.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedExpenses([...selectedExpenses, expense.id])
                              } else {
                                setSelectedExpenses(
                                  selectedExpenses.filter((id) => id !== expense.id)
                                )
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{expense.expense_name}</TableCell>
                        <TableCell>{expense.cost.toLocaleString()}</TableCell>
                        <TableCell>{expense.recurrence}</TableCell>
                        <TableCell>
                          {new Date(expense.payment_date).toLocaleDateString("en-US")}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">
                              {expense.details.substring(0, 10)}
                              {expense.details.length > 10 && "..."}
                            </span>
                            {expense.details && (
                              <Button
                                onClick={() => {
                                  setSelectedDetails(expense.details)
                                  setShowDetailsDialog(true)
                                }}
                                variant="ghost"
                                size="sm"
                              >
                                <Eye className="h-4 w-4 theme-info" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(expense.created_at).toLocaleDateString("en-US")}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => openEditDialog(expense)}
                              variant="ghost"
                              size="sm"
                            >
                              <Edit className="h-4 w-4 theme-info" />
                            </Button>
                            <Button
                              onClick={() => handleDeleteOne(expense.id)}
                              variant="ghost"
                              size="sm"
                            >
                              <Trash2 className="h-4 w-4 theme-danger" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="space-y-2 border-t pt-4">
              <div className="flex justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900">
                <span className="font-medium">{t('expensesCount', currentLanguage.code)}:</span>
                <span className="font-bold text-blue-600">{stats.total}</span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                <span className="font-medium text-blue-900 dark:text-blue-100">{t('totalDailyExpenses', currentLanguage.code)}:</span>
                <span className="text-blue-600 dark:text-blue-400 font-bold">
                  {stats.daily.toLocaleString()} {t('dinar', currentLanguage.code)}
                </span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800">
                <span className="font-medium text-purple-900 dark:text-purple-100">{t('totalWeeklyExpenses', currentLanguage.code)}:</span>
                <span className="text-purple-600 dark:text-purple-400 font-bold">
                  {stats.weekly.toLocaleString()} {t('dinar', currentLanguage.code)}
                </span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                <span className="font-medium text-green-900 dark:text-green-100">{t('totalMonthlyExpenses', currentLanguage.code)}:</span>
                <span className="text-green-600 dark:text-green-400 font-bold">
                  {stats.monthly.toLocaleString()} {t('dinar', currentLanguage.code)}
                </span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                <span className="font-medium text-red-900 dark:text-red-100">{t('totalYearlyExpenses', currentLanguage.code)}:</span>
                <span className="text-red-600 dark:text-red-400 font-bold">
                  {stats.yearly.toLocaleString()} {t('dinar', currentLanguage.code)}
                </span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
                <span className="font-medium text-orange-900 dark:text-orange-100">{t('oneTimeExpenses', currentLanguage.code)}:</span>
                <span className="text-orange-600 dark:text-orange-400 font-bold">
                  {stats.oneTime.toLocaleString()} {t('dinar', currentLanguage.code)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{t('addExpense', currentLanguage.code)}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="expense-name">{t('expenseName', currentLanguage.code)} *</Label>
                <Input
                  id="expense-name"
                  value={expenseName}
                  onChange={(e) => setExpenseName(e.target.value)}
                  placeholder={t('enterExpenseName', currentLanguage.code)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment-date">{t('paymentDate', currentLanguage.code)} *</Label>
                <Input
                  id="payment-date"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="recurrence">{t('recurrence', currentLanguage.code)} *</Label>
                <Select value={recurrence} onValueChange={(value: RecurrenceType) => setRecurrence(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="مرة واحدة">{t('oneTime', currentLanguage.code)}</SelectItem>
                    <SelectItem value="يومي">{t('daily', currentLanguage.code)}</SelectItem>
                    <SelectItem value="أسبوعي">{t('weekly', currentLanguage.code)}</SelectItem>
                    <SelectItem value="شهري">{t('monthly', currentLanguage.code)}</SelectItem>
                    <SelectItem value="سنوي">{t('yearly', currentLanguage.code)}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cost">{t('costInIQD', currentLanguage.code)} *</Label>
                <Input
                  id="cost"
                  type="number"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="details">{t('details', currentLanguage.code)}</Label>
                <Textarea
                  id="details"
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder={t('enterAdditionalDetails', currentLanguage.code)}
                  rows={4}
                />
              </div>

              <Button onClick={handleAdd} className="w-full">
                <Plus className="ml-2 h-4 w-4" />
                {t('addExpense', currentLanguage.code)}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{t('editExpense', currentLanguage.code)}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-expense-name">{t('expenseName', currentLanguage.code)} *</Label>
                <Input
                  id="edit-expense-name"
                  value={expenseName}
                  onChange={(e) => setExpenseName(e.target.value)}
                  placeholder={t('enterExpenseName', currentLanguage.code)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-payment-date">{t('paymentDate', currentLanguage.code)} *</Label>
                <Input
                  id="edit-payment-date"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-recurrence">{t('recurrence', currentLanguage.code)} *</Label>
                <Select value={recurrence} onValueChange={(value: RecurrenceType) => setRecurrence(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="مرة واحدة">{t('oneTime', currentLanguage.code)}</SelectItem>
                    <SelectItem value="يومي">{t('daily', currentLanguage.code)}</SelectItem>
                    <SelectItem value="أسبوعي">{t('weekly', currentLanguage.code)}</SelectItem>
                    <SelectItem value="شهري">{t('monthly', currentLanguage.code)}</SelectItem>
                    <SelectItem value="سنوي">{t('yearly', currentLanguage.code)}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-cost">{t('costInIQD', currentLanguage.code)} *</Label>
                <Input
                  id="edit-cost"
                  type="number"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-details">{t('details', currentLanguage.code)}</Label>
                <Textarea
                  id="edit-details"
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder={t('enterAdditionalDetails', currentLanguage.code)}
                  rows={4}
                />
              </div>

              <Button onClick={handleEdit} className="w-full">
                <Edit className="ml-2 h-4 w-4" />
                {t('saveChanges', currentLanguage.code)}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{t('expenseDetailsTitle', currentLanguage.code)}</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm whitespace-pre-wrap">{selectedDetails}</p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </PermissionGuard>
  );
}
