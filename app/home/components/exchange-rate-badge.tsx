"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { getCurrentExchangeRate } from "@/lib/exchange-rate-operations"
import { t } from "@/lib/translations"
import { useSettings } from "@/components/providers/settings-provider"
import { ExchangeRateModal } from "@/components/modals/exchange-rate-modal"

export function ExchangeRateBadge() {
  const { currentLanguage } = useSettings()
  const [exchangeRate, setExchangeRate] = useState("1350")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    loadExchangeRate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadExchangeRate() {
    try {
      setIsLoading(true)
      const rate = await getCurrentExchangeRate()
      setExchangeRate(rate.toString())
    } catch (error) {
      } finally {
      setIsLoading(false)
    }
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    loadExchangeRate()
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{t("exchangeRate", currentLanguage.code)}:</span>
        <Badge
          variant="secondary"
          className="cursor-pointer px-4 py-2 text-sm font-semibold hover:bg-secondary/80 transition-colors"
          onClick={() => !isLoading && setIsModalOpen(true)}
        >
          {isLoading ? t("loading", currentLanguage.code) : `${exchangeRate} IQD`}
        </Badge>
      </div>
      
      <ExchangeRateModal 
        open={isModalOpen} 
        onOpenChange={handleModalClose}
      />
    </>
  )
}