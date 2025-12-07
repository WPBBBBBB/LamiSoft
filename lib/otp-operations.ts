import { supabase } from './supabase'

// إرسال OTP عبر Wasenderapi (عبر API route لتجنب CORS)
export async function sendOTPViaWhatsApp(
  phoneNumber: string,
  otpCode: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/send-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phoneNumber,
        otpCode
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('API Response Error:', errorText)
      throw new Error(`فشل الاتصال بالخادم: ${response.status}`)
    }

    const data = await response.json()

    if (!data.success) {
      throw new Error(data.error || 'فشل إرسال رسالة الواتساب')
    }

    return { success: true }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'حدث خطأ أثناء إرسال رمز التحقق'
    console.error('Error sending OTP via WhatsApp:', errorMessage)
    return {
      success: false,
      error: errorMessage
    }
  }
}

// إنشاء وحفظ OTP
export async function createOTP(
  phoneNumber: string,
  purpose: string = 'password_reset'
): Promise<{ success: boolean; otpCode?: string; error?: string }> {
  try {
    // توليد رمز OTP من 6 أرقام
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString()
    
    // حفظ في قاعدة البيانات
    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + 5) // صالح لمدة 5 دقائق

    const { error } = await supabase
      .from('otp_codes')
      .insert([{
        phone_number: phoneNumber,
        otp_code: otpCode,
        purpose: purpose,
        expires_at: expiresAt.toISOString(),
        used: false,
        created_at: new Date().toISOString()
      }])

    if (error) throw error

    // إرسال عبر واتساب
    const sendResult = await sendOTPViaWhatsApp(phoneNumber, otpCode)
    
    if (!sendResult.success) {
      // فشل الإرسال
      return {
        success: false,
        error: sendResult.error
      }
    }

    return {
      success: true,
      otpCode: otpCode
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'حدث خطأ أثناء إنشاء رمز التحقق'
    console.error('Error creating OTP:', errorMessage)
    return {
      success: false,
      error: errorMessage
    }
  }
}

// التحقق من OTP
export async function verifyOTP(
  phoneNumber: string,
  otpCode: string,
  purpose: string = 'password_reset'
): Promise<{ success: boolean; error?: string }> {
  try {
    // البحث عن OTP صالح
    const { data, error } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('phone_number', phoneNumber)
      .eq('otp_code', otpCode)
      .eq('purpose', purpose)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      return {
        success: false,
        error: 'رمز التحقق غير صحيح أو منتهي الصلاحية'
      }
    }

    // تحديث الرمز كمستخدم
    await supabase
      .from('otp_codes')
      .update({ used: true })
      .eq('id', data.id)

    return { success: true }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'حدث خطأ أثناء التحقق من الرمز'
    console.error('Error verifying OTP:', errorMessage)
    return {
      success: false,
      error: errorMessage
    }
  }
}

// البحث عن مستخدم برقم الهاتف
export async function getUserByPhone(phoneNumber: string) {
  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, username, phone_number')
    .eq('phone_number', phoneNumber)
    .single()

  if (error) return null
  return data
}

// تحديث كلمة المرور واسم المستخدم
export async function resetPassword(
  userId: string,
  newPassword: string,
  newUsername?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { hashPassword } = await import('./password-utils')
    const hashedPassword = await hashPassword(newPassword)

    const updateData: any = {
      password: hashedPassword,
      password_changed_at: new Date().toISOString(),
      must_change_password: false,
      updated_at: new Date().toISOString()
    }

    // إضافة اسم المستخدم إذا تم توفيره
    if (newUsername && newUsername.trim()) {
      updateData.username = newUsername.trim()
    }

    const { error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)

    if (error) throw error

    return { success: true }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'حدث خطأ أثناء تحديث كلمة المرور'
    console.error('Error resetting password:', errorMessage)
    return {
      success: false,
      error: errorMessage
    }
  }
}
