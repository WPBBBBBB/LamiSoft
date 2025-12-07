import { supabase } from './supabase'

// ============================================
// دوال سعر الصرف (Exchange Rate)
// ============================================

export interface ExchangeRate {
  id: string
  rate: number
  updated_at: string
  updated_by: string
}

// الحصول على سعر الصرف الحالي
export async function getCurrentExchangeRate(): Promise<number> {
  const { data, error } = await supabase
    .from('exchange_rate')
    .select('rate')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()
  
  if (error || !data) {
    console.error('Error fetching exchange rate:', { error, data })
    return 1350 // القيمة الافتراضية
  }
  return data.rate
}

// تحديث سعر الصرف
export async function updateExchangeRate(newRate: number, updatedBy: string = 'user'): Promise<ExchangeRate> {
  // إدخال سجل جديد بدلاً من التحديث (للحفاظ على السجل التاريخي)
  const { data, error } = await supabase
    .from('exchange_rate')
    .insert([{
      rate: newRate,
      updated_by: updatedBy,
    }])
    .select()
    .single()
  
  if (error) throw error
  return data
}

// الحصول على تاريخ سعر الصرف
export async function getExchangeRateHistory(limit: number = 10): Promise<ExchangeRate[]> {
  const { data, error } = await supabase
    .from('exchange_rate')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(limit)
  
  if (error) throw error
  return data || []
}
