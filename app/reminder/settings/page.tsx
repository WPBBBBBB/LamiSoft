"use client"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { MessageSquare, Settings as SettingsIcon, Save, Edit, Eye } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export default function ReminderSettingsPage() {
  // Message Settings
  const [messageTitle, setMessageTitle] = useState("")
  const [messageBody, setMessageBody] = useState("")
  const [isEditingMessage, setIsEditingMessage] = useState(false)

  // WhatsApp Settings
  const [apiKey, setApiKey] = useState("")
  const [delayBetweenMessages, setDelayBetweenMessages] = useState(5002)
  const [jitterFactor, setJitterFactor] = useState(100)
  const [messagesBeforeBreak, setMessagesBeforeBreak] = useState(5)
  const [breakDuration, setBreakDuration] = useState(6000)
  const [isSaving, setIsSaving] = useState(false)

  // Load settings from Supabase
  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      // تحميل إعدادات الواتساب
      const { data: whatsappData, error: whatsappError } = await supabase
        .from("reminder_whatsapp_settings")
        .select("*")
        .single()

      if (whatsappError) {
        console.error("Error loading WhatsApp settings:", whatsappError)
      } else if (whatsappData) {
        setApiKey(whatsappData.api_key || "")
        setDelayBetweenMessages(whatsappData.delay_between_messages || 5002)
        setJitterFactor(whatsappData.jitter_factor || 100)
        setMessagesBeforeBreak(whatsappData.messages_before_break || 5)
        setBreakDuration(whatsappData.break_duration || 6000)
      }

      // تحميل قالب الرسالة
      const { data: messageData, error: messageError } = await supabase
        .from("reminder_message_template")
        .select("*")
        .single()

      if (messageError) {
        console.error("Error loading message template:", messageError)
      } else if (messageData) {
        setMessageTitle(messageData.message_title || "")
        setMessageBody(messageData.message_body || "")
      }
    } catch (error) {
      console.error("Error in loadSettings:", error)
      toast.error("حدث خطأ أثناء تحميل الإعدادات")
    }
  }

  const handleSaveMessageSettings = async () => {
    setIsSaving(true)
    try {
      console.log("Saving message template...")
      
      // التحقق من وجود سجل
      const { data: existingData } = await supabase
        .from("reminder_message_template")
        .select("id")
        .single()

      let result
      if (existingData) {
        // تحديث
        result = await supabase
          .from("reminder_message_template")
          .update({
            message_title: messageTitle,
            message_body: messageBody,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingData.id)
      } else {
        // إدراج
        result = await supabase
          .from("reminder_message_template")
          .insert({
            message_title: messageTitle,
            message_body: messageBody,
          })
      }

      if (result.error) {
        console.error("Error saving message template:", result.error)
        throw result.error
      }

      console.log("Message template saved successfully")
      toast.success("تم حفظ إعدادات الرسالة بنجاح")
      setIsEditingMessage(false)
    } catch (error) {
      console.error("Exception in handleSaveMessageSettings:", error)
      toast.error("حدث خطأ أثناء الحفظ")
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveWhatsAppSettings = async () => {
    if (!apiKey.trim()) {
      toast.error("يجب إدخال API Key")
      return
    }

    setIsSaving(true)
    try {
      console.log("Saving WhatsApp settings to reminder_whatsapp_settings table...")
      console.log("API Key:", apiKey ? `${apiKey.substring(0, 15)}...` : "EMPTY")
      
      // التحقق من وجود سجل
      const { data: existingData, error: selectError } = await supabase
        .from("reminder_whatsapp_settings")
        .select("id")
        .single()

      console.log("Existing data:", existingData)
      console.log("Select error:", selectError)

      let result
      if (existingData) {
        // تحديث
        console.log("Updating existing record...")
        result = await supabase
          .from("reminder_whatsapp_settings")
          .update({
            api_key: apiKey,
            delay_between_messages: delayBetweenMessages,
            jitter_factor: jitterFactor,
            messages_before_break: messagesBeforeBreak,
            break_duration: breakDuration,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingData.id)
      } else {
        // إدراج سجل جديد
        console.log("Inserting new record...")
        result = await supabase
          .from("reminder_whatsapp_settings")
          .insert({
            api_key: apiKey,
            delay_between_messages: delayBetweenMessages,
            jitter_factor: jitterFactor,
            messages_before_break: messagesBeforeBreak,
            break_duration: breakDuration,
          })
      }

      console.log("Save result:", result)

      if (result.error) {
        console.error("Error saving WhatsApp settings:", result.error)
        throw result.error
      }

      console.log("WhatsApp settings saved successfully")
      toast.success("تم حفظ إعدادات الواتساب بنجاح")
    } catch (error) {
      console.error("Exception in handleSaveWhatsAppSettings:", error)
      toast.error("حدث خطأ أثناء الحفظ")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <SettingsIcon className="h-8 w-8" style={{ color: "var(--theme-primary)" }} />
          الإعدادات
        </h1>
        <p className="text-muted-foreground mt-2">إدارة إعدادات الرسائل والواتساب</p>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Right Side - Message Settings */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                إعدادات رسالة الواتساب
              </CardTitle>
              <CardDescription>تحرير هيكلة الرسالة المرسلة للعملاء</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isEditingMessage ? (
                <>
                  {/* Display Mode */}
                  <div className="space-y-3">
                    <div className="p-4 bg-muted rounded-lg space-y-2">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <Eye className="h-4 w-4" />
                        معاينة الرسالة المحفوظة
                      </div>
                      <div className="border-t pt-2">
                        <p className="text-xs text-muted-foreground mb-1">عنوان الرسالة:</p>
                        <p className="font-medium">{messageTitle || "لم يتم تحديد عنوان"}</p>
                      </div>
                      <div className="border-t pt-2">
                        <p className="text-xs text-muted-foreground mb-1">نص الرسالة:</p>
                        <p className="whitespace-pre-wrap text-sm">{messageBody || "لم يتم تحديد نص"}</p>
                      </div>
                    </div>
                    <Button onClick={() => setIsEditingMessage(true)} className="w-full gap-2">
                      <Edit className="h-4 w-4" />
                      تعديل رسالة الواتساب
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  {/* Edit Mode */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="messageTitle">عنوان الرسالة</Label>
                      <Input
                        id="messageTitle"
                        value={messageTitle}
                        onChange={(e) => setMessageTitle(e.target.value)}
                        placeholder="AL-LamiSoft رمز التحقق من"
                        className="text-right"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="messageBody">وصف الرسالة</Label>
                      <Textarea
                        id="messageBody"
                        value={messageBody}
                        onChange={(e) => setMessageBody(e.target.value)}
                        placeholder="{رمز التحقق الخاص بك هو{CODE}:}"
                        rows={6}
                        className="text-right"
                      />
                      <p className="text-xs text-muted-foreground">
                        استخدم {'{CODE}'} للإشارة إلى مكان الرمز
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSaveMessageSettings} disabled={isSaving} className="flex-1 gap-2">
                        <Save className="h-4 w-4" />
                        {isSaving ? "جاري الحفظ..." : "حفظ"}
                      </Button>
                      <Button variant="outline" onClick={() => setIsEditingMessage(false)} disabled={isSaving}>
                        إلغاء
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Left Side - WhatsApp Settings */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>ضبط إعدادات الواتساب</CardTitle>
              <CardDescription>تكوين الإعدادات الفنية للإرسال</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="apiKey">الـ API الخاص بالخدمة</Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="••••••••••••••••••••••••••••••••••••••••••••••••••"
                  className="text-left font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="delay">مدة التأخير بين الرسائل - ملي ثانية</Label>
                <Input
                  id="delay"
                  type="number"
                  value={delayBetweenMessages}
                  onChange={(e) => setDelayBetweenMessages(Number(e.target.value))}
                  min={3000}
                  max={15000}
                  className="text-right"
                />
                <p className="text-xs text-muted-foreground">القيمة بين 3000 و 15000 ملي ثانية</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="jitter">عامل Jitter - لا حاجة للتغيير</Label>
                <Input
                  id="jitter"
                  type="number"
                  value={jitterFactor}
                  onChange={(e) => setJitterFactor(Number(e.target.value))}
                  min={100}
                  max={2000}
                  className="text-right"
                />
                <p className="text-xs text-muted-foreground">القيمة بين 100 و 2000 ملي ثانية</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="messagesCount">عدد الرسائل قبل الاستراحة</Label>
                <Input
                  id="messagesCount"
                  type="number"
                  value={messagesBeforeBreak}
                  onChange={(e) => setMessagesBeforeBreak(Number(e.target.value))}
                  min={5}
                  max={50}
                  className="text-right"
                />
                <p className="text-xs text-muted-foreground">القيمة بين 5 و 50 رسالة</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="breakDuration">مدة الاستراحة المطولة - ملي ثانية</Label>
                <Input
                  id="breakDuration"
                  type="number"
                  value={breakDuration}
                  onChange={(e) => setBreakDuration(Number(e.target.value))}
                  min={6000}
                  max={2000000}
                  className="text-right"
                />
                <p className="text-xs text-muted-foreground">القيمة بين 6000 و 2000000 ملي ثانية</p>
              </div>

              <Button onClick={handleSaveWhatsAppSettings} disabled={isSaving} className="w-full gap-2">
                <Save className="h-4 w-4" />
                {isSaving ? "جاري الحفظ..." : "حفظ"}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
