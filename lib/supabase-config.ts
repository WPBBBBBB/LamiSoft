// ============================================
// Supabase Configuration Settings
// ============================================
// سيتم ربط هذه الإعدادات بصفحة الإعدادات لاحقاً

export interface SupabaseConfig {
  supabaseUrl: string
  supabaseAnonKey: string
  supabaseServiceKey?: string
}

// قراءة الإعدادات من localStorage أو متغيرات البيئة
export function getSupabaseConfig(): SupabaseConfig {
  // محاولة القراءة من localStorage أولاً (Client Side)
  if (typeof window !== 'undefined') {
    const savedConfig = localStorage.getItem('supabase-config')
    if (savedConfig) {
      try {
        return JSON.parse(savedConfig)
      } catch (e) {
        console.error('Failed to parse supabase config:', e)
      }
    }
  }
  
  // القيم الافتراضية من .env.local
  const config = {
    supabaseUrl: typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_URL || '',
    supabaseAnonKey: typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    supabaseServiceKey: typeof process !== 'undefined' && process.env?.SUPABASE_SERVICE_KEY || '',
  }
  
  return config
}

// حفظ الإعدادات في localStorage
export function saveSupabaseConfig(config: SupabaseConfig): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('supabase-config', JSON.stringify(config))
  }
}

// التحقق من صحة الإعدادات
export function validateSupabaseConfig(config: SupabaseConfig): boolean {
  return !!(config.supabaseUrl && config.supabaseAnonKey)
}
