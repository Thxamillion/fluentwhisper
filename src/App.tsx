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
import { GlobalDownloadToast } from '@/components/GlobalDownloadToast'
import { ModelSelectionGuard } from '@/components/ModelSelectionGuard'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ThemeProvider } from '@/components/ThemeProvider'
import { UpdateDialog } from '@/components/UpdateDialog'
import { useSettings } from '@/hooks/settings'
import { useSettingsStore } from '@/stores/settingsStore'
import { useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { logger } from '@/services/logger'
import { initAnalytics, enableTracking, disableTracking } from '@/services/analytics'
import { toast } from '@/lib/toast'

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

// Analytics listener - initializes PostHog and syncs with settings
function AnalyticsListener() {
  const { settings } = useSettingsStore()

  useEffect(() => {
    // Initialize PostHog once on mount
    const apiKey = import.meta.env.VITE_POSTHOG_API_KEY
    if (apiKey) {
      initAnalytics(apiKey, settings.analyticsEnabled)
      logger.info('Analytics initialized', 'Analytics')
    } else {
      logger.debug('No PostHog API key found, analytics disabled', 'Analytics')
    }
  }, []) // Only run once on mount

  useEffect(() => {
    // Update opt-in/opt-out when setting changes
    if (settings.analyticsEnabled) {
      enableTracking()
      logger.info('Analytics tracking enabled', 'Analytics')
    } else {
      disableTracking()
      logger.info('Analytics tracking disabled', 'Analytics')
    }
  }, [settings.analyticsEnabled])

  return null
}

// Language pack listener - shows warning when primary language pack is missing
function LanguagePackListener() {
  useEffect(() => {
    const unlistenPromise = listen<string>('primary-language-pack-missing', (event) => {
      const language = event.payload
      const languageName = language === 'en' ? 'English' :
                          language === 'es' ? 'Spanish' :
                          language === 'fr' ? 'French' :
                          language === 'de' ? 'German' :
                          language === 'it' ? 'Italian' : language

      toast.warning(
        `${languageName} language pack missing. Vocabulary filtering disabled. Download it in Settings → Languages.`,
        { duration: 8000 }
      )

      logger.warn(`Primary language pack missing: ${language}`, 'LanguagePack')
    })

    return () => {
      unlistenPromise.then((unlisten) => unlisten())
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
        <CleanupListener />
        <DebugModeListener />
        <AnalyticsListener />
        <LanguagePackListener />
        <ModelSelectionGuard />

        {/* Global download toast - persists across pages */}
        <GlobalDownloadToast />

        {/* Update dialog - checks for updates on startup and every 24 hours */}
        <UpdateDialog />

        <Routes>
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
            {/* Test routes - only available in development mode */}
            {import.meta.env.DEV && (
              <>
                <Route path="test" element={
                  <ErrorBoundary fallbackMessage="Failed to load test page.">
                    <Test />
                  </ErrorBoundary>
                } />
              </>
            )}
          </Route>
        </Routes>
      </Router>
    </QueryClientProvider>
    </ThemeProvider>
  )
}

export default App