"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { t } from "@/lib/translations"
import { useSettings } from "@/components/providers/settings-provider"
import { PermissionGuard } from "@/components/permission-guard"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { AlertTriangle, Download, Loader2, CheckCircle2 } from "lucide-react"

interface TableOption {
  id: string
  label: string
  table: string
}

const tableOptions: TableOption[] = [
  { id: "purchases", label: "قوائم الشراء", table: "tb_purchasemain,tb_purchaseproductsdetails" },
  { id: "sales", label: "قوائم البيع", table: "tb_salesmain,tb_salesdetails" },
  { id: "inventory", label: "قوائم المنتجات في المخازن", table: "tb_inventory" },
  { id: "stores", label: "قوائم المخازن", table: "tb_store" },
  { id: "payments", label: "قوائم الصندوق وسجلاته", table: "payments" },
  { id: "customers", label: "قوائم العملاء وحساباتهم", table: "customers" },
  { id: "transfers", label: "سجلات النقل المخزني", table: "store_transfers" },
  { id: "expenses", label: "صرفيات المتجر", table: "expenses" },
  { id: "notifications", label: "تنبيهات الزبائن المخزنة", table: "customer_notifications" },
  { id: "activity", label: "سجل حركات النظام", table: "activity_logs" },
  { id: "inventory_alerts", label: "سجل الاشعارات المخزني", table: "inventory_alerts" },
]

