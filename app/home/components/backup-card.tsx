"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Database, Clock, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { t } from "@/lib/translations"
import { useSettings } from "@/components/providers/settings-provider"

export function BackupCard() {
  const { currentLanguage } = useSettings()
  const [isBackingUp, setIsBackingUp] = useState(false)
  const [lastBackupTime, setLastBackupTime] = useState<string>("")
  const [nextAllowedTime, setNextAllowedTime] = useState<number | null>(null)
  const [remainingTime, setRemainingTime] = useState<string>("")
  const [isDisabled, setIsDisabled] = useState(false)

  useEffect(() => {
    loadLastBackupInfo()
  }, [])

  useEffect(() => {
    if (nextAllowedTime) {
      const interval = setInterval(() => {
        const now = Date.now()
        const diff = nextAllowedTime - now

        if (diff <= 0) {
          setIsDisabled(false)
          setRemainingTime("")
          setNextAllowedTime(null)
          clearInterval(interval)
        } else {
          const minutes = Math.floor(diff / 60000)
          const seconds = Math.floor((diff % 60000) / 1000)
          setRemainingTime(`${minutes}:${seconds.toString().padStart(2, '0')}`)
          setIsDisabled(true)
        }
      }, 1000)

      return () => clearInterval(interval)
    }
  }, [nextAllowedTime])

  async function loadLastBackupInfo() {
    try {
      const { data } = await supabase
        .from("backup_logs")
        .select("backup_date, next_allowed_backup_time")
        .eq("backup_type", "auto")
        .order("backup_date", { ascending: false })
        .limit(1)
        .single()

      if (data) {
        const backupDate = new Date(data.backup_date)
        setLastBackupTime(backupDate.toLocaleString("en-US", {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }))

        if (data.next_allowed_backup_time) {
          const nextTime = new Date(data.next_allowed_backup_time).getTime()
          if (nextTime > Date.now()) {
            setNextAllowedTime(nextTime)
          }
        }
      }
    } catch (error) {
      }
  }

  async function handleBackup() {
    if (isDisabled || isBackingUp) return

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
        "payments"
      ]

      const backupData: Record<string, unknown[]> = {}

      for (const tableName of tables) {
        const { data, error } = await supabase
          .from(tableName)
          .select("*")

        if (error) {
          backupData[tableName] = []
        } else {
          backupData[tableName] = data || []
        }
      }

      const nextAllowed = new Date(Date.now() + 60 * 60 * 1000)

      const { error: backupError } = await supabase
        .from("backup_logs")
        .insert([{
          backup_type: "auto",
          backup_date: new Date().toISOString(),
          status: "success",
          backup_data: backupData,
          records_count: Object.keys(backupData).reduce((acc, tableName) => {
            acc[tableName] = backupData[tableName].length
            return acc
          }, {} as Record<string, number>),
          next_allowed_backup_time: nextAllowed.toISOString()
        }])

      if (backupError) throw backupError

      toast.success(t('backupCreatedSuccess', currentLanguage.code))
      
      setLastBackupTime(new Date().toLocaleString("en-US", {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }))
      setNextAllowedTime(nextAllowed.getTime())

    } catch (error) {
      toast.error(t('backupCreationFailed', currentLanguage.code))
    } finally {
      setIsBackingUp(false)
    }
  }

  return (
    <Card className="border-2 transition-all duration-200" style={{ borderColor: 'var(--theme-primary)', background: 'linear-gradient(to bottom right, var(--theme-surface), var(--theme-background))' }}>
      <CardContent className="p-6">
        <Button
          variant="outline"
          className="w-full h-auto py-6 flex-col gap-3 hover:bg-background/50 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleBackup}
          disabled={isDisabled || isBackingUp}
        >
          {isBackingUp ? (
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          ) : (
            <Database className="h-8 w-8 theme-info" />
          )}
          <div className="text-center space-y-1">
            <p className="text-base font-semibold">
              {isBackingUp 
                ? t('creatingBackup', currentLanguage.code)
                : isDisabled 
                  ? `${t('availableAfter', currentLanguage.code)} ${remainingTime}`
                  : t('clickToUpdateDailyBackup', currentLanguage.code)
              }
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{t('lastUpdate', currentLanguage.code)}: {lastBackupTime || "—"}</span>
            </div>
          </div>
        </Button>
      </CardContent>
    </Card>
  )
}
