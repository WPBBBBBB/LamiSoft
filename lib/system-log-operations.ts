import { supabase } from './supabase'

export interface SystemLog {
  id: number
  user_id?: string
  user_name?: string
  action_type: string
  ref_table?: string
  ref_id?: number
  old_value?: string
  new_value?: string
  description?: string
  created_at: string
}

export interface SystemLogFilters {
  search?: string
  actionType?: string
  refTable?: string
  startDate?: string
  endDate?: string
}

export async function getSystemLogs(
  page: number = 1,
  pageSize: number = 30,
  filters?: SystemLogFilters
): Promise<{ data: SystemLog[], count: number }> {
  let query = supabase
    .from('tb_systemlog')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (filters?.search) {
    query = query.or(`user_name.ilike.%${filters.search}%,action_type.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
  }
  
  if (filters?.actionType) {
    query = query.eq('action_type', filters.actionType)
  }
  
  if (filters?.refTable) {
    query = query.eq('ref_table', filters.refTable)
  }
  
  if (filters?.startDate) {
    query = query.gte('created_at', filters.startDate)
  }
  
  if (filters?.endDate) {
    query = query.lte('created_at', filters.endDate)
  }

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  query = query.range(from, to)

  const { data, error, count } = await query
  
  if (error) throw error
  return { data: data || [], count: count || 0 }
}

export async function addSystemLog(log: Omit<SystemLog, 'id' | 'created_at'>): Promise<SystemLog> {
  const { data, error } = await supabase
    .from('tb_systemlog')
    .insert(log)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function deleteSystemLog(id: number): Promise<void> {
  const { error } = await supabase
    .from('tb_systemlog')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

export async function deleteSystemLogs(ids: number[]): Promise<void> {
  const { error } = await supabase
    .from('tb_systemlog')
    .delete()
    .in('id', ids)
  
  if (error) throw error
}

export async function deleteAllSystemLogs(): Promise<void> {
  const { error } = await supabase
    .from('tb_systemlog')
    .delete()
    .neq('id', 0)
  
  if (error) throw error
}

export async function getSystemLogStats(): Promise<{
  totalLogs: number
  logsByAction: { action_type: string, count: number }[]
  logsByTable: { ref_table: string, count: number }[]
}> {
  const { count: totalLogs } = await supabase
    .from('tb_systemlog')
    .select('*', { count: 'exact', head: true })
  
  const { data: actionData } = await supabase
    .from('tb_systemlog')
    .select('action_type')
  
  const logsByAction = actionData?.reduce((acc: { action_type: string; count: number }[], log) => {
    const existing = acc.find(item => item.action_type === log.action_type)
    if (existing) {
      existing.count++
    } else {
      acc.push({ action_type: log.action_type, count: 1 })
    }
    return acc
  }, [] as { action_type: string; count: number }[]) || []
  
  const { data: tableData } = await supabase
    .from('tb_systemlog')
    .select('ref_table')
    .not('ref_table', 'is', null)
  
  const logsByTable = tableData?.reduce((acc: { ref_table: string; count: number }[], log) => {
    const existing = acc.find(item => item.ref_table === log.ref_table)
    if (existing) {
      existing.count++
    } else {
      acc.push({ ref_table: log.ref_table, count: 1 })
    }
    return acc
  }, [] as { ref_table: string; count: number }[]) || []

  return {
    totalLogs: totalLogs || 0,
    logsByAction,
    logsByTable
  }
}

export async function logAction(
  actionType: string,
  description?: string,
  refTable?: string,
  refId?: number,
  oldValue?: Record<string, unknown>,
  newValue?: Record<string, unknown>
): Promise<void> {
  try {
    let fullName = 'غير معروف'
    let userId: string | undefined = undefined
    
    const savedUser = typeof window !== 'undefined' 
      ? localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser')
      : null
    
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser)
        fullName = userData.full_name || 'غير معروف'
        userId = userData.id
      } catch (e) {
        console.error('Error parsing saved user:', e)
      }
    }
    
    await addSystemLog({
      user_id: userId,
      user_name: fullName,
      action_type: actionType,
      ref_table: refTable,
      ref_id: refId,
      old_value: oldValue ? JSON.stringify(oldValue) : undefined,
      new_value: newValue ? JSON.stringify(newValue) : undefined,
      description
    })
  } catch (error: unknown) {
    const err = error as { message?: string; code?: string; details?: string }
    if (err?.message?.includes('relation "tb_systemlog" does not exist') || err?.code === 'PGRST116') {
      console.warn('⚠️ جدول tb_systemlog غير موجود. الرجاء إنشاء الجدول في Supabase. راجع ملف SYSTEM_LOG_SQL.sql')
    } else {
      console.error('Error logging action:', err?.message || err?.details || error)
    }
  }
}
