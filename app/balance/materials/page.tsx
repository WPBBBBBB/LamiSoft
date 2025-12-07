import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Wallet } from "lucide-react"

export default function MaterialsBalancePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">أرصدة المواد</h1>
        <p className="text-muted-foreground mt-2">
          عرض أرصدة المواد والمخزون
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            أرصدة المواد
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
