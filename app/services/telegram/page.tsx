import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Send } from "lucide-react"

export default function TelegramPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">تلغرام</h1>
        <p className="text-muted-foreground mt-2">
          خدمة التلغرام
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            تلغرام
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
