import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, otpCode } = await request.json()

    if (!phoneNumber || !otpCode) {
      return NextResponse.json(
        { success: false, error: 'بيانات غير كاملة' },
        { status: 400 }
      )
    }

    let formattedPhone = phoneNumber.replace(/\s+/g, '').replace(/\D/g, '')
    
    if (formattedPhone.startsWith('07')) {
      formattedPhone = '964' + formattedPhone.substring(1)
    }
    else if (formattedPhone.startsWith('7') && formattedPhone.length === 10) {
      formattedPhone = '964' + formattedPhone
    }
    else if (!formattedPhone.startsWith('964')) {
      formattedPhone = '964' + formattedPhone
    }
    
    const message = `رمز التحقق الخاص بك هو: *${otpCode}*\n\nهذا الرمز صالح لمدة 5 دقائق.\nلا تشارك هذا الرمز مع أي شخص.\n\n_AL-LamiSoft_`

    const apiKey = process.env.WASENDER_API_KEY

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'مفتاح API غير متوفر'
      }, { status: 500 })
    }

    const payload = {
      to: `+${formattedPhone}`,
      text: message
    }

    const response = await fetch('https://wasenderapi.com/api/send-message', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    })

    if (response.ok) {
      return NextResponse.json({
        success: true,
        message: 'تم إرسال رمز التحقق على الواتساب',
        phone: formattedPhone
      })
    }

    const errorText = await response.text()
    return NextResponse.json({
      success: false,
      error: 'فشل إرسال رسالة الواتساب'
    }, { status: 500 })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'حدث خطأ أثناء إرسال رمز التحقق'
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}
