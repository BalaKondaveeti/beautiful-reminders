import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL = 'https://yxwqmwvelpjwwlvrpvki.supabase.co'
// Publishable key: public by design, data is protected by row-level security.
export const SUPABASE_KEY = 'sb_publishable_UJ46Ykxu0xhh4E3T_czhDg_E-Fx3hyu'
export const DASHBOARD_URL = 'https://supabase.com/dashboard/project/yxwqmwvelpjwwlvrpvki'
export const SQL_EDITOR_URL = `${DASHBOARD_URL}/sql/new`

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
})
