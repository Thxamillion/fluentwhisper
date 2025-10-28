# Sync Analysis: FluentWhisper ↔ Fluent Diary

## Overview

This document compares the data structures between **FluentWhisper** (desktop app) and **Fluent Diary** (web/mobile app) to ensure future sync compatibility.

---

## Architecture Comparison

| Aspect | FluentWhisper (Desktop) | Fluent Diary (Web/Mobile) |
|--------|-------------------------|---------------------------|
| **Backend** | Tauri (Rust) | React Native + Supabase |
| **Database** | SQLite (local, offline) | PostgreSQL (Supabase, cloud) |
| **Transcription** | Local Whisper.cpp | OpenAI Whisper API |
| **Storage** | Local filesystem | Cloud storage (Supabase) |
| **Auth** | None (single-user desktop) | Supabase Auth (multi-user) |
| **Sync** | Not yet implemented | Real-time via Supabase |

---

## Data Model Mapping

### 1. Sessions / Recordings

**FluentWhisper: `sessions` table**
```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,              -- UUID
  language TEXT NOT NULL,           -- "en", "es", etc.
  started_at INTEGER NOT NULL,      -- Unix timestamp
  ended_at INTEGER,
  duration INTEGER,                 -- seconds
  audio_path TEXT,                  -- local file path
  transcript TEXT,                  -- full text

  -- Stats
  word_count INTEGER,
  unique_word_count INTEGER,
  wpm REAL,
  new_word_count INTEGER,

  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

**Fluent Diary: `recordings` + `transcriptions` + `recording_analytics`**

Split into 3 tables:

```typescript
// recordings table
{
  id: uuid
  user_id: uuid                     // ⚠️ Missing in FluentWhisper
  filename: string
  file_url: string                  // Cloud URL (not local path)
  duration: number                  // seconds
  file_size: number
  mime_type: string                 // "audio/m4a"
  status: string                    // "uploading" | "completed" | "failed"
  created_at: timestamp
  updated_at: timestamp

  // Fluent Diary specific
  audio_expires_at: timestamp       // ⚠️ Missing in FluentWhisper
  audio_available: boolean          // ⚠️ Missing in FluentWhisper
  is_shareable: boolean             // ⚠️ Missing in FluentWhisper
  share_id: string                  // ⚠️ Missing in FluentWhisper
  session_type: string              // "free_form" | "practice_text"
  text_content: string              // transcript (denormalized)
  practice_text_id: uuid            // ⚠️ Missing in FluentWhisper
  words_read: number
  total_words: number
}

// transcriptions table (separate from recordings)
{
  id: uuid
  recording_id: uuid                // FK to recordings
  provider: string                  // "openai"
  model: string                     // "whisper-1"
  status: string
  text: string                      // transcript
  segments: jsonb                   // ⚠️ Missing in FluentWhisper
  language: string
  confidence: number                // ⚠️ Missing in FluentWhisper
  attempts: number
  processing_time_ms: number
  cost: number                      // ⚠️ Missing in FluentWhisper
  error: string
  created_at: timestamp
  completed_at: timestamp
}

