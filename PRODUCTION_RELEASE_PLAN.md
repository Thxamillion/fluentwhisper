# FluentWhisper v1.0 Production Release Plan

**Goal:** Ship production-ready app with critical fixes + polish
**Timeline:** 5-7 days (40-50 hours)
**Start Date:** November 5, 2025
**Target Release:** November 11-12, 2025

## Progress Summary

✅ **Phase 1: Critical Fixes** - MOSTLY COMPLETE (2/3 tasks done)
- ✅ 1.1 TypeScript Compilation - 0 errors
- ✅ 1.2 Confirmation Dialogs - All delete operations protected
- ⏳ 1.3 README - TODO

✅ **Phase 2: Toast System** - COMPLETE
- ✅ 2.1 Toast Component - Sonner installed & configured
- ✅ 2.2 Replace alerts() - 0 alert() calls remaining

✅ **Phase 3: Error Boundaries** - COMPLETE
- ✅ 3.1 ErrorBoundary Component - Created with retry
- ✅ 3.2 Wrap Routes - All pages wrapped with custom fallbacks

✅ **Phase 4: Dark Mode** - COMPLETE
- ✅ 4.1 Infrastructure - next-themes + Tailwind config
- ✅ 4.2 Toggle UI - Sidebar + Settings page
- ✅ 4.3 Component Updates - All components use semantic tokens
- ✅ DARK_MODE_GUIDE.md created

⏳ **Phase 5: macOS Notarization** - TODO

⏳ **Phase 6: Testing & Polish** - TODO

⏳ **Phase 7: Release Preparation** - TODO

---

## Phase 1: Critical Fixes (Day 1) - 8 hours ✅ COMPLETED

### 1.1 Fix TypeScript Compilation Errors ⚠️ BLOCKING ✅
**Time:** 2 hours
**Priority:** CRITICAL - Nothing works until this is fixed
**Status:** ✅ COMPLETED

**Tasks:**
- [x] Fix `useAuth.ts:28` - DesktopAuthService.signIn() missing
  - [x] Check desktop-auth.service.ts for correct method name
  - [x] Either implement `signIn()` or update hook to use `signInWithEmail()`
  - [x] Test auth flow works

- [x] Fix `SessionDetail.tsx:80,84,290` - displayedWords possibly undefined
  - [x] Add null coalescing: `displayedWords?.slice()` or `displayedWords ?? []`
  - [x] Add proper type guards before iteration
  - [x] Test session detail page loads

- [x] Fix `recording.test.ts:27,93` - ServiceResult type mismatch
  - [x] Check `result.success` before accessing `result.data`
  - [x] Update tests to handle union type correctly
  - [x] Run `npm test` to verify

**Verification:**
```bash
npx tsc --noEmit  # ✅ Passes with 0 errors
npm run build     # ✅ Completes successfully
```

---

### 1.2 Add Confirmation Dialogs ✅
**Time:** 2 hours
**Priority:** CRITICAL - Prevents accidental data loss
**Status:** ✅ COMPLETED

**Tasks:**
- [x] Create reusable `ConfirmDialog` component
  - [x] Location: `src/components/ui/confirm-dialog.tsx`
  - [x] Props: title, description, onConfirm, onCancel, variant (danger/warning)
  - [x] Use existing Dialog from Radix UI
  - [x] Style with Tailwind (red for delete, yellow for discard)

- [x] Add to Delete Session (History page)
  - [x] Import ConfirmDialog
  - [x] Show dialog on delete click
  - [x] Only delete after confirmation
  - [x] Test: Try deleting a session

- [x] Add to Discard Recording (Record page)
  - [x] Show dialog when clicking discard
  - [x] Warn about losing unsaved audio
  - [x] Only discard after confirmation
  - [x] Test: Start recording, stop, then discard

- [x] Add to Delete Text (Library page)
  - [x] Show dialog on text delete
  - [x] Only delete after confirmation

- [x] Add to Delete Whisper Model (Settings page)
  - [x] Show dialog on model delete
  - [x] Only delete after confirmation

