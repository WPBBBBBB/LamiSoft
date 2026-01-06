"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import PasswordStrengthBar from "@/components/ui/password-strength-bar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { ArrowRight, Phone, Lock, ShieldCheck, User } from "lucide-react"
import Link from "next/link"
import { createOTP, verifyOTP, getUserByPhone, resetPassword } from "@/lib/otp-operations"
import { t } from "@/lib/translations"
import { useSettings } from "@/components/providers/settings-provider"
import { LoginFloatingBackground } from "@/components/login-floating-background"

type Step = 'phone' | 'otp' | 'password'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const { currentLanguage } = useSettings()
  const [isLoading, setIsLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState<Step>('phone')
  const [phoneNumber, setPhoneNumber] = useState("")
  const [otpCode, setOtpCode] = useState(["", "", "", "", "", ""])
  const [userId, setUserId] = useState("")
  const [currentUsername, setCurrentUsername] = useState("")
  const [newUsername, setNewUsername] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const handleSendOTP = async () => {
    if (!phoneNumber.trim()) {
      toast.error(t('pleaseEnterPhone', currentLanguage.code))
      return
    }

    const phoneRegex = /^(07[3-9]\d{8}|(\+?964|00964)?7[3-9]\d{8})$/
    if (!phoneRegex.test(phoneNumber.replace(/\s+/g, ''))) {
      toast.error(t('invalidPhoneFormat', currentLanguage.code))
      return
    }

    setIsLoading(true)

    try {
      const user = await getUserByPhone(phoneNumber)
      
      if (!user) {
        toast.error(t('noAccountWithPhone', currentLanguage.code))
        setIsLoading(false)
        return
      }

      setUserId(user.id)
      setCurrentUsername(user.username)
      setNewUsername(user.username)

      const result = await createOTP(phoneNumber)

      if (result.success) {
        toast.success(t('otpSentSuccess', currentLanguage.code))
        setCurrentStep('otp')
      } else {
        toast.error(result.error || t('otpSendFailed', currentLanguage.code))
      }
    } catch (error) {
      toast.error(t('errorSendingOtp', currentLanguage.code))
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyOTP = async () => {
    const fullOTP = otpCode.join('')
    
    if (fullOTP.length !== 6) {
      toast.error(t('pleaseEnterFullOtp', currentLanguage.code))
      return
    }

    setIsLoading(true)

    try {
      const result = await verifyOTP(phoneNumber, fullOTP)

      if (result.success) {
        toast.success(t('otpVerifiedSuccess', currentLanguage.code))
        setCurrentStep('password')
      } else {
        toast.error(result.error || t('otpIncorrect', currentLanguage.code))
        setOtpCode(["", "", "", "", "", ""])
      }
    } catch (error) {
      toast.error(t('errorVerifyingOtp', currentLanguage.code))
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetPassword = async () => {
    if (!newUsername.trim()) {
      toast.error(t('pleaseEnterUsername', currentLanguage.code))
      return
    }

    if (!newPassword.trim()) {
      toast.error(t('pleaseEnterNewPassword', currentLanguage.code))
      return
    }

    if (newPassword.length < 6) {
      toast.error(t('passwordMinLength', currentLanguage.code))
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error(t('passwordsNotMatch', currentLanguage.code))
      return
    }

    setIsLoading(true)

    try {
      const result = await resetPassword(userId, newPassword, newUsername)

      if (result.success) {
        toast.success(t('accountUpdatedSuccess', currentLanguage.code))
        setTimeout(() => {
          router.push('/login')
        }, 1500)
      } else {
        toast.error(result.error || t('accountUpdateFailed', currentLanguage.code))
      }
    } catch (error) {
      toast.error(t('errorUpdatingAccount', currentLanguage.code))
    } finally {
      setIsLoading(false)
    }
  }

  const handleOTPChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return

    const newOTP = [...otpCode]
    newOTP[index] = value.slice(-1)
    setOtpCode(newOTP)

    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`)
      nextInput?.focus()
    }
  }

  const handleOTPKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`)
      prevInput?.focus()
    }
  }

  return (
    <div
      className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden"
      style={{ background: 'linear-gradient(135deg, var(--theme-primary), var(--theme-accent))' }}
    >
      <LoginFloatingBackground />
      <Card className="relative z-10 w-full max-w-md shadow-2xl">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold">{t('resetPassword', currentLanguage.code)}</CardTitle>
            <Link href="/login">
              <Button variant="ghost" size="icon">
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
          <CardDescription>
            {currentStep === 'phone' && t('enterPhoneLinkedToAccount', currentLanguage.code)}
            {currentStep === 'otp' && t('enterOtpSentWhatsApp', currentLanguage.code)}
            {currentStep === 'password' && t('enterNewUsernamePassword', currentLanguage.code)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {}
          {currentStep === 'phone' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="phone">{t('phoneNumber', currentLanguage.code)}</Label>
                <div className="relative">
                  <Phone className="absolute right-3 top-[50%] -translate-y-[50%] h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="07XX XXX XXXX"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="pr-10"
                    dir="ltr"
                    disabled={isLoading}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('otpWillBeSentWhatsApp', currentLanguage.code)}
                </p>
              </div>

              <Button 
                className="w-full h-11" 
                onClick={handleSendOTP}
                disabled={isLoading}
              >
                {isLoading ? t('sending', currentLanguage.code) : t('sendOtpCode', currentLanguage.code)}
              </Button>
            </>
          )}

          {}
          {currentStep === 'otp' && (
            <>
              <div className="space-y-2">
                <Label>{t('otpCode', currentLanguage.code)}</Label>
                <div className="flex gap-2 justify-center" dir="ltr">
                  {otpCode.map((digit, index) => (
                    <Input
                      key={index}
                      id={`otp-${index}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOTPChange(index, e.target.value)}
                      onKeyDown={(e) => handleOTPKeyDown(index, e)}
                      className="w-12 h-12 text-center text-lg font-bold"
                      disabled={isLoading}
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  {t('checkWhatsAppMessages', currentLanguage.code)}
                </p>
              </div>

              <div className="space-y-2">
                <Button 
                  className="w-full h-11" 
                  onClick={handleVerifyOTP}
                  disabled={isLoading}
                >
                  {isLoading ? t('verifying', currentLanguage.code) : t('verifyCode', currentLanguage.code)}
                </Button>

                <Button 
                  variant="outline"
                  className="w-full" 
                  onClick={handleSendOTP}
                  disabled={isLoading}
                >
                  {t('resendCode', currentLanguage.code)}
                </Button>
              </div>
            </>
          )}

          {}
          {currentStep === 'password' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="newUsername">{t('username', currentLanguage.code)}</Label>
                <div className="relative">
                  <User className="absolute right-3 top-[50%] -translate-y-[50%] h-4 w-4 text-muted-foreground" />
                  <Input
                    id="newUsername"
                    type="text"
                    placeholder={t('enterNewUsername', currentLanguage.code)}
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="pr-10"
                    dir="ltr"
                    disabled={isLoading}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('currentUsername', currentLanguage.code)}: {currentUsername}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">{t('newPassword', currentLanguage.code)}</Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-[50%] -translate-y-[50%] h-4 w-4 text-muted-foreground" />
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder={t('enterNewPassword', currentLanguage.code)}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pr-10"
                    dir="ltr"
                    disabled={isLoading}
                  />
                </div>
                <PasswordStrengthBar password={newPassword} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t('confirmPassword', currentLanguage.code)}</Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-[50%] -translate-y-[50%] h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder={t('reEnterPassword', currentLanguage.code)}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pr-10"
                    dir="ltr"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <Button 
                className="w-full h-11" 
                onClick={handleResetPassword}
                disabled={isLoading}
              >
                {isLoading ? t('updating', currentLanguage.code) : t('updatePassword', currentLanguage.code)}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
