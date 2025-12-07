import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Hash } from "lucide-react"

export default function DiscordPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">ديسكورد</h1>
        <p className="text-muted-foreground mt-2">
          خدمة الديسكورد
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5" />
            ديسكورد
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
