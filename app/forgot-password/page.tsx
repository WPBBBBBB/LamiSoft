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

type Step = 'phone' | 'otp' | 'password'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState<Step>('phone')
  const [phoneNumber, setPhoneNumber] = useState("")
  const [otpCode, setOtpCode] = useState(["", "", "", "", "", ""])
  const [userId, setUserId] = useState("")
  const [currentUsername, setCurrentUsername] = useState("")
  const [newUsername, setNewUsername] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  // إرسال OTP
  const handleSendOTP = async () => {
    if (!phoneNumber.trim()) {
      toast.error("يرجى إدخال رقم الهاتف")
      return
    }

    // التحقق من تنسيق رقم الهاتف
    const phoneRegex = /^(07[3-9]\d{8}|(\+?964|00964)?7[3-9]\d{8})$/
    if (!phoneRegex.test(phoneNumber.replace(/\s+/g, ''))) {
      toast.error("رقم الهاتف غير صحيح. يجب أن يبدأ بـ 07")
      return
    }

    setIsLoading(true)

    try {
      // البحث عن المستخدم
      const user = await getUserByPhone(phoneNumber)
      
      if (!user) {
        toast.error("لا يوجد حساب مرتبط بهذا الرقم")
        setIsLoading(false)
        return
      }

      setUserId(user.id)
      setCurrentUsername(user.username)
      setNewUsername(user.username) // قيمة افتراضية

      // إنشاء وإرسال OTP
      const result = await createOTP(phoneNumber)

      if (result.success) {
        toast.success("تم إرسال رمز التحقق على الواتساب")
        setCurrentStep('otp')
      } else {
        toast.error(result.error || "فشل إرسال رمز التحقق")
      }
    } catch (error) {
      console.error(error)
      toast.error("حدث خطأ أثناء إرسال رمز التحقق")
    } finally {
      setIsLoading(false)
    }
  }

  // التحقق من OTP
  const handleVerifyOTP = async () => {
    const fullOTP = otpCode.join('')
    
    if (fullOTP.length !== 6) {
      toast.error("يرجى إدخال رمز التحقق كاملاً")
      return
    }

    setIsLoading(true)

    try {
      const result = await verifyOTP(phoneNumber, fullOTP)

      if (result.success) {
        toast.success("تم التحقق من الرمز بنجاح")
        setCurrentStep('password')
      } else {
        toast.error(result.error || "رمز التحقق غير صحيح")
        setOtpCode(["", "", "", "", "", ""])
      }
    } catch (error) {
      console.error(error)
      toast.error("حدث خطأ أثناء التحقق من الرمز")
    } finally {
      setIsLoading(false)
    }
  }

  // تحديث اسم المستخدم وكلمة المرور
  const handleResetPassword = async () => {
    if (!newUsername.trim()) {
      toast.error("يرجى إدخال اسم المستخدم")
      return
    }

    if (!newPassword.trim()) {
      toast.error("يرجى إدخال كلمة المرور الجديدة")
      return
    }

    if (newPassword.length < 6) {
      toast.error("كلمة المرور يجب أن تكون 6 أحرف على الأقل")
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error("كلمتا المرور غير متطابقتين")
      return
    }

    setIsLoading(true)

    try {
      const result = await resetPassword(userId, newPassword, newUsername)

      if (result.success) {
        toast.success("تم تحديث بيانات الحساب بنجاح")
        setTimeout(() => {
          router.push('/login')
        }, 1500)
      } else {
        toast.error(result.error || "فشل تحديث بيانات الحساب")
      }
    } catch (error) {
      console.error(error)
      toast.error("حدث خطأ أثناء تحديث بيانات الحساب")
    } finally {
      setIsLoading(false)
    }
  }

  // التعامل مع إدخال OTP
  const handleOTPChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return // فقط أرقام

    const newOTP = [...otpCode]
    newOTP[index] = value.slice(-1) // أخذ آخر رقم فقط
    setOtpCode(newOTP)

    // الانتقال للحقل التالي تلقائياً
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`)
      nextInput?.focus()
    }
  }

  // التعامل مع مفتاح Backspace
  const handleOTPKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`)
      prevInput?.focus()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" 
         style={{ background: 'linear-gradient(135deg, var(--theme-primary), var(--theme-accent))' }}>
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold">إعادة تعيين كلمة المرور</CardTitle>
            <Link href="/login">
              <Button variant="ghost" size="icon">
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
          <CardDescription>
            {currentStep === 'phone' && 'أدخل رقم هاتفك المرتبط بالحساب'}
            {currentStep === 'otp' && 'أدخل رمز التحقق المرسل على الواتساب'}
            {currentStep === 'password' && 'أدخل اسم المستخدم وكلمة المرور الجديدة'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* الخطوة 1: إدخال رقم الهاتف */}
          {currentStep === 'phone' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="phone">رقم الهاتف</Label>
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
                  سيتم إرسال رمز التحقق عبر الواتساب
                </p>
              </div>

              <Button 
                className="w-full h-11" 
                onClick={handleSendOTP}
                disabled={isLoading}
              >
                {isLoading ? 'جاري الإرسال...' : 'إرسال رمز التحقق'}
              </Button>
            </>
          )}

          {/* الخطوة 2: إدخال OTP */}
          {currentStep === 'otp' && (
            <>
              <div className="space-y-2">
                <Label>رمز التحقق (OTP)</Label>
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
                  تحقق من رسائل الواتساب الخاصة بك
                </p>
              </div>

              <div className="space-y-2">
                <Button 
                  className="w-full h-11" 
                  onClick={handleVerifyOTP}
                  disabled={isLoading}
                >
                  {isLoading ? 'جاري التحقق...' : 'التحقق من الرمز'}
                </Button>

                <Button 
                  variant="outline"
                  className="w-full" 
                  onClick={handleSendOTP}
                  disabled={isLoading}
                >
                  إعادة إرسال الرمز
                </Button>
              </div>
            </>
          )}

          {/* الخطوة 3: إدخال اسم المستخدم وكلمة المرور الجديدة */}
          {currentStep === 'password' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="newUsername">اسم المستخدم</Label>
                <div className="relative">
                  <User className="absolute right-3 top-[50%] -translate-y-[50%] h-4 w-4 text-muted-foreground" />
                  <Input
                    id="newUsername"
                    type="text"
                    placeholder="أدخل اسم المستخدم الجديد"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="pr-10"
                    dir="ltr"
                    disabled={isLoading}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  اسم المستخدم الحالي: {currentUsername}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">كلمة المرور الجديدة</Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-[50%] -translate-y-[50%] h-4 w-4 text-muted-foreground" />
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="أدخل كلمة المرور الجديدة"
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
                <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-[50%] -translate-y-[50%] h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="أعد إدخال كلمة المرور"
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
                {isLoading ? 'جاري التحديث...' : 'تحديث كلمة المرور'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