export default function SystemResetPage() {
  const router = useRouter()
  const { currentLanguage } = useSettings()
  const [showCountdown, setShowCountdown] = useState(false)
  const [countdown, setCountdown] = useState(5)
  const [showResetInterface, setShowResetInterface] = useState(false)
  const [selectedTables, setSelectedTables] = useState<string[]>([])
  const [isBackingUp, setIsBackingUp] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [resetProgress, setResetProgress] = useState(0)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)

  const handleFullBackup = async () => {
    setIsBackingUp(true)
    try {
      const tables = [
        "tb_purchasemain",
        "tb_purchaseproductsdetails",
        "tb_salesmain",
        "tb_salesdetails",
        "tb_store",
        "tb_inventory",
        "customers",
        "users",
        "login_logs",
        "payments",
      ]

      const backupData: Record<string, unknown[]> = {}
      const recordsCount: Record<string, number> = {}

      for (const table of tables) {
        const { data, error } = await supabase.from(table).select("*")
        if (error) {
          backupData[table] = []
          recordsCount[table] = 0
        } else {
          backupData[table] = data || []
          recordsCount[table] = data?.length || 0
        }
      }

      const fullBackup = {
        backup_date: new Date().toISOString(),
        backup_type: "full_before_reset",
        tables: backupData,
        records_count: recordsCount,
        total_records: Object.values(recordsCount).reduce((a, b) => a + b, 0),
      }

      const jsonString = JSON.stringify(fullBackup, null, 2)
      const blob = new Blob([jsonString], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5)
      link.download = `backup_full_${timestamp}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      const { error: insertError } = await supabase.from("backup_logs").insert({
        backup_type: "full_before_reset",
        backup_date: new Date().toISOString(),
        status: "success",
        backup_data: backupData,
        records_count: recordsCount,
      })

      if (insertError) {
        }

      toast.success("تم تنزيل النسخة الاحتياطية بنجاح")
    } catch (error) {
      toast.error("فشل في إنشاء النسخة الاحتياطية")
    } finally {
      setIsBackingUp(false)
    }
  }

  const handleStartReset = () => {
    setShowCountdown(true)
  }

  const executeReset = async () => {
    setIsResetting(true)
    setResetProgress(0)

    try {
      const tablesToReset: string[] = []

      selectedTables.forEach((tableId) => {
        const option = tableOptions.find((opt) => opt.id === tableId)
        if (option) {
          const tables = option.table.split(",")
          tablesToReset.push(...tables)
        }
      })

      const totalTables = tablesToReset.length
      let completedTables = 0

      for (const table of tablesToReset) {
        try {
          const { error } = await supabase.from(table).delete().neq("id", 0)
          if (error && error.message) {
            }
        } catch (err) {
          }

        completedTables++
        setResetProgress((completedTables / totalTables) * 100)

        await new Promise((resolve) => setTimeout(resolve, 200))
      }

      setShowSuccessDialog(true)
    } catch (error) {
      toast.error(t('systemResetError', currentLanguage.code))
      setIsResetting(false)
    }
  }

  useEffect(() => {
    if (showCountdown && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    } else if (showCountdown && countdown === 0) {
      setShowCountdown(false)
      setCountdown(5)
      setShowResetInterface(true)
    }
  }, [showCountdown, countdown])

  const toggleSelectAll = () => {
    if (selectedTables.length === tableOptions.length) {
      setSelectedTables([])
    } else {
      setSelectedTables(tableOptions.map((opt) => opt.id))
    }
  }

  const handleCheckboxChange = (tableId: string) => {
    setSelectedTables((prev) =>
      prev.includes(tableId) ? prev.filter((id) => id !== tableId) : [...prev, tableId]
    )
  }

  const handleExecuteReset = () => {
    if (selectedTables.length === 0) {
      toast.error("يرجى تحديد خيار واحد على الأقل")
      return
    }
    executeReset()
  }

  return (
    <PermissionGuard requiredRole="مدير">
    <div className="container mx-auto p-6 max-w-4xl">
      {!showResetInterface ? (
        <>
          {}
          <Card className="border-destructive/50 bg-destructive/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <CardTitle className="text-destructive">{t('importantWarning', currentLanguage.code)}</CardTitle>
          </div>
          <CardDescription className="text-base">
            {t('mustTakeBackupBeforeReset', currentLanguage.code)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleFullBackup}
            disabled={isBackingUp}
            className="w-full"
            size="lg"
            variant="outline"
          >
            {isBackingUp ? (
              <>
                <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                {t('creatingBackup', currentLanguage.code)}
              </>
            ) : (
              <>
                <Download className="ml-2 h-5 w-5" />
                {t('finalFullBackup', currentLanguage.code)}
              </>
            )}
          </Button>

          <Button
            onClick={handleStartReset}
            disabled={isBackingUp}
            className="w-full"
            size="lg"
            variant="destructive"
          >
            <AlertTriangle className="ml-2 h-5 w-5" />
            {t('systemReset', currentLanguage.code)}
          </Button>
        </CardContent>
      </Card>
        </>
      ) : (
        <>
      {}
      <Card>
            <CardHeader>
              <CardTitle className="text-2xl">{t('systemReset', currentLanguage.code)}</CardTitle>
              <CardDescription className="text-base leading-relaxed">
                <div className="space-y-4 mt-4">
                  <p>
                    {t('systemResetDescription', currentLanguage.code)}
                  </p>
                  <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      <strong>{t('noteForBenefit', currentLanguage.code)}:</strong> {t('canRestoreDataNote', currentLanguage.code)}
                    </p>
                  </div>
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {}
              <div className="space-y-3">
                <Label className="text-base font-semibold">{t('selectTablesToReset', currentLanguage.code)}:</Label>
                <div className="space-y-2 border rounded-lg p-4">
                  {tableOptions.map((option) => (
                    <div key={option.id} className="flex items-center space-x-2 space-x-reverse">
                      <Checkbox
                        id={option.id}
                        checked={selectedTables.includes(option.id)}
                        onCheckedChange={() => handleCheckboxChange(option.id)}
                      />
                      <Label
                        htmlFor={option.id}
                        className="text-sm font-normal cursor-pointer flex-1"
                      >
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {}
              <Button
                onClick={toggleSelectAll}
                variant={selectedTables.length === tableOptions.length ? "secondary" : "outline"}
                className="w-full"
                size="lg"
              >
                {selectedTables.length === tableOptions.length
                  ? t('deselectAll', currentLanguage.code)
                  : t('selectAll', currentLanguage.code)}
              </Button>

              {}
              <Button
                onClick={handleExecuteReset}
                disabled={selectedTables.length === 0}
                variant="destructive"
                className="w-full"
                size="lg"
              >
                <AlertTriangle className="ml-2 h-5 w-5" />
                {t('startReset', currentLanguage.code)}
              </Button>
            </CardContent>
          </Card>
        </>
      )}

      {}
      <Dialog open={showCountdown} onOpenChange={setShowCountdown}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-6 w-6" />
              {t('attention', currentLanguage.code)}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">{t('dataWillBeDeleted', currentLanguage.code)}</p>
            <div className="flex flex-col items-center justify-center py-6">
              <div className="text-6xl font-bold text-destructive">{countdown}</div>
              <p className="text-sm text-muted-foreground mt-2">{t('second', currentLanguage.code)}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {}
      <Dialog open={isResetting} onOpenChange={() => {}}>
        <DialogContent
          className="sm:max-w-md"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>{t('resettingSystem', currentLanguage.code)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Progress value={resetProgress} className="w-full" />
            <p className="text-center text-sm text-muted-foreground">
              {Math.round(resetProgress)}% {t('completed', currentLanguage.code)}
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {}
      <Dialog open={showSuccessDialog} onOpenChange={() => {}}>
        <DialogContent
          className="sm:max-w-md"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="text-green-600 flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6" />
              {t('completedSuccessfully', currentLanguage.code)}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <p className="text-base text-center text-muted-foreground">{t('systemResetSuccess', currentLanguage.code)}</p>
            <Button
              onClick={() => router.push("/login")}
              className="w-full"
              size="lg"
            >
              {t('returnToLoginPage', currentLanguage.code)}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </PermissionGuard>
  )
}
