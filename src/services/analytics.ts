import posthog from 'posthog-js'

/**
 * Analytics Service - Privacy-Safe PostHog Wrapper
 *
 * This service wraps PostHog with privacy safeguards:
 * - Respects user opt-out preference
 * - Never tracks sensitive content (recordings, transcriptions, vocabulary words)
 * - Only tracks metadata and feature usage
 *
 * What we NEVER track:
 * - Voice recordings or audio data
 * - Transcribed text content
 * - Vocabulary words or translations
 * - Personal information
 *
 * What we DO track:
 * - Feature usage (which buttons/pages)
 * - Session metadata (duration, language, word count)
 * - Error types (sanitized)
 * - Performance metrics
 */

let isInitialized = false

/**
 * Initialize PostHog
 * Call this once when the app starts
 */
export function initAnalytics(apiKey: string, enabled: boolean = true) {
  if (isInitialized) return

  posthog.init(apiKey, {
    api_host: 'https://us.i.posthog.com',
    person_profiles: 'identified_only', // Only create profiles for logged-in users
    autocapture: false, // Disable automatic event capture for privacy
    capture_pageview: false, // We'll manually track page views
    disable_session_recording: true, // Never record sessions (privacy!)

    // Opt-out handling
    opt_out_capturing_by_default: !enabled,

    // Advanced privacy settings
    sanitize_properties: (properties) => {
      // Remove any accidentally included sensitive data
      const sanitized = { ...properties }
      delete sanitized.text
      delete sanitized.transcription
      delete sanitized.recording
      delete sanitized.word
      delete sanitized.translation
      return sanitized
    },
  })

  isInitialized = true
}

/**
 * Track an event
 */
export function track(eventName: string, properties?: Record<string, any>) {
  if (!isInitialized) {
    console.warn('[Analytics] Not initialized, skipping event:', eventName)
    return
  }

  posthog.capture(eventName, properties)
}

/**
 * Set user properties (for retention analysis)
 */
export function setUserProperties(properties: Record<string, any>) {
  if (!isInitialized) return

  posthog.setPersonProperties(properties)
}

/**
 * Identify a user (for logged-in users only)
 */
export function identifyUser(userId: string, properties?: Record<string, any>) {
  if (!isInitialized) return

  posthog.identify(userId, properties)
}

/**
 * Reset user identity (on logout)
 */
export function resetUser() {
  if (!isInitialized) return

  posthog.reset()
}

/**
 * Enable analytics tracking
 */
export function enableTracking() {
  if (!isInitialized) return

  posthog.opt_in_capturing()
}

/**
 * Disable analytics tracking (user opt-out)
 */
export function disableTracking() {
  if (!isInitialized) return

  posthog.opt_out_capturing()
}

/**
 * Check if tracking is enabled
 */
export function isTrackingEnabled(): boolean {
  if (!isInitialized) return false

  return !posthog.has_opted_out_capturing()
}

