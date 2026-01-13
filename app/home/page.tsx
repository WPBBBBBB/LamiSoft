"use client";
import { SearchBar } from "./components/search-bar"
import { ActionButtons } from "./components/action-buttons"
import { BackupCard } from "./components/backup-card"
import { NotificationsCard } from "./components/notifications-card"
import { WeatherButton } from "./components/weather-button"
import { ExchangeRateBadge } from "./components/exchange-rate-badge"
import { WeatherSlots } from "./components/weather-slots"
import { t } from "@/lib/translations"
import { useSettings } from "@/components/providers/settings-provider"

export default function HomePage() {
  const { currentLanguage } = useSettings()
  
  return (
    <div className="space-y-6 relative">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1" style={{ color: "var(--theme-primary)" }}>
            {t('home', currentLanguage.code)}
          </h1>
          <p className="text-muted-foreground"></p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <WeatherButton />
          <WeatherSlots />
          <ExchangeRateBadge />
        </div>
      </div>

      <SearchBar />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <ActionButtons />
        </div>

        <div className="lg:col-span-2 space-y-6">
          <NotificationsCard />
          
          <BackupCard />
        </div>
      </div>
    </div>
  )
}
