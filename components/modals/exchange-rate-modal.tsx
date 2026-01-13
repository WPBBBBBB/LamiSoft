"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { t } from "@/lib/translations"
import { useSettings } from "@/components/providers/settings-provider"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { DollarSign, TrendingUp, History, X } from "lucide-react"
import { getCurrentExchangeRate, updateExchangeRate, getExchangeRateHistory, type ExchangeRate } from "@/lib/exchange-rate-operations"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/auth-context"

interface ExchangeRateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ExchangeRateModal({ open, onOpenChange }: ExchangeRateModalProps) {
  const { currentLanguage } = useSettings()
  const { currentUser } = useAuth()
  const [rate, setRate] = useState<string>("")
  const [currentRate, setCurrentRate] = useState<number>(1350)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState<ExchangeRate[]>([])
  const [todayRate, setTodayRate] = useState<number | null>(null)
  const [loadingTodayRate, setLoadingTodayRate] = useState(false)

  const getUpdater = () => {
    const username = currentUser?.username || "user"
    const fullName = currentUser?.full_name || username
    return { username, fullName }
  }

  useEffect(() => {
    if (open) {
      loadCurrentRate()
      loadTodayRate()
    }
  }, [open])

  async function loadCurrentRate() {
    try {
      setIsLoading(true)
      const currentRate = await getCurrentExchangeRate()
      setCurrentRate(currentRate)
      setRate(currentRate.toString())
    } catch (error) {
      toast.error(t("failedToLoadExchangeRate", currentLanguage.code))
    } finally {
      setIsLoading(false)
    }
  }

  async function loadTodayRate() {
    try {
      setLoadingTodayRate(true)
      const response = await fetch('/api/exchange-rate')
      const data = await response.json()
      
      if (response.ok && data.rate) {
        setTodayRate(data.rate)
      } else {
        throw new Error(data.error || 'Failed to fetch rate')
      }
    } catch (error) {
      toast.error(t("failedToLoadDailyExchangeRate", currentLanguage.code))
    } finally {
      setLoadingTodayRate(false)
    }
  }

  async function loadHistory() {
    try {
      const data = await getExchangeRateHistory(10)
      setHistory(data)
      setShowHistory(true)
    } catch (error) {
      toast.error(t("failedToLoadExchangeRateHistory", currentLanguage.code))
    }
  }

  async function handleUpdateFromTodayRate() {
    if (!todayRate) return
    
    const roundedRate = Math.round(todayRate)
    
    try {
      setIsSaving(true)
      const updater = getUpdater()
      await updateExchangeRate(roundedRate, updater.username, updater.fullName)
      setCurrentRate(roundedRate)
      setRate(roundedRate.toString())
      toast.success(t("exchangeRateUpdatedFromDaily", currentLanguage.code))
      await loadHistory()
    } catch (error) {
      toast.error(t("failedToUpdateExchangeRate", currentLanguage.code))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleSave() {
    const numRate = parseFloat(rate)
    
    if (isNaN(numRate) || numRate <= 0) {
      toast.error(t("enterValidRate", currentLanguage.code))
      return
    }

    try {
      setIsSaving(true)
      const updater = getUpdater()
      await updateExchangeRate(numRate, updater.username, updater.fullName)
      setCurrentRate(numRate)
      toast.success(t("exchangeRateUpdatedSuccessfully", currentLanguage.code))
      onOpenChange(false)
    } catch (error) {
      toast.error(t("failedToUpdateExchangeRate", currentLanguage.code))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleBlur() {
    const numRate = parseFloat(rate)
    
    if (isNaN(numRate) || numRate <= 0) {
      setRate(currentRate.toString())
      return
    }

    if (numRate !== currentRate) {
      try {
        setIsSaving(true)
        const updater = getUpdater()
        await updateExchangeRate(numRate, updater.username, updater.fullName)
        setCurrentRate(numRate)
        toast.success(t("exchangeRateUpdated", currentLanguage.code))
      } catch (error) {
        toast.error(t("updateFailed", currentLanguage.code))
        setRate(currentRate.toString())
      } finally {
        setIsSaving(false)
      }
    }
  }

  function getLocaleFromLanguage(code: string) {
    const normalized = (code || "en").toLowerCase().split(/[-_]/)[0]
    if (normalized === "ar") return "ar-IQ"
    if (normalized === "ku") return "ckb-IQ"
    return "en-US"
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString)
    const locale = getLocaleFromLanguage(currentLanguage.code)
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }
    try {
      return date.toLocaleString(locale, options)
    } catch {
      return date.toLocaleString("en-US", options)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            {t("editExchangeRateTitle", currentLanguage.code)}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">
            {t("loading", currentLanguage.code)}
          </div>
        ) : (
          <div className="space-y-6">
            <Card className="p-4 bg-muted/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">{t("currentPrice", currentLanguage.code)}</span>
                <Badge variant="secondary" className="gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {t("active", currentLanguage.code)}
                </Badge>
              </div>
              <div className="text-2xl font-bold" style={{ color: "var(--theme-text)" }}>
                {Math.round(currentRate).toLocaleString('en-US')} IQD
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {t("perOneUSD", currentLanguage.code)}
              </div>
            </Card>

            {loadingTodayRate ? (
              <Card className="p-4 bg-blue-500/10 border-blue-500/20">
                <div className="text-center text-sm text-muted-foreground">
                  {t("loadingDailyExchangeRate", currentLanguage.code)}
                </div>
              </Card>
            ) : todayRate ? (
              <Card className="p-4 bg-blue-500/10 border-blue-500/20">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-sm text-muted-foreground mb-1">
                      {t("todayExchangeRateIs", currentLanguage.code)}
                    </div>
                    <div className="text-xl font-bold" style={{ color: "var(--theme-text)" }}>
                      {Math.round(todayRate).toLocaleString('en-US')} IQD
                    </div>
                  </div>
                  <Button
                    onClick={handleUpdateFromTodayRate}
                    disabled={isSaving || Math.round(todayRate) === currentRate}
                    variant="default"
                    size="sm"
                    className="gap-2"
                  >
                    {Math.round(todayRate) === currentRate
                      ? t("upToDate", currentLanguage.code)
                      : t("wantToUpdate", currentLanguage.code)}
                  </Button>
                </div>
              </Card>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="rate">{t("newExchangeRateLabel", currentLanguage.code)}</Label>
              <Input
                id="rate"
                type="number"
                step="0.01"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                onBlur={handleBlur}
                placeholder={t("exchangeRateExamplePlaceholder", currentLanguage.code)}
                disabled={isSaving}
                className="text-lg font-mono"
              />
              <p className="text-xs text-muted-foreground">
                {t("autoSaveOnBlurHint", currentLanguage.code)}
              </p>
            </div>

            {showHistory ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <History className="h-4 w-4" />
                    {t("changeHistory", currentLanguage.code)}
                  </Label>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowHistory(false)}
                    className="h-8 w-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <Card className="max-h-[200px] overflow-y-auto">
                  <div className="divide-y">
                    {history.map((item) => (
                      <div key={item.id} className="p-3 flex items-center justify-between">
                        <div>
                          <div className="font-mono font-semibold">
                            {Math.round(item.rate).toLocaleString('en-US')} IQD
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDate(item.updated_at)}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {item.full_name || item.updated_by}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={loadHistory}
              >
                <History className="h-4 w-4" />
                {t("showHistory", currentLanguage.code)}
              </Button>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            {t("close", currentLanguage.code)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
