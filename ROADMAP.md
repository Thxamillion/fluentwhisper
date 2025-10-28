# FluentWhisper Development Roadmap

## ✅ Completed Phases

### Phase 1: Language Pack Integration ✅
- Spanish/English lemmatization databases
- Lemma lookup and word normalization
- Language-specific tokenization

### Phase 2: Tokenization Service ✅
- Word extraction from transcripts
- Punctuation handling
- Stopword filtering

### Phase 3: Vocabulary Persistence ✅
- SQLite database for user vocabulary
- Track word forms, usage counts, timestamps
- Session-word relationships

### Phase 4: Recording Integration ✅
- Local Whisper transcription (whisper-rs)
- Audio recording with device selection
- Full pipeline: Record → Transcribe → Process → Save
- Model management (Small recommended, 466MB)
- React Query hooks for state management
- Processing indicators and error handling
- Session creation and vocabulary extraction working

---

### Phase 5: Stats & Analytics Page ✅
**Goal:** Visualize progress and gamify practice

**Completed Features:**
- ✅ Total speaking time counter
- ✅ Session count display
- ✅ Vocabulary size display
- ✅ Average WPM
- ✅ Current streak + longest streak
- ✅ Avg unique words per session
- ✅ Avg new words per session
- ✅ Top 10 most practiced words with usage bars
- ✅ Language filter dropdown

**Technical:**
- ✅ Query aggregation service (Rust)
- ✅ Tauri commands for stats (5 commands)
- ✅ React Query hooks with caching
- ✅ Real-time data from database

**Future Enhancements:**
- [ ] Vocabulary growth chart over time (line chart)
- [ ] WPM trends chart (line chart)
- [ ] Calendar heatmap for practice days
- [ ] Date range filtering (7/30/90 days)
- [ ] Charts library integration (recharts)

---

## 🚧 Current Phase

### Phase 6: Session History Page (NEXT)
**Priority:** HIGH - Users need to review past sessions

**Key Features:**
- View list of all past recording sessions
- Sort by date, duration, language
- Click to see session details (transcript, stats, vocab)
- Delete sessions
- Simple list UI (no audio playback yet)

**Why Next:** Core feature, completes the basic MVP loop

---

## 📋 Upcoming Phases

### Phase 7: Vocabulary Page Enhancement
**Goal:** Make vocabulary more actionable

**Features:**
- [ ] Export vocabulary to CSV
- [ ] Export to Anki format (.apkg)
- [ ] Mark words as "mastered" or "known"
- [ ] Spaced repetition flashcard mode
- [ ] Search and filter vocabulary (by language, date, frequency)
- [ ] Sort by various metrics (newest, most used, mastered)
- [ ] Show example sentences from sessions where word appears
- [ ] Word definitions (optional dictionary API integration)
- [ ] Audio pronunciation (TTS or recordings)
- [ ] Custom word lists/decks

**Technical:**
- CSV export service
- Anki file generation
- Spaced repetition algorithm (SM-2 or similar)
- Flashcard UI component
- Search/filter query builder
- Dictionary API integration (optional)

---

### Phase 8: UX Polish & Bug Fixes
**Goal:** Professional feel, fewer rough edges

**Features:**
- [ ] Better error handling and user-friendly messages
- [ ] Loading states and skeleton screens
- [ ] Smooth animations and transitions
- [ ] Keyboard shortcuts (Space to record, Esc to stop, etc.)
- [ ] Audio settings (mic levels, input monitoring)
- [ ] Noise reduction toggle
- [ ] Better onboarding flow (first-time user guide)
- [ ] Dark mode support
- [ ] Accessibility (ARIA labels, keyboard nav)
- [ ] Tooltips and help text
- [ ] Empty states with helpful CTAs
- [ ] Confirmation dialogs for destructive actions

**Technical:**
- Error boundary components
- Global keyboard shortcut handler
- Animation library (framer-motion?)
- Audio visualization (waveform)
- Theme provider
- Onboarding state management

---

### Phase 9: Advanced Recording Features
**Goal:** Power user features

