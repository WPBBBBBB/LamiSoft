import { NextRequest, NextResponse } from "next/server"
import { sendBulkMessages } from "@/lib/wasender-api-operations"
import { logReminderWhatsAppSends } from "@/lib/reminder-whatsapp-monitoring"

export async function POST(request: NextRequest) {
  try {
    const { recipients } = await request.json()

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json(
        { error: "قائمة المستلمين مطلوبة" },
        { status: 400 }
      )
    }

    // التحقق من صحة البيانات
    for (const recipient of recipients) {
      if (!recipient.phone || !recipient.message) {
        return NextResponse.json(
          { error: "كل مستلم يجب أن يحتوي على phone و message" },
          { status: 400 }
        )
      }
    }

    const result = await sendBulkMessages(recipients)

    // تسجيل محاولات الإرسال (لا تكسر الإرسال إذا فشل التسجيل)
    await logReminderWhatsAppSends(
      request,
      result.results.map((r, idx) => ({
        operation: "send_text",
        phone: r.phone,
        success: r.success,
        error_message: r.success ? null : (r.error || "خطأ غير معروف"),
        meta: {
          messageLength: recipients[idx]?.message ? String(recipients[idx].message).length : 0,
        },
      }))
    )

    return NextResponse.json({
      success: true,
      totalSent: result.success,
      totalFailed: result.failed,
      results: result.results,
    })
  } catch (error) {
    console.error("Error in send-bulk API:", error)
    return NextResponse.json(
      { error: "حدث خطأ أثناء الإرسال الجماعي" },
      { status: 500 }
    )
  }
}
