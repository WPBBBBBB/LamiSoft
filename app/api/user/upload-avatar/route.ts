import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('avatar') as File
    const userId = formData.get('userId') as string

    if (!file || !userId) {
      return NextResponse.json(
        { error: 'Avatar and userId are required' },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Ensure uploads directory exists
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'avatars')
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    // Create unique filename
    const extension = file.type.split('/')[1] || 'png'
    const filename = `${userId}-${Date.now()}.${extension}`
    const filepath = join(uploadsDir, filename)

    // Save file
    await writeFile(filepath, buffer)

    // Update user avatar_url in database
    const avatarUrl = `/uploads/avatars/${filename}`
    const { error } = await supabase
      .from('users')
      .update({ 
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (error) {
      console.error('Database error:', error)
      throw error
    }

    return NextResponse.json({ avatar_url: avatarUrl })
  } catch (error) {
    console.error('Error uploading avatar:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload avatar' },
      { status: 500 }
    )
  }
}