// recording_analytics table (separate analytics)
{
  id: uuid
  recording_id: uuid                // FK to recordings
  transcription_id: uuid
  status: string

  // Basic stats (matches FluentWhisper)
  word_count: number
  words_per_minute: number
  unique_words: number
  new_words: number

  // Advanced stats (missing in FluentWhisper)
  vocabulary_score: number          // ⚠️ Missing in FluentWhisper
  grammar_score: number             // ⚠️ Missing in FluentWhisper
  insight_score: number             // ⚠️ Missing in FluentWhisper
  speaking_time: number
  total_pauses: number              // ⚠️ Missing in FluentWhisper
  avg_pause_ms: number              // ⚠️ Missing in FluentWhisper
  longest_pause_ms: number          // ⚠️ Missing in FluentWhisper
  filler_words: jsonb               // ⚠️ Missing in FluentWhisper
  filler_word_percentage: number    // ⚠️ Missing in FluentWhisper
  enhanced_filler_analytics: jsonb  // ⚠️ Missing in FluentWhisper
  ai_tip: string                    // ⚠️ Missing in FluentWhisper

  created_at: timestamp
  completed_at: timestamp
}
```

**Key Differences:**
- FluentWhisper uses **1 table** for everything
- Fluent Diary uses **3 tables** (normalized structure)
- Fluent Diary has richer analytics (pause detection, filler words, AI tips)
- Fluent Diary tracks transcription separately from recording metadata

---

### 2. Vocabulary Tracking

**FluentWhisper: `vocab` table**
```sql
CREATE TABLE vocab (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  language TEXT NOT NULL,
  lemma TEXT NOT NULL,              -- Base form
  forms_spoken TEXT,                -- JSON: ["estoy", "estás"]

  first_seen_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  usage_count INTEGER DEFAULT 1,
  mastered BOOLEAN DEFAULT 0,

  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,

  UNIQUE(language, lemma)
);
```

**Fluent Diary: `user_vocabulary` table**
```typescript
{
  id: uuid
  user_id: uuid                     // ⚠️ Missing in FluentWhisper
  word: string                      // Original form spoken
  lemma: string
  translation: string               // ⚠️ Missing in FluentWhisper
  translation_confidence: number

  first_encountered: timestamp
  last_used: timestamp
  total_count: number               // Same as usage_count
  confidence_level: number          // ⚠️ Missing in FluentWhisper

  context_samples: jsonb            // ⚠️ Missing in FluentWhisper
  needs_review: boolean             // Similar to mastered

  // Linguistic metadata
  forms_encountered: jsonb          // Same as forms_spoken
  grammatical_info: jsonb           // ⚠️ Missing in FluentWhisper
  source_language: string
  source_session_id: uuid           // ⚠️ Missing in FluentWhisper

  search_prefix: string             // For search optimization
  created_at: timestamp
  updated_at: timestamp
}
```

**Key Differences:**
- Fluent Diary stores **translations inline** (FluentWhisper uses separate ling.db)
- Fluent Diary has **context samples** for each word
- Fluent Diary tracks **source session** for each word encounter
- Fluent Diary has **grammatical info** (POS, gender, etc.)

---

### 3. Session-Word Relationship

**FluentWhisper: `session_words` junction table**
```sql
CREATE TABLE session_words (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  lemma TEXT NOT NULL,
  count INTEGER DEFAULT 1,          -- Times used in this session
  is_new BOOLEAN DEFAULT 0,         -- Was new when session happened

  FOREIGN KEY (session_id) REFERENCES sessions(id)
);
```

**Fluent Diary: No equivalent table**
- Fluent Diary doesn't have a junction table
- Word tracking is done via `source_session_id` in `user_vocabulary`
- Less granular: can't see "I used 'estar' 5 times in session X"

**Winner:** FluentWhisper has better granularity here

---

### 4. User Profiles

**FluentWhisper: No user table (desktop single-user)**

**Fluent Diary: `profiles` table**
```typescript
{
  id: uuid
  user_id: uuid
  created_at: timestamp

  // Language settings
  target_language: string           // ⚠️ In FluentWhisper config.db
  native_language: string           // ⚠️ In FluentWhisper config.db
  current_level: string             // "beginner" | "intermediate" | "advanced"
  learning_goal: string

  // Subscription (not relevant for desktop)
  subscription_tier: string
  subscription_status: string
  premium_expires_at: timestamp

  // Onboarding
  completed_onboarding: boolean

  // Stats
  total_words_read: number          // ⚠️ Missing in FluentWhisper

  updated_at: timestamp
}
```

**For FluentWhisper:**
- Most profile fields go in `config.db` as settings
- `total_words_read` should be added to FluentWhisper for sync compatibility

---

### 5. Settings / Config

**FluentWhisper: `config.db` with key-value storage**
```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,              -- JSON string
  updated_at INTEGER NOT NULL
);
```

**Fluent Diary: Settings stored in `profiles` table**
- No separate settings table
- All user preferences in profile row

**Recommendation:**
- Keep FluentWhisper's approach (more flexible)
- Map profile fields to config keys for sync

---

## Missing Features in FluentWhisper

Features from Fluent Diary that FluentWhisper could add for sync compatibility:

### High Priority (for sync)
1. ✅ **user_id field** - Add to sessions/vocab tables (nullable for offline use)
2. ✅ **translation field** - Add to vocab table (from ling.db lookup)
3. ✅ **context_samples** - Store example sentences with vocab
4. ✅ **source_session_id** - Track which session introduced each word
5. ✅ **transcription_confidence** - Store Whisper confidence scores
6. ✅ **segments** - Store word-level timing from Whisper

### Medium Priority (nice to have)
7. ⚠️ **Pause detection** - avg_pause_ms, longest_pause_ms, total_pauses
8. ⚠️ **Filler word analysis** - filler_words jsonb, filler_word_percentage
9. ⚠️ **AI tips** - Generate post-session feedback
10. ⚠️ **grammatical_info** - POS tags, gender, conjugation info

### Low Priority (Fluent Diary specific)
11. ❌ **Sharing features** - share_id, is_shareable, view_count
12. ❌ **Audio expiration** - audio_expires_at, audio_available
13. ❌ **Subscription** - subscription_tier, premium_expires_at
14. ❌ **Practice texts** - practice_text_id, session_type

---

## Recommended Schema Updates for FluentWhisper

### Update `sessions` table:
```sql
ALTER TABLE sessions ADD COLUMN user_id TEXT;  -- Nullable for offline use
ALTER TABLE sessions ADD COLUMN segments TEXT; -- JSON: word-level timings
ALTER TABLE sessions ADD COLUMN confidence REAL; -- Whisper confidence
ALTER TABLE sessions ADD COLUMN speaking_time INTEGER; -- Exclude pauses
ALTER TABLE sessions ADD COLUMN total_pauses INTEGER;
ALTER TABLE sessions ADD COLUMN avg_pause_ms REAL;
```

### Update `vocab` table:
```sql
ALTER TABLE vocab ADD COLUMN translation TEXT;
ALTER TABLE vocab ADD COLUMN context_samples TEXT; -- JSON array
ALTER TABLE vocab ADD COLUMN source_session_id TEXT; -- First session
ALTER TABLE vocab ADD COLUMN grammatical_info TEXT; -- JSON: POS, etc.
```

### Update `session_words` table:
```sql
-- Already good! No changes needed
```

---

## Sync Strategy (Future Implementation)

### Option 1: Two-Way Sync (Complex)
- FluentWhisper writes to SQLite
- Background service syncs to Supabase
- Conflict resolution needed (last-write-wins or operational transforms)
- Requires auth and user_id

### Option 2: Export/Import (Simple)
- FluentWhisper exports sessions as JSON
- User manually imports to Fluent Diary web app
- One-way sync only
- No auth needed

### Option 3: Hybrid (Recommended)
- FluentWhisper works 100% offline by default
- Optional "Connect to Fluent Diary" feature
- When connected: background sync to Supabase
- When offline: continues working with SQLite
- Use `updated_at` timestamps for conflict resolution

---

## Implementation Roadmap

### Phase 1: Schema Alignment (Now)
- Add missing fields to FluentWhisper schema
- Ensure UUIDs are compatible (both use UUID v4)
- Add `user_id` field (nullable)

### Phase 2: Export Feature
- Add "Export to Fluent Diary" button
- Generate JSON matching Fluent Diary schema
- User can import via web app

### Phase 3: Background Sync (Future)
- Add Supabase client to FluentWhisper
- Implement auth (optional)
- Background worker syncs changes
- Conflict resolution logic

---

## Key Takeaways

### What's Compatible Now:
✅ Core session data (duration, word_count, wpm, transcript)
✅ Basic vocabulary tracking (lemma, usage_count, first/last seen)
✅ Language support (both use ISO codes)

### What Needs Work:
⚠️ Schema differences (3 tables vs 1 table for sessions)
⚠️ Missing analytics fields (pauses, filler words, AI tips)
⚠️ No user_id in FluentWhisper (needed for sync)
⚠️ Translations stored differently (ling.db vs inline)

### Recommendations:
1. **Add fields now** - Even if not used yet, add sync-compatible fields
2. **Keep sessions simple** - Don't split into 3 tables like Fluent Diary
3. **Add export feature first** - Manual sync is easier than real-time
4. **Design for offline-first** - FluentWhisper's core value is privacy/offline

---

**Status:** Analysis complete
**Next Steps:** Update FluentWhisper schema with recommended fields
**Priority:** Add fields marked ✅ above before building core features
