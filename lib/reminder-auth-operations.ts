import { createClient } from "@supabase/supabase-js"
import bcrypt from "bcryptjs"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export interface ReminderUser {
  id: string
  full_name: string
  username: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ReminderSession {
  id: string
  user_id: string
  session_token: string
  expires_at: string
  ip_address?: string
  user_agent?: string
  created_at: string
}

/**
 * تسجيل دخول مستخدم في نظام التذكير
 */
export async function reminderLogin(username: string, password: string): Promise<{ user: ReminderUser; sessionToken: string } | null> {
  try {
    // البحث عن المستخدم
    const { data: user, error: userError } = await supabase
      .from("reminder_users")
      .select("*")
      .eq("username", username)
      .eq("is_active", true)
      .single()

    if (userError || !user) {
      console.error("User not found or error:", userError)
      return null
    }

    // التحقق من كلمة المرور
    const isPasswordValid = await bcrypt.compare(password, user.password_hash)
    if (!isPasswordValid) {
      console.error("Invalid password")
      return null
    }

    // إنشاء session token
    const sessionToken = await generateSessionToken()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // صلاحية 7 أيام

    // حفظ الجلسة
    const { error: sessionError } = await supabase
      .from("reminder_sessions")
      .insert({
        user_id: user.id,
        session_token: sessionToken,
        expires_at: expiresAt.toISOString(),
      })

    if (sessionError) {
      console.error("Error creating session:", sessionError)
      return null
    }

    // حذف password_hash من النتيجة
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash, ...userWithoutPassword } = user

    return {
      user: userWithoutPassword as ReminderUser,
      sessionToken,
    }
  } catch (error) {
    console.error("Login error:", error)
    return null
  }
}

/**
 * التحقق من صلاحية session token
 */
export async function verifyReminderSession(sessionToken: string): Promise<ReminderUser | null> {
  try {
    const { data: session, error: sessionError } = await supabase
      .from("reminder_sessions")
      .select(`
        *,
        reminder_users (*)
      `)
      .eq("session_token", sessionToken)
      .gt("expires_at", new Date().toISOString())
      .single()

    if (sessionError || !session) {
      return null
    }

    const user = session.reminder_users as Record<string, unknown>
    if (!user || !user.is_active) {
      return null
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash, ...userWithoutPassword } = user
    return userWithoutPassword as unknown as ReminderUser
  } catch (error) {
    console.error("Session verification error:", error)
    return null
  }
}

/**
 * تسجيل خروج المستخدم
 */
export async function reminderLogout(sessionToken: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("reminder_sessions")
      .delete()
      .eq("session_token", sessionToken)

    return !error
  } catch (error) {
    console.error("Logout error:", error)
    return false
  }
}

/**
 * الحصول على جميع المستخدمين
 */
export async function getAllReminderUsers(): Promise<ReminderUser[]> {
  try {
    const { data, error } = await supabase
      .from("reminder_users")
      .select("id, full_name, username, is_active, created_at, updated_at")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching users:", error)
      return []
    }

    return data as ReminderUser[]
  } catch (error) {
    console.error("Error:", error)
    return []
  }
}

/**
 * إضافة مستخدم جديد
 */
export async function addReminderUser(fullName: string, username: string, password: string): Promise<boolean> {
  try {
    const passwordHash = await bcrypt.hash(password, 10)

    const { error } = await supabase
      .from("reminder_users")
      .insert({
        full_name: fullName,
        username,
        password_hash: passwordHash,
      })

    return !error
  } catch (error) {
    console.error("Error adding user:", error)
    return false
  }
}

/**
 * تحديث مستخدم
 */
export async function updateReminderUser(
  userId: string,
  fullName: string,
  username: string,
  password?: string
): Promise<boolean> {
  try {
    const updateData: Record<string, string> = {
      full_name: fullName,
      username,
    }

    if (password) {
      updateData.password_hash = await bcrypt.hash(password, 10)
    }

    const { error } = await supabase
      .from("reminder_users")
      .update(updateData)
      .eq("id", userId)

    return !error
  } catch (error) {
    console.error("Error updating user:", error)
    return false
  }
}

/**
 * حذف مستخدم
 */
export async function deleteReminderUser(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("reminder_users")
      .delete()
      .eq("id", userId)

    return !error
  } catch (error) {
    console.error("Error deleting user:", error)
    return false
  }
}

/**
 * حذف عدة مستخدمين
 */
export async function deleteMultipleReminderUsers(userIds: string[]): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("reminder_users")
      .delete()
      .in("id", userIds)

    return !error
  } catch (error) {
    console.error("Error deleting users:", error)
    return false
  }
}

/**
 * توليد session token عشوائي
 */
async function generateSessionToken(): Promise<string> {
  const array = new Uint8Array(32)
  if (typeof window !== "undefined" && window.crypto) {
    window.crypto.getRandomValues(array)
  } else {
    // للسيرفر سايد
    const { randomFillSync } = await import("crypto")
    randomFillSync(array)
  }
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("")
}
