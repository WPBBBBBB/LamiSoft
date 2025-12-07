"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bell, RefreshCw, Eye, Menu } from "lucide-react"

export function NotificationsCard() {
  const [unreadCount] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = () => {
    setIsRefreshing(true)
    setTimeout(() => setIsRefreshing(false), 1000)
    console.log("Refreshing notifications...")
  }

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <div className="rounded-full p-2" style={{ backgroundColor: 'var(--theme-surface)' }}>
            <Bell className="h-5 w-5" style={{ color: 'var(--theme-primary)' }} />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold">إشعارات مواعيد التسديد الشهرية</h3>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--theme-surface)' }}>
          <p className="text-sm text-muted-foreground text-center">
            لديك <Badge variant="secondary" className="mx-1">{unreadCount}</Badge> من الإشعارات غير المقروءة لمواعيد التسديد الشهرية
          </p>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
              تحديث
            </Button>
            <Button variant="outline" size="sm">
              <Eye className="h-4 w-4 mr-2" />
              تحديد كمقروء
            </Button>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => console.log("Open notifications menu")}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
