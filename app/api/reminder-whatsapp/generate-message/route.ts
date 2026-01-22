import { NextRequest, NextResponse } from "next/server"
import { generateMessageFromTemplate } from "@/lib/wasender-api-operations"

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()

    if (!code) {
      return NextResponse.json(
        { error: "الكود مطلوب" },
        { status: 400 }
      )
    }

    const message = await generateMessageFromTemplate(code)

    if (!message) {
      return NextResponse.json(
        { error: "فشل إنشاء الرسالة من القالب" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: message,
    })
  } catch (error) {
    console.error("Error in generate-message API:", error)
    return NextResponse.json(
      { error: "حدث خطأ أثناء إنشاء الرسالة" },
      { status: 500 }
    )
  }
}
