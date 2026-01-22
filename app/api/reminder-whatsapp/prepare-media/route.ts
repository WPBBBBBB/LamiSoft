import { NextRequest, NextResponse } from "next/server"
import { Buffer } from "buffer"
import { getWhatsAppSettings } from "@/lib/wasender-api-operations"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const mediaUrls = Array.isArray(body?.mediaUrls) ? (body.mediaUrls as string[]) : []

    if (!mediaUrls.length) {
      return NextResponse.json({ error: "قائمة الصور مطلوبة" }, { status: 400 })
    }

    const settings = await getWhatsAppSettings()
    if (!settings?.api_key) {
      return NextResponse.json(
        { error: "إعدادات الواتساب غير موجودة أو API Key مفقود" },
        { status: 400 }
      )
    }

    const apiKey = settings.api_key as string
    const uploadEndpoint = "https://wasenderapi.com/api/upload"

    const cache = new Map<string, string>()

    const toDataUrl = async (urlOrData: string): Promise<string> => {
      if (!urlOrData) return urlOrData
      if (urlOrData.startsWith("data:")) return urlOrData

      const resp = await fetch(urlOrData)
      if (!resp.ok) {
        throw new Error(`فشل جلب الصورة (${resp.status})`)
      }
      const blob = await resp.blob()
      const arrayBuffer = await blob.arrayBuffer()
      const base64 = Buffer.from(arrayBuffer).toString("base64")
      const mimeType = blob.type || "image/jpeg"
      return `data:${mimeType};base64,${base64}`
    }

    const uploadDataUrl = async (dataUrl: string): Promise<string> => {
      const response = await fetch(uploadEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ base64: dataUrl }),
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

    const toWasenderPublicUrl = async (urlOrData: string): Promise<string> => {
      if (!urlOrData) return urlOrData

      // إذا كان الرابط مسبقاً من Wasender media، نستخدمه مباشرة.
      if (
        urlOrData.startsWith("https://wasenderapi.com/media/") ||
        urlOrData.startsWith("https://www.wasenderapi.com/media/")
      ) {
        return urlOrData
      }

      const cached = cache.get(urlOrData)
      if (cached) return cached

      const dataUrl = await toDataUrl(urlOrData)
      const publicUrl = await uploadDataUrl(dataUrl)
      cache.set(urlOrData, publicUrl)
      return publicUrl
    }

    const publicUrls = await Promise.all(mediaUrls.map(toWasenderPublicUrl))

    return NextResponse.json({ success: true, publicUrls })
  } catch (error) {
    console.error("Error in prepare-media API:", error)
    return NextResponse.json(
      {
        error: "حدث خطأ أثناء تجهيز الصور",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
