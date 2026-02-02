import { NextRequest, NextResponse } from "next/server"
import { getWhatsAppSettings } from "@/lib/whatsapp-settings-operations"
import { sendMediaMessage } from "@/lib/wasender-api-operations"

interface SendMediaRequest {
  customers: Array<{
    id: string
    customer_name: string
    phone_number: string
  }>
  image: string
  caption?: string
}

// حسب توثيق WasenderAPI: عند تفعيل Account Protection يصبح الحد 1 طلب لكل 5 ثواني.
// نستخدم حد أدنى آمن مشابه لنظام التذكير التلقائي لتجنب الحظر.
const ACCOUNT_PROTECTION_MIN_DELAY_MS = 5200

function coerceToNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value)
  return Number.isFinite(n) ? n : 0
}

function getSafeRandomDelayMs(baseDelay: unknown, jitter: unknown): number {
  const base = Math.max(coerceToNumber(baseDelay), ACCOUNT_PROTECTION_MIN_DELAY_MS)
  const j = Math.max(coerceToNumber(jitter), 0)
  // إذا لم يتم ضبط jitter، نضع عشوائية صغيرة لتجنب نمط ثابت.
  const effectiveJitter = j > 0 ? j : 500
  const min = base
  const max = base + effectiveJitter
  const safeMin = Math.ceil(min)
  const safeMax = Math.floor(max)
  if (!Number.isFinite(safeMin) || !Number.isFinite(safeMax) || safeMax <= safeMin) return safeMin
  return Math.floor(Math.random() * (safeMax - safeMin + 1)) + safeMin
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
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
        // نستخدم نفس منطق إرسال الوسائط الموجود في نظام التذكير التلقائي:
        // - رفع media إلى Wasender ثم الإرسال عبر imageUrl
        // - تعامل أفضل مع rate-limit
        const sendResult = await sendMediaMessage(
          apiKey,
          customer.phone_number,
          image,
          caption || ""
        )

        if (sendResult.success) {
          results.success++
        } else {
          results.failed++
          results.errors.push({
            customer: customer.customer_name,
            error: sendResult.error || "فشل الإرسال",
          })
        }

        // التأخير بين الرسائل/الوسائط لتجنب الحظر (مشابه لنظام التذكير التلقائي)
        if (i < customers.length - 1) {
          const delayMs = getSafeRandomDelayMs(
            settings.per_message_base_delay_ms,
            settings.per_message_jitter_ms
          )
          await sleep(delayMs)

          const batchSize = Math.max(1, coerceToNumber(settings.batch_size) || 1)
          if ((i + 1) % batchSize === 0) {
            const pauseMs = Math.max(coerceToNumber(settings.batch_pause_ms), ACCOUNT_PROTECTION_MIN_DELAY_MS)
            await sleep(pauseMs)
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
