import { supabase } from './supabase'

export interface Customer {
  id: string
  customer_name: string
  type: 'زبون' | 'مجهز' | 'موظف'
  phone_number?: string
  address?: string
  notes?: string
  image_url?: string
  balanceiqd?: number
  balanceusd?: number
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

export async function getCustomers(): Promise<Customer[]> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data || []
}

export async function getCustomer(id: string): Promise<Customer | null> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) throw error
  return data
}

export async function createCustomer(customer: Omit<Customer, 'id' | 'created_at' | 'updated_at'>): Promise<Customer> {
  const { data, error } = await supabase
    .from('customers')
    .insert([customer])
    .select()
    .single()
  
  if (error) throw error
  return data
}

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

export async function deleteCustomer(id: string): Promise<void> {
  // 1️⃣ التحقق من وجود قوائم بيع آجلة مرتبطة بالزبون
  const { data: deferredSales, error: salesError } = await supabase
    .from('tb_salesmain')
    .select('id, numberofsale, paytype')
    .eq('customerid', id)
    .eq('paytype', 'آجل')
  
  if (salesError) throw salesError
  
  if (deferredSales && deferredSales.length > 0) {
    const saleNumbers = deferredSales.map(s => s.numberofsale).join(', ')
    throw new Error(`لا يمكن حذف هذا الزبون لأنه مرتبط بـ ${deferredSales.length} قائمة بيع آجلة: (${saleNumbers}). الرجاء تسديد الديون أو حذف القوائم أولاً.`)
  }
  
  // 2️⃣ التحقق من وجود دفعات مرتبطة بالزبون
  const { data: payments, error: paymentsError } = await supabase
    .from('payments')
    .select('id')
    .eq('customer_id', id)
  
  if (paymentsError) throw paymentsError
  
  if (payments && payments.length > 0) {
    throw new Error(`لا يمكن حذف هذا الزبون لأنه مرتبط بـ ${payments.length} دفعة مالية. الرجاء حذف الدفعات أولاً.`)
  }
  
  // 3️⃣ إذا لم يكن هناك قوائم آجلة أو دفعات، يمكن الحذف
  // ملاحظة: القوائم النقدية ستحتفظ باسم الزبون في customername
  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

export async function deleteCustomers(ids: string[]): Promise<void> {
  // التحقق من كل زبون على حدة
  const errors: string[] = []
  const deletedIds: string[] = []
  
  for (const id of ids) {
    try {
      // التحقق من القوائم الآجلة
      const { data: deferredSales } = await supabase
        .from('tb_salesmain')
        .select('id, numberofsale, paytype, customername')
        .eq('customerid', id)
        .eq('paytype', 'آجل')
      
      if (deferredSales && deferredSales.length > 0) {
        const customerName = deferredSales[0].customername || 'غير معروف'
        errors.push(`${customerName}: مرتبط بـ ${deferredSales.length} قائمة آجلة`)
        continue
      }
      
      // التحقق من الدفعات
      const { data: payments } = await supabase
        .from('payments')
        .select('id')
        .eq('customer_id', id)
      
      if (payments && payments.length > 0) {
        const { data: customer } = await supabase
          .from('customers')
          .select('customer_name')
          .eq('id', id)
          .single()
        
        errors.push(`${customer?.customer_name || 'غير معروف'}: مرتبط بـ ${payments.length} دفعة مالية`)
        continue
      }
      
      deletedIds.push(id)
    } catch (error) {
      console.error('Error checking customer:', error)
    }
  }
  
  // حذف الزبائن الذين يمكن حذفهم
  if (deletedIds.length > 0) {
    const { error } = await supabase
      .from('customers')
      .delete()
      .in('id', deletedIds)
    
    if (error) throw error
  }
  
  // إذا كانت هناك أخطاء، اطرح استثناء
  if (errors.length > 0) {
    if (deletedIds.length > 0) {
      throw new Error(`تم حذف ${deletedIds.length} زبون. لا يمكن حذف البقية:\n${errors.join('\n')}`)
    } else {
      throw new Error(`لا يمكن حذف أي زبون:\n${errors.join('\n')}`)
    }
  }
}

export async function searchCustomers(query: string): Promise<Customer[]> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .or(`customer_name.ilike.%${query}%,phone_number.ilike.%${query}%,address.ilike.%${query}%`)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data || []
}

export async function createPayment(payment: Omit<Payment, 'id' | 'created_at'>): Promise<Payment> {
  const paymentData = {
    customer_id: payment.customer_id,
    amount_iqd: payment.currency_type === 'IQD' ? payment.amount_iqd : 0,
    amount_usd: payment.currency_type === 'USD' ? payment.amount_usd : 0,
    currency_type: payment.currency_type,
    transaction_type: payment.transaction_type,
    notes: payment.notes,
    pay_date: payment.pay_date,
  }
  
  const { data, error } = await supabase
    .from('payments')
    .insert([paymentData])
    .select()
    .single()
  
  if (error) throw error
  
  await updateCustomerBalanceAfterPayment(
    payment.customer_id,
    payment.currency_type === 'IQD' ? payment.amount_iqd : 0,
    payment.currency_type === 'USD' ? payment.amount_usd : 0,
    payment.transaction_type
  )
  
  return data
}

async function updateCustomerBalanceAfterPayment(
  customerId: string,
  amountIQD: number,
  amountUSD: number,
  transactionType: string
): Promise<void> {
  const { data: customer, error: fetchError } = await supabase
    .from('customers')
    .select('balanceiqd, balanceusd')
    .eq('id', customerId)
    .single()
  
  if (fetchError) throw fetchError
  
  const currentBalanceIQD = customer?.balanceiqd || 0
  const currentBalanceUSD = customer?.balanceusd || 0
  
  const multiplier = ['قبض', 'ايداع'].includes(transactionType) ? 1 : -1
  
  const newBalanceIQD = currentBalanceIQD + (amountIQD * multiplier)
  const newBalanceUSD = currentBalanceUSD + (amountUSD * multiplier)
  
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

export async function getCustomerPayments(customerId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('customer_id', customerId)
    .order('pay_date', { ascending: false })
  
  if (error) throw error
  return data || []
}

export async function getCustomerBalance(customerId: string): Promise<CustomerBalance> {
  
  const { data, error } = await supabase
    .rpc('get_customer_balance', { customer_uuid: customerId })
  
  if (error) {
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

export async function getCustomersWithBalances(): Promise<(Customer & CustomerBalance)[]> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) throw error
  
  return (data || []).map(customer => ({
    ...customer,
    balance_iqd: customer.balanceiqd || 0,
    balance_usd: customer.balanceusd || 0
  }))
}

export async function uploadCustomerImage(file: File): Promise<string> {
  const fileExt = file.name.split('.').pop()
  const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
  const filePath = `customers/${fileName}`
  
  const { error: uploadError } = await supabase.storage
    .from('customer-images')
    .upload(filePath, file)
  
  if (uploadError) throw uploadError
  
  const { data } = supabase.storage
    .from('customer-images')
    .getPublicUrl(filePath)
  
  return data.publicUrl
}

export async function deleteCustomerImage(imageUrl: string): Promise<void> {
  const urlParts = imageUrl.split('/customer-images/')
  if (urlParts.length < 2) return
  
  const filePath = urlParts[1]
  
  const { error } = await supabase.storage
    .from('customer-images')
    .remove([filePath])
  
  if (error) throw error
}
