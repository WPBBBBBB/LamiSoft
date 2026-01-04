import { NextRequest, NextResponse } from "next/server"
import { getWhatsAppSettings } from "@/lib/whatsapp-settings-operations"
import { formatIraqiPhoneNumber, replaceMessageVariables, delay, calculateDelay } from "@/lib/whatsapp-messaging-utils"

interface SendMessageRequest {
  customers: Array<{
    id: string
    customer_name: string
    phone_number: string
    last_payment_date: string | null
    last_payment_iqd: number
    last_payment_usd: number
    balanceiqd: number
    balanceusd: number
  }>
}

export async function POST(request: NextRequest) {
  try {
    const body: SendMessageRequest = await request.json()
    const { customers } = body
    
    if (!customers || customers.length === 0) {
      return NextResponse.json(
        { error: "No customers provided" },
        { status: 400 }
      )
    }
    
    const settings = await getWhatsAppSettings()
    
    if (!settings || !settings.api_key) {
      return NextResponse.json(
        { error: "مفتاح WASender API غير موجود في الإعدادات. يرجى إضافته من صفحة إعدادات الواتساب." },
        { status: 500 }
      )
    }
    
    const apiKey = settings.api_key
    const results = {
      total: customers.length,
      success: 0,
      failed: 0,
      errors: [] as Array<{ customer: string, error: string }>
    }
    
    for (let i = 0; i < customers.length; i++) {
      const customer = customers[i]
      
      try {
        const formattedPhone = formatIraqiPhoneNumber(customer.phone_number)
        
        if (!formattedPhone || formattedPhone === '+964') {
          results.failed++
          results.errors.push({
            customer: customer.customer_name,
            error: 'رقم هاتف غير صالح'
          })
          continue
        }
        
        const messageTitle = replaceMessageVariables(
          settings.normal_message_title,
          customer
        )
        const messageBody = replaceMessageVariables(
          settings.normal_message_body,
          customer
        )
        
        const fullMessage = `*${messageTitle}*\n\n${messageBody}`
        
        const wasenderResponse = await fetch('https://wasenderapi.com/api/send-message', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: formattedPhone,
            text: fullMessage,
          }),
        })
        
        if (wasenderResponse.ok) {
          results.success++
        } else {
          let errorMessage = 'فشل الإرسال'
          try {
            const errorDetails = await wasenderResponse.json()
            errorMessage = errorDetails.message || errorDetails.error || errorDetails.msg || `خطأ ${wasenderResponse.status}`
          } catch {
            errorMessage = `خطأ ${wasenderResponse.status}: ${wasenderResponse.statusText}`
          }
          results.failed++
          results.errors.push({
            customer: customer.customer_name,
            error: errorMessage
          })
        }
        
        if (i < customers.length - 1) {
          const delayTime = calculateDelay(
            settings.per_message_base_delay_ms,
            settings.per_message_jitter_ms
          )
          await delay(delayTime)
          
          if ((i + 1) % settings.batch_size === 0) {
            await delay(settings.batch_pause_ms)
          }
        }
        
      } catch (error) {
        let errorMessage = 'خطأ في الاتصال'
        if (error instanceof Error) {
          if (error.message.includes('fetch')) {
            errorMessage = 'فشل الاتصال بخادم WASender'
          } else {
            errorMessage = error.message
          }
        }
        results.failed++
        results.errors.push({
          customer: customer.customer_name,
          error: errorMessage
        })
      }
    }
    
    return NextResponse.json(results)
    
  } catch {
    return NextResponse.json(
      { error: "Failed to send messages" },
      { status: 500 }
    )
  }
}
