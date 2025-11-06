# FluentWhisper - Architecture & File Structure Summary

## Quick Feature Summary

```
🎤 RECORDING          → Capture speech in target language
📝 TRANSCRIPTION      → Local Whisper converts speech to text  
📊 ANALYSIS          → Extract words, calculate WPM, identify new vocab
🎯 SESSION STORAGE   → Save transcript, metrics, audio path
📚 VOCABULARY TRACK  → Build personal word list with frequency
📈 ANALYTICS         → Dashboard, progress charts, trends
🌍 MULTI-LANGUAGE    → Switch between 5 languages
💾 DATA PRIVACY      → Everything stored locally, optional cloud sync
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    USER RECORDS AUDIO                   │
│            (Microphone → Tauri Audio Service)           │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│                 TRANSCRIPTION                           │
│      (Whisper.cpp converts audio to text)               │
│      (Post-process: lemmatization, tokenization)        │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│              SESSION ANALYSIS                           │
│  - Count words, unique words, WPM                       │
│  - Identify new words (not in vocabulary)               │
│  - Lemmatize words (running → run)                      │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│            SAVE TO DATABASE (user.db)                   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ sessions table:  id, language, transcript, WPM  │   │
│  │ vocab table:     lemma, usage_count, last_seen  │   │
│  │ session_words:   link sessions to words         │   │
│  └─────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│           UI DISPLAYS & QUERIES DATA                    │
│  ┌───────────────────────────────────────────────────┐ │
│  │ Dashboard: streaks, daily goal, recent sessions │ │
│  │ History: searchable list of all sessions         │ │
│  │ Vocabulary: word list, search, filter           │ │
│  │ Progress: charts, analytics, trends             │ │
│  │ Session Detail: transcript, all words, audio    │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## Component Tree (High Level)

```
App (Router + QueryClient)
├── Layout
│   ├── Sidebar (Navigation)
│   └── Main Content Area
│       ├── Dashboard/
│       │   ├── StatCard (Streak, Daily Goal, This Week, Avg WPM)
│       │   ├── RecentSessions (Last 4 sessions)
│       │   ├── NewWords (Last 7 days, 12 words)
│       │   └── PracticeCalendar (Monthly heatmap)
│       │
│       ├── Record/
│       │   ├── AudioRecorder (Mic selection, recording controls)
│       │   ├── AudioPlayer (Review recorded audio)
│       │   └── Transcription UI (Processing state)
│       │
│       ├── Library/
│       │   └── TextList (Search, filter, delete, read-aloud)
│       │
│       ├── ReadAloud/
│       │   ├── TextDisplay (Highlighted text)
│       │   └── Recording Controls
│       │
│       ├── History/
│       │   └── SessionTable (Filter, paginate, delete)
│       │
│       ├── SessionDetail/
│       │   ├── TranscriptDisplay
│       │   ├── SessionStats (WPM, words, new words)
│       │   ├── WordCloud (All words from session)
│       │   └── AudioPlayer
│       │
│       ├── Vocabulary/
│       │   └── VocabTable (Search, filter, inline edit, delete)
│       │
│       ├── Progress/
│       │   ├── TotalPracticeTime (Milestones)
│       │   ├── WpmTrendChart (30-day line chart)
│       │   ├── VocabGrowthChart (Cumulative area chart)
│       │   └── TopWordsTable (10 most used)
│       │
│       ├── Settings/
│       │   ├── ModelSelector
│       │   ├── LanguageSettings
│       │   ├── AudioSettings
│       │   └── DataRetention
│       │
│       ├── Onboarding/
│       │   ├── LanguageSelection
│       │   ├── ModelDownload
│       │   └── MicrophoneTest
│       │
│       └── ...

