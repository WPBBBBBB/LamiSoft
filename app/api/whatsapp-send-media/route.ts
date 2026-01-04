import { NextRequest, NextResponse } from "next/server"
import { getWhatsAppSettings } from "@/lib/whatsapp-settings-operations"
import { formatIraqiPhoneNumber, delay, calculateDelay } from "@/lib/whatsapp-messaging-utils"

interface SendMediaRequest {
  customers: Array<{
    id: string
    customer_name: string
    phone_number: string
  }>
  image: string
  caption?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: SendMediaRequest = await request.json()
    const { customers, image, caption } = body
    
    if (!customers || customers.length === 0) {
      return NextResponse.json(
        { error: "No customers provided" },
        { status: 400 }
      )
    }

    if (!image) {
      return NextResponse.json(
        { error: "No image provided" },
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
        
        const messageData: { to: string; text: string; image: string } = {
          to: formattedPhone,
          text: caption || 'صورة',
          image: '',
        }
        
        if (image.startsWith('data:image')) {
          messageData.image = image
        } else {
          messageData.image = image
        }
        
        const wasenderResponse = await fetch('https://wasenderapi.com/api/send-message', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(messageData),
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
      { error: "Failed to send media" },
      { status: 500 }
    )
  }
}
