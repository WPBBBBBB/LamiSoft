import { NextRequest, NextResponse } from "next/server"
import { sendMessageWithSettings } from "@/lib/wasender-api-operations"

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
      return NextResponse.json(
        { error: result.error || "فشل إرسال الرسالة" },
        { status: 500 }
      )
    }

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
