# Onboarding & Premium Models Plan

**Date:** 2025-01-30
**Status:** Planning Complete - Ready to Implement

---

## Overview

Add onboarding flow for new users and premium model tiers with subscription gates.

---

## Phase 1: Premium Models (45 min)

### Models Structure

**Free Models:**
- Tiny (75 MB) - Fastest, lowest accuracy
- Base (142 MB) - Good balance, recommended
- Small (466 MB) - Better accuracy
- Medium (1.5 GB) - High accuracy

**Premium Models (Subscription Required):**
- Large (2.9 GB) - Highest accuracy
- Large-v2 (2.9 GB) - Improved version
- Large-v3 (2.9 GB) - Newest and best
- Cloud (OpenAI Whisper) - Unlimited, best accuracy

### Implementation

**1. Update Rust Model Struct**
```rust
pub struct WhisperModel {
    pub name: String,
    pub display_name: String,
    pub file_name: String,
    pub url: String,
    pub size_mb: u64,
    pub description: String,
    pub premium_required: bool,  // NEW FIELD
}
```

**2. Add New Models to List**
Add to `src-tauri/src/services/model_download.rs`:
- `ggml-large.bin` (2.9 GB, premium: true)
- `ggml-large-v2.bin` (2.9 GB, premium: true)
- `ggml-large-v3.bin` (2.9 GB, premium: true)

**3. Update UnifiedModelDropdown**
- Show 🔒 icon next to premium local models
- Disable selection if not premium
- Show "Premium required" tooltip

**4. Update WhisperModelSection**
- Check `model.premium_required` before allowing download
- Show "🔒 Premium" badge on download button
- Alert user to upgrade if they try to download premium model

---

## Phase 2: Onboarding Flow (1.5 hours)

### Flow Overview

```
First Launch → Language Selection → Model Selection → Auth (optional) → Download → Complete
```

### Screen Designs

**Screen 1: Language Selection**
```
┌─────────────────────────────────────────┐
│                                         │
│      Welcome to FluentWhisper! 🎯      │
│                                         │
│  What's your native language?          │
│  [Dropdown: English ▼]                 │
│                                         │
│  What language are you learning?       │
│  [Dropdown: Spanish ▼]                 │
│                                         │
│                    [Continue →]        │
│                                         │
└─────────────────────────────────────────┘
```

**Screen 2: Model Selection + Auth**
```
┌─────────────────────────────────────────┐
│  Choose Your Transcription Model        │
│                                         │
│  Free Models:                           │
│  ○ Tiny (75 MB) - Fastest              │
│  ○ Base (142 MB) ⭐ Recommended        │
│  ○ Small (466 MB) - Better             │
│  ○ Medium (1.5 GB) - High accuracy     │
│                                         │
│  Premium Models:                        │
│  ○ Large (2.9 GB) 🔒                   │
│  ○ Large-v2 (2.9 GB) 🔒                │
│  ○ Large-v3 (2.9 GB) 🔒 Best          │
│  ○ ☁️ Cloud - Unlimited 🔒 ⭐         │
│                                         │
│  [Sign In]  [Continue as Guest]        │
│                                         │
└─────────────────────────────────────────┘
```

**Screen 3: Download Progress**
```
┌─────────────────────────────────────────┐
│  Downloading Base Model...              │
│                                         │
│  ████████████░░░░░░░░░░░░░  45%       │
│  33 MB / 74 MB                         │
│                                         │
│  This may take a few minutes...        │
│                                         │
│                         [Cancel]       │
│                                         │
└─────────────────────────────────────────┘
```

**Screen 4: Complete**
```
┌─────────────────────────────────────────┐
│                                         │
│              ✓ Ready!                  │
│                                         │
│    You're all set to start learning    │
│                                         │
│                                         │
│       [Start Using FluentWhisper]      │
│                                         │
└─────────────────────────────────────────┘
```

### Storage & State

**localStorage:**
- `onboarding_completed`: `'true'` after completion
- All other data uses existing stores (settings, auth)

**Settings Store Updates:**
```typescript
export interface AppSettings {
  selectedModel: string
  nativeLanguage: string    // NEW
  learningLanguage: string  // NEW
  // ... existing fields
}
```

### Auth Integration

**"Sign In" button behavior:**
1. Click "Sign In"
2. Trigger `DesktopAuthService.signIn()` (existing auth flow)
3. Opens browser → OAuth → Deep link callback
4. Return to onboarding
5. If premium detected → auto-select "openai-whisper" (cloud model)
6. User can change in model dropdown if they want

**"Continue as Guest" button:**
1. Skip auth
2. Proceed to download with selected free model
3. Can authenticate later via Settings

---

## Phase 3: App Data Directory (15 min)

### Current Issue
Models download to: `/Users/quinortiz/Documents/fluentwhisper/models/`

