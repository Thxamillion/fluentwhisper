import { useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { useAuth } from '@/hooks/auth'
import { useSubscription } from '@/hooks/subscription'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

/**
 * Dev-only auth panel for testing authentication states
 * Allows quick switching between guest, free, and premium user states
 */
export function DevAuthPanel() {
  const { user } = useAuth()
  const { data: subscription } = useSubscription()
  const [loading, setLoading] = useState(false)

  // Only show in dev mode
  if (import.meta.env.PROD) {
    return null
  }

  const mockGuestMode = async () => {
    setLoading(true)
    try {
      // Clear all auth state
      await invoke('delete_auth_credentials')
      await supabase.auth.signOut()
      localStorage.clear()
      window.location.reload()
    } catch (error) {
      console.error('Failed to clear auth:', error)
    } finally {
      setLoading(false)
    }
  }

  const mockFreeUser = async () => {
    setLoading(true)
    try {
      // Create mock credentials
      await invoke('save_auth_credentials', {
        accessToken: 'dev_access_token_free',
        refreshToken: 'dev_refresh_token_free',
        userId: 'dev-free-user-id',
        email: 'dev-free@test.com'
      })

      // Set mock session in Supabase
      await supabase.auth.setSession({
        access_token: 'dev_access_token_free',
        refresh_token: 'dev_refresh_token_free'
      })

      // Cache free subscription status
      localStorage.setItem('subscription_status', JSON.stringify({
        status: {
          isPremium: false,
          status: 'inactive',
          expiresAt: null,
          provider: null
        },
        cachedAt: new Date().toISOString()
      }))

      window.location.reload()
    } catch (error) {
      console.error('Failed to mock free user:', error)
    } finally {
      setLoading(false)
    }
  }

  const mockPremiumUser = async () => {
    setLoading(true)
    try {
      // Create mock credentials
      await invoke('save_auth_credentials', {
        accessToken: 'dev_access_token_premium',
        refreshToken: 'dev_refresh_token_premium',
        userId: 'dev-premium-user-id',
        email: 'dev-premium@test.com'
      })

      // Set mock session in Supabase
      await supabase.auth.setSession({
        access_token: 'dev_access_token_premium',
        refresh_token: 'dev_refresh_token_premium'
      })

      // Cache premium subscription status
      const oneYearFromNow = new Date()
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1)

      localStorage.setItem('subscription_status', JSON.stringify({
        status: {
          isPremium: true,
          status: 'active',
          expiresAt: oneYearFromNow.toISOString(),
          provider: 'stripe'
        },
        cachedAt: new Date().toISOString()
      }))

      window.location.reload()
    } catch (error) {
      console.error('Failed to mock premium user:', error)
    } finally {
      setLoading(false)
    }
  }

  const testDeepLink = () => {
    window.location.href = 'fluentwhisper://auth-callback?access_token=test123&refresh_token=test456'
  }

  return (
    <Card className="border-2 border-orange-500 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🔧 Dev Auth Panel
          <span className="text-xs bg-orange-200 text-orange-800 px-2 py-1 rounded">DEV ONLY</span>
        </CardTitle>
        <CardDescription>
          Quick auth state switching for testing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current State */}
        <div className="p-3 bg-white rounded-lg border">
          <p className="text-sm font-semibold mb-1">Current State:</p>
          <p className="text-sm text-gray-600">
            {user ? `Logged in as ${user.email}` : 'Not logged in (Guest)'}
          </p>
          <p className="text-sm text-gray-600">
            Subscription: {subscription?.isPremium ? '✅ Premium' : '❌ Free'}
          </p>
          {subscription?.isPremium && subscription?.expiresAt && (
            <p className="text-xs text-gray-500 mt-1">
              Expires: {new Date(subscription.expiresAt).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Quick Actions */}
        <div className="space-y-2">
          <p className="text-sm font-semibold">Quick Actions:</p>
          <div className="grid grid-cols-3 gap-2">
            <Button
              onClick={mockGuestMode}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              Guest Mode
            </Button>
            <Button
              onClick={mockFreeUser}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              Free User
            </Button>
            <Button
              onClick={mockPremiumUser}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              Premium User
            </Button>
          </div>
        </div>

        {/* Additional Actions */}
        <div className="space-y-2">
          <Button
            onClick={() => {
              localStorage.clear()
              window.location.reload()
            }}
            disabled={loading}
            variant="outline"
            size="sm"
            className="w-full"
          >
            Clear All Mock Data
          </Button>
          <Button
            onClick={testDeepLink}
            disabled={loading}
            variant="outline"
            size="sm"
            className="w-full"
          >
            Test Deep Link
          </Button>
        </div>

        {/* Instructions */}
        <div className="text-xs text-gray-500 p-2 bg-white rounded border">
          <p className="font-semibold mb-1">How to use:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Click a button to switch auth state</li>
            <li>Page will reload with new state</li>
            <li>Test premium features with different states</li>
            <li>Use "Clear All" to reset everything</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
