import { invoke } from '@tauri-apps/api/core'
import { supabase, SubscriptionStatus } from '@/lib/supabase'

const CACHE_KEY = 'subscription_status'
const CACHE_DURATION = 1000 * 60 * 60 * 24 * 7 // 7 days offline grace

export class DesktopSubscriptionService {
  static async getStatus(): Promise<SubscriptionStatus> {
    try {
      // Try online check
      const session = await supabase.auth.getSession()

      if (!session.data.session) {
        throw new Error('Not authenticated')
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_tier, subscription_status, subscription_expires_at, subscription_provider')
        .eq('user_id', session.data.session.user.id)
        .single()

      const expiresAt = profile?.subscription_expires_at
        ? new Date(profile.subscription_expires_at)
        : null

      const status: SubscriptionStatus = {
        isPremium:
          profile?.subscription_tier === 'premium' &&
          profile?.subscription_status === 'active' &&
          expiresAt !== null &&
          expiresAt > new Date(),
        status: profile?.subscription_status || 'inactive',
        expiresAt,
        provider: profile?.subscription_provider || null
      }

      // Cache result
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        status,
        cachedAt: new Date().toISOString()
      }))

      return status
    } catch (error) {
      console.error('Online check failed, using cache:', error)
      return this.getCachedStatus()
    }
  }

  private static getCachedStatus(): SubscriptionStatus {
    const cached = localStorage.getItem(CACHE_KEY)

    if (!cached) {
      return {
        isPremium: false,
        status: 'inactive',
        expiresAt: null,
        provider: null
      }
    }

    const { status, cachedAt } = JSON.parse(cached)
    const cacheAge = Date.now() - new Date(cachedAt).getTime()

    // Grace period expired
    if (cacheAge > CACHE_DURATION) {
      return {
        isPremium: false,
        status: 'expired',
        expiresAt: status.expiresAt,
        provider: status.provider
      }
    }

    return status
  }

  static async openUpgradePage(): Promise<void> {
    // Open web app upgrade page (user will upgrade via Stripe on web)
    const url = 'https://xtflvvyitebirnsafvrm.supabase.co'

    // Use Tauri command to open URL in default browser
    await invoke('open_url', { url })
  }
}
