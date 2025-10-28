# FluentWhisper Development Roadmap

## 🎉 MVP Complete!

All core features are working:
- ✅ Recording with Whisper transcription
- ✅ Stats & Analytics dashboard
- ✅ Session History with audio playback
- ✅ Vocabulary page with real data, pagination, translations

---

## 🚀 Phase 8: Recording Flow Redesign (MUST-DO)
**Goal:** Professional recording experience with proper flow

**Current Issues:**
- Pressing mic immediately records and stops with no preview
- No way to review audio before transcribing
- Immediately redirects to sessions after stopping

**New Flow:**
1. User presses Record button
2. Recording starts (show timer, waveform)
3. User presses Stop button
4. **NEW:** Recording preview screen appears:
   - Audio player to review recording
   - Transcription status indicator
   - Two buttons: "Discard" or "Transcribe & Save"
5. When user presses "Transcribe & Save":
   - Show loading state during transcription
   - Process vocabulary and stats
   - Redirect to Session Detail page

**Technical:**
- [ ] Recording state machine (idle → recording → stopped → previewing)
- [ ] Preview UI component with audio player
- [ ] "Discard" action (delete temp audio file)
- [ ] "Transcribe & Save" action (existing flow)
- [ ] Loading overlay during transcription
- [ ] Navigate to `/session/:id` after completion

---

## 📚 Phase 9: Onboarding Flow (MUST-DO)
**Goal:** Guide new users through setup

**Features:**
- [ ] Welcome screen explaining the app
- [ ] Whisper model download prompt (if not exists)
   - Show model sizes and accuracy tradeoffs
   - Download progress bar
- [ ] Language selection
- [ ] Microphone permission request with explanation
- [ ] Test recording to verify setup
- [ ] Quick tutorial of main features
- [ ] "Get Started" button to home

**Technical:**
- [ ] Onboarding state in settings (completed: boolean)
- [ ] Multi-step wizard component
- [ ] Model download service with progress
- [ ] Mic permission check
- [ ] First-run detection

---

## 🎬 Phase 10: YouTube Content Import (WANT-TO-HAVE)
**Goal:** Import YouTube videos as reading/speaking practice content

**Features:**
- [ ] Paste YouTube URL
- [ ] Fetch video transcript (via YouTube API or yt-dlp)
- [ ] Import as "Content" (separate from Sessions)
- [ ] Content library page showing imported videos/articles
- [ ] Read-aloud mode:
   - Display transcript text with highlighting
   - Record yourself reading along
   - Compare your recording to original (optional)
   - Track vocabulary from read-aloud sessions

**Technical:**
- [ ] YouTube transcript fetching service
- [ ] New "Content" database table (id, title, source_url, transcript, language)
- [ ] Content library UI page
- [ ] Read-aloud recording mode
- [ ] Link content to sessions

---

## 🎨 Phase 11: Settings Page
**Goal:** Configure app behavior

**Features:**
- [ ] Whisper model selection (Tiny/Base/Small/Medium)
- [ ] Default language preference
- [ ] Target WPM setting
- [ ] Audio device selection
- [ ] Transcription language setting
- [ ] Export/import data (backup/restore)

**Technical:**
- [ ] Settings UI with form
- [ ] Model switching logic
- [ ] Device enumeration
- [ ] Settings persistence (already have migration-free system)

---

## ✨ Phase 12: UX Polish & Performance
**Goal:** Make the app feel professional

**Features:**
- [ ] Better loading states (skeleton screens)
- [ ] Error boundaries with user-friendly messages
- [ ] Keyboard shortcuts:
  - Space to start/stop recording
  - Esc to cancel/close modals
  - Cmd+K for quick navigation
- [ ] Smooth animations (framer-motion)
- [ ] Tooltips for unclear UI elements
- [ ] Confirmation dialogs for destructive actions
- [ ] Empty states with helpful CTAs (mostly done)
- [ ] Audio level meter during recording
- [ ] Dark mode support

**Performance:**
- [ ] Cache translations in IndexedDB (avoid re-fetching)
- [ ] Optimize vocabulary queries for large datasets
- [ ] Lazy load session history (virtual scrolling)
- [ ] Debounce search inputs

---

## 🌟 Phase 13: Vocabulary Enhancements
**Goal:** Make vocabulary more actionable

**Features:**
- [ ] Export vocabulary to CSV
- [ ] Export to Anki format (.apkg)
- [ ] Mark individual words as "mastered"
- [ ] Spaced repetition flashcard mode
- [ ] Show example sentences from sessions
- [ ] Word definitions (optional dictionary API)
- [ ] Audio pronunciation (TTS)
- [ ] Custom word lists/decks

---

## 📊 Phase 14: Analytics Charts
**Goal:** Visualize progress over time

**Features:**
- [ ] Vocabulary growth chart (line chart)
- [ ] WPM trends over time
- [ ] Calendar heatmap for practice days
- [ ] Date range filtering (7/30/90 days)

**Technical:**
- [ ] Charts library (recharts or chart.js)
- [ ] Time-series data queries

---

## 🔮 Future Ideas (Backlog)

**Advanced Recording:**
- Pause/resume recording
- Real-time transcription during recording
- Voice activity detection (auto-stop on silence)
- Recording templates/prompts library
- Multiple takes/re-record option

**Multi-Language:**
- Add more languages (German, Italian, Portuguese, etc.)
- Mixed language support (detect per session)
- Compare stats across languages

**AI-Powered Features:**
- Pronunciation scoring
- Grammar suggestions
- AI conversation partner

**Reading Mode:**
- Import text articles (not just YouTube)
- Highlight new vocabulary while reading
- Track reading sessions

**Social & Sharing:**
- Share session stats (social media cards)
- Export session audio/transcript
- Achievements/badges system
- Practice reminders/notifications

**Mobile & Sync:**
- Mobile app (iOS/Android via Tauri)
- Cloud sync (optional, privacy-focused)

---

## 🎯 Development Priorities

**Immediate (Next 2 weeks):**
1. Recording Flow Redesign (Phase 8)
2. Onboarding Flow (Phase 9)

**Short-term (Next month):**
3. YouTube Content Import (Phase 10)
4. Settings Page (Phase 11)

**Medium-term (Next 2-3 months):**
5. UX Polish & Performance (Phase 12)
6. Vocabulary Enhancements (Phase 13)
7. Analytics Charts (Phase 14)

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

**Last Updated:** MVP Complete! Next up: Recording Flow + Onboarding
