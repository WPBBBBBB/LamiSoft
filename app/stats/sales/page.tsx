"use client";
import { PermissionGuard } from "@/components/permission-guard"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function SalesStatsPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/balance/sales-profit")
  }, [router])

  return (
    <PermissionGuard requiredPermission="view_statistics">
    <div className="flex items-center justify-center h-[calc(100vh-200px)]">
      <div className="text-center">
        <p className="text-muted-foreground">جاري التحويل إلى صفحة أرباح المبيعات...</p>
      </div>
    </div>
    </PermissionGuard>
  )
}
