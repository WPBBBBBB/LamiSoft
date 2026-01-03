import { supabase } from './supabase'

export interface WhatsAppCustomer {
  id: string
  customer_name: string
  phone_number: string
  balanceiqd: number
  balanceusd: number
  last_payment_date: string | null
  last_payment_iqd: number
  last_payment_usd: number
}

export async function getCustomersWithPayments(): Promise<WhatsAppCustomer[]> {
  console.log('getCustomersWithPayments: Starting...')
  
  const { data: allCustomers, error: customersError } = await supabase
    .from('customers')
    .select('id, customer_name, phone_number, balanceiqd, balanceusd')
    .eq('type', 'زبون')
    .order('customer_name', { ascending: true })
  
  console.log('All customers query result:', { 
    count: allCustomers?.length, 
    error: customersError,
    sample: allCustomers?.[0]
  })
  
  if (customersError) {
    console.error('Error fetching customers:', customersError)
    throw customersError
  }

  if (!allCustomers || allCustomers.length === 0) {
    console.log('No customers found at all')
    return []
  }
  
  const customers = allCustomers.filter(c => 
    (c.balanceiqd !== null && c.balanceiqd > 0) || 
    (c.balanceusd !== null && c.balanceusd > 0)
  )
  
  console.log('Filtered customers with positive balance (debtors):', customers.length)

  const customerIds = customers.map(c => c.id)
  
  const { data: payments, error: paymentsError } = await supabase
    .from('payments')
    .select('customer_id, pay_date, amount_iqd, amount_usd')
    .in('customer_id', customerIds)
    .eq('transaction_type', 'قبض')
    .order('pay_date', { ascending: false })

  console.log('Payments query result:', { count: payments?.length, error: paymentsError, sample: payments?.[0] })
  
  if (paymentsError) {
    console.error('Error fetching payments:', paymentsError)
    throw paymentsError
  }

  const result: WhatsAppCustomer[] = customers.map(customer => {
    const lastPayment = payments?.find(p => p.customer_id === customer.id)
    
    console.log(`Customer ${customer.customer_name}: lastPayment =`, lastPayment)
    
    return {
      id: customer.id,
      customer_name: customer.customer_name,
      phone_number: customer.phone_number || '',
      balanceiqd: Math.abs(customer.balanceiqd || 0),
      balanceusd: Math.abs(customer.balanceusd || 0),
      last_payment_date: lastPayment?.pay_date || null,
      last_payment_iqd: lastPayment?.amount_iqd || 0,
      last_payment_usd: lastPayment?.amount_usd || 0,
    }
  })

  return result
}
