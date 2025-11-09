import { invoke } from '@tauri-apps/api/core'
import { supabase } from '@/lib/supabase'
import { logger } from '@/services/logger'

export class DesktopAuthService {
  /**
   * Sign in with email and password (no OAuth needed)
   */
  static async signInWithEmail(email: string, password: string): Promise<void> {
    try {
      logger.debug('Signing in with email/password', 'DesktopAuth')

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

      logger.debug('Email sign in successful, saving credentials', 'DesktopAuth')

      // Save credentials in Rust secure storage
      await invoke('save_auth_credentials', {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        userId: data.session.user.id,
        email: data.session.user.email || ''
      })

      logger.debug('Authentication complete!', 'DesktopAuth')
    } catch (error) {
      logger.error('Email auth failed:', 'DesktopAuth', error)
      throw error
    }
  }

  /**
   * Sign up with email and password
   */
  static async signUpWithEmail(email: string, password: string): Promise<void> {
    try {
      logger.debug('Signing up with email/password', 'DesktopAuth')

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

      logger.debug('Email sign up successful, saving credentials', 'DesktopAuth')

      // Save credentials in Rust secure storage
      await invoke('save_auth_credentials', {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        userId: data.session.user.id,
        email: data.session.user.email || ''
      })

      logger.debug('Authentication complete!', 'DesktopAuth')
    } catch (error) {
      logger.error('Email sign up failed:', 'DesktopAuth', error)
      throw error
    }
  }

  /**
   * Process OAuth callback from deep link
   * Called when app receives fluentwhisper://auth-callback?access_token=...&refresh_token=...
   */
  static async handleOAuthCallback(params: URLSearchParams): Promise<void> {
    try {
      logger.debug('Processing OAuth callback', 'DesktopAuth')

      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')
      const error = params.get('error')

      if (error) {
        logger.error('OAuth error in callback:', 'DesktopAuth', error)
        throw new Error(error)
      }

      if (!accessToken || !refreshToken) {
        logger.error('Missing tokens in OAuth callback', 'DesktopAuth')
        throw new Error('No authentication tokens received')
      }

      logger.debug('Setting Supabase session with OAuth tokens', 'DesktopAuth')

      // Set the session in Supabase
      const { data, error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      })

      if (sessionError) {
        throw sessionError
      }

      if (!data.session) {
        throw new Error('Failed to create session from tokens')
      }

      logger.debug('OAuth session created, saving credentials', 'DesktopAuth')

      // Save credentials in Rust secure storage
      await invoke('save_auth_credentials', {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        userId: data.session.user.id,
        email: data.session.user.email || ''
      })

      logger.debug('OAuth authentication complete!', 'DesktopAuth')
    } catch (error) {
      logger.error('OAuth callback failed:', 'DesktopAuth', error)
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
