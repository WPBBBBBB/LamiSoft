import { createClient } from "@supabase/supabase-js"
import { Buffer } from "buffer"
import { formatIraqiPhoneNumber } from "@/lib/whatsapp-messaging-utils"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

// حسب توثيق WasenderAPI: عند تفعيل Account Protection يصبح الحد 1 طلب لكل 5 ثواني.
// نضع هامش أمان بسيط لتجنب الاصطدام بالحد بالضبط.
const ACCOUNT_PROTECTION_MIN_DELAY_MS = 5200

// لتقليل احتمالية الحظر بسبب نمط ثابت (anti-spam)، نستخدم تأخيراً عشوائياً.
// افتراضياً نجعل التأخير بين ~5.2s و 8s (مع مراعاة Account Protection).
const DEFAULT_RANDOM_DELAY_MAX_MS = 8000
const DEFAULT_MIN_RANDOM_JITTER_MS = 500

export async function getWhatsAppSettings() {
  try {
    console.log("[getWhatsAppSettings] Fetching from reminder_whatsapp_settings table...")
    
    const { data, error } = await supabase
      .from("reminder_whatsapp_settings")
      .select("*")
      .single()

    if (error) {
      console.error("[getWhatsAppSettings] Error fetching WhatsApp settings:", error)
      console.error("[getWhatsAppSettings] Error details:", JSON.stringify(error))
      return null
    }

    console.log("[getWhatsAppSettings] Settings fetched successfully")
    console.log("[getWhatsAppSettings] Data:", data)
    console.log("[getWhatsAppSettings] API Key exists:", !!data?.api_key)
    console.log("[getWhatsAppSettings] API Key value:", data?.api_key ? `${data.api_key.substring(0, 15)}...` : "MISSING")

    return data
  } catch (error) {
    console.error("[getWhatsAppSettings] Exception in getWhatsAppSettings:", error)
    return null
  }
}

/**
 * الحصول على قالب الرسالة من قاعدة البيانات
 */
export async function getMessageTemplate() {
  try {
    const { data, error } = await supabase
      .from("reminder_message_template")
      .select("*")
      .single()

    if (error) {
      console.error("Error fetching message template:", error)
      return null
    }

    return data
  } catch (error) {
    console.error("Error in getMessageTemplate:", error)
    return null
  }
}

/**
 * حساب التأخير مع jitter
 */
export function calculateDelay(baseDelay: number, jitterFactor: number): number {
  const jitter = Math.random() * jitterFactor
  return baseDelay + jitter
}

function getRandomIntInclusive(min: number, max: number): number {
  const safeMin = Math.ceil(min)
  const safeMax = Math.floor(max)
  if (!Number.isFinite(safeMin) || !Number.isFinite(safeMax) || safeMax <= safeMin) return safeMin
  return Math.floor(Math.random() * (safeMax - safeMin + 1)) + safeMin
}

function coerceToNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value)
  return Number.isFinite(n) ? n : 0
}

function getSafeDelayMs(baseDelay: number, jitterFactor: number): number {
  // نضمن حد أدنى مناسب لإرسال الرسائل/الصور لتجنب Rate Limit عند تفعيل Account Protection.
  const safeBase = Math.max(baseDelay || 0, ACCOUNT_PROTECTION_MIN_DELAY_MS)
  return calculateDelay(safeBase, jitterFactor || 0)
}

function getSafeRandomDelayMs(baseDelay: unknown, jitterFactor: unknown): number {
  const base = Math.max(coerceToNumber(baseDelay), ACCOUNT_PROTECTION_MIN_DELAY_MS)
  const configuredJitter = coerceToNumber(jitterFactor)

  // إذا لم يتم ضبط jitter_factor في الإعدادات، نجعل المدى يصل افتراضياً إلى 8 ثواني.
  // وإذا كان base أكبر من 8 ثواني، نبقي عشوائية صغيرة لتجنب نمط ثابت.
  const autoJitter = Math.max(DEFAULT_MIN_RANDOM_JITTER_MS, DEFAULT_RANDOM_DELAY_MAX_MS - base)
  const jitter = configuredJitter > 0 ? configuredJitter : autoJitter

  const min = base
  const max = base + jitter
  return getRandomIntInclusive(min, max)
}

function coerceToOptionalString(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  try {
    return String(value)
  } catch {
    return undefined
  }
}

/**
 * إرسال رسالة نصية عبر wasenderapi
 */
