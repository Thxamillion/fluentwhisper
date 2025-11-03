import { invoke } from '@tauri-apps/api/core'
import { supabase } from '@/lib/supabase'
import { open } from '@tauri-apps/plugin-shell'

const WEB_LOGIN_URL = 'https://fluentdiary.com/login'

export class DesktopAuthService {
  /**
   * Sign in with email and password (no OAuth needed)
   */
  static async signInWithEmail(email: string, password: string): Promise<void> {
    try {
      console.log('[DesktopAuth] Signing in with email/password')

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        throw error
      }

      if (!data.session) {
        throw new Error('No session returned after sign in')
      }

      console.log('[DesktopAuth] Email sign in successful, saving credentials')

      // Save credentials in Rust secure storage
      await invoke('save_auth_credentials', {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        userId: data.session.user.id,
        email: data.session.user.email || ''
      })

      console.log('[DesktopAuth] Authentication complete!')
    } catch (error) {
      console.error('[DesktopAuth] Email auth failed:', error)
      throw error
    }
  }

  /**
   * Sign up with email and password
   */
  static async signUpWithEmail(email: string, password: string): Promise<void> {
    try {
      console.log('[DesktopAuth] Signing up with email/password')

      const { data, error } = await supabase.auth.signUp({
        email,
        password
      })

      if (error) {
        throw error
      }

      if (!data.session) {
        throw new Error('Sign up succeeded but no session returned (check email for verification)')
      }

      console.log('[DesktopAuth] Email sign up successful, saving credentials')

      // Save credentials in Rust secure storage
      await invoke('save_auth_credentials', {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        userId: data.session.user.id,
        email: data.session.user.email || ''
      })

      console.log('[DesktopAuth] Authentication complete!')
    } catch (error) {
      console.error('[DesktopAuth] Email sign up failed:', error)
      throw error
    }
  }

  /**
   * Sign in with social providers (Google, Apple, etc.)
   * Opens fluentdiary.com/login in browser, user signs in there
   * App detects auth state change via Supabase listener
   */
  static async signInWithSocial(): Promise<void> {
    try {
      console.log('[DesktopAuth] Opening web login for social auth')

      // Open web login page in browser
      await open(WEB_LOGIN_URL)

      // The app will detect auth state changes via the global Supabase auth listener
      // No need to wait or poll - Supabase auth.onAuthStateChange() will handle it
      console.log('[DesktopAuth] Web login opened, waiting for user to sign in...')
    } catch (error) {
      console.error('[DesktopAuth] Failed to open web login:', error)
      throw error
    }
  }

  static async signOut(): Promise<void> {
    await supabase.auth.signOut()
    await invoke('delete_auth_credentials')
  }

  static async getSession() {
    const { data: { session } } = await supabase.auth.getSession()

    if (session) return session

    // Try to restore from stored credentials
    try {
      const credentials: any = await invoke('get_auth_credentials')

      if (credentials) {
        const { data } = await supabase.auth.setSession({
          access_token: credentials.access_token,
          refresh_token: credentials.refresh_token
        })
        return data.session
      }
    } catch (error) {
      console.error('Failed to restore session:', error)
    }

    return null
  }
}
