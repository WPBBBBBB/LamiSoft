"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { t } from "@/lib/translations"
import { useSettings } from "@/components/providers/settings-provider"
import { PermissionGuard } from "@/components/permission-guard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Database, Download, Upload, Clock, Info, CheckCircle, HardDrive, Cloud, Trash2 } from "lucide-react"
import { toast } from "sonner"

interface BackupLog {
  id: string
  backup_type: string
  backup_date: string
  status: string
  records_count: Record<string, number>
}

export default function DatabaseSettingsPage() {
  const { currentLanguage } = useSettings()
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(false)
  const [backupTime, setBackupTime] = useState("02:00")
  const [isLoading, setIsLoading] = useState(false)
  const [showRestoreDialog, setShowRestoreDialog] = useState(false)
  const [showAutoBackupsList, setShowAutoBackupsList] = useState(false)
  const [autoBackups, setAutoBackups] = useState<BackupLog[]>([])
  const [selectedBackup, setSelectedBackup] = useState<BackupLog | null>(null)
  const [showConfirmRestore, setShowConfirmRestore] = useState(false)
  const [selectedBackupIds, setSelectedBackupIds] = useState<Set<string>>(new Set())
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)

  const [dbInfo, setDbInfo] = useState({
    lastBackup: "Not done yet",
    lastRestore: "Not done yet",
    lastAutoBackup: "Not done yet",
  })

  const updateLastAutoBackupDate = async () => {
    try {
      const { supabase } = await import("@/lib/supabase")
      
      const { data: backups, error: backupsError } = await supabase
        .from("backup_logs")
        .select("backup_date, status")
        .eq("backup_type", "auto")
        .eq("status", "success")
        .order("backup_date", { ascending: false })
        .limit(1)

      if (!backupsError && backups && backups.length > 0) {
        const lastAutoBackup = new Date(backups[0].backup_date).toLocaleString("en-US", {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        })
        setDbInfo(prev => ({ ...prev, lastAutoBackup }))
      }
    } catch (error) {
      console.error("Error updating last auto backup date:", error)
    }
  }

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { supabase } = await import("@/lib/supabase")
        
        console.log("📥 Loading backup settings...")
        
        const { data: settings, error: settingsError } = await supabase
          .from("backup_settings")
          .select("*")
          .eq("id", 1)
          .single()

        if (!settingsError && settings) {
          console.log("✅ Settings loaded successfully:")
          console.log("   - Auto Backup Enabled:", settings.auto_backup_enabled)
          console.log("   - Backup Time:", settings.backup_time)
          console.log("   - Timezone Offset:", settings.timezone_offset)
          console.log("   - Last Updated:", settings.updated_at)
          
          setAutoBackupEnabled(settings.auto_backup_enabled)
          setBackupTime(settings.backup_time.substring(0, 5))
        } else if (settingsError) {
          console.error("❌ Error loading settings:", settingsError)
        }

        await updateLastAutoBackupDate()

        const savedDbInfo = localStorage.getItem("dbInfo")
        if (savedDbInfo) {
          const parsed = JSON.parse(savedDbInfo)
          setDbInfo(prev => ({ 
            ...prev, 
            lastBackup: parsed.lastBackup || prev.lastBackup,
            lastRestore: parsed.lastRestore || prev.lastRestore
          }))
        }
      } catch (error) {
        console.error("❌ Error loading settings:", error)
      }
    }

    loadSettings()
  }, [])

  const handleBackupTimeChange = async (time: string) => {
    setBackupTime(time)
    
    try {
      const { supabase } = await import("@/lib/supabase")
      
      console.log("🕐 Updating backup time to:", time + ":00")
      
      // Update the backup_settings table directly
      const { error: updateError } = await supabase
        .from("backup_settings")
        .update({ 
          backup_time: time + ":00",
          updated_at: new Date().toISOString()
        })
        .eq("id", 1)

      if (updateError) {
        console.error("❌ Error updating backup time in settings:", updateError)
        toast.error("فشل في تحديث وقت النسخ الاحتياطي: " + updateError.message)
        return
      }

      console.log("✅ Backup time saved to database successfully!")
      
      // Verify the saved value
      const { data: verifyData } = await supabase
        .from("backup_settings")
        .select("backup_time, updated_at")
        .eq("id", 1)
        .single()
      
      if (verifyData) {
        console.log("📋 Verified saved time:", verifyData.backup_time)
        console.log("📅 Last updated at:", verifyData.updated_at)
      }

      // Also update the cron job if the RPC exists
      try {
        const { data, error: rpcError } = await supabase.rpc("update_backup_time", {
          new_time: time + ":00"
        })

        if (rpcError) {
          console.warn("⚠️ RPC update_backup_time not available or failed:", rpcError)
        } else if (data && data.length > 0) {
          const result = data[0]
          console.log("✅ Backup time update result:", result)
          console.log("⏰ Cron Schedule:", result.cron_schedule)
          console.log("🌍 UTC Time:", result.utc_time)
        }
      } catch (rpcError) {
        console.warn("⚠️ Could not update cron job:", rpcError)
      }

      toast.success(`تم تحديث وقت النسخ الاحتياطي إلى ${time}`)
    } catch (error) {
      console.error("❌ Error updating backup time:", error)
      toast.error("فشل في تحديث وقت النسخ الاحتياطي")
    }
  }

  const handleAutoBackupToggle = async (enabled: boolean) => {
    setIsLoading(true)
    
    try {
      const { supabase } = await import("@/lib/supabase")
      
      console.log("Toggling auto backup to:", enabled)
      
      // Update the backup_settings table directly
      const { error: updateError } = await supabase
        .from("backup_settings")
        .update({ 
          auto_backup_enabled: enabled,
          updated_at: new Date().toISOString()
        })
        .eq("id", 1)

      if (updateError) {
        console.error("Error updating auto backup setting:", updateError)
        throw updateError
      }

      // Also try to update cron job if RPC exists
      try {
        const { error: rpcError } = await supabase.rpc("toggle_auto_backup", {
          enabled
        })
        if (rpcError) {
          console.warn("RPC toggle_auto_backup not available or failed:", rpcError)
        }
      } catch (rpcError) {
        console.warn("Could not update cron job:", rpcError)
      }

      setAutoBackupEnabled(enabled)
      
      await updateLastAutoBackupDate()
      
      console.log("Auto backup toggled successfully")
      
      if (enabled) {
        toast.success("تم تفعيل النسخ الاحتياطي التلقائي")
      } else {
        toast.success("تم إيقاف النسخ الاحتياطي التلقائي")
      }
    } catch (error) {
      console.error("Error toggling auto backup:", error)
      toast.error("فشل في تحديث حالة النسخ الاحتياطي")
    } finally {
      setIsLoading(false)
    }
  }

  const handleManualBackup = async () => {
    setIsLoading(true)
    
    try {
      const { supabase } = await import("@/lib/supabase")
      
      const [salesMain, salesDetails, purchasesMain, purchaseProductsDetails, inventory, store, storeTransfers, customers, payments, users, userPermissions, expenses] = await Promise.all([
        supabase.from("tb_salesmain").select("*"),
        supabase.from("tb_salesdetails").select("*"),
        supabase.from("tb_purchasemain").select("*"),
        supabase.from("tb_purchaseproductsdetails").select("*"),
        supabase.from("tb_inventory").select("*"),
        supabase.from("tb_store").select("*"),
        supabase.from("tb_storetransfers").select("*"),
        supabase.from("customers").select("*"),
        supabase.from("payments").select("*"),
        supabase.from("users").select("*"),
        supabase.from("user_permissions").select("*"),
        supabase.from("expenses").select("*"),
      ])

      const backup = {
        version: "1.0",
        timestamp: new Date().toISOString(),
        data: {
          tb_salesmain: salesMain.data || [],
          tb_salesdetails: salesDetails.data || [],
          tb_purchasemain: purchasesMain.data || [],
          tb_purchaseproductsdetails: purchaseProductsDetails.data || [],
          tb_inventory: inventory.data || [],
          tb_store: store.data || [],
          tb_storetransfers: storeTransfers.data || [],
          customers: customers.data || [],
          payments: payments.data || [],
          users: users.data || [],
          user_permissions: userPermissions.data || [],
          expenses: expenses.data || [],
        },
      }

      const json = JSON.stringify(backup, null, 2)
      const blob = new Blob([json], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `backup_${new Date().toISOString().replace(/[:.]/g, "-")}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      const now = new Date().toLocaleString("en-US", {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      })
      const updatedInfo = { ...dbInfo, lastBackup: now }
      setDbInfo(updatedInfo)
      localStorage.setItem("dbInfo", JSON.stringify(updatedInfo))

      toast.success("تم إنشاء وتنزيل النسخة الاحتياطية بنجاح")
    } catch (error) {
      console.error("Backup error:", error)
      toast.error("فشل في إنشاء النسخة الاحتياطية")
    } finally {
      setIsLoading(false)
    }
  }

  const handleRestore = async () => {
    setShowRestoreDialog(true)
  }

  const handleRestoreFromDevice = async () => {
    setShowRestoreDialog(false)
    
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".json"
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      setIsLoading(true)
      try {
        const text = await file.text()
        const backup = JSON.parse(text)

        if (!backup.version || !backup.data) {
          throw new Error("ملف النسخة الاحتياطية غير صالح")
        }

        const { supabase } = await import("@/lib/supabase")

        const restorePromises = Object.entries(backup.data).map(([table, data]) => {
          if (Array.isArray(data) && data.length > 0) {
            return supabase.from(table).upsert(data)
          }
          return Promise.resolve()
        })

      await Promise.all(restorePromises)

      const now = new Date().toLocaleString("en-US", {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      })
      const updatedInfo = { ...dbInfo, lastRestore: now }
      setDbInfo(updatedInfo)
      localStorage.setItem("dbInfo", JSON.stringify(updatedInfo))
      
      await updateLastAutoBackupDate()

      toast.success("تم استعادة النسخة الاحتياطية بنجاح")
    } catch (error) {
        console.error("Restore error:", error)
        toast.error("فشل في استعادة النسخة الاحتياطية")
      } finally {
        setIsLoading(false)
      }
    }

    input.click()
  }

  const handleRestoreFromAutoBackups = async () => {
    setShowRestoreDialog(false)
    setIsLoading(true)
    
    try {
      const { supabase } = await import("@/lib/supabase")
      
      const { data, error } = await supabase
        .from("backup_logs")
        .select("*")
        .eq("backup_type", "auto")
        .eq("status", "success")
        .order("backup_date", { ascending: false })

      if (error) throw error

      setAutoBackups(data || [])
      setShowAutoBackupsList(true)
    } catch (error) {
      console.error("Error loading auto backups:", error)
      toast.error("فشل في تحميل قائمة النسخ الاحتياطية التلقائية")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectBackup = (backup: BackupLog) => {
    setSelectedBackup(backup)
    setShowConfirmRestore(true)
  }

  const handleToggleBackupSelection = (backupId: string) => {
    setSelectedBackupIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(backupId)) {
        newSet.delete(backupId)
      } else {
        newSet.add(backupId)
      }
      return newSet
    })
  }

  const handleToggleAllBackups = () => {
    if (selectedBackupIds.size === autoBackups.length) {
      setSelectedBackupIds(new Set())
    } else {
      setSelectedBackupIds(new Set(autoBackups.map(b => b.id)))
    }
  }

  const handleDeleteSelectedBackups = () => {
    if (selectedBackupIds.size === 0) {
      toast.error(t('selectBackupsToDelete', currentLanguage.code))
      return
    }
    setShowConfirmDelete(true)
  }

  const handleConfirmDelete = async () => {
    setShowConfirmDelete(false)
    setIsLoading(true)

    try {
      const { supabase } = await import("@/lib/supabase")
      
      const { error } = await supabase
        .from("backup_logs")
        .delete()
        .in("id", Array.from(selectedBackupIds))

      if (error) throw error

      // Update the list
      setAutoBackups(prev => prev.filter(b => !selectedBackupIds.has(b.id)))
      setSelectedBackupIds(new Set())
      
      toast.success(t('backupsDeletedSuccessfully', currentLanguage.code))
    } catch (error) {
      console.error("Error deleting backups:", error)
      toast.error(t('failedToDeleteBackups', currentLanguage.code))
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirmRestore = async () => {
    if (!selectedBackup) return

    setShowConfirmRestore(false)
    setShowAutoBackupsList(false)
    setIsLoading(true)

    try {
      const { supabase } = await import("@/lib/supabase")
      
      const { data: backupData, error: fetchError } = await supabase
        .rpc("get_backup_data", { backup_id: selectedBackup.id })
        
      if (fetchError) throw fetchError
      if (!backupData) throw new Error("لم يتم العثور على بيانات النسخة الاحتياطية")

      const backupContent = backupData
      const tables = backupContent.data

      const restorePromises = Object.entries(tables).map(async ([tableName, tableData]) => {
        if (Array.isArray(tableData) && tableData.length > 0) {
          try {
            console.log(`Restoring ${tableName} with ${tableData.length} records...`)
            
            const { data: schemaData } = await supabase
              .from(tableName)
              .select('*')
              .limit(1)
            
            let validFields: string[] = []
            if (schemaData && schemaData.length > 0) {
              validFields = Object.keys(schemaData[0])
              console.log(`Valid fields for ${tableName}:`, validFields)
            }
            
            const cleanedData = tableData.map((record: Record<string, unknown>) => {
              const cleaned: Record<string, unknown> = {}
              
              if (validFields.length > 0) {
                validFields.forEach(field => {
                  if (field in record) {
                    cleaned[field] = record[field]
                  }
                })
              } else {
                Object.keys(record).forEach(key => {
                  if (!['updated_at', 'created_at', 'createdAt', 'updatedAt', 'last_modified'].includes(key)) {
                    cleaned[key] = record[key]
                  }
                })
              }
              
              return cleaned
            })
            
            console.log(`Sample cleaned record for ${tableName}:`, JSON.stringify(cleanedData[0], null, 2))
            
            const { error } = await supabase
              .from(tableName)
              .upsert(cleanedData, { 
                onConflict: 'id',
                ignoreDuplicates: false 
              })
            
            if (error) {
              console.error(`Error restoring ${tableName}:`, JSON.stringify(error, null, 2))
              
              console.log(`Attempting alternative restore method for ${tableName}...`)
              
              const { error: deleteError } = await supabase
                .from(tableName)
                .delete()
                .gte('id', '00000000-0000-0000-0000-000000000000')
              
              if (deleteError) {
                console.warn(`Could not clear table ${tableName}:`, JSON.stringify(deleteError, null, 2))
              }
              
              const batchSize = 50
              let successCount = 0
              
              for (let i = 0; i < cleanedData.length; i += batchSize) {
                const batch = cleanedData.slice(i, i + batchSize)
                const { error: insertError } = await supabase
                  .from(tableName)
                  .insert(batch)
                
                if (insertError) {
                  console.error(`Error inserting batch ${i}-${i + batch.length} into ${tableName}:`, 
                    JSON.stringify(insertError, null, 2))
                  for (const record of batch) {
                    const { error: singleError } = await supabase
                      .from(tableName)
                      .insert([record])
                    
                    if (!singleError) {
                      successCount++
                    } else {
                      console.error(`Failed to insert single record:`, JSON.stringify(singleError, null, 2))
                    }
                  }
                } else {
                  successCount += batch.length
                }
              }
              
              console.log(`✓ Restored ${successCount}/${cleanedData.length} records in ${tableName}`)
            } else {
              console.log(`✓ Successfully restored ${tableName}`)
            }
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : JSON.stringify(err)
            console.error(`Failed to restore table ${tableName}:`, errorMsg)
            console.warn(`Skipping ${tableName} due to errors`)
          }
        } else {
          console.log(`Skipping ${tableName} - no data to restore`)
        }
      })

      await Promise.all(restorePromises)

      const now = new Date().toLocaleString("en-US")
      const updatedInfo = { ...dbInfo, lastRestore: now }
      setDbInfo(updatedInfo)
      localStorage.setItem("dbInfo", JSON.stringify(updatedInfo))

      toast.success("تم استعادة النسخة الاحتياطية بنجاح")
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف'
      console.error("Restore error:", {
        message: errorMessage,
        error: error
      })
      toast.error("فشل في استعادة النسخة الاحتياطية: " + errorMessage)
    } finally {
      setIsLoading(false)
      setSelectedBackup(null)
    }
  }

  return (
    <PermissionGuard requiredRole="مدير">
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('databaseSettings', currentLanguage.code)}</h1>
        <p className="text-muted-foreground mt-2">{t('manageBackupAndRestore', currentLanguage.code)}</p>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Database className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">{t('backupAndRestore', currentLanguage.code)}</h2>
        </div>
        <p className="text-muted-foreground mb-4">{t('createOrRestoreBackup', currentLanguage.code)}</p>
        <div className="flex gap-3">
          <Button onClick={handleManualBackup} disabled={isLoading}>
            <Download className="h-4 w-4 ml-2" />
            {t('createBackupNow', currentLanguage.code)}
          </Button>
          <Button variant="outline" onClick={handleRestore} disabled={isLoading}>
            <Upload className="h-4 w-4 ml-2" />
            {t('restoreBackup', currentLanguage.code)}
          </Button>
        </div>
      </Card>

      {}
      <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('chooseRestoreSource', currentLanguage.code)}</DialogTitle>
            <DialogDescription>
              {t('chooseBackupSource', currentLanguage.code)}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-4">
            <Button onClick={handleRestoreFromDevice} className="w-full justify-start h-auto py-4">
              <HardDrive className="h-5 w-5 ml-3" />
              <div className="text-right">
                <div className="font-semibold">{t('restoreFromDevice', currentLanguage.code)}</div>
                <div className="text-sm text-muted-foreground">{t('uploadBackupFile', currentLanguage.code)}</div>
              </div>
            </Button>
            <Button onClick={handleRestoreFromAutoBackups} variant="outline" className="w-full justify-start h-auto py-4">
              <Cloud className="h-5 w-5 ml-3" />
              <div className="text-right">
                <div className="font-semibold">{t('restoreFromAutoBackups', currentLanguage.code)}</div>
                <div className="text-sm text-muted-foreground">{t('viewAndRestoreAutoBackups', currentLanguage.code)}</div>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {}
      <Dialog open={showAutoBackupsList} onOpenChange={setShowAutoBackupsList}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="text-right">{t('autoBackupList', currentLanguage.code)}</DialogTitle>
            <DialogDescription className="text-right">
              {t('selectBackupToRestore', currentLanguage.code)}
            </DialogDescription>
          </DialogHeader>
          
          {selectedBackupIds.size > 0 && (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <span className="text-sm">
                {selectedBackupIds.size} {t('selected', currentLanguage.code)}
              </span>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleDeleteSelectedBackups}
                disabled={isLoading}
              >
                <Trash2 className="h-4 w-4 ml-2" />
                {t('deleteSelected', currentLanguage.code)}
              </Button>
            </div>
          )}

          <div className="py-4">
            {autoBackups.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {t('noAutoBackupsAvailable', currentLanguage.code)}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right w-12">#</TableHead>
                    <TableHead className="text-center w-12">
                      <Checkbox
                        checked={selectedBackupIds.size === autoBackups.length}
                        onCheckedChange={handleToggleAllBackups}
                      />
                    </TableHead>
                    <TableHead className="text-right">{t('date', currentLanguage.code)}</TableHead>
                    <TableHead className="text-right">{t('time', currentLanguage.code)}</TableHead>
                    <TableHead className="text-right">{t('recordsCount', currentLanguage.code)}</TableHead>
                    <TableHead className="text-right">{t('action', currentLanguage.code)}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {autoBackups.map((backup, index) => {
                    const date = new Date(backup.backup_date)
                    const totalRecords = Object.values(backup.records_count || {}).reduce((a, b) => a + b, 0)
                    
                    return (
                      <TableRow key={backup.id}>
                        <TableCell className="font-medium text-right">
                          {autoBackups.length - index}
                        </TableCell>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={selectedBackupIds.has(backup.id)}
                            onCheckedChange={() => handleToggleBackupSelection(backup.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {date.toLocaleDateString("en-US")}
                        </TableCell>
                        <TableCell>
                          {date.toLocaleTimeString("en-US")}
                        </TableCell>
                        <TableCell>
                          {totalRecords} {t('record', currentLanguage.code)}
                        </TableCell>
                        <TableCell>
                          <Button 
                            size="sm" 
                            onClick={() => handleSelectBackup(backup)}
                            variant="outline"
                          >
                            {t('restore', currentLanguage.code)}
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {}
      <AlertDialog open={showConfirmRestore} onOpenChange={setShowConfirmRestore}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmAction', currentLanguage.code)}</AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              {t('willReplaceCurrentData', currentLanguage.code)}
              <br />
              <br />
              <strong>{t('backupDate', currentLanguage.code)}:</strong> {selectedBackup && new Date(selectedBackup.backup_date).toLocaleString("en-US")}
              <br />
              <strong>{t('recordsCount', currentLanguage.code)}:</strong> {selectedBackup && Object.values(selectedBackup.records_count || {}).reduce((a, b) => a + b, 0)} {t('record', currentLanguage.code)}
              <br />
              <br />
              {t('actionCannotBeUndone', currentLanguage.code)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel', currentLanguage.code)}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRestore} className="bg-destructive hover:bg-destructive/90">
              {t('yesRestoreBackup', currentLanguage.code)}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {}
      <AlertDialog open={showConfirmDelete} onOpenChange={setShowConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right">{t('confirmDelete', currentLanguage.code)}</AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              {t('areYouSureDeleteBackups', currentLanguage.code)}
              <br />
              <br />
              <strong>{t('selectedCount', currentLanguage.code)}:</strong> {selectedBackupIds.size} {t('backup', currentLanguage.code)}
              <br />
              <br />
              {t('actionCannotBeUndone', currentLanguage.code)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel', currentLanguage.code)}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">
              <Trash2 className="h-4 w-4 ml-2" />
              {t('yesDelete', currentLanguage.code)}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Clock className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">{t('autoBackupSettings', currentLanguage.code)}</h2>
        </div>
        
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">{t('enableAutoBackup', currentLanguage.code)}</Label>
              <p className="text-sm text-muted-foreground">
                {t('autoBackupDescription', currentLanguage.code)}
              </p>
            </div>
            <Switch 
              checked={autoBackupEnabled} 
              onCheckedChange={handleAutoBackupToggle}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="backup-time">{t('dailyBackupTime', currentLanguage.code)}</Label>
            <Input
              id="backup-time"
              type="time"
              value={backupTime}
              onChange={(e) => handleBackupTimeChange(e.target.value)}
              className="max-w-xs"
              disabled={!autoBackupEnabled || isLoading}
            />
            <p className="text-sm text-muted-foreground">
              {autoBackupEnabled 
                ? `${t('willCreateBackupAt', currentLanguage.code)} ${backupTime}` 
                : t('enableAutoBackupFirst', currentLanguage.code)}
            </p>
          </div>

          {autoBackupEnabled && (
            <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-green-900">{t('autoBackupEnabled', currentLanguage.code)}</p>
                <p className="text-sm text-green-700 mt-1">
                  {t('backupsSavedAutomatically', currentLanguage.code)}
                </p>
                <p className="text-sm text-green-700 mt-1">
                  {t('scheduledTime', currentLanguage.code)}: {t('everyDayAt', currentLanguage.code)} {backupTime}
                </p>
              </div>
            </div>
          )}

          {!autoBackupEnabled && (
            <div className="flex items-start gap-3 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <Info className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-900">{t('autoBackupDisabled', currentLanguage.code)}</p>
                <p className="text-sm text-yellow-700 mt-1">
                  {t('enableSwitchAbove', currentLanguage.code)}
                </p>
              </div>
            </div>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Info className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">{t('connectionInfo', currentLanguage.code)}</h2>
        </div>
        <p className="text-muted-foreground mb-6">{t('currentDatabaseInfo', currentLanguage.code)}</p>

        <div className="grid gap-4">
          <div className="flex justify-between items-center py-3 border-b">
            <span className="text-sm font-medium text-muted-foreground">{t('lastManualBackup', currentLanguage.code)}</span>
            <span className="text-sm font-semibold">{dbInfo.lastBackup}</span>
          </div>
          <div className="flex justify-between items-center py-3 border-b">
            <span className="text-sm font-medium text-muted-foreground">{t('lastRestoreOperation', currentLanguage.code)}</span>
            <span className="text-sm font-semibold">{dbInfo.lastRestore}</span>
          </div>
          <div className="flex justify-between items-center py-3">
            <span className="text-sm font-medium text-muted-foreground">{t('lastAutoBackupOperation', currentLanguage.code)}</span>
            <span className="text-sm font-semibold">{dbInfo.lastAutoBackup}</span>
          </div>
        </div>
      </Card>
    </div>
    </PermissionGuard>
  )
}
