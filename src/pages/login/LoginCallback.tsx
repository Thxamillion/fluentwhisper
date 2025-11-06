import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { logger } from '@/services/logger'

export function LoginCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    // The URL will have hash params like #access_token=...&refresh_token=...
    // Supabase client automatically detects and processes these
    // AuthStateListener will save credentials automatically

    logger.debug('OAuth callback received, waiting for auth state change...', 'LoginCallback')

    // Wait a moment for Supabase to process the callback
    const timer = setTimeout(() => {
      // Navigate back to onboarding
      navigate('/onboarding')
    }, 1000)

    return () => clearTimeout(timer)
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Completing sign in...</p>
      </div>
    </div>
  )
}
