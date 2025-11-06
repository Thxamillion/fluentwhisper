import { invoke } from '@tauri-apps/api/core'
import { supabase } from '@/lib/supabase'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { logger } from '@/services/logger'

const WEB_LOGIN_URL = 'https://fluentdiary.com/login'

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
   * Sign in with social providers (Google, Apple, etc.)
   * Opens fluentdiary.com/login in an in-app webview window
   * The webview shares Supabase context with main app, so auth state changes are detected automatically
   */
  static async signInWithSocial(): Promise<void> {
    try {
      logger.debug('Opening in-app login window', 'DesktopAuth')

      // Create a new webview window for login
      const authWindow = new WebviewWindow('auth-window', {
        url: WEB_LOGIN_URL,
        title: 'Sign In to Fluent Diary',
        width: 500,
        height: 700,
        resizable: true,
        center: true,
      })

      logger.debug('[DesktopAuth] Auth window created:', undefined, authWindow)

      // Wait for window to be ready
      await authWindow.once('tauri://created', () => {
        logger.debug('Auth window successfully created and ready', 'DesktopAuth')
      })

      await authWindow.once('tauri://error', (e) => {
        logger.error('Auth window creation failed:', 'DesktopAuth', e)
      })

      logger.debug('Waiting for user to sign in...', 'DesktopAuth')

      // Listen for when the window closes (user finished signing in or cancelled)
      authWindow.once('tauri://close-requested', () => {
        logger.debug('Auth window closed', 'DesktopAuth')
      })

      // The global AuthStateListener in App.tsx will detect auth changes automatically
      // When user signs in on the webview, Supabase auth state changes fire in the main app too
    } catch (error) {
      logger.error('Failed to open auth window:', 'DesktopAuth', error)
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