GlobalModals/Overlays:
├── ConfirmDialog (Delete confirmations)
├── DailyGoalModal (Set daily goal)
├── GlobalDownloadToast (Download progress)
├── LanguagePackBanner (Pack status)
└── Toaster (Toast notifications)
```

---

## File Structure (Organized by Feature)

```
src/
├── pages/                          # Page containers (one per route)
│   ├── dashboard/
│   │   └── Dashboard.tsx
│   ├── record/
│   │   └── Record.tsx
│   ├── library/
│   │   └── Library.tsx
│   ├── read-aloud/
│   │   └── ReadAloud.tsx
│   ├── history/
│   │   └── History.tsx
│   ├── session-detail/
│   │   └── SessionDetail.tsx
│   ├── vocabulary/
│   │   └── Vocabulary.tsx
│   ├── progress/
│   │   └── Progress.tsx
│   ├── settings/
│   │   └── Settings.tsx
│   ├── import/
│   │   └── Import.tsx
│   ├── onboarding/
│   │   ├── Onboarding.tsx
│   │   ├── LanguageSelectionStep.tsx
│   │   └── ...
│   ├── login/
│   │   ├── Login.tsx
│   │   └── LoginCallback.tsx
│   └── ...
│
├── components/                     # Reusable UI components
│   ├── dashboard/
│   │   ├── StatCard.tsx
│   │   ├── PracticeCalendar.tsx
│   │   ├── RecentSessions.tsx
│   │   ├── NewWords.tsx
│   │   └── QuickStartBanner.tsx
│   │
│   ├── layout/
│   │   ├── Layout.tsx              # Main app shell
│   │   └── Sidebar.tsx
│   │
│   ├── ui/                         # Shadcn/Radix primitives
│   │   ├── card.tsx
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   ├── confirm-dialog.tsx      # Custom confirmation
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── chart.tsx               # Recharts wrapper
│   │   ├── progress-ring.tsx
│   │   ├── dropdown-menu.tsx
│   │   └── ...
│   │
│   ├── read-aloud/
│   │   ├── HighlightedText.tsx
│   │   └── TranslationTooltip.tsx
│   │
│   ├── language-packs/
│   │   └── DownloadProgress.tsx
│   │
│   ├── settings/
│   │   ├── UnifiedModelDropdown.tsx
│   │   ├── WhisperModelSection.tsx
│   │   └── LanguagePackSection.tsx
│   │
│   ├── AudioPlayer.tsx
│   ├── ErrorBoundary.tsx
│   ├── ModelSelectionGuard.tsx
│   ├── AuthModal.tsx
│   ├── GlobalDownloadToast.tsx
│   ├── LanguagePackBanner.tsx
│   └── ...
│
├── services/                       # Pure business logic
│   ├── recording/
│   │   ├── recording.ts            # Audio capture logic
│   │   ├── types.ts
│   │   └── index.ts
│   │
│   ├── sessions/
│   │   ├── sessions.ts             # Session CRUD
│   │   ├── types.ts
│   │   └── index.ts
│   │
│   ├── vocabulary/
│   │   ├── vocabulary.ts           # Vocab CRUD
│   │   ├── types.ts
│   │   └── index.ts
│   │
│   ├── stats/
│   │   ├── stats.ts                # Analytics calculations
│   │   ├── types.ts
│   │   └── index.ts
│   │
│   ├── text-library/
│   │   ├── text-library.ts
│   │   ├── types.ts
│   │   └── index.ts
│   │
│   ├── transcription/
│   │   └── cloud-transcription.service.ts
│   │
│   ├── models/
│   │   ├── models.ts
│   │   ├── types.ts
│   │   └── index.ts
│   │
│   ├── auth/
│   │   ├── desktop-auth.service.ts
│   │   └── index.ts
│   │
│   ├── langpack/
│   │   ├── translation.ts
│   │   ├── lemmatization.ts
│   │   ├── types.ts
│   │   └── index.ts
│   │
│   ├── system/
│   │   ├── system.ts               # System info, cleanup
│   │   ├── types.ts
│   │   └── index.ts
│   │
│   ├── text/
│   │   ├── tokenization.ts
│   │   ├── types.ts
│   │   └── index.ts
│   │
│   └── subscription/
│       └── desktop-subscription.service.ts
│
├── hooks/                          # React Query + Custom hooks
│   ├── recording/
│   │   ├── useRecording.ts
│   │   └── index.ts
│   │
│   ├── sessions/
│   │   ├── useSessions.ts          # useAllSessions, useSession, useDeleteSession
│   │   └── index.ts
│   │
│   ├── vocabulary/
│   │   ├── useVocabulary.ts        # useUserVocab, useRecentVocab
│   │   └── index.ts
│   │
│   ├── stats/
│   │   ├── useStats.ts             # useOverallStats, useDailySessions, etc
│   │   └── index.ts
│   │
│   ├── settings/
│   │   ├── useSettings.ts
│   │   └── index.ts
│   │
│   ├── text-library/
│   │   ├── useTextLibrary.ts
│   │   └── index.ts
│   │
│   ├── models/
│   │   ├── useModels.ts
│   │   └── index.ts
│   │
│   ├── auth/
│   │   ├── useAuth.ts
│   │   └── index.ts
│   │
│   ├── language-packs/
│   │   ├── useLanguagePackStatus.ts
│   │   ├── useAutoDownload.ts
│   │   └── index.ts
│   │
│   ├── subscription/
│   │   └── useSubscription.ts
│   │
│   ├── system/
│   │   └── useSystemSpecs.ts
│   │
│   └── cleanup/
│       └── useCleanup.ts
│
├── stores/                         # Zustand global state
│   ├── settingsStore.ts            # User settings (persistent)
│   └── downloadStore.ts            # Download progress state
│
├── contexts/
│   └── SidebarContext.tsx           # Sidebar collapsed state
│
├── lib/
│   ├── supabase.ts                 # Supabase client
│   ├── toast.ts                    # Toast notification helper
│   └── utils.ts                    # General utilities
│
├── utils/
│   ├── dateFormatting.ts           # Date/time helpers
│   ├── sessionStats.ts             # Stat calculations
│   └── dailyGoalState.ts           # Daily goal logic
│
├── types/
│   └── language-packs.ts
│
├── App.tsx                         # Root app component
├── main.tsx                        # React entry point
└── vite-env.d.ts                  # Vite type definitions
```

---

## Database Schema (Simplified)

### user.db
```sql
-- Sessions table
sessions {
  id: UUID
  language: string
  started_at: timestamp
  ended_at: timestamp
  duration: seconds
  audio_path: string (file path)
  transcript: text
  word_count: int
  unique_word_count: int
  wpm: float
  new_word_count: int
  session_type: "free_speak" | "read_aloud"
  text_library_id: UUID (for read-aloud)
  source_text: text (for read-aloud)
}

