import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ShoppingCart } from "lucide-react"
import { PermissionGuard } from "@/components/permission-guard"

export default function PurchasesStatsPage() {
  return (
    <PermissionGuard requiredPermission="view_statistics">
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold" style={{ color: "var(--theme-primary)" }}>إحصائيات المشتريات</h1>
        <p className="text-muted-foreground mt-2">
          تتبع وتحليل بيانات المشتريات
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 theme-danger" />
            إحصائيات المشتريات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            سيتم إضافة المحتوى قريباً...
          </p>
        </CardContent>
      </Card>
    </div>
    </PermissionGuard>
  )
}
