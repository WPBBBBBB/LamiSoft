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

// تسجيل الدخول بكلمة المرور
export async function loginWithPassword(
  credentials: LoginCredentials,
  ipAddress?: string
): Promise<LoginResult> {
  try {
    const users = await getUsersWithPermissions()
    
    // البحث عن المستخدم باسم المستخدم فقط
    const user = users.find(u => u.username === credentials.username)

    if (!user) {
      // تسجيل محاولة فاشلة
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

    // التحقق من أن الحساب نشط
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

    // التحقق من قفل الحساب
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

    // التحقق من كلمة المرور
    // دعم كلمات المرور القديمة (غير مشفرة) والجديدة (مشفرة)
    let isPasswordValid = false
    
    // التحقق إذا كانت كلمة المرور مشفرة (تبدأ بـ $2a$ أو $2b$)
    if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
      // كلمة مرور مشفرة - استخدام bcrypt
      isPasswordValid = await verifyPassword(credentials.password, user.password)
    } else {
      // كلمة مرور غير مشفرة - مقارنة مباشرة
      isPasswordValid = credentials.password === user.password
      
      // إذا نجح الدخول، قم بتشفير كلمة المرور
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
      // زيادة عدد المحاولات الفاشلة
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

    // نجح تسجيل الدخول - إعادة تعيين المحاولات الفاشلة
    await resetFailedAttempts(user.id)

    // تحديث معلومات آخر تسجيل دخول
    await updateLoginInfo(user.id, 'password')

    // تسجيل محاولة ناجحة
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
    console.error('Login error:', error)
    return {
      success: false,
      error: 'حدث خطأ أثناء تسجيل الدخول'
    }
  }
}

// تسجيل الدخول عبر OAuth
export async function loginWithOAuth(
  provider: 'google' | 'microsoft' | 'github',
  providerId: string
): Promise<LoginResult> {
  try {
    const users = await getUsersWithPermissions()
    
    let user: UserWithPermissions | undefined

    // البحث عن المستخدم حسب المزود
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

    // تحديث معلومات آخر تسجيل دخول
    await updateLoginInfo(user.id, provider)

    // تسجيل محاولة ناجحة
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
    console.error('OAuth login error:', error)
    return {
      success: false,
      error: 'حدث خطأ أثناء تسجيل الدخول'
    }
  }
}

// تحديث معلومات آخر تسجيل دخول
async function updateLoginInfo(
  userId: string,
  loginMethod: string
): Promise<void> {
  try {
    // استدعاء الدالة في قاعدة البيانات
    const { error } = await supabase.rpc('update_user_login_info', {
      p_user_id: userId,
      p_login_method: loginMethod
    })

    if (error) {
      // إذا فشلت الدالة، نستخدم UPDATE عادي
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
    console.error('Error updating login info:', error)
  }
}

// زيادة عدد المحاولات الفاشلة
async function incrementFailedAttempts(userId: string): Promise<void> {
  try {
    const { error } = await supabase.rpc('increment_failed_login_attempts', {
      p_user_id: userId
    })

    if (error) {
      // إذا فشلت الدالة، نستخدم UPDATE عادي
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
    console.error('Error incrementing failed attempts:', error)
  }
}

// إعادة تعيين المحاولات الفاشلة
async function resetFailedAttempts(userId: string): Promise<void> {
  try {
    const { error } = await supabase.rpc('reset_failed_login_attempts', {
      p_user_id: userId
    })

    if (error) {
      // إذا فشلت الدالة، نستخدم UPDATE عادي
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
    console.error('Error resetting failed attempts:', error)
  }
}

// تسجيل محاولة تسجيل الدخول
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
    console.error('Error logging login attempt:', error)
  }
}

// جلب آخر عمليات تسجيل الدخول
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

// حساب وقت آخر تسجيل دخول
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
