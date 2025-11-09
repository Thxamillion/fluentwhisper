import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { Layout } from '@/components/layout/Layout'
import { Dashboard } from '@/pages/dashboard/Dashboard'
import { Record } from '@/pages/record/Record'
import { Library } from '@/pages/library/Library'
import { History } from '@/pages/history/History'
import { SessionDetail } from '@/pages/session-detail/SessionDetail'
import { Vocabulary } from '@/pages/vocabulary/Vocabulary'
import { Progress } from '@/pages/progress/Progress'
import { Settings } from '@/pages/settings/Settings'
import { Import } from '@/pages/import/Import'
import { Test } from '@/pages/test/Test'
import { ReadAloud } from '@/pages/read-aloud/ReadAloud'
import { Onboarding } from '@/pages/onboarding/Onboarding'
import { LoginCallback } from '@/pages/login/LoginCallback'
import { TranslationTest } from '@/pages/translation-test/TranslationTest'
import { GlobalDownloadToast } from '@/components/GlobalDownloadToast'
import { ModelSelectionGuard } from '@/components/ModelSelectionGuard'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ThemeProvider } from '@/components/ThemeProvider'
import { useSettings } from '@/hooks/settings'
import { useSettingsStore } from '@/stores/settingsStore'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { invoke } from '@tauri-apps/api/core'
import { logger } from '@/services/logger'
import { onOpenUrl } from '@tauri-apps/plugin-deep-link'
import { DesktopAuthService } from '@/services/auth/desktop-auth.service'
import { toast } from 'sonner'

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
    logger.debug('Setting up global auth state listener', 'Auth')

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      logger.debug(`State changed: ${event}`, 'Auth', session?.user?.email)

      if (event === 'SIGNED_IN' && session) {
        logger.info('User signed in, saving credentials', 'Auth')

        try {
          await invoke('save_auth_credentials', {
            accessToken: session.access_token,
            refreshToken: session.refresh_token,
            userId: session.user.id,
            email: session.user.email || ''
          })
          logger.debug('Credentials saved successfully', 'Auth')
        } catch (error) {
          logger.error('Failed to save credentials', 'Auth', error)
        }
      } else if (event === 'SIGNED_OUT') {
        logger.info('User signed out, clearing credentials', 'Auth')
        try {
          await invoke('delete_auth_credentials')
        } catch (error) {
          logger.error('Failed to delete credentials', 'Auth', error)
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
        logger.info(`Running automatic cleanup with ${settings.retentionDays} day retention`, 'Cleanup')
        try {
          const stats = await invoke<{ deletedCount: number; failedCount: number }>('run_cleanup', {
            retentionDays: settings.retentionDays
          })
          logger.info(`Complete: deleted ${stats.deletedCount} sessions, ${stats.failedCount} failures`, 'Cleanup')
        } catch (error) {
          logger.error('Failed to run cleanup', 'Cleanup', error)
        }
      } else {
        logger.debug('Retention set to "Never delete", skipping cleanup', 'Cleanup')
      }
    }

    // Run cleanup on mount (app startup)
    runCleanup()
  }, []) // Empty deps - only run once on mount

  return null
}

// Debug mode listener - syncs debug mode setting with logger
function DebugModeListener() {
  const { settings } = useSettingsStore()

  useEffect(() => {
    logger.setDebugMode(settings.debugMode)
  }, [settings.debugMode])

  return null
}