- [x] Add to Delete Session Detail (Session Detail page)
  - [x] Show dialog on session delete
  - [x] Only delete after confirmation

**Files modified:**
- ✅ `src/components/ui/confirm-dialog.tsx` (created)
- ✅ `src/pages/history/History.tsx`
- ✅ `src/pages/record/Record.tsx`
- ✅ `src/pages/library/Library.tsx`
- ✅ `src/components/settings/WhisperModelSection.tsx`
- ✅ `src/pages/session-detail/SessionDetail.tsx`

---

### 1.3 Write Basic README ⏳
**Time:** 4 hours
**Priority:** CRITICAL - Users need to know how to use the app
**Status:** ⏳ TODO

**Tasks:**
- [ ] Create comprehensive README.md
  - [ ] Product overview (what is FluentWhisper?)
  - [ ] Features list with emojis
  - [ ] Screenshots (record 3-4 key screens)
  - [ ] Installation instructions
  - [ ] Quick start guide
  - [ ] Troubleshooting section
  - [ ] Privacy & data info
  - [ ] License (MIT recommended)

**Sections to include:**
```markdown
# FluentWhisper

## Features
- 🎤 Local speech-to-text with Whisper
- 📚 Automatic vocabulary tracking
- 📊 Progress analytics
- 🌍 4 languages supported
- 🔒 Privacy-first (local processing)

## Installation
[Download for macOS]
[Download for Windows]

## Quick Start
1. Select your native and target languages
2. Download a Whisper model
3. Start recording!

## Troubleshooting
...
```

**Files to create:**
- `README.md`
- `docs/screenshots/` (folder with app screenshots)

---

## Phase 2: Toast Notification System (Day 2) - 8 hours ✅ COMPLETED

### 2.1 Create Toast Component & Store ✅
**Time:** 4 hours
**Status:** ✅ COMPLETED

**Tasks:**
- [x] Install Sonner (recommended toast library)
  ```bash
  npm install sonner
  ```

- [x] Create toast integration
  - [x] Add `<Toaster />` to App.tsx
  - [x] Create toast utility in `src/lib/toast.ts`
  - [x] Export helper functions: `toast.success()`, `toast.error()`, `toast.loading()`

- [x] Style toasts to match app theme
  - [x] Use Tailwind classes
  - [x] Match existing color scheme
  - [x] Add icons for success/error/warning

**Implementation:**
```typescript
// src/lib/toast.ts
import { toast as sonnerToast } from 'sonner';

export const toast = {
  success: (message: string) => sonnerToast.success(message),
  error: (message: string) => sonnerToast.error(message),
  loading: (message: string) => sonnerToast.loading(message),
  promise: sonnerToast.promise,
};
```

---

### 2.2 Replace All alert() Calls with Toasts ✅
**Time:** 4 hours
**Status:** ✅ COMPLETED (0 alert() calls remaining)

**Tasks:**
- [x] Search for all `alert()` usage
  ```bash
  grep -r "alert(" src/
  ```

- [x] Replace in History.tsx
  - [x] Delete session success: `toast.success("Session deleted")`
  - [x] Delete session error: `toast.error("Failed to delete session")`

- [x] Replace in Record.tsx
  - [x] Recording saved: `toast.success("Session saved!")`
  - [x] Transcription failed: `toast.error("Transcription failed")`

- [x] Replace in Library.tsx
  - [x] Text saved: `toast.success("Text saved")`
  - [x] Text deleted: `toast.success("Text deleted")`

- [x] Replace in Settings.tsx
  - [x] Settings saved: Already has visual feedback (checkmark)
  - [x] Add error toast for save failures

- [x] Add loading toasts for async operations
  - [x] Model download: Shows progress with toast
  - [x] Language pack download: Shows banner with progress
  - [x] Transcription: Shows progress in UI

**Files to modify:**
- Install: `package.json`
- Add Toaster: `src/App.tsx`
- Create utility: `src/lib/toast.ts`
- Update: All pages with error handling

---

## Phase 3: Error Boundaries (Day 3) - 6 hours ✅ COMPLETED

### 3.1 Create Global Error Boundary Component ✅
**Time:** 2 hours
**Status:** ✅ COMPLETED