// Type-safe event tracking helpers
export const Analytics = {
  // App Lifecycle
  appOpened: (platform: string, version: string, isFirstLaunch: boolean) => {
    track('app_opened', {
      platform,
      app_version: version,
      is_first_launch: isFirstLaunch,
    })
  },

  // Onboarding
  onboardingLanguageSelected: (targetLanguage: string, primaryLanguage: string) => {
    track('onboarding_language_selected', {
      target_language: targetLanguage,
      primary_language: primaryLanguage,
    })
  },

  onboardingModelSelected: (modelType: 'local' | 'cloud', modelName: string) => {
    track('onboarding_model_selected', {
      model_type: modelType,
      model_name: modelName,
    })
  },

  onboardingModelDownloadStarted: (modelName: string) => {
    track('onboarding_model_download_started', {
      model_name: modelName,
    })
  },

  onboardingModelDownloadCompleted: (modelName: string, durationSeconds: number, success: boolean, error?: string) => {
    track('onboarding_model_download_completed', {
      model_name: modelName,
      duration_seconds: durationSeconds,
      success,
      error_type: error ? sanitizeError(error) : undefined,
    })
  },

  onboardingCompleted: (totalDurationSeconds: number, targetLanguage: string, modelType: 'local' | 'cloud') => {
    track('onboarding_completed', {
      total_duration_seconds: totalDurationSeconds,
      target_language: targetLanguage,
      model_type: modelType,
    })
  },

  // Recording & Sessions
  recordingStarted: (language: string, promptSelected: boolean, promptCategory?: string) => {
    track('recording_started', {
      language,
      prompt_selected: promptSelected,
      prompt_category: promptCategory,
    })
  },

  recordingStopped: (durationSeconds: number, language: string) => {
    track('recording_stopped', {
      duration_seconds: durationSeconds,
      language,
    })
  },

  recordingDiscarded: (durationSeconds: number, stage: 'recording' | 'review') => {
    track('recording_discarded', {
      duration_seconds: durationSeconds,
      stage,
    })
  },

  transcriptionStarted: (audioDurationSeconds: number, language: string, modelName: string) => {
    track('transcription_started', {
      audio_duration_seconds: audioDurationSeconds,
      language,
      model_name: modelName,
    })
  },

  transcriptionCompleted: (
    audioDurationSeconds: number,
    transcriptionDurationSeconds: number,
    language: string,
    modelName: string,
    wordCount: number
  ) => {
    track('transcription_completed', {
      audio_duration_seconds: audioDurationSeconds,
      transcription_duration_seconds: transcriptionDurationSeconds,
      language,
      model_name: modelName,
      word_count: wordCount,
      success: true,
    })
  },

  transcriptionFailed: (audioDurationSeconds: number, modelName: string, errorType: string) => {
    track('transcription_failed', {
      audio_duration_seconds: audioDurationSeconds,
      model_name: modelName,
      error_type: sanitizeError(errorType),
    })
  },

  sessionSaved: (
    durationSeconds: number,
    wordCount: number,
    language: string,
    promptUsed: boolean,
    promptCategory?: string
  ) => {
    track('session_saved', {
      duration_seconds: durationSeconds,
      word_count: wordCount,
      language,
      prompt_used: promptUsed,
      prompt_category: promptCategory,
    })
  },

  // Prompts
  promptPickerOpened: () => {
    track('prompt_picker_opened')
  },

  promptSelected: (category: string, promptText: string) => {
    track('prompt_selected', {
      prompt_category: category,
      prompt_text: promptText, // Safe to track - it's just the prompt, not what user said
    })
  },

  promptCleared: (beforeRecording: boolean) => {
    track('prompt_cleared', {
      before_recording: beforeRecording,
    })
  },

  // Navigation
  pageViewed: (pageName: string) => {
    track('page_viewed', {
      page_name: pageName,
    })
  },

  // Errors
  errorOccurred: (errorType: string, page: string, fatal: boolean) => {
    track('error_occurred', {
      error_type: sanitizeError(errorType),
      page,
      fatal,
    })
  },

  // User Properties (for retention)
  updateUserProperties: (props: {
    targetLanguage?: string
    primaryLanguage?: string
    modelType?: 'local' | 'cloud'
    totalSessions?: number
    totalPracticeMinutes?: number
    totalVocabularyWords?: number
    currentStreakDays?: number
    longestStreakDays?: number
  }) => {
    setUserProperties({
      target_language: props.targetLanguage,
      primary_language: props.primaryLanguage,
      model_type: props.modelType,
      total_sessions: props.totalSessions,
      total_practice_minutes: props.totalPracticeMinutes,
      total_vocabulary_words: props.totalVocabularyWords,
      current_streak_days: props.currentStreakDays,
      longest_streak_days: props.longestStreakDays,
    })
  },
}

/**
 * Sanitize error messages to remove sensitive data
 * Only keep error type/category, not full messages
 */
function sanitizeError(error: string): string {
  // Map specific errors to categories
  if (error.includes('network') || error.includes('fetch')) return 'network_error'
  if (error.includes('permission')) return 'permission_denied'
  if (error.includes('not found') || error.includes('404')) return 'not_found'
  if (error.includes('timeout')) return 'timeout'
  if (error.includes('disk') || error.includes('space')) return 'disk_space'

  return 'unknown_error'
}
