import { NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import { existsSync } from "fs"
import path from "path"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    
    if (!file) {
      return NextResponse.json(
        { error: "لم يتم رفع ملف" },
        { status: 400 }
      )
    }

    // التحقق من نوع الملف
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "نوع الملف غير مدعوم. يرجى رفع صورة (jpg, png, gif, webp)" },
        { status: 400 }
      )
    }

    // التحقق من حجم الملف (5MB max)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "حجم الملف كبير جداً. الحد الأقصى 5MB" },
        { status: 400 }
      )
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // في بيئات Serverless (مثل Vercel) لا يمكن الاعتماد على الكتابة داخل public لأن الملفات لا تُخدم دائماً بعد الكتابة.
    // لذلك نحاول أولاً رفع الصورة إلى Supabase Storage (خيار الأفضل للإنتاج).
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const bucketName = process.env.SUPABASE_CAMPAIGN_BUCKET || "reminder-campaign"
    const isProd = process.env.NODE_ENV === "production" || !!process.env.VERCEL

    // إنشاء اسم فريد للملف
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(7)
    const ext = file.name.split(".").pop()
    const filename = `${timestamp}-${randomStr}.${ext}`

    // 1) Supabase Storage (للإنتاج + الأفضل)
    if (supabaseUrl && supabaseKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey)
        const objectPath = `campaign/${filename}`

        const { error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(objectPath, buffer, {
            contentType: file.type,
            upsert: false,
          })

        if (uploadError) {
          // في الإنتاج لا نريد fallback للـ filesystem لأنه سيؤدي إلى 404 لاحقاً
          if (isProd) {
            return NextResponse.json(
              {
                error: "فشل رفع الصورة إلى التخزين (Supabase Storage)",
                details: uploadError.message || uploadError,
                hint:
                  "تأكد من إنشاء bucket باسم reminder-campaign (أو ضع SUPABASE_CAMPAIGN_BUCKET) وجعله Public أو إضافة policies تسمح بالرفع.",
              },
              { status: 500 }
            )
          }
        } else {
          const { data: publicData } = supabase.storage.from(bucketName).getPublicUrl(objectPath)
          const publicUrl = publicData?.publicUrl
          if (!publicUrl) {
            if (isProd) {
              return NextResponse.json(
                { error: "تم رفع الصورة لكن تعذر الحصول على رابط عام" },
                { status: 500 }
              )
            }
          } else {
            return NextResponse.json({
              success: true,
              url: publicUrl,
              filename,
            })
          }
        }
      } catch (e) {
        if (isProd) {
          return NextResponse.json(
            {
              error: "فشل الاتصال بـ Supabase Storage",
              details: e instanceof Error ? e.message : String(e),
            },
            { status: 500 }
          )
        }
        // في التطوير فقط: نكمل للـ filesystem
      }
    }

    // 2) Fallback: filesystem (للتطوير المحلي فقط)
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "campaign")
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    const filepath = path.join(uploadsDir, filename)
    await writeFile(filepath, buffer)

    const imageUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/uploads/campaign/${filename}`

    return NextResponse.json({
      success: true,
      url: imageUrl,
      filename: filename,
    })
  } catch (error) {
    console.error("Error uploading file:", error)
    return NextResponse.json(
      { error: "حدث خطأ أثناء رفع الملف" },
      { status: 500 }
    )
  }
}