-- Vocabulary table
vocab {
  id: int
  language: string
  lemma: string (base word)
  forms_spoken: JSON array (all forms user said)
  first_seen_at: timestamp
  last_seen_at: timestamp
  usage_count: int
  mastered: boolean
}

-- Link sessions to words (many-to-many)
session_words {
  id: int
  session_id: UUID
  lemma: string
  count: int (occurrences in session)
  is_new: boolean
}
```

### ling.db (per language)
```sql
-- Lemmatization data
lemmas {
  id: int
  word_form: string
  lemma: string (base form)
  pos: string (part of speech)
}
```

---

## State Management

### Zustand Stores (Persistent)
```typescript
// settingsStore.ts
{
  settings: {
    selectedModel: string          // "tiny", "base", "openai-whisper", etc
    defaultMicrophone: string
    audioQuality: "high" | "medium" | "low"
    noiseReduction: boolean
    primaryLanguage: string        // User's native language
    targetLanguage: string         // Language being learned
    dailyGoalMinutes: number       // Default 15
    retentionDays: number | null   // Data retention policy
  }
  updateSetting(key, value)
  resetSettings()
}

// downloadStore.ts
{
  activeDownload: {
    type: "model" | "language-pack"
    name: string
    progress: 0-100
  } | null
  setActiveDownload(download)
  clearActiveDownload()
}
```

### React Query (Cached Queries)
```typescript
// Automatic refetching & caching
useAllSessions()           // All recording sessions
useSession(id)             // Single session with words
useUserVocab(lang)         // All vocabulary for language
useOverallStats(lang)      // Cumulative statistics
useDailySessions(lang, days)  // Daily counts
useWpmTrends(lang, days)   // WPM chart data
useVocabGrowth(lang)       // Cumulative vocab growth
useTopWords(lang, limit)   // Most used words
useTextLibrary()           // All texts in library
```

### React Context
```typescript
// SidebarContext
{
  isCollapsed: boolean
  toggleSidebar()
}
```

---

## Key Data Types

```typescript
// Session
interface SessionData {
  id: string
  language: string
  startedAt: number (timestamp)
  endedAt: number | null
  duration: number | null (seconds)
  audioPath: string | null (file path)
  transcript: string | null
  wordCount: number | null
  uniqueWordCount: number | null
  wpm: number | null
  newWordCount: number | null
  sessionType: "free_speak" | "read_aloud"
  textLibraryId: string | null
  sourceText: string | null
}

