import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { supabase } from '@/lib/supabase'

export class DesktopAuthService {
  static async signIn(): Promise<void> {
    // Opens browser to start OAuth flow
    await invoke('start_auth_flow')

    // Wait for deep link callback
    return new Promise((resolve, reject) => {
      const unlistenPromise = listen('auth-success', async (event: any) => {
        try {
          const { access_token, refresh_token, user_id, email } = event.payload

          // Set session in Supabase first to get user data
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token,
            refresh_token
          })

          if (sessionError || !data.session) {
            throw new Error('Failed to set session')
          }

          // Save credentials in Rust secure storage
          await invoke('save_auth_credentials', {
            accessToken: access_token,
            refreshToken: refresh_token,
            userId: user_id || data.session.user.id,
            email: email || data.session.user.email || ''
          })

          // Cleanup listener
          unlistenPromise.then(unlisten => unlisten())
          resolve()
        } catch (error) {
          unlistenPromise.then(unlisten => unlisten())
          reject(error)
        }
      })

      // Timeout after 5 minutes
      setTimeout(() => {
        unlistenPromise.then(unlisten => unlisten())
        reject(new Error('Authentication timeout'))
      }, 5 * 60 * 1000)
    })
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
