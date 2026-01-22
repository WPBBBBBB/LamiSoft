import { NextRequest, NextResponse } from "next/server"
import { sendMessageWithSettings } from "@/lib/wasender-api-operations"
import { logReminderWhatsAppSends } from "@/lib/reminder-whatsapp-monitoring"

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, message, messageCount } = await request.json()

    if (!phoneNumber || !message) {
      return NextResponse.json(
        { error: "رقم الهاتف والرسالة مطلوبان" },
        { status: 400 }
      )
    }

    const result = await sendMessageWithSettings(
      phoneNumber,
      message,
      messageCount || 0
    )

    if (!result.success) {
      await logReminderWhatsAppSends(request, [
        {
          operation: "send_text",
          phone: phoneNumber,
          success: false,
          error_message: result.error || "فشل إرسال الرسالة",
          meta: {
            messageLength: String(message).length,
            messageCount: Number(messageCount || 0),
          },
        },
      ])
      return NextResponse.json(
        { error: result.error || "فشل إرسال الرسالة" },
        { status: 500 }
      )
    }

    await logReminderWhatsAppSends(request, [
      {
        operation: "send_text",
        phone: phoneNumber,
        success: true,
        error_message: null,
        meta: {
          messageLength: String(message).length,
          messageCount: Number(messageCount || 0),
        },
      },
    ])

    return NextResponse.json({
      success: true,
      message: "تم إرسال الرسالة بنجاح",
    })
  } catch (error) {
    console.error("Error in send-message API:", error)
    return NextResponse.json(
      { error: "حدث خطأ أثناء إرسال الرسالة" },
      { status: 500 }
    )
  }
}