### Solution
Change to app data directory:
- macOS: `~/Library/Application Support/FluentWhisper/models/`
- Windows: `C:\Users\<user>\AppData\Roaming\FluentWhisper\models\`
- Linux: `~/.local/share/FluentWhisper/models/`

### Implementation
Update `get_models_dir()` in `model_download.rs`:
```rust
pub fn get_models_dir(app: &AppHandle) -> Result<PathBuf> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .context("Failed to get app data directory")?;

    let models_dir = app_data_dir.join("models");
    fs::create_dir_all(&models_dir)
        .context("Failed to create models directory")?;

    Ok(models_dir)
}
```

**Migration:** Check if old `models/` exists, copy to new location, delete old.

---

## Phase 4: Fix Model Deletion (30 min)

### Current Issue
Click "Delete" button → nothing happens

### Investigation Steps
1. Check browser console for errors
2. Add console.log to mutation handler
3. Check if Rust function returns error
4. Check file permissions on model files
5. Verify error handling propagates to UI

### Files to Check
- `src/components/settings/WhisperModelSection.tsx` (delete button)
- `src/hooks/models/useModels.ts` (delete mutation)
- `src/services/models/models.ts` (delete service)
- `src-tauri/src/services/model_download.rs` (delete_model function)

---

## Implementation Order

### Step 1: Premium Models Structure (15 min)
- [x] Add `premium_required` field to `WhisperModel` struct
- [x] Add Large, Large-v2, Large-v3 to available models list
- [x] Update TypeScript types to match

### Step 2: Premium Gates in UI (30 min)
- [x] Update `UnifiedModelDropdown` to show 🔒 for premium models
- [x] Update `WhisperModelSection` to block premium downloads for free users
- [x] Add subscription check before allowing download/selection

### Step 3: Settings Store for Languages (10 min)
- [x] Add `nativeLanguage` and `learningLanguage` to `AppSettings`
- [x] Add defaults for new fields
- [x] Export helper functions if needed

### Step 4: Onboarding Component (1 hour)
- [x] Create `src/pages/onboarding/Onboarding.tsx`
- [x] Create step components:
  - `LanguageSelectionStep.tsx`
  - `ModelSelectionStep.tsx`
  - `DownloadStep.tsx`
  - `CompleteStep.tsx`
- [x] Wire up navigation between steps
- [x] Save completion to localStorage

### Step 5: Auth Integration in Onboarding (15 min)
- [x] Add "Sign In" button to model selection step
- [x] Trigger existing auth flow
- [x] Auto-select cloud model for premium users
- [x] Handle auth callback during onboarding

### Step 6: Wire to App.tsx (10 min)
- [x] Check `onboarding_completed` on app load
- [x] Redirect to onboarding if not completed
- [x] Allow Settings/Test pages during onboarding

### Step 7: App Data Directory (15 min)
- [x] Update `get_models_dir()` to use app data directory
- [x] Update all callers to pass `AppHandle`
- [x] Test model download to new location

### Step 8: Fix Model Deletion (30 min)
- [x] Debug why deletion fails
- [x] Fix issue
- [x] Test deletion for all model sizes

---

## Testing Checklist

### Premium Models
- [ ] Free user cannot download Large models
- [ ] Free user sees 🔒 icon on premium models
- [ ] Premium user can download Large models
- [ ] Cloud model shows in premium section

### Onboarding Flow
- [ ] First launch shows onboarding
- [ ] Language selection saves correctly
- [ ] Model selection shows all models
- [ ] Sign In opens browser auth
- [ ] After premium auth, cloud model auto-selected
- [ ] Continue as Guest works
- [ ] Download progress shows correctly
- [ ] Completion redirects to main app
- [ ] Second launch skips onboarding

### Model Directory
- [ ] Models download to app data dir
- [ ] Models persist across app restarts
- [ ] Path works on macOS, Windows, Linux

### Model Deletion
- [ ] Delete button works
- [ ] File actually gets deleted
- [ ] UI updates after deletion
- [ ] Error handling shows user-friendly message

---

## Files to Create/Modify

**New Files:**
- `src/pages/onboarding/Onboarding.tsx`
- `src/pages/onboarding/LanguageSelectionStep.tsx`
- `src/pages/onboarding/ModelSelectionStep.tsx`
- `src/pages/onboarding/DownloadStep.tsx`
- `src/pages/onboarding/CompleteStep.tsx`

**Modified Files:**
- `src-tauri/src/services/model_download.rs` (add models, premium field, app data dir)
- `src/stores/settingsStore.ts` (add language fields)
- `src/components/settings/UnifiedModelDropdown.tsx` (premium gates)
- `src/components/settings/WhisperModelSection.tsx` (premium gates)
- `src/App.tsx` (onboarding check)
- `src-tauri/src/commands/models.rs` (pass AppHandle to get_models_dir)

---

## Timeline

- Premium Models: 45 min
- Onboarding Flow: 1.5 hours
- App Data Directory: 15 min
- Fix Deletion: 30 min

**Total: ~3 hours**

---

## Notes

- Model deletion comes last (can investigate while testing)
- Premium cloud model auto-selection happens after auth
- Users can change model in Settings after onboarding
- Onboarding completion stored in localStorage only
- No formal tutorial screen for now (can add later)
