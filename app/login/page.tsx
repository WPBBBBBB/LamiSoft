"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "sonner"
import { ArrowRight, Eye, EyeOff, Lock, User, RefreshCw, AlertCircle, Clock } from "lucide-react"
import Link from "next/link"
import { t } from "@/lib/translations"
import { useSettings } from "@/components/providers/settings-provider"
import { 
  generateDeviceFingerprint, 
  checkOAuthBlock, 
  formatRemainingTime 
} from "@/lib/oauth-security"
import { deleteCookie, getCookie, setCookie } from "@/lib/cookie-utils"
import { LoginFloatingBackground } from "@/components/login-floating-background"

const SAVED_USERNAME_COOKIE = "als_saved_username"

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
  const { currentLanguage } = useSettings()
  const [isLoading, setIsLoading] = useState(false)
  const inFlightRef = useRef(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showOAuthOptions, setShowOAuthOptions] = useState(false)
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [showCaptcha, setShowCaptcha] = useState(false)
  const [captchaCode, setCaptchaCode] = useState("")
  const [captchaInput, setCaptchaInput] = useState("")
  const [userIP, setUserIP] = useState<string>()
  const [deviceFingerprint, setDeviceFingerprint] = useState<string>('')
  const [oauthBlock, setOauthBlock] = useState<{
    isBlocked: boolean
    remainingTime: number
    blockLevel: number
    totalAttempts: number
  } | null>(null)
  const [blockTimer, setBlockTimer] = useState<number>(0)
  
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    rememberMe: false
  })

  useEffect(() => {
    const savedUsername = getCookie(SAVED_USERNAME_COOKIE)
    if (savedUsername) {
      setFormData({
        username: savedUsername,
        password: "",
        rememberMe: true
      })
    }

    fetch('/api/ip', { cache: 'no-store' })
      .then(res => res.json())
      .then((data: { ip?: string | null }) => setUserIP(data.ip ?? 'unknown'))
      .catch(() => setUserIP('unknown'))

    const attempts = parseInt(localStorage.getItem('loginAttempts') || '0')
    setFailedAttempts(attempts)
    if (attempts >= 3) {
      setShowCaptcha(true)
      setCaptchaCode(generateCaptcha())
    }

    // Generate device fingerprint
    const fingerprint = generateDeviceFingerprint()
    setDeviceFingerprint(fingerprint)

    // Check OAuth block status
    checkOAuthBlock(fingerprint).then(block => {
      if (block.isBlocked) {
        setOauthBlock(block)
        setBlockTimer(block.remainingTime)
      }
    })
  }, [])

  // Update block timer every second
  useEffect(() => {
    if (oauthBlock?.isBlocked && blockTimer > 0) {
      const interval = setInterval(() => {
        setBlockTimer(prev => {
          if (prev <= 1) {
            setOauthBlock(null)
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(interval)
    }
  }, [oauthBlock, blockTimer])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (inFlightRef.current || isLoading) return

    if (!formData.username.trim()) {
      toast.error(t('pleaseEnterUsername', currentLanguage.code))
      return
    }

    if (!formData.password.trim()) {
      toast.error(t('pleaseEnterPassword', currentLanguage.code))
      return
    }

    if (showCaptcha) {
      if (!captchaInput.trim()) {
        toast.error(t('pleaseEnterCaptcha', currentLanguage.code))
        return
      }
      if (captchaInput.toLowerCase() !== captchaCode.toLowerCase()) {
        toast.error(t('captchaIncorrect', currentLanguage.code))
        setCaptchaCode(generateCaptcha())
        setCaptchaInput("")
        return
      }
    }

    inFlightRef.current = true
    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
          rememberMe: formData.rememberMe,
          ipAddress: userIP,
        }),
      })

      const result = (await response.json()) as {
        success: boolean
        user?: unknown
        error?: string
      }

      if (response.ok && result.success && result.user && typeof result.user === 'object') {
        const user = result.user as Record<string, unknown>

        localStorage.setItem('loginAttempts', '0')
        setFailedAttempts(0)
        setShowCaptcha(false)

        if (formData.rememberMe) {
          setCookie(SAVED_USERNAME_COOKIE, formData.username, { maxAgeDays: 30 })
        } else {
          deleteCookie(SAVED_USERNAME_COOKIE)
        }

        login(user as never)

        toast.success(`${t('welcome', currentLanguage.code)} ${String(user.full_name || '')}!`)
        router.replace('/home')
      } else {
        const newAttempts = failedAttempts + 1
        localStorage.setItem('loginAttempts', newAttempts.toString())
        setFailedAttempts(newAttempts)

        if (newAttempts >= 3 && !showCaptcha) {
          setShowCaptcha(true)
          setCaptchaCode(generateCaptcha())
          toast.warning(t('captchaActivated', currentLanguage.code))
        }

        toast.error(result.error || t('loginFailed', currentLanguage.code))
      }
    } catch (error) {
      toast.error(t('unexpectedError', currentLanguage.code))
    } finally {
      setIsLoading(false)
      inFlightRef.current = false
    }
  }

  const refreshCaptcha = () => {
    setCaptchaCode(generateCaptcha())
    setCaptchaInput("")
  }

  const handleOAuthLogin = async (provider: 'google' | 'microsoft' | 'github') => {
    if (inFlightRef.current || isLoading) return

    inFlightRef.current = true
    setIsLoading(true)

    // Check if blocked
    const block = await checkOAuthBlock(deviceFingerprint)
    if (block.isBlocked) {
      setOauthBlock(block)
      setBlockTimer(block.remainingTime)
      toast.error(`تم حظر تسجيل الدخول. الوقت المتبقي: ${formatRemainingTime(block.remainingTime)}`)
      setIsLoading(false)
      inFlightRef.current = false
      return
    }

    const width = 600
    const height = 700
    const left = window.screenX + (window.outerWidth - width) / 2
    const top = window.screenY + (window.outerHeight - height) / 2

    const authWindow = window.open(
      `/api/oauth/${provider}/authorize?fingerprint=${deviceFingerprint}`,
      `${provider}_login`,
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    )

    if (!authWindow) {
      toast.error('تعذر فتح نافذة تسجيل الدخول. تأكد من السماح بالنوافذ المنبثقة.')
      setIsLoading(false)
      inFlightRef.current = false
      return
    }

    let finished = false
    let checkWindow: ReturnType<typeof setInterval> | null = null

    const cleanup = () => {
      window.removeEventListener('message', handleMessage)
      if (checkWindow) clearInterval(checkWindow)
      setIsLoading(false)
      inFlightRef.current = false
    }

    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return

      if (event.data.type === 'oauth-success' && event.data.provider === provider) {
        if (finished) return
        finished = true

        if (event.data.user && typeof event.data.user === 'object') {
          const user = event.data.user as Record<string, unknown>
          
          // Close the popup first
          authWindow.close()
          
          // Wait a moment for cookies to be fully set
          await new Promise(resolve => setTimeout(resolve, 300))
          
          // Set user in context
          login(user as never)
          
          // Show success message
          toast.success(`${t('welcome', currentLanguage.code)} ${String(user.full_name || '')}!`)
          
          // Wait a bit more to ensure everything is synced
          await new Promise(resolve => setTimeout(resolve, 200))
          
          // Navigate to home
          window.location.href = '/home'
        }
        cleanup()
      } else if (event.data.type === 'oauth-error' || event.data.type === 'oauth_login_error') {
        if (finished) return
        finished = true

        // Check if it's a block error
        if (event.data.blockInfo) {
          setOauthBlock(event.data.blockInfo)
          setBlockTimer(event.data.blockInfo.remainingTime)
        }
        toast.error(event.data.error || t('loginFailed', currentLanguage.code))
        authWindow.close()
        cleanup()
      }
    }

    window.addEventListener('message', handleMessage)

    checkWindow = setInterval(() => {
      if (authWindow?.closed) {
        cleanup()
      }
    }, 500)
  }

  if (showOAuthOptions) {
    return (
      <div
        className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, var(--theme-primary), var(--theme-accent))' }}
      >
        <LoginFloatingBackground />
        {isLoading && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
            aria-busy="true"
            role="status"
          >
            <div className="flex items-center gap-3 rounded-lg border bg-background px-4 py-3 shadow">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span className="text-sm">{t('loggingIn', currentLanguage.code)}</span>
            </div>
          </div>
        )}
        <Card className="relative z-10 w-full max-w-md shadow-2xl">
          <CardHeader className="space-y-1 text-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowOAuthOptions(false)}
              className="absolute top-4 right-4"
              disabled={isLoading}
            >
              <ArrowRight className="h-5 w-5" />
            </Button>
            <CardTitle className="text-2xl font-bold">{t('login', currentLanguage.code)}</CardTitle>
            <CardDescription>{t('chooseLoginMethod', currentLanguage.code)}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* OAuth Block Warning */}
            {oauthBlock && oauthBlock.isBlocked && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <div className="flex-1">
                  <div className="font-semibold">تم حظر تسجيل الدخول مؤقتاً</div>
                  <div className="text-sm mt-1">
                    المستوى: {oauthBlock.blockLevel} | المحاولات الفاشلة: {oauthBlock.totalAttempts}
                  </div>
                  <div className="flex items-center gap-2 text-sm mt-2">
                    <Clock className="h-4 w-4" />
                    <span>الوقت المتبقي: {formatRemainingTime(blockTimer)}</span>
                  </div>
                </div>
              </Alert>
            )}

            {}
            <Button
              variant="outline"
              className="w-full h-12 gap-3 text-base hover:bg-[#4285F4] hover:text-white transition-colors"
              onClick={() => handleOAuthLogin('google')}
              disabled={oauthBlock?.isBlocked || isLoading}
            >
              <svg className="h-6 w-6" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {t('loginWithGoogle', currentLanguage.code)}
            </Button>

            {}
            <Button
              variant="outline"
              className="w-full h-12 gap-3 text-base hover:bg-[#00A4EF] hover:text-white transition-colors"
              onClick={() => handleOAuthLogin('microsoft')}
              disabled={oauthBlock?.isBlocked || isLoading}
            >
              <svg className="h-6 w-6" viewBox="0 0 23 23">
                <path fill="#f25022" d="M0 0h11v11H0z"/>
                <path fill="#00a4ef" d="M12 0h11v11H12z"/>
                <path fill="#7fba00" d="M0 12h11v11H0z"/>
                <path fill="#ffb900" d="M12 12h11v11H12z"/>
              </svg>
              {t('loginWithMicrosoft', currentLanguage.code)}
            </Button>

            {}
            <Button
              variant="outline"
              className="w-full h-12 gap-3 text-base hover:bg-[#24292e] hover:text-white transition-colors"
              onClick={() => handleOAuthLogin('github')}
              disabled={oauthBlock?.isBlocked || isLoading}
            >
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              {t('loginWithGitHub', currentLanguage.code)}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">{t('or', currentLanguage.code)}</span>
              </div>
            </div>

            <Button
              variant="secondary"
              className="w-full"
              onClick={() => setShowOAuthOptions(false)}
              disabled={isLoading}
            >
              {t('loginWithUsernamePassword', currentLanguage.code)}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div
      className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden"
      style={{ background: 'linear-gradient(135deg, var(--theme-primary), var(--theme-accent))' }}
    >
      <LoginFloatingBackground />
      {isLoading && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          aria-busy="true"
          role="status"
        >
          <div className="flex items-center gap-3 rounded-lg border bg-background px-4 py-3 shadow">
            <RefreshCw className="h-5 w-5 animate-spin" />
            <span className="text-sm">{t('loggingIn', currentLanguage.code)}</span>
          </div>
        </div>
      )}
      <Card className="relative z-10 w-full max-w-md shadow-2xl">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-3xl font-bold">{t('welcomeBack', currentLanguage.code)}</CardTitle>
          <CardDescription className="text-base">
            {t('loginToAccessDashboard', currentLanguage.code)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {}
            <div className="space-y-2">
              <Label htmlFor="username">{t('username', currentLanguage.code)}</Label>
              <div className="relative">
                <User className="absolute right-3 top-[50%] -translate-y-[50%] h-4 w-4 text-muted-foreground" />
                <Input
                  id="username"
                  type="text"
                  placeholder={t('enterUsername', currentLanguage.code)}
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="pr-10"
                  dir="ltr"
                  disabled={isLoading}
                />
              </div>
            </div>

            {}
            <div className="space-y-2">
              <Label htmlFor="password">{t('password', currentLanguage.code)}</Label>
              <div className="relative">
                <Lock className="absolute right-3 top-[50%] -translate-y-[50%] h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t('enterPassword', currentLanguage.code)}
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

            {}
            {showCaptcha && (
              <div className="space-y-2">
                <Label>{t('captchaCode', currentLanguage.code)}</Label>
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
                    title={t('refreshCaptcha', currentLanguage.code)}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
                <Input
                  type="text"
                  placeholder={t('enterCaptcha', currentLanguage.code)}
                  value={captchaInput}
                  onChange={(e) => setCaptchaInput(e.target.value)}
                  disabled={isLoading}
                  maxLength={6}
                  dir="ltr"
                />
                <p className="text-xs text-muted-foreground">
                  {t('enterCharactersAbove', currentLanguage.code)}
                </p>
              </div>
            )}

            {}
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
                {t('rememberMe', currentLanguage.code)}
              </Label>
            </div>

            {}
            <Button 
              type="submit" 
              className="w-full h-11 text-base"
              disabled={isLoading}
            >
              {isLoading ? t('loggingIn', currentLanguage.code) : t('login', currentLanguage.code)}
            </Button>

            {}
            <div className="text-center text-sm">
              <Link href="/forgot-password">
                <Button
                  type="button"
                  variant="link"
                  className="text-muted-foreground hover:text-primary"
                  disabled={isLoading}
                >
                  {t('forgotPassword', currentLanguage.code)}
                </Button>
              </Link>
            </div>

            {}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">{t('or', currentLanguage.code)}</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setShowOAuthOptions(true)}
              disabled={isLoading}
            >
              {t('tryOtherLoginMethods', currentLanguage.code)}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
