"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Card } from "@/components/ui/card"
import { Save, User, Calendar, DollarSign, Clock, Building2, CreditCard } from "lucide-react"
import { toast } from "sonner"

interface MessageTemplate {
  title: string
  body: string
}

interface MessageEditorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: "normal" | "notification"
  currentTemplate: MessageTemplate
  onSave: (template: MessageTemplate) => void
}

export function MessageEditorDialog({
  open,
  onOpenChange,
  type,
  currentTemplate,
  onSave
}: MessageEditorDialogProps) {
  const [title, setTitle] = useState(currentTemplate.title)
  const [body, setBody] = useState(currentTemplate.body)
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
      await onSave({ title, body })
      toast.success("تم حفظ هيكل الرسالة بنجاح")
      onOpenChange(false)
    } catch (error) {
      toast.error("فشل حفظ هيكل الرسالة")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {type === "normal" ? "تعديل هيكل الرسالة العادية" : "تعديل هيكل رسالة الإشعار"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {}
          <div className="space-y-2">
            <Label htmlFor="messageTitle">عنوان الرسالة</Label>
            <Input
              id="messageTitle"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: رسالة من AL-LamiSoft"
              className="text-base"
            />
          </div>

          {}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {}
            <div className="lg:col-span-2 space-y-2">
              <Label htmlFor="messageBody">نص الرسالة</Label>
              <Textarea
                id="messageBody"
                ref={textareaRef}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="اكتب نص الرسالة هنا... يمكنك استخدام الأزرار على اليسار لإضافة المتغيرات"
                className="min-h-[300px] text-base font-mono"
                dir="rtl"
              />
              <p className="text-xs text-muted-foreground">
                استخدم المتغيرات من الأزرار على اليسار لإضافة بيانات ديناميكية في الرسالة
              </p>
            </div>

            {}
            <Card className="p-4">
              <h3 className="text-sm font-semibold mb-3">المتغيرات المتاحة</h3>
              <p className="text-xs text-muted-foreground mb-4">
                اضغط على أي زر لإضافة المتغير في موضع المؤشر
              </p>
              <div className="space-y-2">
                {variables.map((variable) => (
                  <Button
                    key={variable.code}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-xs gap-2"
                    onClick={() => insertVariable(variable.code)}
                  >
                    <variable.icon className="h-3 w-3" />
                    {variable.label}
                  </Button>
                ))}
              </div>

              <div className="mt-4 p-2 bg-muted rounded text-xs">
                <p className="font-semibold mb-1">مثال:</p>
                <p className="text-muted-foreground">
                  عزيزي الزبون {"{CustomerName}"}, نشكرك على استخدام خدماتنا...
                </p>
              </div>
            </Card>
          </div>

          {}
          <Card className="p-4 bg-muted/50">
            <h3 className="text-sm font-semibold mb-2">معاينة الرسالة:</h3>
            <div className="space-y-2">
              <div>
                <span className="text-xs text-muted-foreground">العنوان:</span>
                <p className="font-semibold">{title || "---"}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">النص:</span>
                <p className="whitespace-pre-wrap text-sm">{body || "---"}</p>
              </div>
            </div>
          </Card>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
