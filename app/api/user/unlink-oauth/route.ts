import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, provider } = body

    if (!userId || !provider) {
      return NextResponse.json(
        { error: 'userId and provider are required' },
        { status: 400 }
      )
    }

    const updateData: Record<string, null> = {}
    
    switch (provider.toLowerCase()) {
      case 'google':
        updateData.google_id = null
        updateData.google_email = null
        break
      case 'microsoft':
        updateData.microsoft_id = null
        updateData.microsoft_email = null
        break
      case 'github':
        updateData.github_id = null
        updateData.github_username = null
        break
      default:
        return NextResponse.json({ error: 'Invalid provider' }, { status: 400 })
    }

    const { error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: 'Failed to unlink OAuth account' },
      { status: 500 }
    )
  }
}