**Tasks:**
- [x] Create `src/components/ErrorBoundary.tsx`
  - [x] Extend React.Component with error boundary methods
  - [x] Add state for error tracking
  - [x] Implement `componentDidCatch()` and `getDerivedStateFromError()`
  - [x] Design error UI with retry button
  - [x] Support both fullScreen and inline error modes

**Implementation:**
```tsx
// src/components/ErrorBoundary.tsx
import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
            <p className="text-gray-600 mb-6">{this.state.error?.message}</p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

---

### 3.2 Wrap All Pages with Error Boundaries ✅
**Time:** 4 hours
**Status:** ✅ COMPLETED

**Tasks:**
- [x] Wrap routes in App.tsx
  ```tsx
  <Route path="/record" element={
    <ErrorBoundary>
      <Record />
    </ErrorBoundary>
  } />
  ```

- [x] Add error boundaries to:
  - [x] `/record` - Record page
  - [x] `/history` - History page
  - [x] `/vocabulary` - Vocabulary page
  - [x] `/progress` - Progress page (Analytics)
  - [x] `/settings` - Settings page
  - [x] `/library` - Text Library page
  - [x] `/session/:id` - Session Detail page
  - [x] `/dashboard` - Dashboard page

- [x] Add page-specific error messages
  - [x] Record: "Failed to load recording page"
  - [x] History: "Failed to load session history"
  - [x] Vocabulary: "Failed to load vocabulary"
  - [x] All pages have custom fallback messages

- [x] Test error boundaries
  - [x] Added error test button to Test page
  - [x] Verified boundary catches and shows UI
  - [x] Verified retry button works

**Files to modify:**
- Create: `src/components/ErrorBoundary.tsx`
- Update: `src/App.tsx` (wrap all routes)

---

## Phase 4: Dark Mode (Day 4) - 6 hours ✅ COMPLETED

### 4.1 Set Up Dark Mode Infrastructure ✅
**Time:** 3 hours
**Status:** ✅ COMPLETED

**Tasks:**
- [x] Install next-themes (best for React dark mode)
  ```bash
  npm install next-themes
  ```

- [x] Update Tailwind config for dark mode
  ```javascript
  // tailwind.config.js
  module.exports = {
    darkMode: 'class', // Enable class-based dark mode
    // ... rest of config
  }
  ```

- [x] Create dark mode provider
  ```tsx
  // src/components/ThemeProvider.tsx
  import { ThemeProvider as NextThemesProvider } from 'next-themes';

  export function ThemeProvider({ children }: { children: React.ReactNode }) {
    return (
      <NextThemesProvider attribute="class" defaultTheme="system">
        {children}
      </NextThemesProvider>
    );
  }
  ```

- [x] Wrap App with ThemeProvider
  ```tsx
  // src/App.tsx
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      {/* ... */}
    </QueryClientProvider>
  </ThemeProvider>
  ```

---

### 4.2 Add Dark Mode Toggle UI ✅
**Time:** 2 hours
**Status:** ✅ COMPLETED

**Tasks:**
- [x] Create theme toggle button component
  ```tsx
  // src/components/ThemeToggle.tsx
  import { Moon, Sun } from 'lucide-react';
  import { useTheme } from 'next-themes';

  export function ThemeToggle() {
    const { theme, setTheme } = useTheme();

    return (
      <button
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>
    );
  }
  ```

- [x] Add toggle to Sidebar
  - [x] Place at bottom of sidebar
  - [x] Icon-based toggle

- [x] Add toggle to Settings page
  - [x] New section: "Appearance"
  - [x] Radio buttons: Light / Dark / System
  - [x] Prevents hydration mismatch with mounted state

---

### 4.3 Update All Components for Dark Mode ✅
**Time:** 1 hour
**Status:** ✅ COMPLETED

**Tasks:**
- [x] Add dark mode classes to key components
  ```tsx
  // Before:
  <div className="bg-white text-gray-900">

  // After:
  <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
  ```

- [x] Update components using semantic CSS variables:
  - [x] Sidebar: Uses `--sidebar-bg` variable
  - [x] Cards: Uses `bg-card` and `border-border`
  - [x] Inputs: Uses `bg-input text-foreground`
  - [x] Buttons: Uses semantic color tokens
  - [x] Modals/Dialogs: Uses `bg-card`
  - [x] All text uses `text-foreground` or `text-muted-foreground`
  - [x] All backgrounds use semantic tokens
  - [x] Progress page with colored stat cards
  - [x] Vocabulary table
  - [x] History page
  - [x] Settings page
  - [x] Audio player component
  - [x] Session detail page

- [x] Test dark mode
  - [x] Toggle on each page
  - [x] Verify all text is readable
  - [x] Check input fields are usable
  - [x] Verify charts/graphs work in dark mode
  - [x] Test colored UI elements (badges, stats)
  - [x] Test hover states

- [x] Create DARK_MODE_GUIDE.md
  - [x] Document macOS-style elevation hierarchy
  - [x] List all semantic color tokens
  - [x] Provide DO/DON'T examples
  - [x] Include common patterns

**Files to modify:**
- Install: `package.json`
- Update: `tailwind.config.js`
- Create: `src/components/ThemeProvider.tsx`
- Create: `src/components/ThemeToggle.tsx`
- Update: `src/App.tsx`
- Update: All major components with `dark:` classes

---

## Phase 5: macOS Notarization (Day 5) - 8 hours

### 5.1 Apple Developer Account Setup
**Time:** 2 hours

**Tasks:**
- [ ] Sign up for Apple Developer Program ($99/year)
  - [ ] Go to https://developer.apple.com/programs/
  - [ ] Complete enrollment (requires Apple ID)
  - [ ] Wait for approval (can take 24-48 hours)

- [ ] Create App ID
  - [ ] Log in to https://developer.apple.com/account
  - [ ] Go to "Certificates, Identifiers & Profiles"
  - [ ] Click "Identifiers" → "+" → "App IDs"
  - [ ] Bundle ID: `com.fluentdiary.desktop` (match tauri.conf.json)
  - [ ] Description: "FluentWhisper"
  - [ ] Capabilities: None needed for now

- [ ] Create Developer ID Certificate
  - [ ] Go to "Certificates" → "+"
  - [ ] Select "Developer ID Application"
  - [ ] Follow CSR generation steps
  - [ ] Download certificate
  - [ ] Install in Keychain Access

---

### 5.2 Configure Code Signing in Tauri
**Time:** 3 hours

**Tasks:**
- [ ] Update tauri.conf.json
  ```json
  {
    "bundle": {
      "macOS": {
        "signingIdentity": "Developer ID Application: Your Name (TEAM_ID)",
        "providerShortName": "TEAM_ID",
        "entitlements": null,
        "exceptionDomain": null
      }
    }
  }
  ```

- [ ] Set environment variables for notarization
  ```bash
  # Add to .env (DO NOT COMMIT)
  APPLE_ID=your@email.com
  APPLE_PASSWORD=app-specific-password  # Generate at appleid.apple.com
  APPLE_TEAM_ID=YOUR_TEAM_ID
  ```

- [ ] Update build script
  ```json
  // package.json
  {
    "scripts": {
      "tauri:build": "tauri build",
      "tauri:build:signed": "tauri build --config tauri.conf.json"
    }
  }
  ```

- [ ] Install required tools
  ```bash
  # Install Xcode Command Line Tools (if not already)
  xcode-select --install

  # Verify codesign is available
  which codesign
  ```

---

### 5.3 Build, Sign, and Notarize
**Time:** 3 hours

**Tasks:**
- [ ] Build signed app
  ```bash
  npm run tauri:build:signed
  ```

- [ ] Verify signing
  ```bash
  codesign -dv --verbose=4 src-tauri/target/release/bundle/macos/FluentWhisper.app
  # Should show: Authority=Developer ID Application: Your Name
  ```

- [ ] Create DMG for distribution
  ```bash
  npm install --save-dev create-dmg

  # Add script to package.json
  "create-dmg": "create-dmg src-tauri/target/release/bundle/macos/FluentWhisper.app"
  ```

- [ ] Notarize the app
  ```bash
  # Tauri should auto-notarize if credentials are set
  # Or manually:
  xcrun notarytool submit FluentWhisper.dmg \
    --apple-id your@email.com \
    --password app-specific-password \
    --team-id TEAM_ID \
    --wait
  ```

- [ ] Staple notarization ticket
  ```bash
  xcrun stapler staple FluentWhisper.dmg

  # Verify
  xcrun stapler validate FluentWhisper.dmg
  # Should show: The validate action worked!
  ```

- [ ] Test on clean Mac
  - [ ] Copy DMG to USB drive
  - [ ] Test on Mac without Xcode
  - [ ] Verify app opens without Gatekeeper warning
  - [ ] Test all core features work

**Critical:** Keep signing credentials secure!
- [ ] Add `.env` to `.gitignore`
- [ ] Store credentials in 1Password/LastPass
- [ ] Never commit certificates or keys

---

## Phase 6: Final Testing & Polish (Day 6-7) - 12 hours

### 6.1 Comprehensive Testing
**Time:** 6 hours

**Testing Matrix:**

| Feature | Test Case | Expected Result | Status |
|---------|-----------|----------------|--------|
| **Recording** | Start free-speak session | Audio records, shows duration | [ ] |
| | Stop recording | Shows preview with audio playback | [ ] |
| | Transcribe audio | Whisper transcribes correctly | [ ] |
| | Save session | Session appears in history | [ ] |
| | Discard recording | Shows confirmation, audio deleted | [ ] |
| **Read Aloud** | Create text in library | Text saved and listed | [ ] |
| | Start read-aloud session | Records with text reference | [ ] |
| | View session detail | Shows "Read Aloud" badge | [ ] |
| **Vocabulary** | Complete session with new words | Words appear in vocabulary | [ ] |
| | Check translations | Shows correct translation | [ ] |
| | Language pack missing | Shows banner, auto-downloads | [ ] |
| **History** | View all sessions | Paginated list loads | [ ] |
| | Filter by language | Shows only selected language | [ ] |
| | Delete session | Shows confirmation, deletes on confirm | [ ] |
| **Analytics** | View overall stats | Shows correct streak, WPM, sessions | [ ] |
| | View charts | WPM trend, daily activity visible | [ ] |
| **Settings** | Change target language | Language updates, pack downloads | [ ] |
| | Download Whisper model | Progress shown, model installs | [ ] |
| | Toggle dark mode | UI switches to dark theme | [ ] |
| **Authentication** | Sign in with email | Login succeeds, redirects | [ ] |
| | Sign out | Clears session, shows login | [ ] |
| **Error Handling** | Trigger error in Record page | Error boundary shows, retry works | [ ] |
| | Network failure during download | Toast shows error message | [ ] |
| **Onboarding** | First launch | Wizard shows, guides through setup | [ ] |

---

### 6.2 Performance Testing
**Time:** 2 hours

**Tasks:**
- [ ] Test with large datasets
  - [ ] Create 100+ sessions
  - [ ] Add 1000+ vocabulary words
  - [ ] Check pagination works smoothly
  - [ ] Verify no memory leaks

- [ ] Test audio recording
  - [ ] Record 1 minute session
  - [ ] Record 10 minute session
  - [ ] Verify file sizes reasonable
  - [ ] Check transcription speed

- [ ] Profile with React DevTools
  - [ ] Identify slow components
  - [ ] Check for unnecessary re-renders
  - [ ] Optimize if needed

---

### 6.3 Final Polish
**Time:** 4 hours

**Tasks:**
- [ ] Update all version numbers to 1.0.0
  - [ ] package.json
  - [ ] Cargo.toml
  - [ ] tauri.conf.json

- [ ] Create app icon (if not done)
  - [ ] Design 1024x1024 icon
  - [ ] Generate icns file for macOS
  - [ ] Add to tauri.conf.json

- [ ] Write CHANGELOG.md
  ```markdown
  # Changelog

  ## [1.0.0] - 2025-11-12

  ### Added
  - Initial release
  - Free-speak recording
  - Read-aloud sessions
  - Automatic vocabulary tracking
  - 4 languages: Spanish, French, German, Italian
  - Local Whisper transcription
  - Cloud transcription (premium)
  - Dark mode support
  - ...
  ```

- [ ] Create release notes
  - [ ] Highlight key features
  - [ ] Known issues section
  - [ ] System requirements
  - [ ] Installation instructions

- [ ] Clean up console logs
  ```bash
  # Search for console.log
  grep -r "console.log" src/

  # Remove debug logs (keep error logs)
  ```

- [ ] Final build check
  ```bash
  npm run build      # Frontend builds
  npm run tauri:build:signed  # App builds and signs

  # Test the built app
  open src-tauri/target/release/bundle/macos/FluentWhisper.app
  ```

---

## Phase 7: Release Preparation (Day 7) - 4 hours

### 7.1 Create GitHub Release
**Time:** 2 hours

**Tasks:**
- [ ] Tag release
  ```bash
  git tag -a v1.0.0 -m "Release v1.0.0"
  git push origin v1.0.0
  ```

- [ ] Create GitHub release
  - [ ] Go to GitHub → Releases → New Release
  - [ ] Tag: v1.0.0
  - [ ] Title: "FluentWhisper v1.0.0 - Initial Release"
  - [ ] Upload DMG file
  - [ ] Copy CHANGELOG into release notes
  - [ ] Mark as "Latest Release"

- [ ] Update README with download links
  ```markdown
  ## Download

  ### macOS
  [Download FluentWhisper-1.0.0.dmg](https://github.com/user/repo/releases/download/v1.0.0/FluentWhisper.dmg)

  Requires macOS 11.0 or later
  ```

---

### 7.1.1 Release Management Best Practices

**IMPORTANT: Preventing "Latest" Release Conflicts**

When testing older versions (e.g., creating v1.0.0 after v1.0.2 exists), GitHub will automatically mark the newest created release as "Latest", which breaks the updater for production users.

**Solution: Use Pre-releases for Testing**

Always mark test releases as pre-release to prevent them from becoming "Latest":

```bash
# ✅ GOOD - Create test release as pre-release
gh release create v1.0.0 \
  --prerelease \
  --title "v1.0.0 - Test Release" \
  --notes "Test version - not for production use" \
  "Fluent Diary_1.0.0_aarch64.dmg"

# ❌ BAD - Creates normal release, becomes "Latest"
gh release create v1.0.0 \
  --title "v1.0.0" \
  "Fluent Diary_1.0.0_aarch64.dmg"
```

**If you accidentally create a normal release:**

```bash
# Fix by marking the correct version as latest
gh release edit v1.0.2 --repo Thxamillion/fluentdiary-desktop --latest
```

**Release Strategy:**
- **Production releases:** Normal releases (no `--prerelease` flag)
- **Test releases:** Always use `--prerelease` flag
- **Beta channel (future):** Use `-beta`, `-rc` suffixes with `--prerelease`

---

### 7.2 Documentation & Support Setup
**Time:** 2 hours

**Tasks:**
- [ ] Create CONTRIBUTING.md
  - [ ] How to report bugs
  - [ ] How to request features
  - [ ] How to contribute code
  - [ ] Code of conduct

- [ ] Set up issue templates
  ```bash
  mkdir -p .github/ISSUE_TEMPLATE
  ```

  - [ ] Bug report template
  - [ ] Feature request template
  - [ ] Question template

- [ ] Create SUPPORT.md
  - [ ] FAQ section
  - [ ] Common issues and solutions
  - [ ] How to get help
  - [ ] Discord/community links (if applicable)

- [ ] Update LICENSE
  - [ ] Choose license (MIT recommended)
  - [ ] Add copyright year and name

- [ ] Create privacy policy (if needed)
  - [ ] What data is collected (none for local mode)
  - [ ] Cloud mode disclaimer
  - [ ] User rights

---

## Success Criteria ✅

### Must Have (Blocking Release)
- [ ] TypeScript compiles with 0 errors
- [ ] App builds successfully on macOS
- [ ] App launches without errors
- [ ] Core recording flow works end-to-end
- [ ] Vocabulary tracking works
- [ ] Toast notifications show for all user actions
- [ ] Confirmation dialogs prevent accidental deletes
- [ ] README exists with installation instructions
- [ ] Error boundaries catch component errors
- [ ] Dark mode works on all pages
- [ ] App is code-signed and notarized (macOS)
- [ ] All critical bugs fixed

### Should Have (Nice to Have)
- [ ] App icon looks professional
- [ ] CHANGELOG is complete
- [ ] GitHub release is created
- [ ] Issue templates exist
- [ ] Performance tested with 100+ sessions
- [ ] Tested on clean Mac installation

### Won't Have (v1.1+)
- Full test suite (E2E, unit, integration)
- Windows/Linux builds
- YouTube integration
- Spaced repetition
- Mobile apps

---

## Timeline Summary

| Day | Phase | Hours | Deliverables |
|-----|-------|-------|-------------|
| 1 | Critical Fixes | 8h | TS errors fixed, confirmations, README |
| 2 | Toast System | 8h | Toast component, all alerts replaced |
| 3 | Error Boundaries | 6h | Boundaries on all pages, tested |
| 4 | Dark Mode | 6h | Theme toggle, all components styled |
| 5 | macOS Notarization | 8h | Signed & notarized build |
| 6-7 | Testing & Polish | 12h | Full testing, final polish |
| 7 | Release Prep | 4h | GitHub release, documentation |
| **Total** | | **52 hours** | **Production-ready v1.0** |

---

## Risk Mitigation

### High Risk Items

1. **Apple Developer Account Approval**
   - Risk: Takes 24-48 hours
   - Mitigation: Start enrollment on Day 1
   - Fallback: Ship without notarization first, update later

2. **Code Signing Issues**
   - Risk: Certificate/entitlements problems
   - Mitigation: Test signing early (Day 5 morning)
   - Fallback: Ship unsigned for beta testers, fix for v1.0.1

3. **Critical Bug During Testing**
   - Risk: Find blocker bug on Day 6
   - Mitigation: Fix immediately, extend timeline if needed
   - Fallback: Ship v1.0 without affected feature, add in v1.0.1

### Medium Risk Items

4. **Dark Mode Visual Bugs**
   - Risk: Some components unreadable
   - Mitigation: Test each component as you add dark classes
   - Fallback: Ship light mode only, add dark in v1.0.1

5. **Performance Issues with Large Data**
   - Risk: App slows with 1000+ vocab words
   - Mitigation: Profile early, add pagination
   - Fallback: Document known limits, optimize in v1.1

---

## Post-Release (Week 2)

### Monitor & Support
- [ ] Set up error logging (Sentry or similar)
- [ ] Monitor GitHub issues
- [ ] Gather user feedback
- [ ] Create v1.0.1 patch if needed

### v1.1 Planning
- [ ] Full test suite (E2E, unit)
- [ ] Windows build
- [ ] Linux build
- [ ] YouTube integration
- [ ] Keyboard shortcuts
- [ ] Performance optimizations

---

## Notes & Considerations

### Development Environment
- macOS required for signing/notarization
- Xcode Command Line Tools required
- Apple Developer account required ($99/year)
- GitHub account for releases

### Dependencies
- All npm packages already installed
- Rust toolchain installed
- Tauri CLI installed

### Backup Strategy
- Commit after each phase
- Tag each day's progress
- Keep backup of signed builds
- Document any issues in PROGRESS.md

### Team Communication (if applicable)
- Daily standup: Share progress, blockers
- End of day: Commit all work
- Slack/Discord: Async updates

---

## Getting Started Tomorrow

**Day 1 Morning - First Steps:**

1. Start Apple Developer enrollment (2 min)
2. Fix TypeScript errors (2 hours)
3. Verify build works (30 min)
4. Break for lunch ☕

**Day 1 Afternoon:**

5. Create ConfirmDialog component (1 hour)
6. Add to delete operations (1 hour)
7. Start writing README (2 hours)
8. Commit all changes

**Ready to ship in 7 days! 🚀**
