import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { supabase } from '@/lib/supabase'
import { shell } from '@tauri-apps/plugin-shell'
import { start } from '@tauri-apps/plugin-oauth'

const OAUTH_PORT = 9999

export class DesktopAuthService {
  static async signIn(): Promise<void> {
    try {
      console.log('[DesktopAuth] Starting OAuth flow with localhost redirect')

      // Start OAuth with skipBrowserRedirect and localhost redirect
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          skipBrowserRedirect: true,
          redirectTo: `http://localhost:${OAUTH_PORT}`,
          scopes: 'profile email'
        }
      })

      if (error) {
        throw error
      }

      if (!data.url) {
        throw new Error('No OAuth URL returned from Supabase')
      }

      console.log('[DesktopAuth] Opening OAuth URL:', data.url)

      // Start the OAuth plugin's localhost server and open browser
      const result = await start(data.url, OAUTH_PORT)

      console.log('[DesktopAuth] OAuth redirect received:', result)

      // Extract the authorization code from the callback
      const url = new URL(result)
      const code = url.searchParams.get('code')

      if (!code) {
        throw new Error('No authorization code received from OAuth callback')
      }

      console.log('[DesktopAuth] Exchanging code for session')

      // Exchange the authorization code for a session using PKCE
      const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)

      if (sessionError || !sessionData.session) {
        throw new Error(`Failed to exchange code for session: ${sessionError?.message}`)
      }

      console.log('[DesktopAuth] Session established, saving credentials')

      // Save credentials in Rust secure storage
      await invoke('save_auth_credentials', {
        accessToken: sessionData.session.access_token,
        refreshToken: sessionData.session.refresh_token,
        userId: sessionData.session.user.id,
        email: sessionData.session.user.email || ''
      })

      console.log('[DesktopAuth] Authentication complete!')
    } catch (error) {
      console.error('[DesktopAuth] Authentication failed:', error)
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
