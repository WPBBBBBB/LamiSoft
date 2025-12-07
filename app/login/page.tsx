"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { loginWithPassword } from "@/lib/auth-operations"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "sonner"
import { ArrowRight, Eye, EyeOff, Lock, User, RefreshCw } from "lucide-react"
import Link from "next/link"

// دالة لتوليد CAPTCHA بسيط
function generateCaptcha(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let captcha = ''
  for (let i = 0; i < 6; i++) {
    captcha += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return captcha
}

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showOAuthOptions, setShowOAuthOptions] = useState(false)
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [showCaptcha, setShowCaptcha] = useState(false)
  const [captchaCode, setCaptchaCode] = useState("")
  const [captchaInput, setCaptchaInput] = useState("")
  const [userIP, setUserIP] = useState<string>()
  
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    rememberMe: false
  })

  // تحميل البيانات المحفوظة
  useEffect(() => {
    const savedUsername = localStorage.getItem('savedUsername')
    const savedPassword = localStorage.getItem('savedPassword')
    if (savedUsername && savedPassword) {
      setFormData({
        username: savedUsername,
        password: savedPassword,
        rememberMe: true
      })
    }

    // الحصول على IP Address
    fetch('https://api.ipify.org?format=json')
      .then(res => res.json())
      .then(data => setUserIP(data.ip))
      .catch(() => setUserIP('unknown'))

    // التحقق من المحاولات الفاشلة المخزنة
    const attempts = parseInt(localStorage.getItem('loginAttempts') || '0')
    setFailedAttempts(attempts)
    if (attempts >= 3) {
      setShowCaptcha(true)
      setCaptchaCode(generateCaptcha())
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.username.trim()) {
      toast.error("يرجى إدخال اسم المستخدم")
      return
    }

    if (!formData.password.trim()) {
      toast.error("يرجى إدخال كلمة المرور")
      return
    }

    // التحقق من CAPTCHA إذا كان معروضاً
    if (showCaptcha) {
      if (!captchaInput.trim()) {
        toast.error("يرجى إدخال رمز التحقق")
        return
      }
      if (captchaInput.toLowerCase() !== captchaCode.toLowerCase()) {
        toast.error("رمز التحقق غير صحيح")
        setCaptchaCode(generateCaptcha())
        setCaptchaInput("")
        return
      }
    }

    setIsLoading(true)

    try {
      const result = await loginWithPassword({
        username: formData.username,
        password: formData.password
      }, userIP)

      if (result.success && result.user) {
        // إعادة تعيين المحاولات الفاشلة
        localStorage.setItem('loginAttempts', '0')
        setFailedAttempts(0)
        setShowCaptcha(false)

        // حفظ بيانات تسجيل الدخول إذا اختار المستخدم ذلك
        if (formData.rememberMe) {
          localStorage.setItem('savedUsername', formData.username)
          localStorage.setItem('savedPassword', formData.password)
        } else {
          localStorage.removeItem('savedUsername')
          localStorage.removeItem('savedPassword')
        }

        // تسجيل الدخول في السياق
        login(result.user, formData.rememberMe)
        
        toast.success(`مرحباً ${result.user.full_name}!`)
        router.push('/home')
      } else {
        // زيادة عدد المحاولات الفاشلة
        const newAttempts = failedAttempts + 1
        localStorage.setItem('loginAttempts', newAttempts.toString())
        setFailedAttempts(newAttempts)

        // إظهار CAPTCHA بعد 3 محاولات
        if (newAttempts >= 3 && !showCaptcha) {
          setShowCaptcha(true)
          setCaptchaCode(generateCaptcha())
          toast.warning("تم تفعيل رمز التحقق بسبب المحاولات المتعددة")
        }

        toast.error(result.error || 'فشل تسجيل الدخول')
      }
    } catch (error) {
      console.error(error)
      toast.error('حدث خطأ غير متوقع')
    } finally {
      setIsLoading(false)
    }
  }

  const refreshCaptcha = () => {
    setCaptchaCode(generateCaptcha())
    setCaptchaInput("")
  }

  const handleOAuthLogin = (provider: 'google' | 'microsoft' | 'github') => {
    // فتح نافذة OAuth
    const width = 500
    const height = 600
    const left = window.screenX + (window.outerWidth - width) / 2
    const top = window.screenY + (window.outerHeight - height) / 2

    let authUrl = ''
    
    switch (provider) {
      case 'google':
        authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=YOUR_GOOGLE_CLIENT_ID&redirect_uri=${encodeURIComponent(window.location.origin + '/api/auth/login/google')}&response_type=code&scope=openid%20email%20profile`
        break
      case 'microsoft':
        authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=YOUR_MICROSOFT_CLIENT_ID&redirect_uri=${encodeURIComponent(window.location.origin + '/api/auth/login/microsoft')}&response_type=code&scope=openid%20email%20profile`
        break
      case 'github':
        authUrl = `https://github.com/login/oauth/authorize?client_id=YOUR_GITHUB_CLIENT_ID&redirect_uri=${encodeURIComponent(window.location.origin + '/api/auth/login/github')}&scope=read:user%20user:email`
        break
    }

    const authWindow = window.open(
      authUrl,
      `${provider}_login`,
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    )

    // الاستماع لرسالة من نافذة OAuth
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return

      if (event.data.type === 'oauth_login_success' && event.data.provider === provider) {
        if (event.data.user) {
          login(event.data.user, true)
          toast.success(`مرحباً ${event.data.user.full_name}!`)
          router.push('/home')
        }
        if (authWindow) authWindow.close()
      } else if (event.data.type === 'oauth_login_error') {
        toast.error(event.data.error || 'فشل تسجيل الدخول')
        if (authWindow) authWindow.close()
      }
    }

    window.addEventListener('message', handleMessage)

    const checkWindow = setInterval(() => {
      if (authWindow?.closed) {
        clearInterval(checkWindow)
        window.removeEventListener('message', handleMessage)
      }
    }, 500)
  }

  if (showOAuthOptions) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" 
           style={{ background: 'linear-gradient(135deg, var(--theme-primary), var(--theme-accent))' }}>
        <Card className="w-full max-w-md shadow-2xl">
          <CardHeader className="space-y-1 text-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowOAuthOptions(false)}
              className="absolute top-4 right-4"
            >
              <ArrowRight className="h-5 w-5" />
            </Button>
            <CardTitle className="text-2xl font-bold">تسجيل الدخول</CardTitle>
            <CardDescription>اختر طريقة تسجيل الدخول</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Google */}
            <Button
              variant="outline"
              className="w-full h-12 gap-3 text-base hover:bg-[#4285F4] hover:text-white transition-colors"
              onClick={() => handleOAuthLogin('google')}
            >
              <svg className="h-6 w-6" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              تسجيل الدخول بحساب Google
            </Button>

            {/* Microsoft */}
            <Button
              variant="outline"
              className="w-full h-12 gap-3 text-base hover:bg-[#00A4EF] hover:text-white transition-colors"
              onClick={() => handleOAuthLogin('microsoft')}
            >
              <svg className="h-6 w-6" viewBox="0 0 23 23">
                <path fill="#f25022" d="M0 0h11v11H0z"/>
                <path fill="#00a4ef" d="M12 0h11v11H12z"/>
                <path fill="#7fba00" d="M0 12h11v11H0z"/>
                <path fill="#ffb900" d="M12 12h11v11H12z"/>
              </svg>
              تسجيل الدخول بحساب Microsoft
            </Button>

            {/* GitHub */}
            <Button
              variant="outline"
              className="w-full h-12 gap-3 text-base hover:bg-[#24292e] hover:text-white transition-colors"
              onClick={() => handleOAuthLogin('github')}
            >
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              تسجيل الدخول بحساب GitHub
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">أو</span>
              </div>
            </div>

            <Button
              variant="secondary"
              className="w-full"
              onClick={() => setShowOAuthOptions(false)}
            >
              تسجيل الدخول باسم المستخدم وكلمة المرور
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" 
         style={{ background: 'linear-gradient(135deg, var(--theme-primary), var(--theme-accent))' }}>
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-3xl font-bold">مرحباً بك</CardTitle>
          <CardDescription className="text-base">
            قم بتسجيل الدخول للوصول إلى لوحة التحكم
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* اسم المستخدم */}
            <div className="space-y-2">
              <Label htmlFor="username">اسم المستخدم</Label>
              <div className="relative">
                <User className="absolute right-3 top-[50%] -translate-y-[50%] h-4 w-4 text-muted-foreground" />
                <Input
                  id="username"
                  type="text"
                  placeholder="أدخل اسم المستخدم"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="pr-10"
                  dir="ltr"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* كلمة المرور */}
            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <div className="relative">
                <Lock className="absolute right-3 top-[50%] -translate-y-[50%] h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="أدخل كلمة المرور"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="pr-10 pl-10"
                  dir="ltr"
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute left-1 top-[50%] -translate-y-[50%] h-7 w-7"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* CAPTCHA */}
            {showCaptcha && (
              <div className="space-y-2">
                <Label>رمز التحقق</Label>
                <div className="flex gap-2">
                  <div className="flex-1 bg-muted rounded-lg p-4 flex items-center justify-center relative select-none"
                       style={{
                         fontFamily: 'monospace',
                         fontSize: '24px',
                         letterSpacing: '8px',
                         fontWeight: 'bold',
                         background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                         color: 'white',
                         textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
                       }}>
                    {captchaCode}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={refreshCaptcha}
                    disabled={isLoading}
                    title="تحديث رمز التحقق"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
                <Input
                  type="text"
                  placeholder="أدخل رمز التحقق"
                  value={captchaInput}
                  onChange={(e) => setCaptchaInput(e.target.value)}
                  disabled={isLoading}
                  maxLength={6}
                  dir="ltr"
                />
                <p className="text-xs text-muted-foreground">
                  يرجى إدخال الأحرف الظاهرة في الصورة أعلاه
                </p>
              </div>
            )}

            {/* حفظ معلومات التسجيل */}
            <div className="flex items-center space-x-2 space-x-reverse">
              <Checkbox
                id="rememberMe"
                checked={formData.rememberMe}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, rememberMe: checked as boolean })
                }
                disabled={isLoading}
              />
              <Label 
                htmlFor="rememberMe" 
                className="text-sm font-normal cursor-pointer"
              >
                حفظ معلومات التسجيل
              </Label>
            </div>

            {/* زر تسجيل الدخول */}
            <Button 
              type="submit" 
              className="w-full h-11 text-base"
              disabled={isLoading}
            >
              {isLoading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
            </Button>

            {/* نسيت كلمة المرور */}
            <div className="text-center text-sm">
              <Link href="/forgot-password">
                <Button
                  type="button"
                  variant="link"
                  className="text-muted-foreground hover:text-primary"
                  disabled={isLoading}
                >
                  هل نسيت كلمة المرور؟
                </Button>
              </Link>
            </div>

            {/* جرّب طرق أخرى */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">أو</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setShowOAuthOptions(true)}
              disabled={isLoading}
            >
              جرّب طرق أخرى لتسجيل الدخول
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
