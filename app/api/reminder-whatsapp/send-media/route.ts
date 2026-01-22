import { NextRequest, NextResponse } from "next/server"
import { sendMediaWithSettings } from "@/lib/wasender-api-operations"

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
      return NextResponse.json(
        { error: result.error || "فشل إرسال الصورة" },
        { status: 500 }
      )
    }

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
