import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
// Early signal that the frontend bundle executed
console.log('[DeepLink][JS] App bundle loaded');
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { Dashboard } from '@/pages/dashboard/Dashboard'
import { Record } from '@/pages/record/Record'
import { Library } from '@/pages/library/Library'
import { History } from '@/pages/history/History'
import { SessionDetail } from '@/pages/session-detail/SessionDetail'
import { Vocabulary } from '@/pages/vocabulary/Vocabulary'
import { Analytics } from '@/pages/analytics/Analytics'
import { Settings } from '@/pages/settings/Settings'
import { Import } from '@/pages/import/Import'
import { Test } from '@/pages/test/Test'
import { ReadAloud } from '@/pages/read-aloud/ReadAloud'
import { Onboarding } from '@/pages/onboarding/Onboarding'
import { useSettings } from '@/hooks/settings'
import { useEffect } from 'react'
import { onOpenUrl, getCurrent, isRegistered } from '@tauri-apps/plugin-deep-link'
import { invoke } from '@tauri-apps/api/core'
import { supabase } from '@/lib/supabase'

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
})

// Check if onboarding is completed
function OnboardingGate({ children }: { children: React.ReactNode }) {
  const onboardingCompleted = localStorage.getItem('onboarding_completed') === 'true'

  if (!onboardingCompleted) {
    return <Navigate to="/onboarding" replace />
  }

  return <>{children}</>
}

// Protected route component that checks if model is selected
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings()

  // If no model selected, redirect to settings
  if (!settings.selectedModel) {
    return <Navigate to="/settings" replace />
  }

  return <>{children}</>
}

// Auth deep link handler - always active at root level
function AuthDeepLinkHandler() {
  useEffect(() => {
    alert('[Debug] AuthDeepLinkHandler mounted - setting up global deep link listeners')
    // Emit a Rust-visible marker so tests can see JS is alive
    invoke('log_marker', { message: 'AuthDeepLinkHandler mounted' }).catch(() => {})

    // Check plugin registration status (desktop should be auto-registered via config)
    isRegistered('fluentwhisper').then((v) => {
      console.log('[AuthDeepLinkHandler] deep-link isRegistered():', v)
      alert('[Debug] deep-link isRegistered(): ' + v)
    }).catch((e) => {
      console.error('[AuthDeepLinkHandler] isRegistered() error:', e)
      alert('[Debug] isRegistered() error: ' + (e?.message || String(e)))
    })

    const handleAuthDeepLink = async (url: string) => {
      invoke('log_marker', { message: `onOpenUrl received: ${url}` }).catch(() => {})
      alert('[Debug] Global handleAuthDeepLink called with: ' + url)
      console.log('[AuthDeepLinkHandler] Processing deep link:', url)

      if (!url.startsWith('fluentwhisper://auth-callback')) {
        console.log('[AuthDeepLinkHandler] Not an auth callback URL')
        return
      }

      try {
        const urlObj = new URL(url)
        const accessToken = urlObj.searchParams.get('access_token')
        const refreshToken = urlObj.searchParams.get('refresh_token')

        if (accessToken && refreshToken) {
          console.log('[AuthDeepLinkHandler] Successfully extracted auth tokens from deep link')

          // Set session in Supabase and save credentials
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          })

          if (error || !data.session) {
            console.error('[AuthDeepLinkHandler] Failed to set session:', error)
            alert('Failed to sign in: ' + (error?.message || 'Unknown error'))
            return
          }

          console.log('[AuthDeepLinkHandler] Session set successfully, saving credentials...')

          // Save credentials in Rust secure storage
          try {
            await invoke('save_auth_credentials', {
              accessToken: accessToken,
              refreshToken: refreshToken,
              userId: data.session.user.id,
              email: data.session.user.email || ''
            })
            console.log('[AuthDeepLinkHandler] Credentials saved successfully!')
            // TEST MARKER: Deep link auth test passed - credentials saved
            console.log('[TEST_SUCCESS] Deep link authentication completed successfully')
            alert('Successfully signed in! Premium features unlocked.')
          } catch (err) {
            console.error('[AuthDeepLinkHandler] Failed to save credentials:', err)
          }
        } else {
          console.error('[AuthDeepLinkHandler] Missing tokens in deep link URL')
          alert('Authentication failed: No tokens received')
        }
      } catch (err) {
        console.error('[AuthDeepLinkHandler] Failed to parse deep link URL:', err)
        alert('Authentication failed: Invalid callback URL')
      }
    }

    // Check if app was opened with a deep link
    getCurrent().then(urls => {
      alert('[Debug] Global getCurrent() returned: ' + JSON.stringify(urls))
      console.log('[AuthDeepLinkHandler] Initial URLs on mount:', urls)
      if (urls && urls.length > 0) {
        invoke('log_marker', { message: `getCurrent found: ${urls[0]}` }).catch(() => {})
        handleAuthDeepLink(urls[0])
      } else {
        alert('[Debug] No initial deep link URLs found')
      }
    }).catch(err => {
      alert('[Debug] Global getCurrent() error: ' + err)
      console.log('[AuthDeepLinkHandler] No initial deep link:', err)
    })

    // Listen for new deep links while app is running
    const unlisten = onOpenUrl((urls) => {
      alert('[Debug] Global onOpenUrl event fired with: ' + JSON.stringify(urls))
      console.log('[AuthDeepLinkHandler] Received deep link event:', urls)
      if (urls && urls.length > 0) {
        invoke('log_marker', { message: `onOpenUrl list[0]: ${urls[0]}` }).catch(() => {})
        handleAuthDeepLink(urls[0])
      }
    })

    return () => {
      unlisten.then(fn => fn())
    }
  }, [])

  return null // This component doesn't render anything
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        {/* Global auth deep link handler - always active */}
        <AuthDeepLinkHandler />

        <Routes>
          {/* Onboarding - standalone, no layout */}
          <Route path="/onboarding" element={<Onboarding />} />

          {/* Main app with layout */}
          <Route path="/" element={<OnboardingGate><Layout /></OnboardingGate>}>
            <Route index element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="record" element={<ProtectedRoute><Record /></ProtectedRoute>} />
            <Route path="library" element={<ProtectedRoute><Library /></ProtectedRoute>} />
            <Route path="read-aloud/:textLibraryId" element={<ProtectedRoute><ReadAloud /></ProtectedRoute>} />
            <Route path="history" element={<ProtectedRoute><History /></ProtectedRoute>} />
            <Route path="session/:sessionId" element={<ProtectedRoute><SessionDetail /></ProtectedRoute>} />
            <Route path="vocabulary" element={<ProtectedRoute><Vocabulary /></ProtectedRoute>} />
            <Route path="analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
            <Route path="settings" element={<Settings />} />
            <Route path="import" element={<ProtectedRoute><Import /></ProtectedRoute>} />
            <Route path="test" element={<Test />} />
          </Route>
        </Routes>
      </Router>
    </QueryClientProvider>
  )
}

export default App