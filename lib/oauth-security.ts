import { supabase } from './supabase'

interface BlockInfo {
  isBlocked: boolean
  blockedUntil: Date | null
  remainingTime: number // in seconds
  blockLevel: number
  totalAttempts: number
}

interface DeviceInfo {
  fingerprint: string
  ip: string
  userAgent: string
}

// Block durations in minutes
const BLOCK_DURATIONS = [15, 60, 300, 720, 1440, 10080] // 15min, 1h, 5h, 12h, 24h, 1week

/**
 * Generate device fingerprint
 */
export function generateDeviceFingerprint(): string {
  if (typeof window === 'undefined') return 'server'
  
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  let canvasFingerprint = ''
  
  if (ctx) {
    ctx.textBaseline = 'top'
    ctx.font = '14px Arial'
    ctx.fillText('fingerprint', 2, 2)
    canvasFingerprint = canvas.toDataURL().slice(-50)
  }
  
  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.colorDepth,
    screen.width,
    screen.height,
    new Date().getTimezoneOffset(),
    canvasFingerprint
  ].join('|')
  
  // Simple hash function
  let hash = 0
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  
  return `fp_${Math.abs(hash).toString(36)}`
}

/**
 * Check if device is currently blocked
 */
export async function checkOAuthBlock(deviceFingerprint: string): Promise<BlockInfo> {
  try {
    const { data, error } = await supabase
      .from('oauth_blocks')
      .select('*')
      .eq('device_fingerprint', deviceFingerprint)
      .single()

    if (error || !data) {
      return {
        isBlocked: false,
        blockedUntil: null,
        remainingTime: 0,
        blockLevel: 0,
        totalAttempts: 0
      }
    }

    const blockedUntil = new Date(data.blocked_until)
    const now = new Date()
    const remainingTime = Math.max(0, Math.floor((blockedUntil.getTime() - now.getTime()) / 1000))

    // If block expired, remove it
    if (remainingTime === 0) {
      await supabase
        .from('oauth_blocks')
        .delete()
        .eq('device_fingerprint', deviceFingerprint)

      return {
        isBlocked: false,
        blockedUntil: null,
        remainingTime: 0,
        blockLevel: 0,
        totalAttempts: 0
      }
    }

    return {
      isBlocked: true,
      blockedUntil,
      remainingTime,
      blockLevel: data.block_level,
      totalAttempts: data.total_failed_attempts
    }
  } catch (error) {
    return {
      isBlocked: false,
      blockedUntil: null,
      remainingTime: 0,
      blockLevel: 0,
      totalAttempts: 0
    }
  }
}

/**
 * Record failed OAuth login attempt
 */
export async function recordFailedOAuthAttempt(
  deviceInfo: DeviceInfo,
  provider: string,
  providerEmail?: string,
  providerId?: string
): Promise<BlockInfo> {
  try {
    // Get current block status
    const { data: blockData } = await supabase
      .from('oauth_blocks')
      .select('*')
      .eq('device_fingerprint', deviceInfo.fingerprint)
      .single()

    let newBlockLevel = 1
    let totalAttempts = 1

    if (blockData) {
      totalAttempts = blockData.total_failed_attempts + 1
      
      // Increase block level every 5 failed attempts
      if (totalAttempts % 5 === 0) {
        newBlockLevel = Math.min(blockData.block_level + 1, BLOCK_DURATIONS.length)
      } else {
        newBlockLevel = blockData.block_level
      }
    }

    const blockDurationMinutes = BLOCK_DURATIONS[newBlockLevel - 1]
    const blockedUntil = new Date(Date.now() + blockDurationMinutes * 60 * 1000)

    // Record attempt in oauth_login_attempts
    await supabase
      .from('oauth_login_attempts')
      .insert({
        device_fingerprint: deviceInfo.fingerprint,
        provider,
        provider_email: providerEmail,
        provider_id: providerId,
        ip_address: deviceInfo.ip,
        user_agent: deviceInfo.userAgent,
        status: totalAttempts % 5 === 0 ? 'blocked' : 'failed',
        block_duration_minutes: totalAttempts % 5 === 0 ? blockDurationMinutes : null,
        blocked_until: totalAttempts % 5 === 0 ? blockedUntil.toISOString() : null
      })

    // Update or create block record if 5 attempts reached
    if (totalAttempts % 5 === 0) {
      if (blockData) {
        await supabase
          .from('oauth_blocks')
          .update({
            block_level: newBlockLevel,
            blocked_until: blockedUntil.toISOString(),
            total_failed_attempts: totalAttempts,
            last_failed_attempt: new Date().toISOString()
          })
          .eq('device_fingerprint', deviceInfo.fingerprint)
      } else {
        await supabase
          .from('oauth_blocks')
          .insert({
            device_fingerprint: deviceInfo.fingerprint,
            block_level: newBlockLevel,
            blocked_until: blockedUntil.toISOString(),
            total_failed_attempts: totalAttempts,
            last_failed_attempt: new Date().toISOString()
          })
      }
    } else if (blockData) {
      // Just update attempt count
      await supabase
        .from('oauth_blocks')
        .update({
          total_failed_attempts: totalAttempts,
          last_failed_attempt: new Date().toISOString()
        })
        .eq('device_fingerprint', deviceInfo.fingerprint)
    } else {
      // Create initial record
      await supabase
        .from('oauth_blocks')
        .insert({
          device_fingerprint: deviceInfo.fingerprint,
          block_level: 0,
          blocked_until: new Date().toISOString(),
          total_failed_attempts: totalAttempts,
          last_failed_attempt: new Date().toISOString()
        })
    }

    return {
      isBlocked: totalAttempts % 5 === 0,
      blockedUntil: totalAttempts % 5 === 0 ? blockedUntil : null,
      remainingTime: totalAttempts % 5 === 0 ? blockDurationMinutes * 60 : 0,
      blockLevel: newBlockLevel,
      totalAttempts
    }
  } catch (error) {
    return {
      isBlocked: false,
      blockedUntil: null,
      remainingTime: 0,
      blockLevel: 0,
      totalAttempts: 0
    }
  }
}

/**
 * Reset OAuth block (for successful login)
 */
export async function resetOAuthBlock(deviceFingerprint: string): Promise<void> {
  try {
    await supabase
      .from('oauth_blocks')
      .delete()
      .eq('device_fingerprint', deviceFingerprint)
  } catch (error) {
    }
}

/**
 * Format remaining time for display
 */
export function formatRemainingTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} ثانية`
  } else if (seconds < 3600) {
    const minutes = Math.ceil(seconds / 60)
    return `${minutes} دقيقة`
  } else if (seconds < 86400) {
    const hours = Math.ceil(seconds / 3600)
    return `${hours} ساعة`
  } else {
    const days = Math.ceil(seconds / 86400)
    return `${days} يوم`
  }
}
