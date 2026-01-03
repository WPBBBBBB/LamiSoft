import { supabase } from './supabase'
import { hashPassword } from './password-utils'

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
  view_store_transfer: boolean
  created_at: string
  updated_at: string
}

export interface UserWithPermissions extends User {
  permissions?: UserPermission
}

export async function getUsers(): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data || []
}

export async function getUsersWithPermissions(): Promise<UserWithPermissions[]> {
  const { data, error } = await supabase
    .from('users')
    .select(`
      *,
      permissions:user_permissions(*)
    `)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  
  return (data || []).map(user => ({
    ...user,
    permissions: Array.isArray(user.permissions) && user.permissions.length > 0 
      ? user.permissions[0] 
      : undefined
  }))
}

export async function getUser(id: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) throw error
  return data
}

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

export async function createUser(
  userData: Omit<User, 'id' | 'created_at' | 'updated_at'>,
  permissions?: Omit<UserPermission, 'id' | 'user_id' | 'created_at' | 'updated_at'>
): Promise<User> {
  const hashedPassword = await hashPassword(userData.password)
  
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

export async function updateUser(
  id: string,
  userData: Partial<Omit<User, 'id' | 'created_at' | 'updated_at'>>,
  permissions?: Partial<Omit<UserPermission, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<User> {
  const updateData: Partial<User> & { password_changed_at?: string } = { ...userData }
  if (userData.password) {
    updateData.password = await hashPassword(userData.password)
    updateData.password_changed_at = new Date().toISOString()
  }
  
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
  
  if (permissions && user && (user.permission_type === 'محاسب' || user.permission_type === 'موظف')) {
    const { data: existingPerm } = await supabase
      .from('user_permissions')
      .select('id')
      .eq('user_id', id)
      .single()
    
    if (existingPerm) {
      const { error: permError } = await supabase
        .from('user_permissions')
        .update({
          ...permissions,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', id)
      
      if (permError) throw permError
    } else {
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
    await supabase
      .from('user_permissions')
      .delete()
      .eq('user_id', id)
  }
  
  return user
}

export async function deleteUser(id: string): Promise<void> {
  await supabase
    .from('user_permissions')
    .delete()
    .eq('user_id', id)
  
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

export async function deleteUsers(ids: string[]): Promise<void> {
  await supabase
    .from('user_permissions')
    .delete()
    .in('user_id', ids)
  
  const { error } = await supabase
    .from('users')
    .delete()
    .in('id', ids)
  
  if (error) throw error
}

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

export async function getUserPermissions(userId: string): Promise<UserPermission | null> {
  const { data, error } = await supabase
    .from('user_permissions')
    .select('*')
    .eq('user_id', userId)
    .single()
  
  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  
  return data
}

export type OAuthProvider = 'google' | 'microsoft' | 'github'

export interface OAuthLinkData {
  provider: OAuthProvider
  providerId: string
  email?: string
  username?: string
  avatarUrl?: string
}

export async function linkOAuthAccount(
  userId: string,
  oauthData: OAuthLinkData
): Promise<void> {
  const updateData: Partial<User> = {
    oauth_linked_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

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

  await supabase.from('oauth_link_logs').insert([{
    user_id: userId,
    provider: oauthData.provider,
    action: 'link',
    success: true
  }])
}

export async function unlinkOAuthAccount(
  userId: string,
  provider: OAuthProvider
): Promise<void> {
  const updateData: Partial<User> = {
    updated_at: new Date().toISOString()
  }

  switch (provider) {
    case 'google':
      updateData.google_id = undefined
      updateData.google_email = undefined
      break
    case 'microsoft':
      updateData.microsoft_id = undefined
      updateData.microsoft_email = undefined
      break
    case 'github':
      updateData.github_id = undefined
      updateData.github_username = undefined
      break
  }

  const { error } = await supabase
    .from('users')
    .update(updateData)
    .eq('id', userId)

  if (error) throw error

  await supabase.from('oauth_link_logs').insert([{
    user_id: userId,
    provider: provider,
    action: 'unlink',
    success: true
  }])
}

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
