import { NextRequest, NextResponse } from "next/server"
import { sendMediaWithSettings } from "@/lib/wasender-api-operations"
import { logReminderWhatsAppSends } from "@/lib/reminder-whatsapp-monitoring"

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, mediaUrl, caption, messageCount } = await request.json()

    if (!phoneNumber || !mediaUrl) {
      return NextResponse.json(
        { error: "رقم الهاتف ورابط الصورة مطلوبان" },
        { status: 400 }
      )
    }

    const result = await sendMediaWithSettings(
      phoneNumber,
      mediaUrl,
      caption || "",
      messageCount || 0
    )

    if (!result.success) {
      await logReminderWhatsAppSends(request, [
        {
          operation: "send_media",
          phone: phoneNumber,
          success: false,
          error_message: result.error || "فشل إرسال الصورة",
          media_url: mediaUrl,
          caption: caption || null,
          meta: {
            messageCount: Number(messageCount || 0),
          },
        },
      ])
      return NextResponse.json(
        { error: result.error || "فشل إرسال الصورة" },
        { status: 500 }
      )
    }

    await logReminderWhatsAppSends(request, [
      {
        operation: "send_media",
        phone: phoneNumber,
        success: true,
        error_message: null,
        media_url: mediaUrl,
        caption: caption || null,
        meta: {
          messageCount: Number(messageCount || 0),
        },
      },
    ])

    return NextResponse.json({
      success: true,
      message: "تم إرسال الصورة بنجاح",
    })
  } catch (error) {
    console.error("Error in send-media API:", error)
    return NextResponse.json(
      { error: "حدث خطأ أثناء إرسال الصورة" },
      { status: 500 }
    )
  }
}
