import { invoke } from '@tauri-apps/api/core'
import { supabase } from '@/lib/supabase'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'

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
   * Opens fluentdiary.com/login in an in-app webview window
   * The webview shares Supabase context with main app, so auth state changes are detected automatically
   */
  static async signInWithSocial(): Promise<void> {
    try {
      console.log('[DesktopAuth] Opening in-app login window')

      // Create a new webview window for login
      const authWindow = new WebviewWindow('auth-window', {
        url: WEB_LOGIN_URL,
        title: 'Sign In to Fluent Diary',
        width: 500,
        height: 700,
        resizable: true,
        center: true,
      })

      console.log('[DesktopAuth] Auth window created:', authWindow)

      // Wait for window to be ready
      await authWindow.once('tauri://created', () => {
        console.log('[DesktopAuth] Auth window successfully created and ready')
      })

      await authWindow.once('tauri://error', (e) => {
        console.error('[DesktopAuth] Auth window creation failed:', e)
      })

      console.log('[DesktopAuth] Waiting for user to sign in...')

      // Listen for when the window closes (user finished signing in or cancelled)
      authWindow.once('tauri://close-requested', () => {
        console.log('[DesktopAuth] Auth window closed')
      })

      // The global AuthStateListener in App.tsx will detect auth changes automatically
      // When user signs in on the webview, Supabase auth state changes fire in the main app too
    } catch (error) {
      console.error('[DesktopAuth] Failed to open auth window:', error)
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
