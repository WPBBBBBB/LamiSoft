import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://jpupsfzitqvdrbwzlvnk.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwdXBzZnppdHF2ZHJid3psdm5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NzUzODksImV4cCI6MjA4MDQ1MTM4OX0.aSj_Il--QY9B2VnGyDj-u9bpYS_vxe1TxlerAT-qrv8'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
