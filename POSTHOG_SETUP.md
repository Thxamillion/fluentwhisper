# PostHog Analytics Setup Guide

## ✅ What's Done

1. **PostHog SDK installed** (`npm install posthog-js`)
2. **Analytics service created** (`src/services/analytics.ts`)
   - Privacy-safe wrapper with sanitization
   - Opt-out support
   - Type-safe tracking helpers
3. **Settings updated**
   - Added `analyticsEnabled` toggle to settings store
   - Added UI toggle in Settings page with privacy explanation
4. **App initialization**
   - AnalyticsListener component added to App.tsx
   - Tracks `app_opened` event on launch
   - Respects analytics toggle setting

## 🔧 Next Steps

### 1. Get Your PostHog API Key

1. Sign up at https://app.posthog.com
2. Create a new project
3. Copy your API key (starts with `phc_`)
4. Create `.env` file in project root:
   ```bash
   VITE_POSTHOG_API_KEY=phc_your_actual_key_here
   ```

### 2. Add Tracking to Key Flows

The analytics service is ready - now add tracking calls to these files:

#### **src/pages/record/Record.tsx** (Recording flow)

```typescript
// In handlePromptClick
const handlePromptClick = (prompt: string) => {
  // Find the category for this prompt
  const category = Object.entries(promptsByCategory).find(([_, prompts]) =>
    prompts.includes(prompt)
  )?.[0] || 'Unknown'

  Analytics.promptSelected(category, prompt)
  setSelectedPrompt(prompt)
  setPromptsExpanded(false)
}

// When clearing prompt
<button onClick={() => {
  Analytics.promptCleared(false) // false = cleared before recording
  setSelectedPrompt(null)
}}>

// In handleRecordToggle (start recording)
else {
  Analytics.recordingStarted(
    selectedLanguage,
    !!selectedPrompt,
    selectedPrompt ? getCategoryForPrompt(selectedPrompt) : undefined
  )
  recording.startRecording(selectedLanguage, selectedDevice, primaryLanguage)
}

// In handleRecordToggle (stop recording)
if (recording.isRecording) {
  const result = await recording.stopRecording()
  Analytics.recordingStopped(result.durationSeconds, selectedLanguage)
  setRecordingData(result)
  setProcessingStage('review')
}

// In handleTranscribeAndSave (transcription started)
setProcessingStage('transcribing')
const transcriptionStart = Date.now()
Analytics.transcriptionStarted(recordingData.durationSeconds, selectedLanguage, settings.selectedModel)

const transcriptResult = await recording.transcribe(recordingData.filePath, selectedLanguage)
const transcriptionDuration = (Date.now() - transcriptionStart) / 1000

Analytics.transcriptionCompleted(
  recordingData.durationSeconds,
  transcriptionDuration,
  selectedLanguage,
  settings.selectedModel,
  transcriptResult.text.split(' ').length
)

// In handleTranscribeAndSave (session saved)
await recording.completeSession(...)
Analytics.sessionSaved(
  recordingData.durationSeconds,
  transcriptResult.text.split(' ').length,
  selectedLanguage,
  !!selectedPrompt,
  selectedPrompt ? getCategoryForPrompt(selectedPrompt) : undefined
)

// In confirmDiscard
const confirmDiscard = async () => {
  Analytics.recordingDiscarded(
    recordingData?.durationSeconds || 0,
    processingStage === 'review' ? 'review' : 'recording'
  )
  // ... rest of discard logic
}

// Catch transcription errors
catch (error) {
  Analytics.transcriptionFailed(
    recordingData.durationSeconds,
    settings.selectedModel,
    String(error)
  )
  toast.error('Failed to process session. Please try again.')
}
```

#### **src/pages/onboarding/Onboarding.tsx** (Onboarding flow)

```typescript
// When language selected
Analytics.onboardingLanguageSelected(targetLanguage, primaryLanguage)

// When model selected
Analytics.onboardingModelSelected(
  modelType, // 'local' or 'cloud'
  modelName
)

// When model download starts
Analytics.onboardingModelDownloadStarted(modelName)

// When download completes
Analytics.onboardingModelDownloadCompleted(
  modelName,
  downloadDurationSeconds,
  success,
  error
)

// When onboarding complete
Analytics.onboardingCompleted(
  totalDurationSeconds,
  targetLanguage,
  modelType
)
```

