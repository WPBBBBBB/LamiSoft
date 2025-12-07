import { supabase } from './supabase'
import { hashPassword } from './password-utils'

// أنواع البيانات
export interface User {
  id: string
  full_name: string
  phone_number?: string
  address?: string
  age?: number
  permission_type: 'مدير' | 'محاسب' | 'موظف'
  username: string
  password: string
  google_id?: string
  google_email?: string
  microsoft_id?: string
  microsoft_email?: string
  github_id?: string
  github_username?: string
  avatar_url?: string
  oauth_linked_at?: string
  failed_login_attempts?: number
  account_locked_until?: string
  password_changed_at?: string
  must_change_password?: boolean
  last_login_at?: string
  last_login_method?: string
  login_count?: number
  is_active?: boolean
  created_at: string
  updated_at: string
}

export interface UserPermission {
  id: string
  user_id: string
  view_statistics: boolean
  view_reports: boolean
  view_services: boolean
  view_people: boolean
  view_notifications: boolean
  add_purchase: boolean
  view_stores: boolean
  created_at: string
  updated_at: string
}

export interface UserWithPermissions extends User {
  permissions?: UserPermission
}

// ============================================
// دوال المستخدمين (Users)
// ============================================

// جلب جميع المستخدمين
export async function getUsers(): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data || []
}

// جلب جميع المستخدمين مع الصلاحيات
export async function getUsersWithPermissions(): Promise<UserWithPermissions[]> {
  const { data, error } = await supabase
    .from('users')
    .select(`
      *,
      permissions:user_permissions(*)
    `)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  
  // تحويل البيانات لتكون permissions كائن واحد بدلاً من مصفوفة
  return (data || []).map(user => ({
    ...user,
    permissions: Array.isArray(user.permissions) && user.permissions.length > 0 
      ? user.permissions[0] 
      : undefined
  }))
}

// جلب مستخدم واحد
export async function getUser(id: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) throw error
  return data
}

// جلب مستخدم مع الصلاحيات
export async function getUserWithPermissions(id: string): Promise<UserWithPermissions | null> {
  const { data, error } = await supabase
    .from('users')
    .select(`
      *,
      permissions:user_permissions(*)
    `)
    .eq('id', id)
    .single()
  
  if (error) throw error
  
  if (data && Array.isArray(data.permissions) && data.permissions.length > 0) {
    data.permissions = data.permissions[0]
  }
  
  return data
}

