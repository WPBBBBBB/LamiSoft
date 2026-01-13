

export interface SupabaseConfig {
  supabaseUrl: string
  supabaseAnonKey: string
  supabaseServiceKey?: string
}

export function getSupabaseConfig(): SupabaseConfig {
  const isServer = typeof window === 'undefined'
  const isProd = process.env.NODE_ENV === 'production'

  // In production, server-side code (API routes) must use env-provided Supabase config.
  // Falling back to hard-coded defaults can point auth to the wrong DB and make login fail.
  if (isServer && isProd) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !anon) {
      throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY in production')
    }
  }

  const fallbackConfig: SupabaseConfig = {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jpupsfzitqvdrbwzlvnk.supabase.co',
    supabaseAnonKey:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwdXBzZnppdHF2ZHJid3psdm5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NzUzODksImV4cCI6MjA4MDQ1MTM4OX0.aSj_Il--QY9B2VnGyDj-u9bpYS_vxe1TxlerAT-qrv8',
    supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY || '',
  }

  if (typeof window !== 'undefined') {
    const savedConfig = localStorage.getItem('supabase-config')
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig) as Partial<SupabaseConfig>
        const candidate: SupabaseConfig = {
          ...fallbackConfig,
          ...(parsed || {}),
        }

        if (validateSupabaseConfig(candidate)) return candidate
      } catch (e) {
        }
    }
  }

  return fallbackConfig
}

export function saveSupabaseConfig(config: SupabaseConfig): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('supabase-config', JSON.stringify(config))
  }
}

export function validateSupabaseConfig(config: SupabaseConfig): boolean {
  return !!(config.supabaseUrl && config.supabaseAnonKey)
}
