# FluentWhisper - Complete App Overview

## What is FluentWhisper?

**FluentWhisper** is a desktop language learning app (macOS/Windows) that helps users improve speaking fluency through local speech-to-text recording and vocabulary tracking. It uses **local Whisper** for transcription (fully offline-capable), and tracks speaking metrics and vocabulary growth over time.

---

## Main Features (Currently Implemented)

### 1. Recording Sessions
- **Free Form Speech**: Users record themselves speaking freely in their target language
- **Read Aloud Mode**: Read imported texts or library items aloud (recording + text reference)
- **Microphone Selection**: Choose recording device in settings
- **Audio Quality Control**: High/Medium/Low quality settings with optional noise reduction
- **Live Timer**: Shows elapsed time while recording (MM:SS format)
- **Review Before Saving**: After recording stops, user can listen to audio and review before transcribing
- **Discard Option**: Option to discard recording with confirmation dialog

### 2. Transcription & Session Analysis
Each session automatically computes:
- **Word Count**: Total words spoken
- **Unique Word Count**: Total unique word forms
- **Words Per Minute (WPM)**: Speaking speed metric
- **New Word Count**: Words not in user's vocabulary before this session
- **Lemmatization**: Converts word forms to base forms (e.g., "running" → "run", "estoy" → "estar")
- **Timestamps**: Session start/end times, creation/update metadata

### 3. Session Management
- **Session History**: Chronological list of all recording sessions with filtering
- **Delete Sessions**: Option to delete sessions (with confirmation)
- **Filter by Language**: View sessions for specific language
- **Filter by Type**: Free speak vs read aloud sessions
- **Pagination**: 10 items per page with previous/next navigation
- **Session Detail View**: Full transcript, all spoken words, statistics, audio playback

### 4. Vocabulary Tracking
Core vocabulary database tracks each word:
- **Lemma**: Base form of the word
- **Forms Spoken**: JSON array of actual forms user has spoken (e.g., ["estoy", "estás", "están"])
- **First Seen**: Timestamp of first session with this word
- **Last Seen**: Timestamp of most recent session
- **Usage Count**: Total times spoken across all sessions
- **Translation**: Retrieved from language pack (optional feature)
- **Mastery Status**: Can be marked as "mastered" (future feature)

**Vocabulary Page Features:**
- Search by lemma or spoken forms
- Filter by mastery (all, learning, mastered)
- Inline editing of mastery status
- Delete individual words
- Pagination (10 per page)
- Translation lookup (when language packs available)
- Date formatting (first seen, last seen)

### 5. Dashboard / Home
Analytics overview with:
- **Streak Tracking**: Current consecutive days with practice + personal best streak
- **Daily Goal**: Customizable daily goal (default 15 min) with visual progress ring
- **This Week Stats**: Total minutes and new words learned this week
- **Average WPM**: Overall speaking speed with trend indicator (% change vs last week)
- **Recent Sessions**: Last 4 sessions with quick stats (date, duration, WPM, new words)
- **New Words Widget**: 12 most recent words learned (last 7 days)
- **Practice Calendar**: Heatmap of speaking activity for current month (color-coded by completion % of daily goal)
- **Daily Goal Modal**: Pop-up to set custom daily goal

### 6. Progress / Analytics Page
Long-term learning journey visualization:
- **Language Selector**: Switch between languages to view stats
- **Total Practice Time**: Hours and minutes milestones (10h, 25h, 50h, 100h, 200h)
- **WPM Trends**: Line chart showing average WPM over 30 days
- **Vocabulary Growth**: Area chart showing cumulative vocabulary buildup
- **Top Words**: Table of 10 most frequently used words with usage counts
- **Daily Session Counts**: Breakdown by number of sessions/day

### 7. Text Library / "Library" Page
Store and manage reading practice materials:
- **Import Text**: Manually paste text or upload .txt files
- **Text Properties**:
  - Title
  - Content
  - Language
  - Word count
  - Estimated reading duration
  - Difficulty level (beginner/intermediate/advanced)
  - Tags (future feature)
- **Read Aloud Feature**: Select text to practice speaking while reading
- **Search & Filter**: By title, content, language
- **Delete with Confirmation**: Remove texts from library
- **Source Tracking**: Tracks whether text was manually entered or uploaded

### 8. Multi-Language Support
- Currently supports: **English, Spanish, French, German, Italian**
- **Language Packs**: Each language has:
  - `ling.db` with lemmatization data
  - Dictionary for translations
  - Tokenization rules
