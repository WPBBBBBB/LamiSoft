import { supabase } from './supabase'
import { getUsersWithPermissions, type UserWithPermissions } from './users-operations'
import { verifyPassword } from './password-utils'

export interface LoginCredentials {
  username: string
  password: string
}

export interface LoginResult {
  success: boolean
  user?: UserWithPermissions
  error?: string
}

function normalizeDigits(input: string): string {
  const arabicIndic = "٠١٢٣٤٥٦٧٨٩"
  const easternArabicIndic = "۰۱۲۳۴۵۶۷۸۹"

  return input
    .replace(/[٠-٩]/g, (d) => String(arabicIndic.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String(easternArabicIndic.indexOf(d)))
}

function normalizeUsername(input: string): string {
  return normalizeDigits(input.trim().normalize("NFKC")).toLowerCase()
}

export async function loginWithPassword(
  credentials: LoginCredentials,
  ipAddress?: string
): Promise<LoginResult> {
  try {
    const users = await getUsersWithPermissions()

    const requestedUsername = normalizeUsername(credentials.username)
    const user = users.find((u) => normalizeUsername(u.username) === requestedUsername)

    if (!user) {
      await logLoginAttempt({
        username: credentials.username,
        login_method: 'password',
        success: false,
        ip_address: ipAddress,
        error_message: 'اسم المستخدم غير موجود'
      })

      return {
        success: false,
        error: 'اسم المستخدم أو كلمة المرور غير صحيحة'
      }
    }

    if (user.is_active === false) {
      await logLoginAttempt({
        user_id: user.id,
        username: credentials.username,
        login_method: 'password',
        success: false,
        ip_address: ipAddress,
        error_message: 'الحساب غير نشط'
      })

      return {
        success: false,
        error: 'هذا الحساب غير نشط. يرجى التواصل مع المدير'
      }
    }

    if (user.account_locked_until) {
      const lockTime = new Date(user.account_locked_until)
      if (lockTime > new Date()) {
        const minutesLeft = Math.ceil((lockTime.getTime() - Date.now()) / 60000)
        await logLoginAttempt({
          user_id: user.id,
          username: credentials.username,
          login_method: 'password',
          success: false,
          ip_address: ipAddress,
          error_message: 'الحساب مقفل'
        })

        return {
          success: false,
          error: `الحساب مقفل مؤقتاً. حاول مرة أخرى بعد ${minutesLeft} دقيقة`
        }
      }
    }

    let isPasswordValid = false
    
    if (
      user.password.startsWith('$2a$') ||
      user.password.startsWith('$2b$') ||
      user.password.startsWith('$2y$')
    ) {
      isPasswordValid = await verifyPassword(credentials.password, user.password)
    } else {
      isPasswordValid = credentials.password === user.password
      
      if (isPasswordValid) {
        const { hashPassword } = await import('./password-utils')
        const hashedPassword = await hashPassword(credentials.password)
        await supabase
          .from('users')
          .update({ 
            password: hashedPassword,
            password_changed_at: new Date().toISOString()
          })
          .eq('id', user.id)
      }
    }
    
    if (!isPasswordValid) {
      await incrementFailedAttempts(user.id)

      const attempts = (user.failed_login_attempts || 0) + 1
      let errorMsg = 'اسم المستخدم أو كلمة المرور غير صحيحة'
      
      if (attempts >= 5) {
        errorMsg = 'تم قفل حسابك لمدة 15 دقيقة بسبب المحاولات الفاشلة المتكررة'
      } else if (attempts >= 3) {
        errorMsg = `كلمة المرور غير صحيحة. لديك ${5 - attempts} محاولة متبقية`
      }

      await logLoginAttempt({
        user_id: user.id,
        username: credentials.username,
        login_method: 'password',
        success: false,
        ip_address: ipAddress,
        error_message: 'كلمة المرور غير صحيحة'
      })

      return {
        success: false,
        error: errorMsg
      }
    }

    await resetFailedAttempts(user.id)

    await updateLoginInfo(user.id, 'password')

    await logLoginAttempt({
      user_id: user.id,
      username: credentials.username,
      login_method: 'password',
      success: true,
      ip_address: ipAddress
    })

    return {
      success: true,
      user
    }
  } catch (error: unknown) {
    return {
      success: false,
      error: 'حدث خطأ أثناء تسجيل الدخول'
    }
  }
}

export async function loginWithOAuth(
  provider: 'google' | 'microsoft' | 'github',
  providerId: string
): Promise<LoginResult> {
  try {
    const users = await getUsersWithPermissions()
    
    let user: UserWithPermissions | undefined

    switch (provider) {
      case 'google':
        user = users.find(u => u.google_id === providerId && u.is_active !== false)
        break
      case 'microsoft':
        user = users.find(u => u.microsoft_id === providerId && u.is_active !== false)
        break
      case 'github':
        user = users.find(u => u.github_id === providerId && u.is_active !== false)
        break
    }

    if (!user) {
      await logLoginAttempt({
        login_method: provider,
        success: false,
        error_message: 'لا يوجد حساب مرتبط بهذه الخدمة'
      })

      return {
        success: false,
        error: 'لا يوجد حساب مرتبط بهذه الخدمة. يرجى التواصل مع المدير'
      }
    }

    await updateLoginInfo(user.id, provider)

    await logLoginAttempt({
      user_id: user.id,
      username: user.username,
      login_method: provider,
      success: true
    })

    return {
      success: true,
      user
    }
  } catch (error: unknown) {
    return {
      success: false,
      error: 'حدث خطأ أثناء تسجيل الدخول'
    }
  }
}

async function updateLoginInfo(
  userId: string,
  loginMethod: string
): Promise<void> {
  try {
    const { error } = await supabase.rpc('update_user_login_info', {
      p_user_id: userId,
      p_login_method: loginMethod
    })

    if (error) {
      const { data: currentUser } = await supabase
        .from('users')
        .select('login_count')
        .eq('id', userId)
        .single()

      await supabase
        .from('users')
        .update({
          last_login_at: new Date().toISOString(),
          last_login_method: loginMethod,
          login_count: (currentUser?.login_count || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
    }
  } catch (error) {
    }
}

async function incrementFailedAttempts(userId: string): Promise<void> {
  try {
    const { error } = await supabase.rpc('increment_failed_login_attempts', {
      p_user_id: userId
    })

    if (error) {
      const { data: user } = await supabase
        .from('users')
        .select('failed_login_attempts')
        .eq('id', userId)
        .single()

      const newAttempts = (user?.failed_login_attempts || 0) + 1
      const lockUntil = newAttempts >= 5 
        ? new Date(Date.now() + 15 * 60000).toISOString() 
        : null

      await supabase
        .from('users')
        .update({
          failed_login_attempts: newAttempts,
          account_locked_until: lockUntil,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
    }
  } catch (error) {
    }
}

async function resetFailedAttempts(userId: string): Promise<void> {
  try {
    const { error } = await supabase.rpc('reset_failed_login_attempts', {
      p_user_id: userId
    })

    if (error) {
      await supabase
        .from('users')
        .update({
          failed_login_attempts: 0,
          account_locked_until: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
    }
  } catch (error) {
    }
}

async function logLoginAttempt(data: {
  user_id?: string
  username?: string
  login_method: string
  success: boolean
  ip_address?: string
  error_message?: string
}): Promise<void> {
  try {
    await supabase.from('login_logs').insert([{
      user_id: data.user_id || null,
      username: data.username || null,
      login_method: data.login_method,
      success: data.success,
      ip_address: data.ip_address || null,
      error_message: data.error_message || null,
      created_at: new Date().toISOString()
    }])
  } catch (error) {
    }
}

export async function getRecentLogins(userId: string, limit: number = 10) {
  const { data, error } = await supabase
    .from('login_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('success', true)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}

export function getLastLoginTime(lastLoginAt?: string): string {
  if (!lastLoginAt) return 'لم يسجل الدخول بعد'

  const now = new Date()
  const lastLogin = new Date(lastLoginAt)
  const diffMs = now.getTime() - lastLogin.getTime()
  
  const diffMinutes = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMinutes < 1) return 'الآن'
  if (diffMinutes < 60) return `منذ ${diffMinutes} دقيقة`
  if (diffHours < 24) return `منذ ${diffHours} ساعة`
  if (diffDays < 30) return `منذ ${diffDays} يوم`
  
  return lastLogin.toLocaleDateString('ar-IQ')
}
