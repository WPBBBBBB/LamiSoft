"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Bell, Lock, User } from "lucide-react"
import Logo from "@/components/welcome/Logo"
import { toast } from "sonner"

export default function ReminderLoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      const response = await fetch("/api/reminder-auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || "اسم المستخدم أو كلمة المرور غير صحيحة")
        setIsLoading(false)
        return
      }

      // حفظ session token
      if (rememberMe) {
        localStorage.setItem("reminder_session_token", data.sessionToken)
      } else {
        sessionStorage.setItem("reminder_session_token", data.sessionToken)
      }

      toast.success(`مرحباً ${data.user.full_name}!`)
      router.push("/reminder/dashboard")
    } catch (error) {
      console.error("Login error:", error)
      toast.error("حدث خطأ أثناء تسجيل الدخول")
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 right-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md mx-4"
      >
        <Card className="backdrop-blur-sm bg-card/95 shadow-2xl border-2">
          <CardHeader className="space-y-4 text-center pb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="flex justify-center"
            >
              <Logo />
            </motion.div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2">
                <Bell className="h-5 w-5" style={{ color: "var(--theme-primary)" }} />
                <CardTitle className="text-2xl">نظام التذكير التلقائي</CardTitle>
              </div>
              <CardDescription>
                سجل دخولك للوصول إلى نظام إرسال التذكيرات الآلية للعملاء
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Username Field */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-2"
              >
                <Label htmlFor="username" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  اسم المستخدم
                </Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="أدخل اسم المستخدم"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="text-right"
                  disabled={isLoading}
                />
              </motion.div>

              {/* Password Field */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-2"
              >
                <Label htmlFor="password" className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  كلمة المرور
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="أدخل كلمة المرور"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="text-right"
                  disabled={isLoading}
                />
              </motion.div>

              {/* Remember Me */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="flex items-center space-x-2 space-x-reverse"
              >
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  disabled={isLoading}
                />
                <Label
                  htmlFor="remember"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  حفظ تسجيل الدخول
                </Label>
              </motion.div>

              {/* Submit Button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="space-y-3 pt-2"
              >
                <Button
                  type="submit"
                  className="w-full gap-2 group"
                  size="lg"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <div className="h-4 w-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
                      جاري تسجيل الدخول...
                    </>
                  ) : (
                    <>
                      تسجيل الدخول
                      <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push("/welcome")}
                  disabled={isLoading}
                >
                  العودة للصفحة الرئيسية
                </Button>
              </motion.div>
            </form>
          </CardContent>
        </Card>

        {/* Info Card */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-4"
        >
          <Card className="bg-muted/50 border-primary/20">
            <CardContent className="pt-4 text-center text-sm text-muted-foreground">
              <p>نظام مخصص لإرسال التذكيرات الآلية للعملاء عبر WhatsApp</p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  )
}
