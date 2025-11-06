# FluentWhisper - Comprehensive App Overview for Diary Enhancements

## Executive Summary

**FluentWhisper** is a desktop language learning application (macOS/Windows) that captures speech-to-text recordings, analyzes vocabulary growth, and tracks progress metrics. The app is **session-centric**: users record speaking sessions → Whisper transcribes locally → system analyzes words spoken → metrics are tracked. It's fully offline-capable with optional cloud sync.

The existing app is **metrics-focused** (WPM, vocabulary counts, streaks). A diary enhancement would add a **personal narrative layer** that captures the human experience alongside the numbers.

---

## Core Features Implemented

### 1. Speech Recording & Transcription
- **Record freely or read aloud**: Two session types
- **Local Whisper**: Transcription happens on-device (no cloud needed)
- **Audio review**: Listen before saving
- **Languages supported**: English, Spanish, French, German, Italian

### 2. Session Analysis
Each session captures:
- Duration, word count, unique words, WPM
- New word discovery (words not in vocabulary before)
- Full transcript with timestamps
- Audio file storage

### 3. Vocabulary Tracking
- Lemmatized word tracking (base forms only)
- Frequency counts across sessions
- First/last seen timestamps
- Forms spoken (e.g., "estoy", "estás", "están" → lemma "estar")
- Mastery status (learning/mastered)

### 4. Dashboard Analytics
- **Streak counter**: Consecutive days with practice
- **Daily goal**: Custom target (default 15 min) with progress ring
- **Weekly stats**: Minutes and new words learned
- **Average WPM**: Speaking speed with trends
- **Recent sessions**: Last 4 sessions at a glance
- **New words widget**: 12 most recent words (last 7 days)
- **Practice calendar**: Monthly heatmap showing activity

### 5. Progress Page
- Total practice time with milestone markers (10h, 25h, 50h, 100h, 200h)
- WPM trends (30-day line chart)
- Vocabulary growth (cumulative area chart)
- Top 10 words by frequency
- Daily session breakdown

### 6. History & Session Detail
- Searchable, filterable session history
- Full transcript display per session
- All words spoken in session (searchable)
- Session audio playback
- Delete with confirmation

### 7. Vocabulary Management
- Searchable word list (by lemma or form)
- Filter by mastery status
- Inline mastery editing
- Translation lookup (when language pack available)
- Delete individual words
- Pagination (10 per page)

### 8. Text Library
- Import texts for reading practice
- Read-aloud mode (record while reading)
- Search and language filter
- Difficulty levels (beginner/intermediate/advanced)
- Word count and duration estimation

### 9. Settings & Configuration
- Transcription model selection (local or cloud)
- Microphone selection
- Audio quality and noise reduction
- Language preferences
- Data retention policy (never/30/60/90 days)
- Language pack management with progress

### 10. Authentication (Optional)
- Desktop credential storage
- Supabase integration for cloud sync
- Login/signup flow
- Multi-device sync capability

---

## Data Model

### Session (Recording)
```typescript
{
  id: UUID
  language: "es" | "en" | "fr" | "de" | "it"
  startedAt: timestamp
  endedAt: timestamp | null
  duration: seconds | null
  audioPath: string (relative file path)
  transcript: string (full text)
  wordCount: number
  uniqueWordCount: number
  wpm: number | null
  newWordCount: number
  sessionType: "free_speak" | "read_aloud"
  textLibraryId: UUID | null (for read-aloud)
  sourceText: string | null (for read-aloud)
}
```

### Word (Vocabulary Entry)
```typescript
{
  id: int
  language: string
  lemma: string (base form: "estar", "run")
  forms_spoken: string[] (["estoy", "estás", "están"])
  first_seen_at: timestamp
  last_seen_at: timestamp
  usage_count: number
  mastered: boolean
}
```

### Statistics (Computed)
```typescript
{
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

## Technical Architecture

### Three-Layer Pattern
```
Services (Pure functions, no UI deps)
    ↓
Hooks (React Query wrappers for caching)
    ↓
