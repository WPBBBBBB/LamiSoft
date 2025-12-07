"use client"

import { SearchBar } from "./components/search-bar"
import { ActionButtons } from "./components/action-buttons"
import { BackupCard } from "./components/backup-card"
import { NotificationsCard } from "./components/notifications-card"

export default function HomePage() {
  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-1" style={{ color: "var(--theme-primary)" }}>
          الصفحة الرئيسية
        </h1>
        <p className="text-muted-foreground">
        </p>
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