- **Target Language**: The language you're learning (for transcription)
- **Primary Language**: Your native language (for translations/UI)
- **Settings**: Easy switching between languages

### 9. Settings & Configuration
User-configurable settings:
- **Model Selection**: Choose transcription model (local Whisper models or cloud APIs)
- **Microphone**: Select default recording device
- **Audio Quality**: High/Medium/Low with noise reduction toggle
- **Primary Language**: Native language for translations
- **Target Language**: Language being learned
- **Daily Goal**: Custom daily practice goal (in minutes)
- **Retention Policy**: How long to keep deleted data (never/30/60/90 days)
- **Language Pack Management**: Download/manage language packs

### 10. Authentication & Cloud Sync (Optional)
- **Desktop Auth**: Credentials saved in secure Tauri storage
- **Cloud Integration**: Optional cloud sync for multi-device support
- **Login/Signup**: Via Supabase (optional cloud backend)
- **Onboarding**: First-run setup wizard

### 11. Other Features
- **Language Pack Downloads**: Auto-download language packs, progress indication
- **Model Download Progress**: Track Whisper model downloads
- **Confirmation Dialogs**: Prevent accidental data deletion (discard recording, delete session)
- **Toast Notifications**: User feedback for actions (save, delete, errors)
- **Error Handling**: Try/catch at boundaries (Tauri calls, file operations, transcription)
- **Auto-Cleanup**: Automatic deletion of old sessions based on retention policy
- **Dark Mode Support**: Full dark/light theme support via Tailwind

---

## Data Being Tracked

### Per Session
- Session ID, language, start/end time, duration
- Audio file path, complete transcript
- Total words, unique words, WPM, new word count
- Session type (free_speak or read_aloud)
- Source text ID (for read-aloud sessions)

### Per Word (Vocabulary)
- Lemma (base form)
- All spoken forms
- First and last seen timestamps
- Usage frequency
- Mastery status

### Overall Statistics
- Total sessions recorded
- Total speaking time (seconds)
- Total vocabulary size
- Average WPM
- Current & longest streaks (consecutive days)
- Average unique words per session
- Average new words per session
- Top words used
- Daily session counts
- WPM trends over time
- Vocabulary growth curve

### User Settings
- Selected model for transcription
- Default microphone
- Audio quality & noise reduction
- Primary & target languages
- Daily goal (minutes)
- Data retention policy

---

## UI/UX Approach

### Architecture Pattern: Three-Layer
1. **Service Layer**: Pure functions, no UI dependencies
   - `services/sessions/`
   - `services/vocabulary/`
   - `services/stats/`
   - `services/recording/`
   - `services/transcription/`

2. **Query/Hook Layer**: React Query wrapper for reactivity & caching
   - `hooks/sessions/useAllSessions()`
   - `hooks/vocabulary/useUserVocab()`
   - `hooks/stats/useOverallStats()`
   - `hooks/recording/useRecording()`

3. **UI Component Layer**: React components with minimal logic
   - Presentational components in `components/`
   - Page containers in `pages/`
   - Zustand stores for global settings

### Layout Structure
- **Sidebar Navigation**: Left sidebar with links to main pages
- **Main Content Area**: Responsive grid layouts
- **Responsive Design**: Adapts to different window sizes
- **Modal Dialogs**: For confirmations and settings

### Visual Patterns
- **Stat Cards**: Icon + label + value + subtitle (dashboard)
- **Heatmap Calendar**: Color-coded practice activity grid
- **Charts**: Recharts library (line charts, area charts)
- **Tables**: Paginated lists with search/filter
- **Progress Rings**: Circular progress indicator for daily goal
- **Badges**: Status indicators (mastered/learning)
- **Icons**: Lucide React icons throughout

### Data Visualization
- **Dashboard**: Grid of stat cards + calendar heatmap + recent sessions list
- **Progress Page**: Side-by-side layout with metrics on left, charts on right
- **History Page**: Paginated table with language/type filters
- **Vocabulary Page**: Paginated table with search and mastery filter

### Component Organization
```
components/
├── dashboard/          # Dashboard-specific components
│   ├── StatCard.tsx
│   ├── PracticeCalendar.tsx
│   ├── RecentSessions.tsx
│   ├── NewWords.tsx
│   └── QuickStartBanner.tsx
├── ui/                 # Reusable UI primitives
│   ├── card.tsx
│   ├── button.tsx
│   ├── dialog.tsx
│   ├── chart.tsx
│   └── ...
├── layout/
│   ├── Layout.tsx      # Main app shell
│   └── Sidebar.tsx
└── ...
```

