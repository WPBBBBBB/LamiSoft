import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign } from "lucide-react"

export default function NetProfitPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">صافي الأرباح</h1>
        <p className="text-muted-foreground mt-2">
          عرض صافي الأرباح الإجمالية
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            صافي الأرباح
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
