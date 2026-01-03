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
  console.log('========== Send WhatsApp Media API Called ==========')
  
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
    
    console.log(`Preparing to send media to ${customers.length} customers`)
    
    const settings = await getWhatsAppSettings()
    console.log('📋 الإعدادات المسترجعة:', {
      hasSettings: !!settings,
      hasApiKey: !!settings?.api_key,
      apiKeyLength: settings?.api_key?.length,
      apiKeyPreview: settings?.api_key ? `${settings.api_key.substring(0, 10)}...` : 'غير موجود'
    })
    
    if (!settings || !settings.api_key) {
      console.error('❌ خطأ: API key غير موجود في الإعدادات')
      return NextResponse.json(
        { error: "مفتاح WASender API غير موجود في الإعدادات. يرجى إضافته من صفحة إعدادات الواتساب." },
        { status: 500 }
      )
    }
    
    const apiKey = settings.api_key
    console.log('✅ API Key جاهز للاستخدام')
    
    const results = {
      total: customers.length,
      success: 0,
      failed: 0,
      errors: [] as Array<{ customer: string, error: string }>
    }
    
    console.log('📤 تحضير الصورة للإرسال...')
    console.log('📏 حجم الصورة (Base64):', image.length, 'حرف')
    
    for (let i = 0; i < customers.length; i++) {
      const customer = customers[i]
      
      try {
        const formattedPhone = formatIraqiPhoneNumber(customer.phone_number)
        
        if (!formattedPhone || formattedPhone === '+964') {
          console.log(`Skipping customer ${customer.customer_name}: Invalid phone number`)
          results.failed++
          results.errors.push({
            customer: customer.customer_name,
            error: 'رقم هاتف غير صالح'
          })
          continue
        }
        
        console.log(`📤 إرسال صورة إلى: ${customer.customer_name} (${formattedPhone})`)
        
        console.log('🔗 إرسال طلب إلى WASender API...')
        
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
        
        console.log('📦 بيانات الإرسال:', {
          to: formattedPhone,
          hasImage: !!messageData.image,
          imageSize: image.length,
          text: messageData.text
        })
        
        const wasenderResponse = await fetch('https://wasenderapi.com/api/send-message', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(messageData),
        })
        
        console.log('📡 رد WASender:', {
          status: wasenderResponse.status,
          statusText: wasenderResponse.statusText,
          ok: wasenderResponse.ok
        })
        
        if (wasenderResponse.ok) {
          const responseData = await wasenderResponse.json()
          console.log(`✅ تم إرسال الصورة بنجاح إلى ${customer.customer_name}`, responseData)
          results.success++
        } else {
          let errorMessage = 'فشل الإرسال'
          let errorDetails = null
          try {
            errorDetails = await wasenderResponse.json()
            console.log('❌ تفاصيل خطأ WASender:', errorDetails)
            errorMessage = errorDetails.message || errorDetails.error || errorDetails.msg || `خطأ ${wasenderResponse.status}`
          } catch {
            errorMessage = `خطأ ${wasenderResponse.status}: ${wasenderResponse.statusText}`
          }
          console.error(`❌ فشل الإرسال إلى ${customer.customer_name}:`, errorMessage)
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
          console.log(`Waiting ${delayTime}ms before next message...`)
          await delay(delayTime)
          
          if ((i + 1) % settings.batch_size === 0) {
            console.log(`Batch completed. Waiting ${settings.batch_pause_ms}ms...`)
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
        console.error(`Error sending to ${customer.customer_name}:`, error)
        results.failed++
        results.errors.push({
          customer: customer.customer_name,
          error: errorMessage
        })
      }
    }
    
    console.log('Send complete:', results)
    return NextResponse.json(results)
    
  } catch (error) {
    console.error("Error in send media API:", error)
    return NextResponse.json(
      { error: "Failed to send media" },
      { status: 500 }
    )
  }
}
