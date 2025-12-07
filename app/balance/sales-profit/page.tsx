import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp } from "lucide-react"

export default function SalesProfitPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">أرباح المبيعات</h1>
        <p className="text-muted-foreground mt-2">
          تتبع أرباح المبيعات
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            أرباح المبيعات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            سيتم إضافة المحتوى قريباً...
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
