import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// API لتشغيل فحص الإشعارات (يُستدعى من Cron Job خارجي)
export async function GET(request: Request) {
  try {
    // التحقق من المفتاح السري للأمان
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.CRON_SECRET_KEY
    
    if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // تشغيل دالة توليد الإشعارات
    const { data, error } = await supabase.rpc('generate_debt_notifications')

    if (error) {
      console.error('Error generating notifications:', error)
      return NextResponse.json(
        { 
          success: false, 
          error: error.message 
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      count: data || 0,
      message: `تم توليد ${data || 0} إشعار جديد`,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Exception in notifications cron:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

// يمكن أيضاً استخدام POST
export async function POST(request: Request) {
  return GET(request)
}