#### **src/components/layout/Layout.tsx** (Navigation tracking)

```typescript
// Track page views
useEffect(() => {
  const pathname = location.pathname
  const pageName = pathname.split('/')[1] || 'dashboard'
  Analytics.pageViewed(pageName)
}, [location.pathname])
```

#### **src/components/ErrorBoundary.tsx** (Error tracking)

```typescript
componentDidCatch(error: Error, errorInfo: ErrorInfo) {
  console.error('ErrorBoundary caught an error:', error, errorInfo)

  // Track error
  Analytics.errorOccurred(
    error.message,
    window.location.pathname,
    true // fatal
  )

  if (this.props.onError) {
    this.props.onError(error, errorInfo)
  }
}
```

### 3. Add User Properties for Retention

Update user properties when key metrics change:

```typescript
// After session saved
Analytics.updateUserProperties({
  targetLanguage: selectedLanguage,
  totalSessions: updatedTotalSessions,
  totalPracticeMinutes: updatedTotalMinutes,
  currentStreakDays: currentStreak,
})
```

## 📊 Key Metrics Tracked

### High Priority (Implemented in analytics service):
- ✅ `app_opened` - App launches
- ✅ `recording_started` - User starts recording
- ✅ `recording_stopped` - User stops recording
- ✅ `recording_discarded` - User discards recording
- ✅ `transcription_started` - Transcription begins
- ✅ `transcription_completed` - Transcription succeeds
- ✅ `transcription_failed` - Transcription errors
- ✅ `session_saved` - Session successfully saved
- ✅ `prompt_selected` - User picks a prompt
- ✅ `prompt_cleared` - User removes prompt
- ✅ `page_viewed` - Navigation tracking
- ✅ `error_occurred` - App errors
- ✅ Onboarding events (all steps)

### User Properties (for Retention Analysis):
- `target_language` - Language being learned
- `primary_language` - Native language
- `model_type` - local vs cloud
- `total_sessions` - Lifetime session count
- `total_practice_minutes` - Total practice time
- `total_vocabulary_words` - Words saved
- `current_streak_days` - Current streak
- `longest_streak_days` - Best streak

## 🎯 Questions You Can Answer

With this tracking, you'll be able to answer:

1. **User Retention**
   - How many users return day 2, 7, 30?
   - What's the average session frequency?
   - Which users are power users vs casual?

2. **Feature Usage**
   - Which prompts are most popular?
   - Which prompt categories drive engagement?
   - Do users prefer local or cloud models?

3. **Error Rates**
   - What's the transcription success rate?
   - Which models fail most often?
   - Where do users encounter errors?

4. **Language Popularity**
   - Which languages are most practiced?
   - Does language affect retention?

5. **Session Metrics**
   - Average session duration
   - Average words per session
   - Recording → Save conversion rate

## 🔒 Privacy Guarantees

What we NEVER track:
- ❌ Voice recordings or audio data
- ❌ Transcribed text content
- ❌ Vocabulary words or translations
- ❌ Personal information (name, email - unless user logs in)

What we DO track:
- ✅ Feature usage (buttons clicked, pages visited)
- ✅ Session metadata (duration, word count, language)
- ✅ Error types (sanitized, no sensitive data)
- ✅ Performance metrics (transcription speed)

## 🚀 Testing

1. Enable analytics in Settings
2. Perform actions (record session, select prompt, etc.)
3. Check PostHog dashboard: https://app.posthog.com
4. View "Live events" to see events arriving in real-time

## 📝 TODO

- [ ] Add PostHog API key to `.env`
- [ ] Add tracking to Record.tsx
- [ ] Add tracking to Onboarding.tsx
- [ ] Add tracking to Layout.tsx (page views)
- [ ] Add tracking to ErrorBoundary.tsx
- [ ] Test tracking in PostHog dashboard
- [ ] Add user properties updates
