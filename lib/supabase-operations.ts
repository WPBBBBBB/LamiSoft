import { supabase } from './supabase'

// أنواع البيانات
export interface Customer {
  id: string
  customer_name: string
  type: 'زبون' | 'مجهز' | 'موظف'
  phone_number?: string
  address?: string
  notes?: string
  image_url?: string
  created_at: string
  updated_at: string
}

export interface Payment {
  id: string
  customer_id: string
  amount_iqd: number
  amount_usd: number
  currency_type: 'IQD' | 'USD'
  transaction_type: 'قبض' | 'ايداع' | 'سحب' | 'صرف' | 'قرض'
  notes?: string
  pay_date: string
  created_at: string
}

export interface CustomerBalance {
  balance_iqd: number
  balance_usd: number
}

// ============================================
// دوال العملاء (Customers)
// ============================================

// جلب جميع العملاء
export async function getCustomers(): Promise<Customer[]> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data || []
}

// جلب عميل واحد
export async function getCustomer(id: string): Promise<Customer | null> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) throw error
  return data
}

// إضافة عميل جديد
export async function createCustomer(customer: Omit<Customer, 'id' | 'created_at' | 'updated_at'>): Promise<Customer> {
  const { data, error } = await supabase
    .from('customers')
    .insert([customer])
    .select()
    .single()
  
  if (error) throw error
  return data
}

// تعديل عميل
export async function updateCustomer(id: string, customer: Partial<Customer>): Promise<Customer> {
  const { data, error } = await supabase
    .from('customers')
    .update(customer)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// حذف عميل
export async function deleteCustomer(id: string): Promise<void> {
  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

// حذف عدة عملاء
export async function deleteCustomers(ids: string[]): Promise<void> {
  const { error } = await supabase
    .from('customers')
    .delete()
    .in('id', ids)
  
  if (error) throw error
}

// البحث عن العملاء
export async function searchCustomers(query: string): Promise<Customer[]> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .or(`customer_name.ilike.%${query}%,phone_number.ilike.%${query}%,address.ilike.%${query}%`)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data || []
}

// ============================================
// دوال الدفعات (Payments)
// ============================================

// إضافة دفعة جديدة وتحديث رصيد الزبون
export async function createPayment(payment: Omit<Payment, 'id' | 'created_at'>): Promise<Payment> {
  // تحديد المبلغ حسب العملة
  const paymentData = {
    customer_id: payment.customer_id,
    amount_iqd: payment.currency_type === 'IQD' ? payment.amount_iqd : 0,
    amount_usd: payment.currency_type === 'USD' ? payment.amount_usd : 0,
    currency_type: payment.currency_type,
    transaction_type: payment.transaction_type,
    notes: payment.notes,
    pay_date: payment.pay_date,
  }
  
  // تسجيل الدفعة
  const { data, error } = await supabase
    .from('payments')
    .insert([paymentData])
    .select()
    .single()
  
  if (error) throw error
  
  // تحديث رصيد الزبون في جدول customers
  await updateCustomerBalanceAfterPayment(
    payment.customer_id,
    payment.currency_type === 'IQD' ? payment.amount_iqd : 0,
    payment.currency_type === 'USD' ? payment.amount_usd : 0,
    payment.transaction_type
  )
  
  return data
}

// تحديث رصيد الزبون بعد الدفعة
async function updateCustomerBalanceAfterPayment(
  customerId: string,
  amountIQD: number,
  amountUSD: number,
  transactionType: string
): Promise<void> {
  // جلب الرصيد الحالي
  const { data: customer, error: fetchError } = await supabase
    .from('customers')
    .select('balanceiqd, balanceusd')
    .eq('id', customerId)
    .single()
  
  if (fetchError) throw fetchError
  
  const currentBalanceIQD = customer?.balanceiqd || 0
  const currentBalanceUSD = customer?.balanceusd || 0
  
  // حساب الرصيد الجديد
  // قبض/ايداع = زيادة، سحب/صرف/قرض = نقصان
  const multiplier = ['قبض', 'ايداع'].includes(transactionType) ? 1 : -1
  
  const newBalanceIQD = currentBalanceIQD + (amountIQD * multiplier)
  const newBalanceUSD = currentBalanceUSD + (amountUSD * multiplier)
  
  // تحديث الرصيد
  const { error: updateError } = await supabase
    .from('customers')
    .update({
      balanceiqd: newBalanceIQD,
      balanceusd: newBalanceUSD,
      updated_at: new Date().toISOString()
    })
    .eq('id', customerId)
  
  if (updateError) throw updateError
}

// جلب دفعات عميل معين
export async function getCustomerPayments(customerId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('customer_id', customerId)
    .order('pay_date', { ascending: false })
  
  if (error) throw error
  return data || []
}

// حساب رصيد العميل
export async function getCustomerBalance(customerId: string): Promise<CustomerBalance> {
  
  // استدعاء الدالة المخزنة في قاعدة البيانات
  const { data, error } = await supabase
    .rpc('get_customer_balance', { customer_uuid: customerId })
  
  if (error) {
    // إذا فشلت الدالة، نحسب الرصيد يدوياً
    const payments = await getCustomerPayments(customerId)
    
    let balance_iqd = 0
    let balance_usd = 0
    
    payments.forEach(payment => {
      const multiplier = ['قبض', 'ايداع'].includes(payment.transaction_type) ? 1 : -1
      
      if (payment.currency_type === 'IQD') {
        balance_iqd += payment.amount_iqd * multiplier
      } else {
        balance_usd += payment.amount_usd * multiplier
      }
    })
    
    return { balance_iqd, balance_usd }
  }
  
  return data[0] || { balance_iqd: 0, balance_usd: 0 }
}

// جلب جميع العملاء مع أرصدتهم (من جدول customers مباشرة)
export async function getCustomersWithBalances(): Promise<(Customer & CustomerBalance)[]> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) throw error
  
  // تحويل البيانات للشكل المطلوب
  return (data || []).map(customer => ({
    ...customer,
    balance_iqd: customer.balanceiqd || 0,
    balance_usd: customer.balanceusd || 0
  }))
}

// ============================================
// دوال رفع الصور
// ============================================

// رفع صورة إلى Supabase Storage
export async function uploadCustomerImage(file: File): Promise<string> {
  const fileExt = file.name.split('.').pop()
  const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
  const filePath = `customers/${fileName}`
  
  const { error: uploadError } = await supabase.storage
    .from('customer-images')
    .upload(filePath, file)
  
  if (uploadError) throw uploadError
  
  // الحصول على الرابط العام
  const { data } = supabase.storage
    .from('customer-images')
    .getPublicUrl(filePath)
  
  return data.publicUrl
}

// حذف صورة من Supabase Storage
export async function deleteCustomerImage(imageUrl: string): Promise<void> {
  // استخراج المسار من الرابط
  const urlParts = imageUrl.split('/customer-images/')
  if (urlParts.length < 2) return
  
  const filePath = urlParts[1]
  
  const { error } = await supabase.storage
    .from('customer-images')
    .remove([filePath])
  
  if (error) throw error
}
