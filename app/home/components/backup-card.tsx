"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Database, Clock } from "lucide-react"

export function BackupCard() {
  const handleBackup = () => {
    console.log("Backup triggered...")
  }

  return (
    <Card className="border-2 transition-all duration-200" style={{ borderColor: 'var(--theme-primary)', background: 'linear-gradient(to bottom right, var(--theme-surface), var(--theme-background))' }}>
      <CardContent className="p-6">
        <Button
          variant="outline"
          className="w-full h-auto py-6 flex-col gap-3 hover:bg-background/50"
          onClick={handleBackup}
        >
          <Database className="h-8 w-8 text-primary" />
          <div className="text-center space-y-1">
            <p className="text-base font-semibold">
              انقر لتحديث النسخة الاحتياطية اليومية
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>آخر تحديث: — الساعة: 00:00</span>
            </div>
          </div>
        </Button>
      </CardContent>
    </Card>
  )
}
