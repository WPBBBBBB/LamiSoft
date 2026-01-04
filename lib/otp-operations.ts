import { supabase } from './supabase'

type SendOtpApiResponse = {
  success: boolean
  error?: string
}

function isSendOtpApiResponse(value: unknown): value is SendOtpApiResponse {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  if (typeof record.success !== 'boolean') return false
  if (typeof record.error !== 'undefined' && typeof record.error !== 'string') return false
  return true
}

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
      throw new Error(`فشل الاتصال بالخادم: ${response.status}`)
    }

    const json: unknown = await response.json()
    if (!isSendOtpApiResponse(json)) {
      throw new Error('استجابة غير صالحة من الخادم')
    }

    if (!json.success) throw new Error(json.error || 'فشل إرسال رسالة الواتساب')

    return { success: true }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'حدث خطأ أثناء إرسال رمز التحقق'
    return {
      success: false,
      error: errorMessage
    }
  }
}

export async function createOTP(
  phoneNumber: string,
  purpose: string = 'password_reset'
): Promise<{ success: boolean; otpCode?: string; error?: string }> {
  try {
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString()
    
    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + 5)

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

    const sendResult = await sendOTPViaWhatsApp(phoneNumber, otpCode)
    
    if (!sendResult.success) {
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
    return {
      success: false,
      error: errorMessage
    }
  }
}

export async function verifyOTP(
  phoneNumber: string,
  otpCode: string,
  purpose: string = 'password_reset'
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('otp_codes')
      .select('id')
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

    const otpId = (data as { id?: unknown } | null)?.id
    if (typeof otpId !== 'string') {
      return {
        success: false,
        error: 'استجابة غير صالحة من قاعدة البيانات'
      }
    }

    await supabase.from('otp_codes').update({ used: true }).eq('id', otpId)

    return { success: true }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'حدث خطأ أثناء التحقق من الرمز'
    return {
      success: false,
      error: errorMessage
    }
  }
}

export async function getUserByPhone(phoneNumber: string) {
  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, username, phone_number')
    .eq('phone_number', phoneNumber)
    .single()

  if (error) return null
  return data as {
    id: string
    full_name: string
    username: string
    phone_number?: string
  }
}

export async function resetPassword(
  userId: string,
  newPassword: string,
  newUsername?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { hashPassword } = await import('./password-utils')
    const hashedPassword = await hashPassword(newPassword)

    const updateData: Record<string, unknown> = {
      password: hashedPassword,
      password_changed_at: new Date().toISOString(),
      must_change_password: false,
      updated_at: new Date().toISOString()
    }

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
    return {
      success: false,
      error: errorMessage
    }
  }
}
