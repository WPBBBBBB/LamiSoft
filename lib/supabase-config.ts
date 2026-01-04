

export interface SupabaseConfig {
  supabaseUrl: string
  supabaseAnonKey: string
  supabaseServiceKey?: string
}

export function getSupabaseConfig(): SupabaseConfig {
  if (typeof window !== 'undefined') {
    const savedConfig = localStorage.getItem('supabase-config')
    if (savedConfig) {
      try {
        return JSON.parse(savedConfig)
      } catch (e) {
        }
    }
  }
  
  const config = {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jpupsfzitqvdrbwzlvnk.supabase.co',
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwdXBzZnppdHF2ZHJid3psdm5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NzUzODksImV4cCI6MjA4MDQ1MTM4OX0.aSj_Il--QY9B2VnGyDj-u9bpYS_vxe1TxlerAT-qrv8',
    supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY || '',
  }
  
  return config
}

export function saveSupabaseConfig(config: SupabaseConfig): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('supabase-config', JSON.stringify(config))
  }
}

export function validateSupabaseConfig(config: SupabaseConfig): boolean {
  return !!(config.supabaseUrl && config.supabaseAnonKey)
}
