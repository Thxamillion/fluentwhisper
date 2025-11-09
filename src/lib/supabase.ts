import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Configure Supabase client for desktop app
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: 'pkce',
    autoRefreshToken: true,
    detectSessionInUrl: false, // Desktop apps don't use URL-based sessions
    persistSession: true,
  },
})

export interface SubscriptionStatus {
  isPremium: boolean
  status: string
  expiresAt: Date | null
  provider: 'stripe' | 'apple' | 'google' | null
}
