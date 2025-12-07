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

    // تنسيق رقم الهاتف - إزالة المسافات وإضافة 964
    let formattedPhone = phoneNumber.replace(/\s+/g, '').replace(/\D/g, '')
    
    // إذا كان الرقم يبدأ بـ 07، استبدله بـ 9647
    if (formattedPhone.startsWith('07')) {
      formattedPhone = '964' + formattedPhone.substring(1)
    }
    // إذا كان يبدأ بـ 7 فقط، أضف 964
    else if (formattedPhone.startsWith('7') && formattedPhone.length === 10) {
      formattedPhone = '964' + formattedPhone
    }
    // إذا لم يبدأ بـ 964، أضفها
    else if (!formattedPhone.startsWith('964')) {
      formattedPhone = '964' + formattedPhone
    }
    
    // إعداد رسالة OTP
    const message = `رمز التحقق الخاص بك هو: *${otpCode}*\n\nهذا الرمز صالح لمدة 5 دقائق.\nلا تشارك هذا الرمز مع أي شخص.\n\n_AL-LamiSoft_`

    // مفتاح API
    const apiKey = '35b4b390da09293a21be2b72de6050fbf75c7bcfec892629ab44cc2d48c0bd7e'

    // إرسال عبر Wasenderapi بالتنسيق الصحيح
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

    // إذا فشل الإرسال
    const errorText = await response.text()
    console.error('Wasender Error:', errorText)
    
    return NextResponse.json({
      success: false,
      error: 'فشل إرسال رسالة الواتساب'
    }, { status: 500 })
  } catch (error: unknown) {
    console.error('Error in send-otp API:', error)
    const errorMessage = error instanceof Error ? error.message : 'حدث خطأ أثناء إرسال رمز التحقق'
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}
