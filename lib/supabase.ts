import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from './supabase-config'

const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig()

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
