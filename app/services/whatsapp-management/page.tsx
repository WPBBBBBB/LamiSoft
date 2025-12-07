import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageSquare } from "lucide-react"

export default function WhatsappManagementPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">إدارة الواتساب</h1>
        <p className="text-muted-foreground mt-2">
          إدارة وتهيئة خدمات الواتساب
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            إدارة الواتساب
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
