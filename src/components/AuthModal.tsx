import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { invoke } from '@tauri-apps/api/core'
import { toast } from 'sonner'

interface AuthModalProps {
  open: boolean
  onClose: () => void
}

export function AuthModal({ open, onClose }: AuthModalProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error

      // AuthStateListener will save credentials automatically
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to sign in')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    if (isLoading) {
      console.log('[OAuth] Already in progress, ignoring click')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      console.log('[OAuth] Starting Google OAuth flow...')

      // Start the OAuth server (this will wait for callback)
      const oauthPromise = invoke<[string, string]>('start_oauth_localhost')

      // Small delay to ensure server is ready
      await new Promise(resolve => setTimeout(resolve, 200))

      // Open browser for OAuth (redirects to localhost:54321)
      const redirectUrl = 'http://localhost:54321/callback'
      console.log('[OAuth] Getting OAuth URL from Supabase...')

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true  // Don't auto-open, we'll do it manually
        }
      })

      if (error) throw error

      if (!data.url) {
        throw new Error('No OAuth URL returned from Supabase')
      }

      console.log('[OAuth] Opening browser manually with URL:', data.url)

      // Manually open browser using Tauri shell
      const { open } = await import('@tauri-apps/plugin-shell')
      await open(data.url)

      console.log('[OAuth] Browser opened, waiting for callback...')

      // Wait for the Rust server to receive and parse the callback
      const [accessToken, refreshToken] = await oauthPromise

      console.log('[OAuth] Tokens received, setting session...')

      // Set the session with received tokens
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      })

      if (sessionError) throw sessionError

      toast.success('Successfully signed in with Google!')
      onClose()
    } catch (err: any) {
      console.error('[OAuth] Error:', err)
      setError(err.message || 'Failed to sign in with Google')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAppleSignIn = async () => {
    if (isLoading) {
      console.log('[OAuth] Already in progress, ignoring click')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      console.log('[OAuth] Starting Apple OAuth flow...')

      // Apple requires registered redirect URLs, so use the registered web URL
      // which will redirect to the desktop app via deep link
      const redirectUrl = 'https://www.fluentdiary.com/desktop-auth-callback'
      console.log('[OAuth] Getting OAuth URL from Supabase...')

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true  // Don't auto-open, we'll do it manually
        }
      })

      if (error) throw error

      if (!data.url) {
        throw new Error('No OAuth URL returned from Supabase')
      }

      console.log('[OAuth] Full authorization URL:', data.url)
      
      // Decode and log the state parameter to see what Supabase is sending
      try {
        const urlObj = new URL(data.url)
        const state = urlObj.searchParams.get('state')
        if (state) {
          // Decode JWT state (base64url)
          const parts = state.split('.')
          if (parts.length >= 2) {
            const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
            console.log('[OAuth] State payload:', payload)
          }
        }
      } catch (e) {
        console.warn('[OAuth] Could not parse state:', e)
      }

      // Manually open browser using Tauri shell
      const { open } = await import('@tauri-apps/plugin-shell')
      await open(data.url)

      console.log('[OAuth] Browser opened, waiting for deep link callback...')
      
      // The desktop-auth-callback.html page will redirect to fluentwhisper://auth-callback
      // which will be handled by the DeepLinkListener in App.tsx
      // We don't need to wait for a localhost server here since Apple requires registered URLs
      
      toast.success('Please complete sign-in in your browser. The app will open automatically.')
      onClose()
    } catch (err: any) {
      console.error('[OAuth] Error:', err)
      setError(err.message || 'Failed to sign in with Apple')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Sign in to Fluent Diary</DialogTitle>
          <DialogDescription>
            Choose your preferred sign in method
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-md">
              {error}
            </div>
          )}

          {/* Social Sign In Buttons */}
          <div className="space-y-2">
            <Button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full"
              variant="outline"
              type="button"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </Button>

            <Button
              onClick={handleAppleSignIn}
              disabled={isLoading}
              className="w-full"
              variant="outline"
              type="button"
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              Continue with Apple
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with email
              </span>
            </div>
          </div>

          {/* Email/Password Sign In */}
          <form onSubmit={handleEmailSignIn} className="space-y-3">
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign in with Email'}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