// Deep link listener - handles OAuth callbacks from browser
function DeepLinkListener() {
  useEffect(() => {
    logger.debug('Setting up deep link listener for OAuth callbacks', 'DeepLink')

    // Listen for deep link events
    const unlisten = onOpenUrl((urls) => {
      logger.debug('Deep link received:', 'DeepLink', urls)

      for (const url of urls) {
        try {
          const parsedUrl = new URL(url)

          // Check if this is an OAuth callback
          if (parsedUrl.protocol === 'fluentwhisper:' && parsedUrl.host === 'auth-callback') {
            logger.info('Processing OAuth callback from deep link', 'DeepLink')

            // Extract query parameters
            const params = parsedUrl.searchParams

            // Process the OAuth callback
            DesktopAuthService.handleOAuthCallback(params)
              .then(() => {
                logger.info('OAuth sign-in successful!', 'DeepLink')
                toast.success('Successfully signed in!')
              })
              .catch((error) => {
                logger.error('OAuth callback processing failed', 'DeepLink', error)
                toast.error('Failed to sign in: ' + (error.message || 'Unknown error'))
              })
          }
        } catch (error) {
          logger.error('Failed to parse deep link URL', 'DeepLink', error)
        }
      }
    })

    return () => {
      unlisten.then(fn => fn())
    }
  }, [])

  return null
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        {/* Toast notifications - global */}
        <Toaster position="top-right" richColors closeButton />

      <Router>
        {/* Global listeners - always active */}
        <AuthStateListener />
        <CleanupListener />
        <DebugModeListener />
        <DeepLinkListener />
        <ModelSelectionGuard />

        {/* Global download toast - persists across pages */}
        <GlobalDownloadToast />

        <Routes>
          {/* Auth pages - standalone, no layout */}
          <Route path="/login/callback" element={
            <ErrorBoundary fallbackMessage="Failed to complete login. Please try logging in again.">
              <LoginCallback />
            </ErrorBoundary>
          } />

          {/* Onboarding - standalone, no layout */}
          <Route path="/onboarding" element={
            <ErrorBoundary fallbackMessage="Failed to load onboarding. Please refresh and try again.">
              <Onboarding />
            </ErrorBoundary>
          } />

          {/* Main app with layout */}
          <Route path="/" element={<OnboardingGate><Layout /></OnboardingGate>}>
            <Route index element={
              <ErrorBoundary fallbackMessage="Failed to load dashboard. Your data is safe.">
                <ProtectedRoute><Dashboard /></ProtectedRoute>
              </ErrorBoundary>
            } />
            <Route path="record" element={
              <ErrorBoundary fallbackMessage="Failed to load recording page. Please check your microphone settings.">
                <ProtectedRoute><Record /></ProtectedRoute>
              </ErrorBoundary>
            } />
            <Route path="library" element={
              <ErrorBoundary fallbackMessage="Failed to load text library. Your saved texts are safe.">
                <ProtectedRoute><Library /></ProtectedRoute>
              </ErrorBoundary>
            } />
            <Route path="read-aloud/:textLibraryId" element={
              <ErrorBoundary fallbackMessage="Failed to load read-aloud session. The text may be unavailable.">
                <ProtectedRoute><ReadAloud /></ProtectedRoute>
              </ErrorBoundary>
            } />
            <Route path="history" element={
              <ErrorBoundary fallbackMessage="Failed to load session history. Your sessions are safe.">
                <ProtectedRoute><History /></ProtectedRoute>
              </ErrorBoundary>
            } />
            <Route path="session/:sessionId" element={
              <ErrorBoundary fallbackMessage="Failed to load session details. The session may not exist.">
                <ProtectedRoute><SessionDetail /></ProtectedRoute>
              </ErrorBoundary>
            } />
            <Route path="vocabulary" element={
              <ErrorBoundary fallbackMessage="Failed to load vocabulary. Your learned words are safe.">
                <ProtectedRoute><Vocabulary /></ProtectedRoute>
              </ErrorBoundary>
            } />
            <Route path="progress" element={
              <ErrorBoundary fallbackMessage="Failed to load progress analytics. Your stats are safe.">
                <ProtectedRoute><Progress /></ProtectedRoute>
              </ErrorBoundary>
            } />
            <Route path="settings" element={
              <ErrorBoundary fallbackMessage="Failed to load settings. Your configuration is safe.">
                <Settings />
              </ErrorBoundary>
            } />
            <Route path="import" element={
              <ErrorBoundary fallbackMessage="Failed to load import page. Please try again.">
                <ProtectedRoute><Import /></ProtectedRoute>
              </ErrorBoundary>
            } />
            <Route path="test" element={
              <ErrorBoundary fallbackMessage="Failed to load test page.">
                <Test />
              </ErrorBoundary>
            } />
            <Route path="translation-test" element={
              <ErrorBoundary fallbackMessage="Failed to load translation test.">
                <TranslationTest />
              </ErrorBoundary>
            } />
          </Route>
        </Routes>
      </Router>
    </QueryClientProvider>
    </ThemeProvider>
  )
}

export default App