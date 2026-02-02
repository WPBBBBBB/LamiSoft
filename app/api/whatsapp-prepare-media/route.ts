import { NextRequest, NextResponse } from "next/server"
import { getWhatsAppSettings } from "@/lib/whatsapp-settings-operations"

function pickErrorMessage(data: unknown, fallback: string) {
  if (!data || typeof data !== "object") return fallback
  const anyData = data as { message?: string; error?: string; msg?: string; details?: string }
  return anyData.message || anyData.error || anyData.msg || anyData.details || fallback
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { image?: string; images?: string[] }
    const imagesRaw = Array.isArray(body?.images)
      ? body.images
      : (body?.image ? [body.image] : [])

    const images = imagesRaw.filter((x) => typeof x === "string" && x.trim().length > 0)

    if (!images || images.length === 0) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 })
    }

    if (images.length > 2) {
      return NextResponse.json(
        { error: "الحد الأقصى هو صورتين فقط" },
        { status: 400 }
      )
    }

    const settings = await getWhatsAppSettings()
    if (!settings?.api_key) {
      return NextResponse.json(
        {
          error:
            "مفتاح WASender API غير موجود في الإعدادات. يرجى إضافته من صفحة إعدادات الواتساب.",
        },
        { status: 500 }
      )
    }

    const publicUrls: string[] = []

    for (let i = 0; i < images.length; i++) {
      const uploadResp = await fetch("https://wasenderapi.com/api/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${settings.api_key}`,
        },
        body: JSON.stringify({ base64: images[i] }),
      })

      let data: unknown = null
      try {
        data = await uploadResp.json()
      } catch {
        // ignore
      }

      if (!uploadResp.ok) {
        const message = pickErrorMessage(data, `HTTP ${uploadResp.status}`)
        return NextResponse.json(
          { error: `فشل رفع الصورة إلى Wasender: ${message}` },
          { status: uploadResp.status }
        )
      }

      const publicUrl = (data as { publicUrl?: string } | null)?.publicUrl
      if (!publicUrl) {
        return NextResponse.json(
          { error: "فشل رفع الصورة: لم يتم إرجاع publicUrl" },
          { status: 500 }
        )
      }

      publicUrls.push(publicUrl)
    }

    // backward compatibility
    return NextResponse.json({ publicUrl: publicUrls[0], publicUrls })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { error: `Failed to prepare media: ${message}` },
      { status: 500 }
    )
  }
}
