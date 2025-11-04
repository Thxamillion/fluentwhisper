import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
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
import { Login } from '@/pages/login/Login'
import { LoginCallback } from '@/pages/login/LoginCallback'
import { TranslationTest } from '@/pages/translation-test/TranslationTest'
import { GlobalDownloadToast } from '@/components/GlobalDownloadToast'
import { useSettings } from '@/hooks/settings'
import { useSettingsStore } from '@/stores/settingsStore'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { invoke } from '@tauri-apps/api/core'

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

// Global auth state listener - saves credentials when user signs in
function AuthStateListener() {
  useEffect(() => {
    console.log('[Auth] Setting up global auth state listener')

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[Auth] State changed:', event, session?.user?.email)

      if (event === 'SIGNED_IN' && session) {
        console.log('[Auth] User signed in, saving credentials to secure storage')

        try {
          await invoke('save_auth_credentials', {
            accessToken: session.access_token,
            refreshToken: session.refresh_token,
            userId: session.user.id,
            email: session.user.email || ''
          })
          console.log('[Auth] Credentials saved successfully')
        } catch (error) {
          console.error('[Auth] Failed to save credentials:', error)
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('[Auth] User signed out, clearing credentials')
        try {
          await invoke('delete_auth_credentials')
        } catch (error) {
          console.error('[Auth] Failed to delete credentials:', error)
        }
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return null // This component doesn't render anything
}

// Auto-cleanup listener - runs cleanup on app startup
function CleanupListener() {
  const { settings } = useSettingsStore()

  useEffect(() => {
    const runCleanup = async () => {
      // Only run if retention period is set (null = never delete)
      if (settings.retentionDays) {
        console.log(`[Cleanup] Running automatic cleanup with ${settings.retentionDays} day retention`)
        try {
          const stats = await invoke<{ deletedCount: number; failedCount: number }>('run_cleanup', {
            retentionDays: settings.retentionDays
          })
          console.log(`[Cleanup] Complete: deleted ${stats.deletedCount} sessions, ${stats.failedCount} failures`)
        } catch (error) {
          console.error('[Cleanup] Failed:', error)
        }
      } else {
        console.log('[Cleanup] Retention set to "Never delete", skipping cleanup')
      }
    }

    // Run cleanup on mount (app startup)
    runCleanup()
  }, []) // Empty deps - only run once on mount

  return null
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        {/* Global listeners - always active */}
        <AuthStateListener />
        <CleanupListener />

        {/* Global download toast - persists across pages */}
        <GlobalDownloadToast />

        <Routes>
          {/* Auth pages - standalone, no layout */}
          <Route path="/login" element={<Login />} />
          <Route path="/login/callback" element={<LoginCallback />} />

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
            <Route path="translation-test" element={<TranslationTest />} />
          </Route>
        </Routes>
      </Router>
    </QueryClientProvider>
  )
}

export default App