// إضافة مستخدم جديد
export async function createUser(
  userData: Omit<User, 'id' | 'created_at' | 'updated_at'>,
  permissions?: Omit<UserPermission, 'id' | 'user_id' | 'created_at' | 'updated_at'>
): Promise<User> {
  // تشفير كلمة المرور
  const hashedPassword = await hashPassword(userData.password)
  
  // إضافة المستخدم
  const { data: user, error: userError } = await supabase
    .from('users')
    .insert([{
      ...userData,
      password: hashedPassword,
      is_active: true,
      failed_login_attempts: 0,
      password_changed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }])
    .select()
    .single()
  
  if (userError) throw userError
  
  // إضافة الصلاحيات إذا كانت موجودة
  if (permissions && user && (userData.permission_type === 'محاسب' || userData.permission_type === 'موظف')) {
    const { error: permError } = await supabase
      .from('user_permissions')
      .insert([{
        user_id: user.id,
        ...permissions,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
    
    if (permError) throw permError
  }
  
  return user
}

// تحديث مستخدم
export async function updateUser(
  id: string,
  userData: Partial<Omit<User, 'id' | 'created_at' | 'updated_at'>>,
  permissions?: Partial<Omit<UserPermission, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<User> {
  // تشفير كلمة المرور إذا تم تغييرها
  let updateData = { ...userData }
  if (userData.password) {
    updateData.password = await hashPassword(userData.password)
    updateData.password_changed_at = new Date().toISOString()
  }
  
  // تحديث المستخدم
  const { data: user, error: userError } = await supabase
    .from('users')
    .update({
      ...updateData,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()
  
  if (userError) throw userError
  
  // تحديث أو إنشاء الصلاحيات
  if (permissions && user && (user.permission_type === 'محاسب' || user.permission_type === 'موظف')) {
    // التحقق من وجود صلاحيات
    const { data: existingPerm } = await supabase
      .from('user_permissions')
      .select('id')
      .eq('user_id', id)
      .single()
    
    if (existingPerm) {
      // تحديث الصلاحيات الموجودة
      const { error: permError } = await supabase
        .from('user_permissions')
        .update({
          ...permissions,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', id)
      
      if (permError) throw permError
    } else {
      // إنشاء صلاحيات جديدة
      const { error: permError } = await supabase
        .from('user_permissions')
        .insert([{
          user_id: id,
          ...permissions,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
      
      if (permError) throw permError
    }
  } else if (user && user.permission_type === 'مدير') {
    // حذف الصلاحيات إذا تم تغيير النوع إلى مدير
    await supabase
      .from('user_permissions')
      .delete()
      .eq('user_id', id)
  }
  
  return user
}

// حذف مستخدم
export async function deleteUser(id: string): Promise<void> {
  // حذف الصلاحيات أولاً
  await supabase
    .from('user_permissions')
    .delete()
    .eq('user_id', id)
  
  // ثم حذف المستخدم
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

// حذف مستخدمين متعددين
export async function deleteUsers(ids: string[]): Promise<void> {
  // حذف الصلاحيات أولاً
  await supabase
    .from('user_permissions')
    .delete()
    .in('user_id', ids)
  
  // ثم حذف المستخدمين
  const { error } = await supabase
    .from('users')
    .delete()
    .in('id', ids)
  
  if (error) throw error
}

// التحقق من وجود اسم مستخدم
export async function checkUsernameExists(username: string, excludeId?: string): Promise<boolean> {
  let query = supabase
    .from('users')
    .select('id')
    .eq('username', username)
  
  if (excludeId) {
    query = query.neq('id', excludeId)
  }
  
  const { data, error } = await query
  
  if (error) throw error
  return (data || []).length > 0
}

// جلب صلاحيات مستخدم
export async function getUserPermissions(userId: string): Promise<UserPermission | null> {
  const { data, error } = await supabase
    .from('user_permissions')
    .select('*')
    .eq('user_id', userId)
    .single()
  
  if (error) {
    if (error.code === 'PGRST116') return null // لا توجد صلاحيات
    throw error
  }
  
  return data
}

// ============================================
// دوال ربط الحسابات الخارجية (OAuth)
// ============================================

export type OAuthProvider = 'google' | 'microsoft' | 'github'

export interface OAuthLinkData {
  provider: OAuthProvider
  providerId: string
  email?: string
  username?: string
  avatarUrl?: string
}

// ربط حساب خارجي بمستخدم
export async function linkOAuthAccount(
  userId: string,
  oauthData: OAuthLinkData
): Promise<void> {
  const updateData: any = {
    oauth_linked_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  // تحديث الحقول حسب المزود
  switch (oauthData.provider) {
    case 'google':
      updateData.google_id = oauthData.providerId
      updateData.google_email = oauthData.email
      if (oauthData.avatarUrl) updateData.avatar_url = oauthData.avatarUrl
      break
    case 'microsoft':
      updateData.microsoft_id = oauthData.providerId
      updateData.microsoft_email = oauthData.email
      if (oauthData.avatarUrl) updateData.avatar_url = oauthData.avatarUrl
      break
    case 'github':
      updateData.github_id = oauthData.providerId
      updateData.github_username = oauthData.username
      if (oauthData.avatarUrl) updateData.avatar_url = oauthData.avatarUrl
      break
  }

  const { error } = await supabase
    .from('users')
    .update(updateData)
    .eq('id', userId)

  if (error) throw error

  // تسجيل في السجل (اختياري)
  await supabase.from('oauth_link_logs').insert([{
    user_id: userId,
    provider: oauthData.provider,
    action: 'link',
    success: true
  }])
}

// إلغاء ربط حساب خارجي
export async function unlinkOAuthAccount(
  userId: string,
  provider: OAuthProvider
): Promise<void> {
  const updateData: any = {
    updated_at: new Date().toISOString()
  }

  // مسح الحقول حسب المزود
  switch (provider) {
    case 'google':
      updateData.google_id = null
      updateData.google_email = null
      break
    case 'microsoft':
      updateData.microsoft_id = null
      updateData.microsoft_email = null
      break
    case 'github':
      updateData.github_id = null
      updateData.github_username = null
      break
  }

  const { error } = await supabase
    .from('users')
    .update(updateData)
    .eq('id', userId)

  if (error) throw error

  // تسجيل في السجل (اختياري)
  await supabase.from('oauth_link_logs').insert([{
    user_id: userId,
    provider: provider,
    action: 'unlink',
    success: true
  }])
}

// التحقق من حالة ربط الحسابات
export function getLinkedAccounts(user: User): {
  google: boolean
  microsoft: boolean
  github: boolean
} {
  return {
    google: !!user.google_id,
    microsoft: !!user.microsoft_id,
    github: !!user.github_id
  }
}
