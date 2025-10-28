# Session Detail - Future Features

Features from the mockup that we're NOT implementing yet but want to track for later phases.

## Phase 7: Vocabulary Page Enhancement

### Annotations System
- **Add notes to transcript** - Textarea to add personal notes/annotations
- **Save annotations to database** - Persist notes per session
- **Display annotations** - Show saved notes below transcript
- **Edit/delete annotations** - Manage existing notes

**Technical:**
- New `session_annotations` table with session_id, note_text, created_at
- Tauri commands for CRUD operations
- Simple textarea + save button UI

---

## Phase 8: UX Polish & Features

### Custom Tags
- **Tag sessions** - "Presentation", "Interview Prep", "Practice", etc.
- **Filter by tags** - In History page, filter sessions by tag
- **Tag management** - Create/edit/delete custom tags
- **Tag suggestions** - Auto-suggest common tags

**Technical:**
- New `tags` table and `session_tags` junction table
- Tauri commands for tag CRUD
- Tag input component with autocomplete
- Filter UI in History page

---

## Phase 9: Advanced Recording Features

### Interactive Transcript
- **Word highlighting** - Click any word in transcript to highlight
- **Word context menu** - Right-click word for options:
  - Add to vocabulary/flashcards
  - See definition
  - Mark as "practice word"
  - Hear pronunciation
- **Filler word detection** - Auto-highlight "um", "like", "uh", etc.
  - Show count of each filler word type
  - Visual highlighting in transcript (yellow background)
- **Pause detection** - Highlight long pauses in transcript
- **Speaking pace visualization** - Color-code transcript by WPM (fast/normal/slow sections)

**Technical:**
- Filler word detection in tokenization service
- Store filler word positions/counts in database
- Interactive transcript component with click handlers
- Context menu UI component
- Audio-transcript sync (timestamp each word)

### Advanced Metrics
- **Clarity Score** - Calculate speech clarity (0-100%)
  - Based on: filler words, pauses, pace consistency
  - Algorithm: weighted score of multiple factors
- **Fluency metrics** - More detailed WPM breakdown
  - Average WPM
  - Peak WPM (fastest section)
  - Minimum WPM (slowest section)
- **Pronunciation analysis** - Compare with native speakers (future AI feature)

**Technical:**
- Advanced stats calculation in Rust service
- New metrics fields in sessions table
- Scoring algorithms for clarity/fluency
- Visual charts/graphs for metrics

### Audio Visualization
- **Waveform display** - Show audio waveform above player
- **Playback controls** - Play/pause, skip forward/back, speed control
- **Seek by clicking waveform** - Jump to specific timestamp
- **Audio-transcript sync** - Auto-scroll transcript as audio plays
- **Download audio** - Export session audio file

**Technical:**
- Waveform generation (use wavesurfer.js or similar)
- Audio player component with custom controls
- Timestamp mapping for audio-transcript sync
- File download API

---

## Future Ideas

### AI-Powered Features (Phase 11+)
- **Grammar suggestions** - Highlight grammar errors in transcript
- **Pronunciation feedback** - Compare pronunciation with native speakers
- **Vocabulary recommendations** - Suggest words to learn based on context
- **Speaking style analysis** - Formal vs casual, technical vs simple

### Social Features (Phase 11+)
- **Share sessions** - Generate shareable link with audio + transcript
- **Session comments** - Allow teachers/friends to comment
- **Comparison mode** - Compare two sessions side-by-side

---

## Priority Order

1. **Phase 7:** Annotations (simple notes)
2. **Phase 8:** Custom tags (organization)
3. **Phase 9:** Filler word detection (immediate value)
4. **Phase 9:** Interactive transcript (power user feature)
5. **Phase 9:** Audio visualization (nice-to-have)
6. **Phase 11+:** AI features (long-term)

---

**Last Updated:** Phase 6 Complete