Components (React UI only)
```

### State Management
- **Zustand**: Persistent settings (model choice, languages, daily goal)
- **React Query**: Server state (sessions, vocabulary, analytics) with 5-min cache
- **React Context**: Sidebar collapse state

### Database
- **user.db**: Sessions, vocabulary, usage statistics (SQLite)
- **ling.db**: Language pack lemmatization data (per language)
- **Supabase** (optional): Cloud auth and sync

### Key Technologies
- React 18 + TypeScript (strict mode)
- Tauri (Rust backend for audio, file I/O, Whisper)
- React Router (navigation)
- Tailwind CSS (styling)
- Recharts (data visualization)
- Shadcn/ui (component library)
- SQLite (local storage)

---

## User Interface Patterns

### Pages/Routes
```
/ Dashboard (stats overview)
├── /record (audio recording)
├── /library (text storage)
├── /read-aloud/:id (read + record)
├── /history (all sessions, searchable)
├── /session/:id (session detail + transcript)
├── /vocabulary (word list)
├── /progress (analytics + charts)
├── /settings (configuration)
└── /onboarding (first-run setup)
```

### Visual Patterns
- **Stat Cards**: Icon + label + value + subtitle
- **Heatmap**: Monthly practice activity with color intensity
- **Charts**: Recharts (line, area)
- **Tables**: Paginated, searchable, filterable
- **Modals**: Confirmation dialogs, goal setting
- **Toasts**: User feedback (success, error)

### Layout
- Left sidebar navigation (collapsible)
- Main content area (responsive grid)
- Top-level modals for dialogs
- Global toast notification area

---

## Data Being Tracked (Complete List)

### Per Session
- Session ID, language, type (free/read-aloud)
- Start/end times, duration
- Complete transcript text
- Audio file path
- Word count, unique words, WPM
- New word count
- Related text (if read-aloud)

### Per Word
- Base form (lemma)
- All spoken forms
- First/last seen timestamps
- Usage frequency
- Mastery status

### Overall Statistics
- Total sessions and speaking time
- Vocabulary size
- Average WPM
- Current & best streaks
- Daily activity (session counts/minutes per day)
- WPM trends (30-day history)
- Vocabulary growth curve
- Top words (10 most used)

### User Preferences
- Selected transcription model
- Primary language (native)
- Target language (learning)
- Microphone preference
- Audio quality setting
- Daily goal (minutes)
- Data retention policy
- Dark mode preference

---

## Current State & Polish

### What Works Well
- Recording & transcription pipeline (fully functional)
- Vocabulary tracking (lemmatized, accurate)
- Dashboard with visual feedback (streaks, goals, calendar)
- Analytics/progress page (charts, trends)
- Multi-language support (5 languages available)
- Settings management (auto-save)
- Error handling (try/catch at boundaries)
- User feedback (toasts, confirmation dialogs)
- Dark mode support

### Recent Improvements
- Query invalidation fixes
- Relative time calculations (for dashboard)
- Language pack status banner
- Toast notifications (replaced alerts)
- Confirmation dialogs (prevent accidental deletes)

### Next on Roadmap
- Production release (v1.0)
- Shift+Delete shortcuts (power users)
- Word prompts during recording (vocabulary practice)
- AI Language Mentor (LLM recommendations)
- Spaced repetition flashcards

---

## Why "Fluent Diary" Makes Sense

The current app is **metrics-centric**: What did I do? (sessions) How much? (WPM, vocabulary) How consistently? (streaks)

A diary enhancement adds **narrative & reflection**: Why did I practice? What challenged me? What insights did I gain?

### Complementary Features to Add
```
Current Metrics              +    Proposed Diary Layer
────────────────────────────────────────────────────
📊 WPM trend                 +    📝 Reflection on learning goals
📈 Vocabulary growth         +    💭 Notes on challenging words
🔥 Streak counter            +    ✨ Affirmations & celebrating progress
📚 Words spoken              +    🎯 Focus areas for practice
⏱️ Hours practiced           +    🌟 Mood, energy, engagement level
```

### Diary Entries Could Include
- **Session notes**: What did I focus on? Why?
- **Reflections**: What went well? What was hard?
- **Challenges**: Which words/concepts are difficult?
- **Victories**: Which improvements am I proud of?
- **Mood/Energy**: How was I feeling during practice?
- **Goals**: What do I want to improve?
- **Affirmations**: Personal encouragement based on streaks

### UI Enhancements for Diary
- **Diary calendar**: Like practice calendar, but showing entries with mood/difficulty
- **Entry editor**: After saving session, pop-up for quick reflection
- **Diary archive**: Browse past entries, see growth over time
- **Weekly/monthly summaries**: AI-generated progress digests
- **Sidebar notes**: Quick reference during recording (learning goals, challenges)

---

## File Organization (Key Directories)

```
src/
├── pages/              # Page containers (one per route)
├── components/         # Reusable UI components
│   ├── dashboard/     # Dashboard-specific (StatCard, Calendar, etc)
│   ├── ui/            # Shadcn/ui primitives (buttons, dialogs, etc)
│   └── layout/        # Layout shell (Sidebar, Layout wrapper)
├── services/          # Pure business logic (no UI deps)
│   ├── sessions/      # Session CRUD
│   ├── vocabulary/    # Word management
│   ├── stats/         # Analytics calculations
│   ├── recording/     # Audio capture
│   ├── text-library/  # Text management
│   └── ...
├── hooks/             # React Query wrappers
│   ├── sessions/      # useAllSessions, useSession, etc
│   ├── vocabulary/    # useUserVocab, useRecentVocab
│   ├── stats/         # useOverallStats, useDailySessions, etc
│   └── ...
├── stores/            # Zustand global state
│   ├── settingsStore.ts
│   └── downloadStore.ts
└── utils/             # Utilities
    ├── dateFormatting.ts
    ├── sessionStats.ts
    └── dailyGoalState.ts
