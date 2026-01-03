export function formatIraqiPhoneNumber(phone: string): string {
  if (!phone) return ''
  
  let cleaned = phone.replace(/[\s\-\(\)]/g, '')
  
  cleaned = cleaned.replace(/^(\+|00)/, '')
  
  if (cleaned.startsWith('964')) {
    cleaned = cleaned.substring(3)
  }
  
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1)
  }
  
  return `+964${cleaned}`
}

export function replaceMessageVariables(
  template: string,
  customer: {
    customer_name: string
    last_payment_date: string | null
    last_payment_iqd: number
    last_payment_usd: number
    balanceiqd: number
    balanceusd: number
  },
  companyName: string = 'AL-LamiSoft'
): string {
  let message = template
  
  message = message.replace(/{CustomerName}/g, customer.customer_name)
  
  if (customer.last_payment_date) {
    const date = new Date(customer.last_payment_date)
    message = message.replace(
      /{LastPaymentDate}/g,
      date.toLocaleDateString('ar-IQ')
    )
  } else {
    message = message.replace(/{LastPaymentDate}/g, 'لا يوجد')
  }
  
  const lastAmountParts: string[] = []
  if (customer.last_payment_iqd > 0) {
    lastAmountParts.push(`${customer.last_payment_iqd.toLocaleString('en-US')} دينار`)
  }
  if (customer.last_payment_usd > 0) {
    lastAmountParts.push(`$${customer.last_payment_usd.toLocaleString('en-US')}`)
  }
  const lastAmountText = lastAmountParts.length > 0 
    ? lastAmountParts.join(' || ') 
    : 'لا يوجد'
  message = message.replace(/{LastAmount}/g, lastAmountText)
  
  const balanceParts: string[] = []
  if (customer.balanceiqd > 0) {
    balanceParts.push(`${customer.balanceiqd.toLocaleString('en-US')} دينار`)
  }
  if (customer.balanceusd > 0) {
    balanceParts.push(`$${customer.balanceusd.toLocaleString('en-US')}`)
  }
  const balanceText = balanceParts.length > 0 
    ? balanceParts.join(' || ') 
    : '0'
  message = message.replace(/{RemainingBalance}/g, balanceText)
  
  const now = new Date()
  message = message.replace(
    /{CurrentDate}/g,
    now.toLocaleDateString('ar-IQ')
  )
  message = message.replace(
    /{CurrentTime}/g,
    now.toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' })
  )
  
  message = message.replace(/{CompanyName}/g, companyName)
  
  return message
}

export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function calculateDelay(baseDelay: number, jitter: number): number {
  const randomJitter = Math.floor(Math.random() * jitter)
  return baseDelay + randomJitter
}