// Word
interface VocabWord {
  id: number
  language: string
  lemma: string
  forms_spoken: string[] (["estoy", "estás"])
  first_seen_at: number (timestamp)
  last_seen_at: number (timestamp)
  usage_count: number
  mastered: boolean
}

// Statistics
interface OverallStats {
  totalSessions: number
  totalSpeakingTimeSeconds: number
  totalVocabularySize: number
  averageWpm: number
  currentStreakDays: number
  longestStreakDays: number
  avgUniqueWordsPerSession: number
  avgNewWordsPerSession: number
}
```

---

## Key Patterns

### 1. Three-Layer Architecture
```
Services (Pure logic)
    ↓
Hooks (React Query wrapper)
    ↓
Components (UI only)
```

### 2. Error Handling at Boundaries
```typescript
// Only wrap operations that can fail
try {
  const result = await recordingService.transcribe()
} catch (error) {
  toast.error('Transcription failed')
}

// Don't wrap pure functions
const stats = calculateStats() // Never fails
```

### 3. React Query Caching
```typescript
// Queries are cached for 5 minutes
// Refetch on window focus disabled (offline-friendly)
const { data, isLoading } = useAllSessions()
```

### 4. Confirmation Dialogs
```typescript
const [confirmOpen, setConfirmOpen] = useState(false)

const handleDelete = () => {
  setConfirmOpen(true)
}

// User confirms via dialog
<ConfirmDialog
  open={confirmOpen}
  title="Delete session?"
  onConfirm={() => deleteSession.mutate(id)}
/>
```

---

## Navigation & Routing

All routes protected by onboarding gate and model selection guard:

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | Dashboard | Home, stats overview |
| `/record` | Record | Audio recording |
| `/library` | Library | Text storage, read-aloud |
| `/read-aloud/:id` | ReadAloud | Read & record |
| `/history` | History | All sessions, searchable |
| `/session/:id` | SessionDetail | Session transcript & words |
| `/vocabulary` | Vocabulary | Word list, search, edit |
| `/progress` | Progress | Analytics & charts |
| `/settings` | Settings | Configuration |
| `/import` | Import | Import data |
| `/onboarding` | Onboarding | First-run setup |
| `/login` | Login | Authentication |

---

## Conclusion

FluentWhisper is a well-structured language learning app with:
- **Clear separation of concerns** (services → hooks → components)
- **Type-safe** (strict TypeScript)
- **Offline-first** (local databases, optional cloud)
- **Session-centric** data model (records → analysis → vocabulary growth)
- **Rich analytics** (dashboard, progress charts, trends)
- **Multi-language support** (5+ languages via language packs)

The current architecture makes it easy to add **diary/journaling features** that complement the existing metrics-driven approach.
