# Dev Auth & Cloud Transcription - Implementation Progress

## ✅ Completed (Phase 1 - Testing Infrastructure)

### 1. **Test Page Renamed** ✅
- **File**: `/src/pages/test/Test.tsx`
- Renamed from `TestLangpack` to `Test`
- Updated imports in `App.tsx`
- More general purpose for all dev testing

### 2. **Dev Auth Panel** ✅
- **File**: `/src/components/DevAuthPanel.tsx`
- **Location**: Shows at `/test` page
- **Features**:
  - Guest Mode button (clears all auth)
  - Free User button (mock logged-in, no subscription)
  - Premium User button (mock logged-in + premium subscription)
  - Clear All Mock Data button
  - Test Deep Link button
  - Shows current auth state
  - Only visible in dev mode (`import.meta.env.PROD` check)

**How to use:**
```
1. Navigate to http://localhost:1420/test
2. Click "Premium User" button
3. Page reloads → You're now logged in as premium
4. Go to Settings → Cloud transcription toggle is unlocked
5. Click "Guest Mode" to test free user experience
```

### 3. **Settings Store** ✅
- **Files**:
  - `/src/stores/settingsStore.ts` (Zustand store)
  - `/src/hooks/settings/useSettings.ts` (React hook)
  - `/src/hooks/settings/index.ts` (exports)

**Interface**:
```typescript
interface AppSettings {
  useCloudTranscription: boolean  // Premium feature
  whisperModel: string
  defaultMicrophone: string
  audioQuality: 'high' | 'medium' | 'low'
  noiseReduction: boolean
  primaryLanguage: string
  targetLanguage: string
}
```

**Usage**:
```typescript
import { useSettings } from '@/hooks/settings'

const { settings, updateSetting } = useSettings()

// Read setting
const useCloud = settings.useCloudTranscription

// Update setting
updateSetting('useCloudTranscription', true)
```

### 4. **Cloud Transcription Toggle in Settings** ✅
- **File**: `/src/pages/settings/Settings.tsx`
- **Location**: Top of settings page (after Whisper Model section)
- **Features**:
  - Wrapped in `<PremiumFeature>` component
  - Shows "Upgrade to Premium" for free users
  - Shows working toggle for premium users
  - Visual feedback when enabled
  - Unlimited cloud transcription messaging

**UI States**:
- **Free User**: Shows upgrade prompt instead of toggle
- **Premium User**: Shows toggle (enabled/disabled)
- **Toggle ON**: Shows confirmation message with checkmark

---

## 🚧 Remaining (Phase 2 - Integration)

### 5. **Update Record Page** 📝
- **File**: `/src/pages/record/Record.tsx`
- **Need to**:
  - Import `useSettings` and `useSubscription`
  - Check if `settings.useCloudTranscription && subscription?.isPremium`
  - If true → call cloud transcription service
  - If false → call local Rust command `invoke('transcribe')`
  - Add visual badge showing which mode is active

### 6. **Update ReadAloud Page** 📝
- **File**: `/src/pages/read-aloud/ReadAloud.tsx`
- Same implementation as Record page

### 7. **Update Import Page** 📝
- **File**: `/src/pages/import/Import.tsx`
- Same implementation as Record page

### 8. **Create Cloud Transcription Service** 📝
- **Option A**: Supabase Edge Function (Recommended)
  - **File**: `/supabase/functions/transcribe-audio/index.ts`
  - Accepts audio file (Blob/ArrayBuffer)
  - Calls OpenAI Whisper API
  - Returns transcript text
  - Cost: $0.006/minute (extremely cheap!)

- **Option B**: TypeScript service calling OpenAI directly
  - **File**: `/src/services/transcription/cloudTranscription.ts`
  - Uses OpenAI API key from env
  - Direct API calls from desktop app

**Recommendation**: Start with Option A (Edge Function) for better security (API key on server)

### 9. **Add Visual Indicators** 📝
- Create badge component showing transcription mode
- **Files**:
  - `/src/components/TranscriptionBadge.tsx`
- **Usage**:
  ```tsx
  {useCloud ? (
    <Badge variant="cloud">☁️ Cloud</Badge>
  ) : (
    <Badge variant="local">💻 Local</Badge>
  )}
  ```

---

## 🧪 Testing Guide

### Test Scenario 1: Free User → Premium Upgrade
```
1. npm run tauri:dev
2. Navigate to /test
3. Click "Guest Mode"
4. Go to /settings
5. See "Upgrade to Premium" prompt for cloud transcription ✓
6. Go back to /test
7. Click "Premium User"
8. Go to /settings
9. See cloud transcription toggle unlocked ✓
10. Enable toggle
11. Go to /record
12. Should see "☁️ Cloud" badge
```

### Test Scenario 2: Cloud vs Local Transcription
```
1. Start as Premium User (via /test)
2. Go to /settings → Enable cloud transcription
3. Go to /record → Record something
4. Should use cloud API (need to implement Step 5-8 first)
5. Go to /settings → Disable cloud transcription
6. Go to /record → Record something
7. Should use local Whisper
```

---

## 📊 Economics (For Reference)

**OpenAI Whisper API**: $0.006/minute

**User Usage Patterns**:
- Casual (5 min/day) = 150 min/month = $0.90/month
- Regular (15 min/day) = 450 min/month = $2.70/month
- Active (30 min/day) = 900 min/month = $5.40/month
- Power (60 min/day) = 1,800 min/month = $10.80/month

**At $10/month subscription**:
- Average profit: $5-8 per user
- Even power users break even
- **Recommendation**: Offer UNLIMITED cloud transcription!

---

## 🎯 Next Steps

**To complete implementation:**

1. **Create Edge Function** (30 min)
   ```bash
   cd /Users/quinortiz/Downloads/Fluent/supabase/functions
   supabase functions new transcribe-audio
   ```

2. **Add OpenAI API key to Supabase** (5 min)
   ```bash
   supabase secrets set OPENAI_API_KEY=your_key_here
   ```

3. **Implement cloud transcription in Record page** (20 min)
   - Add badge
   - Add service call
   - Handle loading states

4. **Copy implementation to ReadAloud & Import** (10 min)

5. **Test full flow** (15 min)

**Total time**: ~1.5 hours to complete

---

## 📝 Notes

- Dev Auth Panel only shows in dev mode (hidden in production)
- Settings are persisted in localStorage via Zustand
- Premium state is cached for offline access
- Mock auth uses keychain storage (same as real auth)
- Deep link testing available via "Test Deep Link" button

---

Ready to continue with Phase 2? Let me know when you want to implement the cloud transcription service!