---

## Navigation Structure

```
/                          Dashboard (home)
├── /record                Record a session
├── /library               Text library (import texts)
├── /read-aloud/:id       Read aloud mode for library item
├── /history              All sessions (searchable, filterable)
├── /session/:id          Session detail (transcript, words, audio)
├── /vocabulary           Vocabulary list (searchable, filterable)
├── /progress             Long-term analytics & charts
├── /settings             App settings & preferences
├── /import               Import sessions/data
├── /onboarding           First-run setup wizard
├── /login                Auth login page
└── /login/callback       OAuth callback
```

---

## Technology Stack

### Frontend
- **React 18** with TypeScript (strict mode)
- **React Router** for navigation
- **React Query (TanStack Query)** for data fetching & caching
- **Zustand** for global state (settings, downloads)
- **Tailwind CSS** for styling
- **Recharts** for data visualization
- **Lucide React** for icons
- **Sonner** for toast notifications
- **Shadcn/ui** components (buttons, dialogs, cards, tables)

### Backend (Rust)
- **Tauri** for desktop app framework
- **SQLite** (via sqlx) for local databases
- **Whisper.cpp** or faster-whisper for speech-to-text
- **cpal/rodio** for audio capture

### Build Tools
- **Vite** for bundling
- **Bun** for package management
- **TypeScript** compiler
- **ESLint + Prettier** for code style

### Database
- **user.db**: Sessions, vocabulary, vocab usage (SQLite)
- **ling.db**: Language pack lemmatization data
- **Supabase** (optional cloud backend for auth & sync)

---

## Key Hooks & Services

### Hooks
- `useRecording()` - Control recording state, transcription
- `useSessions()` - Fetch/manage sessions
- `useAllSessions()` - Get all sessions
- `useSession(id)` - Get single session
- `useVocabulary()` - Get vocabulary list
- `useUserVocab()` - User's vocab with filters
- `useStats()` - Various stats hooks (overall, daily, WPM, vocab growth)
- `useSettings()` - Access & update app settings
- `useTextLibrary()` - Text library management
- `useModels()` - Whisper model management
- `useAuth()` - Authentication state

### Services
- **RecordingService**: Audio capture, transcription coordination
- **TranscriptionService**: Whisper integration
- **SessionService**: Create, read, delete sessions
- **VocabularyService**: Word tracking and retrieval
- **StatsService**: Calculate analytics
- **TextLibraryService**: Text storage & retrieval
- **AuthService**: Login/logout, credentials management
- **SettingsService**: Persist user preferences

---

## Future Enhancements Mentioned in Code/Docs

1. **Word Prompts During Recording**: Show unpracticed words to encourage usage
2. **AI Language Mentor**: LLM-powered analysis of transcripts for recommendations
3. **Flashcard/Spaced Repetition**: Interactive vocabulary practice
4. **YouTube/Article Import**: For reading & transcription practice
5. **Grammar Analysis**: Identify patterns and suggest improvements
6. **Shift+Delete Shortcuts**: Power user workflow improvements
7. **Advanced Library Features**: Tags, difficulty ratings, source URLs

---

## Current State & Polish

The app is feature-complete for MVP with:
- Working recording and transcription
- Vocabulary tracking across sessions
- Dashboard with streaks, goals, and recent activity
- Comprehensive analytics/progress page
- Text library for reading practice
- Multi-language support
- Settings management
- Error handling and user feedback
- Dark mode support

**Recent improvements:**
- Query invalidation fixes
- Relative time calculations for dashboard
- Language pack status banner
- Toast notifications instead of alerts
- Confirmation dialogs for destructive actions

---

## Why "Fluent Diary" Enhancement?

Current app is **session-centric** (records → transcribes → analyzes). A diary enhancement would add:
- **Personal narrative** to sessions (what was I learning about? why?)
- **Reflection prompts** (what went well? what was challenging?)
- **Session notes** (context, mood, focus areas)
- **Diary calendar view** (see entries over time with mood/difficulty indicators)
- **Progress summaries** (weekly/monthly digests of what was learned)
- **Affirmations & streaks** (celebrating consistency, personal encouragement)

This would make it more of a **learning journal** that captures not just metrics, but the human experience of language learning.
