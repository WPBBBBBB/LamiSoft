import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Fetch user data with permissions
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (userError) throw userError

    const { data: permissions, error: permError } = await supabase
      .from('user_permissions')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (permError && permError.code !== 'PGRST116') throw permError

    // Return user data (without password for security)
    const { password, ...userWithoutPassword } = user

    return NextResponse.json({
      ...userWithoutPassword,
      permissions: permissions || {
        view_statistics: false,
        view_reports: false,
        view_services: false,
        view_people: false,
        view_notifications: false,
        add_purchase: false,
        view_stores: false,
        view_store_transfer: false,
      }
    })
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user profile' },
      { status: 500 }
    )
  }
}
