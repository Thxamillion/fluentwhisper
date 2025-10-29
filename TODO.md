# FluentWhisper - Read Aloud Feature TODO

## High Priority - Core Read Aloud Features

### 1. Create Read Aloud Page
- [ ] Create `/src/pages/read-aloud/ReadAloud.tsx` route at `/read-aloud/:textLibraryId`
- [ ] Match screenshot design (no breadcrumbs)
- [ ] Left side: Title, instruction text, scrollable text container with highlighted words
- [ ] Right sidebar: "Your Voice" section with big circular record button, timer, waveform
- [ ] "Playback & Actions" section: Play, Retry, Save, Compare buttons
- [ ] Previous/Next navigation at bottom
- [ ] Integrate with `useRecording` hook for read-aloud sessions
- [ ] Pass `session_type: 'read_aloud'`, `text_library_id`, and `source_text` to recording

### 2. Build HighlightedText Component
- [ ] Create `/src/components/read-aloud/HighlightedText.tsx`
- [ ] Tokenize text while preserving whitespace and punctuation
- [ ] Lemmatize each word using `lemmatization` service
- [ ] Compare lemmas against user's vocabulary from `useUserVocab` hook
- [ ] Highlight NEW words (not in vocab) with yellow background
- [ ] Make highlighted words clickable
- [ ] Handle click events to show translation tooltip
- [ ] Support multiple languages (es, en, fr, de)

### 3. Add TranslationTooltip Component
- [ ] Create `/src/components/read-aloud/TranslationTooltip.tsx`
- [ ] Position tooltip near clicked word
- [ ] Display: lemma, translation, example usage
- [ ] Use existing `translation` service for translations
- [ ] Add "Add to known words" button (optional)
- [ ] Handle click outside to close
- [ ] Smooth animations for show/hide

### 4. Update Session Detail for Read-Aloud Sessions
- [ ] Modify `/src/pages/session-detail/SessionDetail.tsx`
- [ ] Check `session.sessionType` field
- [ ] If `'read_aloud'`: show "Read Aloud Session" badge
- [ ] Display side-by-side layout: Source Text | Transcript
- [ ] Show link back to text library item if `textLibraryId` exists
- [ ] Keep existing stats display (WPM, word count, new words)
- [ ] Show words learned section

### 5. Update Sidebar Navigation
- [ ] Modify `/src/components/layout/Sidebar.tsx`
- [ ] Add "Read Aloud" or "Text Library" navigation item
- [ ] Use appropriate icon (BookOpen, Library, FileText)
- [ ] Link to `/library` route
- [ ] Update active state highlighting

### 6. Update History Page with Session Type Filtering
- [ ] Modify `/src/pages/history/History.tsx`
- [ ] Add session type filter: "All", "Free Speak", "Read Aloud"
- [ ] Show badge on cards indicating session type
- [ ] For read-aloud sessions, show source title from `sourceText` or `textLibraryId`
- [ ] Filter sessions based on selected type
- [ ] Update empty state messages based on filters

## Bug Fixes & Polish

### Database Migration
- [x] ~~Added missing columns to existing database~~
- [ ] Create automatic migration script for future users
- [ ] Add database version tracking
- [ ] Handle schema upgrades gracefully

### Error Handling
- [ ] **Fix delete button crash on History page**
  - [ ] Add try/catch around delete mutation
  - [ ] Show error toast instead of crashing
  - [ ] Add loading state to delete button
  - [ ] Disable delete during deletion

- [ ] **Prevent app crashes from database errors**
  - [ ] Wrap all Tauri invokes in try/catch
  - [ ] Return proper error types from services
  - [ ] Display user-friendly error messages
  - [ ] Add error boundaries to React components
  - [ ] Log errors for debugging

- [ ] **Add error handling to recording flow**
  - [ ] Handle microphone permission denied
  - [ ] Handle Whisper transcription failures
  - [ ] Handle database write failures
  - [ ] Show clear error messages to user

### UI/UX Improvements
- [ ] Add loading states to all async operations
- [ ] Add success/error toast notifications
- [ ] Add confirmation dialogs for destructive actions
- [ ] Improve empty states with illustrations
- [ ] Add keyboard shortcuts (Space to record, Esc to cancel)

## Future Enhancements (v2)

- [ ] Pronunciation analysis (compare transcript to source)
- [ ] YouTube integration (auto-fetch subtitles)
- [ ] Text-to-speech for native speaker audio
- [ ] Progress tracking for texts
- [ ] Spaced repetition suggestions
- [ ] Difficulty detection
- [ ] Collections/playlists for texts
- [ ] Export sessions to external formats

## Testing

- [ ] Test read-aloud session creation
- [ ] Test vocabulary highlighting with different languages
- [ ] Test translation tooltip positioning
- [ ] Test session detail view for both session types
- [ ] Test History filtering by session type
- [ ] Test database migration on fresh install
- [ ] Test error scenarios (no mic, no internet, etc.)

---

## Notes

- Keep following the three-layer architecture (Service → Query → UI)
- Use existing services where possible (lemmatization, translation, vocabulary)
- Maintain migration-free philosophy (all new features have defaults)
- Follow existing code style and patterns
- Add JSDoc comments for complex functions
