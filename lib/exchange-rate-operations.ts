import { supabase } from './supabase'

export interface ExchangeRate {
  id: string
  rate: number
  updated_at: string
  updated_by: string
  full_name?: string
}

export async function getCurrentExchangeRate(): Promise<number> {
  const { data, error } = await supabase
    .from('exchange_rate')
    .select('rate')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  
  if (error) {
    return 1350
  }
  
  if (!data) {
    return 1350
  }
  
  return data.rate
}

export async function updateExchangeRate(
  newRate: number, 
  updatedBy: string = 'user', 
  fullName?: string
): Promise<ExchangeRate> {
  const { data, error } = await supabase
    .from('exchange_rate')
    .insert([{
      rate: newRate,
      updated_by: updatedBy,
      full_name: fullName || updatedBy,
    }])
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function getExchangeRateHistory(limit: number = 10): Promise<ExchangeRate[]> {
  const { data, error } = await supabase
    .from('exchange_rate')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(limit)
  
  if (error) throw error
  return data || []
}
