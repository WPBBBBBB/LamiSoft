"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
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

interface ExchangeRateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ExchangeRateModal({ open, onOpenChange }: ExchangeRateModalProps) {
  const [rate, setRate] = useState<string>("")
  const [currentRate, setCurrentRate] = useState<number>(1350)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState<ExchangeRate[]>([])

  useEffect(() => {
    if (open) {
      loadCurrentRate()
    }
  }, [open])

  async function loadCurrentRate() {
    try {
      setIsLoading(true)
      const currentRate = await getCurrentExchangeRate()
      setCurrentRate(currentRate)
      setRate(currentRate.toString())
    } catch (error) {
      console.error(error)
      toast.error("فشل تحميل سعر الصرف")
    } finally {
      setIsLoading(false)
    }
  }

  async function loadHistory() {
    try {
      const data = await getExchangeRateHistory(10)
      setHistory(data)
      setShowHistory(true)
    } catch (error) {
      console.error(error)
      toast.error("فشل تحميل السجل")
    }
  }

  async function handleSave() {
    const numRate = parseFloat(rate)
    
    if (isNaN(numRate) || numRate <= 0) {
      toast.error("يرجى إدخال سعر صحيح")
      return
    }

    try {
      setIsSaving(true)
      await updateExchangeRate(numRate)
      setCurrentRate(numRate)
      toast.success("تم تحديث سعر الصرف بنجاح")
      onOpenChange(false)
    } catch (error) {
      console.error(error)
      toast.error("فشل تحديث سعر الصرف")
    } finally {
      setIsSaving(false)
    }
  }

  // التحديث عند مغادرة الحقل
  async function handleBlur() {
    const numRate = parseFloat(rate)
    
    if (isNaN(numRate) || numRate <= 0) {
      // إعادة القيمة الحالية
      setRate(currentRate.toString())
      return
    }

    // إذا تغير السعر، احفظه
    if (numRate !== currentRate) {
      try {
        setIsSaving(true)
        await updateExchangeRate(numRate)
        setCurrentRate(numRate)
        toast.success("تم تحديث سعر الصرف")
      } catch (error) {
        console.error(error)
        toast.error("فشل التحديث")
        setRate(currentRate.toString())
      } finally {
        setIsSaving(false)
      }
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString)
    return date.toLocaleString('ar-IQ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            تعديل سعر الصرف
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">
            جاري التحميل...
          </div>
        ) : (
          <div className="space-y-6">
            <Card className="p-4 bg-muted/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">السعر الحالي</span>
                <Badge variant="secondary" className="gap-1">
                  <TrendingUp className="h-3 w-3" />
                  فعّال
                </Badge>
              </div>
              <div className="text-2xl font-bold" style={{ color: "var(--theme-text)" }}>
                {currentRate.toLocaleString('en-US')} IQD
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                مقابل 1 دولار أمريكي
              </div>
            </Card>

            <div className="space-y-2">
              <Label htmlFor="rate">السعر الجديد (دينار عراقي)</Label>
              <Input
                id="rate"
                type="number"
                step="0.01"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                onBlur={handleBlur}
                placeholder="مثال: 1350"
                disabled={isSaving}
                className="text-lg font-mono"
              />
              <p className="text-xs text-muted-foreground">
                سيتم حفظ السعر تلقائياً عند مغادرة الحقل
              </p>
            </div>

            {showHistory ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <History className="h-4 w-4" />
                    سجل التغييرات
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
                            {item.rate.toLocaleString('en-US')} IQD
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDate(item.updated_at)}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {item.updated_by}
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
                عرض السجل
              </Button>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            إغلاق
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="gap-2"
          >
            {isSaving ? "جاري الحفظ..." : "حفظ يدوياً"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