export async function sendTextMessage(
  apiKey: string,
  phoneNumber: string,
  message: string
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const response = await fetch("https://api.wasenderapi.com/api/v1/messages/text", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        phone: phoneNumber,
        message: message,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error("Failed to send message:", data)
      return {
        success: false,
        error: data.message || "Failed to send message",
      }
    }

    return {
      success: true,
      data: data,
    }
  } catch (error) {
    console.error("Error sending text message:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * إرسال صورة عبر wasenderapi
 */
export async function sendMediaMessage(
  apiKey: string,
  phoneNumber: string,
  mediaUrl: string,
  caption?: string
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
    const retryDelayMs = ACCOUNT_PROTECTION_MIN_DELAY_MS

    console.log("[sendMediaMessage] Starting...")
    const formattedPhone = formatIraqiPhoneNumber(phoneNumber)
    // بعض مزودي WhatsApp API يتوقعون الرقم بدون علامة +
    const formattedNoPlus = formattedPhone.startsWith("+") ? formattedPhone.slice(1) : formattedPhone
    // لتجنب إرسال محاولات كثيرة بسرعة (التي تفعل Account Protection)، نكتفي بصيغتين شائعتين فقط.
    const phoneCandidates = Array.from(new Set([formattedPhone, formattedNoPlus].filter(Boolean)))

    if (!formattedPhone || formattedPhone === "+964") {
      return {
        success: false,
        error: "رقم هاتف غير صالح. يرجى إدخال رقم عراقي صحيح مثل: 077xxxxxxxx أو 9647xxxxxxxx",
      }
    }

    console.log("[sendMediaMessage] Phone:", phoneNumber, "=> candidates:", phoneCandidates)
    console.log("[sendMediaMessage] MediaUrl:", mediaUrl)
    console.log("[sendMediaMessage] Caption:", caption)
    console.log("[sendMediaMessage] API Key:", apiKey ? `${apiKey.substring(0, 10)}...` : "MISSING")

    // حسب التوثيق الرسمي:
    // - إرسال صورة يكون عبر POST /api/send-message
    // - الحقل الصحيح هو imageUrl (وليس image)
    // - رفع media (base64 أو binary) يكون عبر POST /api/upload ويُرجع publicUrl
    const sendMessageEndpoint = "https://wasenderapi.com/api/send-message"
    const uploadEndpoint = "https://wasenderapi.com/api/upload"

    const uploadMediaToWasender = async (base64DataUrl: string): Promise<string> => {
      const response = await fetch(uploadEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // بعض الحسابات تتطلب Authorization على الرفع كذلك، وضعه آمن.
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          base64: base64DataUrl,
        }),
      })

      let data: unknown = null
      try {
        data = await response.json()
      } catch {
        // ignore
      }

      if (!response.ok) {
        const messageText =
          (data as { message?: string; error?: string; msg?: string } | null)?.message ||
          (data as { message?: string; error?: string; msg?: string } | null)?.error ||
          (data as { message?: string; error?: string; msg?: string } | null)?.msg
        throw new Error(messageText || (data ? JSON.stringify(data) : `HTTP ${response.status}`))
      }

      const publicUrl = (data as { publicUrl?: string } | null)?.publicUrl
      if (!publicUrl) {
        throw new Error("فشل رفع الصورة: لم يتم إرجاع publicUrl من Wasender")
      }
      return publicUrl
    }

    const toDataUrl = async (urlOrData: string): Promise<string> => {
      if (!urlOrData) return urlOrData
      if (urlOrData.startsWith("data:")) return urlOrData

      console.log("[sendMediaMessage] Fetching image and converting to base64 for upload...")
      const imageResponse = await fetch(urlOrData)
      if (!imageResponse.ok) {
        throw new Error(`فشل جلب الصورة: ${imageResponse.status}`)
      }
      const imageBlob = await imageResponse.blob()
      const arrayBuffer = await imageBlob.arrayBuffer()
      const base64 = Buffer.from(arrayBuffer).toString("base64")
      const mimeType = imageBlob.type || "image/jpeg"
      const dataUrl = `data:${mimeType};base64,${base64}`
      console.log("[sendMediaMessage] Base64 size:", base64.length)
      return dataUrl
    }

    const ensureWasenderPublicUrl = async (urlOrData: string): Promise<string> => {
      // إذا كان الرابط مسبقاً من Wasender media، نستخدمه مباشرة.
      if (urlOrData.startsWith("https://wasenderapi.com/media/") || urlOrData.startsWith("https://www.wasenderapi.com/media/")) {
        return urlOrData
      }

      const dataUrl = await toDataUrl(urlOrData)
      return await uploadMediaToWasender(dataUrl)
    }

    const trySend = async (to: string, imageUrl: string) => {
      // حسب التوثيق: text اختياري عند وجود media.
      // لتجنب أخطاء المزود مثل "The text field must be a string"، لا نرسل text إطلاقاً إذا كان فارغاً.
      const safeCaption = coerceToOptionalString(caption)
      const requestBody: { to: string; imageUrl: string; text?: string } = {
        to,
        imageUrl,
      }
      if (safeCaption && safeCaption.trim().length > 0) {
        requestBody.text = safeCaption
      }

      const response = await fetch(sendMessageEndpoint, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      let data: unknown = null
      try {
        data = await response.json()
      } catch {
        // ignore non-json
      }

      return { response, data }
    }

    // ملاحظة: Wasender لا يقبل base64 مباشرةً في /api/send-message. يجب رفعه أولاً إلى /api/upload.
    // لذلك نحول أي (URL أو dataURL) إلى publicUrl لدى Wasender ثم نرسله كـ imageUrl.
    let imageUrlForSending: string
    try {
      imageUrlForSending = await ensureWasenderPublicUrl(mediaUrl)
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? `فشل تجهيز الصورة للإرسال: ${e.message}` : "فشل تجهيز الصورة للإرسال",
      }
    }

    if (!imageUrlForSending) {
      return {
        success: false,
        error: "فشل تجهيز الصورة للإرسال: رابط الصورة النهائي فارغ",
      }
    }

    console.log("[sendMediaMessage] Sending media via imageUrl ...")
    let response: Response | null = null
    let data: unknown = null
    let lastMessageText: string | undefined

    for (const candidate of phoneCandidates) {
      if (response && !response.ok) {
        await sleep(retryDelayMs)
      }

      let res = await trySend(candidate, imageUrlForSending)
      response = res.response
      data = res.data

      const messageText =
        (data as { message?: string; error?: string; msg?: string } | null)?.message ||
        (data as { message?: string; error?: string; msg?: string } | null)?.error ||
        (data as { message?: string; error?: string; msg?: string } | null)?.msg
      lastMessageText = messageText

      const msgLower = String(messageText || "").toLowerCase()
      const isRateLimited =
        msgLower.includes("account protection") ||
        msgLower.includes("only send 1 message") ||
        msgLower.includes("every 5")

      // إذا واجهنا Rate Limit: انتظر حسب retry_after إن وجد ثم أعد المحاولة مرة واحدة.
      if (!response.ok && isRateLimited) {
        const retryAfterSeconds = (data as { retry_after?: number } | null)?.retry_after
        const waitMs =
          typeof retryAfterSeconds === "number" && retryAfterSeconds > 0
            ? Math.ceil(retryAfterSeconds * 1000) + 200
            : retryDelayMs

        console.warn(`[sendMediaMessage] Rate limited. Waiting ${waitMs}ms then retrying...`)
        await sleep(waitMs)

        res = await trySend(candidate, imageUrlForSending)
        response = res.response
        data = res.data

        if (!response.ok) {
          return {
            success: false,
            error:
              "حماية الحساب مفعلة لدى مزود الخدمة: يسمح بإرسال رسالة واحدة كل 5 ثوانٍ. " +
              "حسب التوثيق الرسمي، اجعل الانتظار بين الرسائل >= 5 ثوانٍ. تم إعادة المحاولة تلقائياً وما زال هناك حد. " +
              "ارفع (مدة التأخير بين الرسائل) إلى 5200ms أو أكثر.",
          }
        }
      }

      if (response.ok) break

      // إذا الخطأ ليس متعلقاً بصيغة الرقم/الوجود على واتساب، لا داعي لتجربة صيغ أخرى
      const isJidProblem = msgLower.includes("jid") || msgLower.includes("exist on whatsapp")
      if (!isJidProblem) break
    }

    if (!response || !response.ok) {
      const detailed =
        lastMessageText || (data ? JSON.stringify(data) : null) || (response ? `HTTP ${response.status}` : "No response")
      return {
        success: false,
        error: detailed,
      }
    }

    return {
      success: true,
      data: data,
    }
  } catch (error) {
    console.error("Error sending media message:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * إرسال رسالة مع مراعاة الإعدادات (delays, breaks, etc.)
 */
export async function sendMessageWithSettings(
  phoneNumber: string,
  message: string,
  messageCount: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const settings = await getWhatsAppSettings()
    
    if (!settings || !settings.api_key) {
      return {
        success: false,
        error: "إعدادات الواتساب غير موجودة أو API Key مفقود",
      }
    }

    // إضافة تأخير بناءً على عدد الرسائل المرسلة
    if (messageCount > 0) {
      // التحقق إذا كان يجب أخذ استراحة
      if (messageCount % settings.messages_before_break === 0) {
        const waitMs = Math.max(coerceToNumber(settings.break_duration), ACCOUNT_PROTECTION_MIN_DELAY_MS)
        console.log(`Taking break after ${messageCount} messages for ${waitMs}ms`)
        await new Promise(resolve => setTimeout(resolve, waitMs))
      } else {
        // تأخير عشوائي (لتجنب نمط ثابت) مع حد أدنى آمن لتفادي rate limit
        const delay = getSafeRandomDelayMs(settings.delay_between_messages, settings.jitter_factor)
        console.log(`Waiting ${delay}ms before sending message`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    // إرسال الرسالة
    const result = await sendTextMessage(settings.api_key, phoneNumber, message)
    
    return result
  } catch (error) {
    console.error("Error in sendMessageWithSettings:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * إرسال صورة مع مراعاة الإعدادات
 */
export async function sendMediaWithSettings(
  phoneNumber: string,
  mediaUrl: string,
  caption: string,
  messageCount: number
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`[sendMediaWithSettings] Starting for phone: ${phoneNumber}`)
    const settings = await getWhatsAppSettings()
    
    if (!settings || !settings.api_key) {
      console.error("[sendMediaWithSettings] Settings not found or API key missing")
      console.log("[sendMediaWithSettings] Settings:", settings)
      return {
        success: false,
        error: "إعدادات الواتساب غير موجودة أو API Key مفقود",
      }
    }
    
    console.log("[sendMediaWithSettings] Settings loaded successfully")

    // إضافة تأخير بناءً على عدد الرسائل المرسلة
    if (messageCount > 0) {
      if (messageCount % settings.messages_before_break === 0) {
        const waitMs = Math.max(coerceToNumber(settings.break_duration), ACCOUNT_PROTECTION_MIN_DELAY_MS)
        console.log(`Taking break after ${messageCount} messages for ${waitMs}ms`)
        await new Promise(resolve => setTimeout(resolve, waitMs))
      } else {
        const delay = getSafeRandomDelayMs(settings.delay_between_messages, settings.jitter_factor)
        console.log(`Waiting ${delay}ms before sending media`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    // إرسال الصورة
    const result = await sendMediaMessage(settings.api_key, phoneNumber, mediaUrl, caption)
    
    return result
  } catch (error) {
    console.error("Error in sendMediaWithSettings:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * إنشاء رسالة من القالب مع استبدال الكود
 */
export async function generateMessageFromTemplate(code: string): Promise<string | null> {
  try {
    const template = await getMessageTemplate()
    
    if (!template) {
      return null
    }

    // استبدال {CODE} بالكود الفعلي
    const message = `${template.message_title}\n\n${template.message_body.replace("{CODE}", code)}`
    
    return message
  } catch (error) {
    console.error("Error generating message:", error)
    return null
  }
}

/**
 * إرسال رسائل متعددة (Bulk Send)
 */
export async function sendBulkMessages(
  recipients: Array<{ phone: string; message: string }>,
  onProgress?: (current: number, total: number, status: string) => void
): Promise<{ 
  success: number; 
  failed: number; 
  results: Array<{ phone: string; success: boolean; error?: string }> 
}> {
  const results: Array<{ phone: string; success: boolean; error?: string }> = []
  let successCount = 0
  let failedCount = 0

  for (let i = 0; i < recipients.length; i++) {
    const recipient = recipients[i]
    
    if (onProgress) {
      onProgress(i + 1, recipients.length, `Sending to ${recipient.phone}`)
    }

    const result = await sendMessageWithSettings(recipient.phone, recipient.message, i)
    
    if (result.success) {
      successCount++
      results.push({
        phone: recipient.phone,
        success: true,
      })
    } else {
      failedCount++
      results.push({
        phone: recipient.phone,
        success: false,
        error: result.error,
      })
    }
  }

  return {
    success: successCount,
    failed: failedCount,
    results,
  }
}

/**
 * إرسال صور متعددة (Bulk Send Media)
 */
export async function sendBulkMedia(
  recipients: Array<{ phone: string; mediaUrl: string; caption: string }>,
  onProgress?: (current: number, total: number, status: string) => void,
  startIndex: number = 0
): Promise<{ 
  success: number; 
  failed: number; 
  results: Array<{ phone: string; success: boolean; error?: string }> 
}> {
  const results: Array<{ phone: string; success: boolean; error?: string }> = []
  let successCount = 0
  let failedCount = 0

  // نجلب الإعدادات مرة واحدة (بدلاً من استدعائها داخل الحلقة لكل مستلم)
  const settings = await getWhatsAppSettings()
  if (!settings || !settings.api_key) {
    for (const r of recipients) {
      results.push({
        phone: r.phone,
        success: false,
        error: "إعدادات الواتساب غير موجودة أو API Key مفقود",
      })
    }
    return {
      success: 0,
      failed: recipients.length,
      results,
    }
  }

  // لتحسين الأداء: نخزن publicUrl الناتج من /api/upload لكل صورة مرة واحدة.
  const mediaCache = new Map<string, string>()
  const uploadEndpoint = "https://wasenderapi.com/api/upload"

  const toWasenderPublicUrl = async (apiKey: string, urlOrData: string): Promise<string> => {
    if (!urlOrData) return urlOrData
    const cached = mediaCache.get(urlOrData)
    if (cached) return cached

    // إذا كان الرابط مسبقاً من Wasender media، لا حاجة للرفع.
    if (urlOrData.startsWith("https://wasenderapi.com/media/") || urlOrData.startsWith("https://www.wasenderapi.com/media/")) {
      mediaCache.set(urlOrData, urlOrData)
      return urlOrData
    }

    let base64DataUrl = urlOrData
    if (!urlOrData.startsWith("data:")) {
      const resp = await fetch(urlOrData)
      if (!resp.ok) {
        throw new Error(`فشل جلب الصورة (${resp.status})`) 
      }
      const blob = await resp.blob()
      const arrayBuffer = await blob.arrayBuffer()
      const base64 = Buffer.from(arrayBuffer).toString("base64")
      const mimeType = blob.type || "image/jpeg"
      base64DataUrl = `data:${mimeType};base64,${base64}`
    }

    const uploadResp = await fetch(uploadEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ base64: base64DataUrl }),
    })

    let uploadData: unknown = null
    try {
      uploadData = await uploadResp.json()
    } catch {
      // ignore
    }

    if (!uploadResp.ok) {
      const messageText =
        (uploadData as { message?: string; error?: string; msg?: string } | null)?.message ||
        (uploadData as { message?: string; error?: string; msg?: string } | null)?.error ||
        (uploadData as { message?: string; error?: string; msg?: string } | null)?.msg
      throw new Error(messageText || (uploadData ? JSON.stringify(uploadData) : `HTTP ${uploadResp.status}`))
    }

    const publicUrl = (uploadData as { publicUrl?: string } | null)?.publicUrl
    if (!publicUrl) {
      throw new Error("فشل رفع الصورة: لم يتم إرجاع publicUrl من Wasender")
    }
    mediaCache.set(urlOrData, publicUrl)
    return publicUrl
  }

  for (let i = 0; i < recipients.length; i++) {
    const recipient = recipients[i]
    const messageIndex = startIndex + i

    if (onProgress) {
      onProgress(i + 1, recipients.length, `Sending media to ${recipient.phone}`)
    }

    try {
      // نفس منطق التأخير الموجود في sendMediaWithSettings ولكن بدون إعادة جلب الإعدادات كل مرة
      if (messageIndex > 0) {
        if (messageIndex % settings.messages_before_break === 0) {
          const waitMs = Math.max(coerceToNumber(settings.break_duration), ACCOUNT_PROTECTION_MIN_DELAY_MS)
          console.log(`Taking break after ${messageIndex} messages for ${waitMs}ms`)
          await new Promise(resolve => setTimeout(resolve, waitMs))
        } else {
          const delay = getSafeRandomDelayMs(settings.delay_between_messages, settings.jitter_factor)
          console.log(`Waiting ${delay}ms before sending media`)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }

      // نرفع الصورة مرة واحدة لكل mediaUrl (مع كاش)، ثم نرسلها كـ imageUrl
      const publicUrl = await toWasenderPublicUrl(settings.api_key, recipient.mediaUrl)
      const result = await sendMediaMessage(settings.api_key, recipient.phone, publicUrl, coerceToOptionalString(recipient.caption) || "")

      if (result.success) {
        successCount++
        results.push({
          phone: recipient.phone,
          success: true,
        })
      } else {
        failedCount++
        results.push({
          phone: recipient.phone,
          success: false,
          error: result.error,
        })
      }
    } catch (e) {
      failedCount++
      results.push({
        phone: recipient.phone,
        success: false,
        error: e instanceof Error ? e.message : String(e),
      })
    }
  }

  return {
    success: successCount,
    failed: failedCount,
    results,
  }
}