**Features:**
- [ ] Pause/resume recording
- [ ] Audio playback in Record page (review before saving)
- [ ] Real-time word detection during recording (live transcript)
- [ ] Recording templates/prompts library
- [ ] Auto-save drafts (unsaved recordings)
- [ ] Background noise detection/warning
- [ ] Audio level meter
- [ ] Custom recording duration limits
- [ ] Voice activity detection (auto-stop on silence)
- [ ] Multiple takes/re-record option

**Technical:**
- Recording state machine (idle/recording/paused/stopped)
- Draft storage system
- Real-time transcription (streaming?)
- Audio visualization
- VAD algorithm
- Prompt template system

---

### Phase 10: Multi-Language Support
**Goal:** Support more languages beyond Spanish/English

**Features:**
- [ ] Add French, German, Italian, Portuguese lemmatization
- [ ] Language-specific settings
- [ ] Mixed language support (detect language per session)
- [ ] Translation features (optional)
- [ ] Language learning goals per language
- [ ] Compare stats across languages

**Technical:**
- Additional lemma databases
- Language detection
- Multi-language query support
- Translation API (optional)

---

### Phase 11: Social & Sharing
**Goal:** Community and motivation

**Features:**
- [ ] Share session stats (social media cards)
- [ ] Export session audio/transcript
- [ ] Friends/teacher sharing (optional)
- [ ] Leaderboards (optional, privacy-focused)
- [ ] Achievements/badges system
- [ ] Practice reminders/notifications

**Technical:**
- Social card generation (OG images)
- Export functionality
- Notification system
- Achievement tracking

---

### Phase 12: Mobile & Cross-Platform
**Goal:** Use on all devices

**Features:**
- [ ] Mobile app (iOS/Android via Tauri)
- [ ] Cloud sync (optional, privacy-focused)
- [ ] Cross-device sessions
- [ ] Mobile-optimized UI

**Technical:**
- Tauri mobile support
- Sync service (optional)
- Responsive design improvements

---

## 🔮 Future Ideas (Backlog)

- **AI-powered feedback:** Pronunciation scoring, grammar suggestions
- **Conversation practice:** AI conversation partner
- **Reading mode:** Import text, highlight new vocabulary
- **Video support:** Transcribe videos for language learning
- **Browser extension:** Capture vocabulary from web browsing
- **Offline-first PWA:** Use in browser without install
- **Study groups:** Share vocabulary lists with classmates
- **Import existing vocabulary:** From Anki, Quizlet, etc.
- **Custom word pronunciation:** Record your own audio for words
- **Sentence mining:** Extract full sentences with new words
- **Model selection UI:** Choose between Tiny/Base/Small/Medium in settings
- **Automatic language detection:** Detect which language was spoken

---

## 🎯 Success Metrics

**User Engagement:**
- Daily active users
- Average session length
- Sessions per week
- Vocabulary words learned per week

**Technical Health:**
- App load time < 2s
- Recording start time < 500ms
- Transcription time < 5s for 60s audio (Small model)
- Zero data loss (sessions, vocabulary)

**User Satisfaction:**
- Transcription accuracy > 90% (with Small model)
- App rating > 4.5/5
- NPS score > 50

---

## 📝 Technical Notes

**Current Tech Stack:**
- Frontend: React, TypeScript, TanStack Query, Tailwind CSS
- Backend: Rust, Tauri v2, SQLite, whisper-rs
- Models: Whisper Small (466MB, recommended)
- Audio: cpal (recording), hound (WAV), rubato (resampling)

**Architecture Principles:**
- Three-layer: Service → Query → UI
- Local-first (no cloud dependencies)
- Privacy-focused (all data stays on device)
- Migration-free settings
- Error handling at boundaries only

**Development Workflow:**
- Type-check: `bun run type-check`
- Lint: `bun run lint`
- Build: `bun run tauri build`
- Dev: `bun run tauri dev`
- Rust check: `cd src-tauri && cargo check`

---

**Last Updated:** Phase 5 Complete (Stats & Analytics working!), Phase 6 Next (Session History)