```

---

## Integration Points for Diary Feature

### New Data to Store
```typescript
interface DiaryEntry {
  id: UUID
  sessionId: UUID (links to session)
  entryText: string (user's notes)
  mood: "great" | "good" | "neutral" | "challenging" | "struggling"
  difficulty: 1-5 (how challenging was practice?)
  focus: string[] (["pronunciation", "new words", "grammar"])
  createdAt: timestamp
  updatedAt: timestamp
}
```

### New Database Tables
- `diary_entries`: id, session_id, text, mood, difficulty, created_at
- `entry_tags`: id, entry_id, tag (for categorizing reflections)

### New Hook/Service Pattern
```typescript
// Service
function saveDiaryEntry(sessionId, text, mood, difficulty) { ... }
function getDiaryEntriesForSession(sessionId) { ... }
function getDiaryEntriesForDate(date) { ... }

// Hook
function useDiaryEntry(sessionId) { ... }
function useDiaryEntries(filter) { ... }

// Component
<DiaryEditor sessionId={sessionId} onSave={...} />
<DiaryEntry entry={entry} />
<DiaryCalendar entries={entries} />
```

### New Pages/Components
- `/diary` - Browse diary entries with calendar
- `/session/:id/edit-diary` - Edit entry for session
- `DiaryEntry` - Display entry with mood/difficulty badges
- `DiaryCalendar` - Like practice calendar but shows mood
- `DiaryEditor` - Textarea for writing reflections

### Integration Points
- After session saved, show modal prompting for diary entry
- Add diary link in session detail view
- Dashboard: Show mood/engagement patterns alongside metrics
- Progress page: Add diary insights alongside charts

---

## Key Insights for Enhancement

### Strengths to Build On
1. **Clean architecture**: Services → Hooks → Components separation makes adding features easy
2. **Type safety**: Strict TypeScript enables confident refactoring
3. **Caching strategy**: React Query handles offline gracefully
4. **Database schema**: Already flexible enough for diary data
5. **UI components**: Shadcn/ui provides foundation for new UI

### Design Considerations
1. **Optional feature**: Diary entries should be optional (not required to save session)
2. **Lightweight**: Should not add significant UI/UX complexity
3. **Complementary**: Should enhance metrics, not replace them
4. **Offline-first**: Entries stored locally like everything else
5. **Flexible prompts**: Users decide what/when to reflect (not pushy)

### Similar Features to Reference
- **NewWords component**: Shows recent words as widget
- **PracticeCalendar**: Model for calendar display with color coding
- **DailyGoalModal**: Example of post-session interaction
- **SessionDetail**: Good model for detailed view

---

## Summary for Developers

FluentWhisper is a well-architected desktop language learning app that tracks:
- **What**: Vocabulary learned (words, forms, lemmas)
- **How much**: Speaking time, WPM, consistency (streaks)
- **How it's growing**: Progress charts, vocabulary curves, trends

The diary enhancement would add:
- **Why**: Purpose and motivation for practice
- **Experience**: Mood, difficulty, engagement
- **Reflection**: Personal insights and learning discoveries
- **Connection**: Human narrative alongside metrics

The codebase is ready for this enhancement with its three-layer architecture, comprehensive data model, and modular component design.

---

## Quick Reference: File Paths

Key files for diary implementation:

```
src/
├── services/diary/
│   ├── diary.ts          # CRUD operations for entries
│   ├── types.ts          # DiaryEntry interface
│   └── index.ts
├── hooks/diary/
│   ├── useDiaryEntry.ts  # React Query hook
│   └── index.ts
├── pages/diary/
│   └── Diary.tsx         # Browse entries view
├── components/diary/
│   ├── DiaryEditor.tsx   # Write/edit entry
│   ├── DiaryEntry.tsx    # Display entry
│   ├── DiaryCalendar.tsx # Month view with moods
│   └── MoodSelector.tsx  # UI for mood selection
└── stores/
    └── diaryStore.ts     # Zustand for diary state (if needed)
```

This organization follows the existing FluentWhisper patterns and integrates seamlessly with the current architecture.
