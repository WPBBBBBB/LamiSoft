"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Save, User, Calendar, DollarSign, Clock, Building2, CreditCard, ArrowRight } from "lucide-react"
import { toast } from "sonner"

export default function EditMessagePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const type = searchParams.get("type") as "normal" | "notification" || "normal"
  
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const variables = [
    { label: "اسم الزبون", code: "{CustomerName}", icon: User },
    { label: "تاريخ آخر تسديد", code: "{LastPaymentDate}", icon: Calendar },
    { label: "المبلغ الواصل (الأخير)", code: "{LastAmount}", icon: DollarSign },
    { label: "المبلغ المتبقي", code: "{RemainingBalance}", icon: CreditCard },
    { label: "التاريخ الحالي", code: "{CurrentDate}", icon: Calendar },
    { label: "الوقت الحالي", code: "{CurrentTime}", icon: Clock },
    { label: "اسم الشركة", code: "{CompanyName}", icon: Building2 },
  ]

  useEffect(() => {
    loadCurrentTemplate()
  }, [])

  async function loadCurrentTemplate() {
    try {
      const response = await fetch("/api/whatsapp-settings")
      if (response.ok) {
        const data = await response.json()
        if (type === "normal") {
          setTitle(data.normal_message_title || "")
          setBody(data.normal_message_body || "")
        } else {
          setTitle(data.notification_message_title || "")
          setBody(data.notification_message_body || "")
        }
      }
    } catch (error) {
      toast.error("فشل تحميل البيانات")
    } finally {
      setIsLoading(false)
    }
  }

  function insertVariable(code: string) {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const newBody = body.substring(0, start) + code + body.substring(end)
    
    setBody(newBody)
    
    setTimeout(() => {
      textarea.focus()
      const newPosition = start + code.length
      textarea.setSelectionRange(newPosition, newPosition)
    }, 0)
  }

  async function handleSave() {
    if (!title.trim()) {
      toast.error("يرجى إدخال عنوان الرسالة")
      return
    }

    if (!body.trim()) {
      toast.error("يرجى إدخال نص الرسالة")
      return
    }

    try {
      const savedUser = localStorage.getItem('currentUser')
      let username = 'user'
      let fullName = 'user'
      
      if (savedUser) {
        const user = JSON.parse(savedUser)
        username = user.username || 'user'
        fullName = user.full_name || user.fullName || user.name || username
      }

      const currentResponse = await fetch("/api/whatsapp-settings")
      const currentSettings = await currentResponse.json()

      const { apiKey, ...settingsWithoutApiKey } = currentSettings

      const updatedSettings = {
        ...settingsWithoutApiKey,
        ...(type === "normal"
          ? {
              normal_message_title: title,
              normal_message_body: body,
            }
          : {
              notification_message_title: title,
              notification_message_body: body,
            }),
      }

      const response = await fetch('/api/whatsapp-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          settings: updatedSettings,
          updatedBy: username,
          fullName: fullName,
        }),
      })

      if (response.ok) {
        toast.success("تم حفظ هيكل الرسالة بنجاح")
        router.push("/settings/whatsapp")
      } else {
        const errorData = await response.json()
        toast.error(`فشل حفظ هيكل الرسالة: ${errorData.error || 'خطأ غير معروف'}`)
      }
    } catch (error) {
      toast.error(`فشل حفظ هيكل الرسالة: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">جاري التحميل...</div>
      </div>
    )
  }

  return (
    <div className="h-full p-6">
      {}
      <div className="mb-6 flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.push("/settings/whatsapp")}
        >
          <ArrowRight className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">
            {type === "normal" ? "تعديل هيكل الرسالة العادية" : "تعديل هيكل رسالة الإشعار"}
          </h1>
          <p className="text-muted-foreground mt-1">
            استخدم المتغيرات لإضافة بيانات ديناميكية في الرسالة
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {}
        <Card className="p-6">
          <div className="space-y-2">
            <Label htmlFor="messageTitle" className="text-base font-semibold">
              عنوان الرسالة
            </Label>
            <Input
              id="messageTitle"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: رسالة من AL-LamiSoft"
              className="text-base"
            />
          </div>
        </Card>

        {}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {}
          <Card className="lg:col-span-2 p-6">
            <div className="space-y-2">
              <Label htmlFor="messageBody" className="text-base font-semibold">
                نص الرسالة
              </Label>
              <Textarea
                id="messageBody"
                ref={textareaRef}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="اكتب نص الرسالة هنا... يمكنك استخدام الأزرار على اليسار لإضافة المتغيرات"
                className="min-h-[400px] text-base"
                dir="rtl"
              />
              <p className="text-xs text-muted-foreground">
                استخدم المتغيرات من الأزرار على اليسار لإضافة بيانات ديناميكية في الرسالة
              </p>
            </div>
          </Card>

          {}
          <Card className="p-6">
            <h3 className="text-base font-semibold mb-3">المتغيرات المتاحة</h3>
            <p className="text-xs text-muted-foreground mb-4">
              اضغط على أي زر لإضافة المتغير في موضع المؤشر
            </p>
            <div className="space-y-2">
              {variables.map((variable) => (
                <Button
                  key={variable.code}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-sm gap-2"
                  onClick={() => insertVariable(variable.code)}
                >
                  <variable.icon className="h-4 w-4" />
                  {variable.label}
                </Button>
              ))}
            </div>

            <div className="mt-6 p-3 bg-muted rounded text-xs">
              <p className="font-semibold mb-2">مثال:</p>
              <p className="text-muted-foreground whitespace-pre-wrap">
                عزيزي الزبون {"{CustomerName}"}, نشكرك على استخدام خدماتنا...
              </p>
            </div>
          </Card>
        </div>

        {}
        <Card className="p-6 bg-muted/50">
          <h3 className="text-base font-semibold mb-4">معاينة الرسالة:</h3>
          <div className="space-y-3">
            <div>
              <span className="text-sm text-muted-foreground">العنوان:</span>
              <p className="font-semibold text-lg mt-1">{title || "---"}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">النص:</span>
              <p className="whitespace-pre-wrap mt-1">{body || "---"}</p>
            </div>
          </div>
        </Card>

        {}
        <div className="flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={() => router.push("/settings/whatsapp")}
          >
            إلغاء
          </Button>
          <Button
            onClick={handleSave}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            حفظ التغييرات
          </Button>
        </div>
      </div>
    </div>
  )
}
