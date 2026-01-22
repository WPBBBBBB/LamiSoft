import { NextRequest, NextResponse } from "next/server"
import { sendBulkMedia } from "@/lib/wasender-api-operations"

export async function POST(request: NextRequest) {
  try {
    const { recipients, startIndex } = await request.json()

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json(
        { error: "قائمة المستلمين مطلوبة" },
        { status: 400 }
      )
    }

    // التحقق من صحة البيانات
    for (const recipient of recipients) {
      if (!recipient.phone || !recipient.mediaUrl) {
        return NextResponse.json(
          { error: "كل مستلم يجب أن يحتوي على phone و mediaUrl" },
          { status: 400 }
        )
      }
    }

    const parsedStartIndex = typeof startIndex === "number" && Number.isFinite(startIndex) && startIndex >= 0 ? startIndex : 0
    const result = await sendBulkMedia(recipients, undefined, parsedStartIndex)

    // استخراج الأخطاء من النتائج
    const errors = result.results
      .filter(r => !r.success)
      .map(r => ({ phone: r.phone, error: r.error || 'خطأ غير معروف' }))

    return NextResponse.json({
      success: true,
      totalSent: result.success,
      totalFailed: result.failed,
      results: result.results,
      errors: errors,
    })
  } catch (error) {
    console.error("Error in send-bulk-media API:", error)
    const errorMessage = error instanceof Error ? error.message : "خطأ غير معروف"
    return NextResponse.json(
      { 
        error: "حدث خطأ أثناء الإرسال الجماعي للصور",
        details: errorMessage 
      },
      { status: 500 }
    )
  }
}
