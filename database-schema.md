# Database Schema Plan

## Overview

FluentWhisper uses 3 separate SQLite databases:
1. **user.db** - User sessions, vocabulary, and stats
2. **ling.db** - Language pack data (one per language)
3. **config.db** - User settings

---

## 1. user.db - Core App Data

### Sessions Table
Stores every recording session.

```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,              -- UUID (e.g., "550e8400-e29b-41d4-a716-446655440000")
  language TEXT NOT NULL,           -- ISO code: "en", "es", "fr", "de"
  started_at INTEGER NOT NULL,      -- Unix timestamp (seconds)
  ended_at INTEGER,                 -- Unix timestamp (NULL if still recording)
  duration INTEGER,                 -- Duration in seconds
  audio_path TEXT,                  -- Path to WAV file (relative to app_data_dir)
  transcript TEXT,                  -- Full transcript text

  -- Stats (calculated after transcription)
  word_count INTEGER,               -- Total words spoken
  unique_word_count INTEGER,        -- Unique words (after lemmatization)
  wpm REAL,                         -- Words per minute
  new_word_count INTEGER,           -- New words discovered this session

  created_at INTEGER NOT NULL,      -- Unix timestamp (for sorting)
  updated_at INTEGER NOT NULL       -- Unix timestamp (for sync)
);

CREATE INDEX idx_sessions_language ON sessions(language);
CREATE INDEX idx_sessions_created_at ON sessions(created_at DESC);
```

### Vocab Table
Tracks all words user has spoken (lemmatized).

```sql
CREATE TABLE vocab (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  language TEXT NOT NULL,           -- "en", "es", etc.
  lemma TEXT NOT NULL,              -- Base form: "estar", "run", "house"

  -- Track which forms user has actually spoken
  forms_spoken TEXT,                -- JSON array: ["estoy", "estás", "están"]

  -- Tracking
  first_seen_at INTEGER NOT NULL,   -- Unix timestamp (first session with this word)
  last_seen_at INTEGER NOT NULL,    -- Unix timestamp (most recent session)
  usage_count INTEGER DEFAULT 1,    -- How many times spoken across all sessions

  -- Optional future fields
  mastered BOOLEAN DEFAULT 0,       -- User marked as "mastered" (future feature)

  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,

  UNIQUE(language, lemma)           -- One row per word per language
);

CREATE INDEX idx_vocab_language ON vocab(language);
CREATE INDEX idx_vocab_first_seen ON vocab(first_seen_at);
CREATE INDEX idx_vocab_usage_count ON vocab(usage_count DESC);
```

**Example vocab entry:**
```json
{
  "lemma": "estar",
  "forms_spoken": ["estoy", "estás", "están"],
  "usage_count": 15,
  "first_seen_at": 1704067200
}
```

### Session Words Table (Junction Table)
Links sessions to specific words spoken. Many-to-many relationship.

```sql
CREATE TABLE session_words (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,         -- Foreign key to sessions.id
  lemma TEXT NOT NULL,              -- Base form of word
  count INTEGER DEFAULT 1,          -- How many times in THIS session
  is_new BOOLEAN DEFAULT 0,         -- Was this word new when session happened?

  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE INDEX idx_session_words_session ON session_words(session_id);
CREATE INDEX idx_session_words_new ON session_words(is_new);
```

**Why this table?**
- Lets you see: "In session X, user said 'estar' 5 times"
- Supports future features: "Show all sessions where I used word X"
- Enables analytics: "Which words do I use most often?"

---

## 2. lemmas.db - Lemmatization Data (Bundled with App)

One **small** database per language (bundled with app installation):
- `langpacks/en/lemmas.db` (English, ~2-3MB)
- `langpacks/es/lemmas.db` (Spanish, ~2-3MB)
- `langpacks/fr/lemmas.db` (French, ~2-3MB)
- `langpacks/de/lemmas.db` (German, ~2-3MB)

### Lemmas Table
Maps word forms to base forms. NO translations in this file.

```sql
CREATE TABLE lemmas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  word TEXT NOT NULL UNIQUE,        -- Inflected form: "estás", "running", "better"
  lemma TEXT NOT NULL,              -- Base form: "estar", "run", "good"
  pos TEXT                          -- Part of speech: "VERB", "NOUN", "ADJ" (optional)
);

CREATE INDEX idx_lemmas_word ON lemmas(word);
CREATE INDEX idx_lemmas_lemma ON lemmas(lemma);
```

**Example data:**
```sql
-- Spanish (langpacks/es/lemmas.db)
INSERT INTO lemmas (word, lemma, pos) VALUES ('estoy', 'estar', 'VERB');
INSERT INTO lemmas (word, lemma, pos) VALUES ('estás', 'estar', 'VERB');
INSERT INTO lemmas (word, lemma, pos) VALUES ('están', 'estar', 'VERB');
INSERT INTO lemmas (word, lemma, pos) VALUES ('corriendo', 'correr', 'VERB');

-- English (langpacks/en/lemmas.db)
INSERT INTO lemmas (word, lemma, pos) VALUES ('running', 'run', 'VERB');
INSERT INTO lemmas (word, lemma, pos) VALUES ('ran', 'run', 'VERB');
INSERT INTO lemmas (word, lemma, pos) VALUES ('better', 'good', 'ADJ');
```

---

## 3. Translation Packs (Downloaded On-Demand)

User downloads **only the language pairs they need**:
- `translations/es-en.db` - Spanish↔English bidirectional (~40MB)
- `translations/fr-en.db` - French↔English bidirectional (~38MB)
- `translations/de-en.db` - German↔English bidirectional (~35MB)
- `translations/es-fr.db` - Spanish↔French bidirectional (v0.2+)
- `translations/es-de.db` - Spanish↔German bidirectional (v0.2+)
- `translations/fr-de.db` - French↔German bidirectional (v0.2+)

### Translations Table
Bidirectional translations (both directions in same file).

```sql
CREATE TABLE translations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lemma_from TEXT NOT NULL,         -- Base form: "estar" or "run"
  lang_from TEXT NOT NULL,          -- Language code: "es" or "en"
  translation TEXT NOT NULL,        -- Translation: "to be" or "correr"
  lang_to TEXT NOT NULL,            -- Target language: "en" or "es"

  UNIQUE(lemma_from, lang_from, lang_to)
);

CREATE INDEX idx_translations_lookup ON translations(lemma_from, lang_from, lang_to);
```

**Example data (in translations/es-en.db):**
```sql
-- Spanish→English
INSERT INTO translations (lemma_from, lang_from, translation, lang_to) VALUES
  ('estar', 'es', 'to be', 'en'),
  ('correr', 'es', 'to run', 'en'),
  ('casa', 'es', 'house', 'en'),
  ('perro', 'es', 'dog', 'en');

-- English→Spanish (SAME FILE, bidirectional)
INSERT INTO translations (lemma_from, lang_from, translation, lang_to) VALUES
  ('run', 'en', 'correr', 'es'),
  ('house', 'en', 'casa', 'es'),
  ('dog', 'en', 'perro', 'es'),
  ('be', 'en', 'estar', 'es');  -- Note: "to be" lemmatized to "be"
```

### How Translations Work (Download-on-Demand)

**User settings:** `nativeLanguage = "en"`, `targetLanguage = "es"`

**First Launch:**
1. User selects Spanish (target) and English (native)
2. App downloads `translations/es-en.db` (~40MB, one-time)
3. Saved to app data directory

**Runtime:**
1. User speaks Spanish word "estás"
2. System lemmatizes using `langpacks/es/lemmas.db`: "estás" → "estar"
3. Query `translations/es-en.db`:
   ```sql
   SELECT translation FROM translations
   WHERE lemma_from = 'estar' AND lang_from = 'es' AND lang_to = 'en'
   ```
4. Display: "estar → to be"

**Why bidirectional?**
- User learning Spanish (target=es, native=en) uses es→en translations
- User learning English (target=en, native=es) uses en→es translations
- Both share the same `translations/es-en.db` file

### Future Tables (v0.2+)

```sql
-- Word frequency (for "advanced word" detection)
CREATE TABLE word_frequency (
  lemma TEXT PRIMARY KEY,
  rank INTEGER NOT NULL,            -- 1 = most common, 50000 = rare
  frequency REAL                    -- Percentage in corpus
);
```

---

## 4. config.db - User Settings

Migration-free settings using key-value storage.

```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,              -- Store as JSON string for flexibility
  updated_at INTEGER NOT NULL
);
```

**Example settings:**
```sql
INSERT INTO settings (key, value, updated_at) VALUES
  ('app.nativeLanguage', '"en"', 1234567890),
  ('app.targetLanguage', '"es"', 1234567890),
  ('app.theme', '"dark"', 1234567890),
  ('recording.autoSaveAudio', 'true', 1234567890),
  ('recording.autoDeleteAfterTranscription', 'false', 1234567890),
  ('stats.targetWPM', '150', 1234567890),
  ('ui.showNewWordHighlights', 'true', 1234567890);
```

**Settings Schema (with defaults in Rust):**
```rust
pub struct AppSettings {
    #[serde(default = "default_native_lang")]
    pub native_language: String,        // "en"

    #[serde(default = "default_target_lang")]
    pub target_language: String,        // "es"

    #[serde(default = "default_theme")]
    pub theme: String,                  // "dark" | "light"

    #[serde(default = "default_true")]
    pub auto_save_audio: bool,

    #[serde(default = "default_false")]
    pub auto_delete_after_transcription: bool,

    #[serde(default = "default_wpm")]
    pub target_wpm: i32,
}

fn default_native_lang() -> String { "en".to_string() }
fn default_target_lang() -> String { "es".to_string() }
fn default_theme() -> String { "dark".to_string() }
fn default_true() -> bool { true }
fn default_false() -> bool { false }
fn default_wpm() -> i32 { 150 }
```

---

## Database File Locations

```
~/Library/Application Support/Fluency/  (Mac)
C:\Users\<name>AppData\Roaming\Fluency\  (Windows)

├── user.db              # User sessions, vocab, stats
├── config.db            # Settings
├── audio/               # Session audio files
│   ├── <session-id-1>.wav
│   └── <session-id-2>.wav
├── langpacks/           # BUNDLED with app (~12MB total)
│   ├── es/
│   │   └── lemmas.db   # Spanish lemmatization only (2-3MB)
│   ├── en/
│   │   └── lemmas.db   # English lemmatization only (2-3MB)
│   ├── fr/
│   │   └── lemmas.db   # French lemmatization only (2-3MB)
│   └── de/
│       └── lemmas.db   # German lemmatization only (2-3MB)
└── translations/        # DOWNLOADED on-demand by user
    ├── es-en.db        # Spanish↔English bidirectional (~40MB)
    ├── fr-en.db        # French↔English bidirectional (~38MB)
    └── de-en.db        # German↔English bidirectional (~35MB)
```

---

## Data Sources for Language Packs

### Lemmatization Data (Bundled with App):
- **Universal Dependencies** - Free, 100+ languages
  - https://universaldependencies.org/
  - CoNLL-U format with word→lemma mappings
- **SpaCy** - Pre-trained models (RECOMMENDED)
  - English: `en_core_web_sm`
  - Spanish: `es_core_news_sm`
  - French: `fr_core_news_sm`
  - German: `de_core_news_sm`
  - Export lemma rules to SQLite
- **FreeLing** - Open-source NLP toolkit
  - Backup option if SpaCy doesn't cover a language

### Translation Data (Downloaded On-Demand):

**Primary Source: Kaikki.org / Wiktextract** (RECOMMENDED)
- **Free Wiktionary extracts** in JSONL format
- **Coverage:** 100+ languages with English glosses
- **License:** Creative Commons (Wiktionary data)
- **URL:** https://kaikki.org/dictionary/rawdata.html
- **Format:** One JSON object per line
  ```json
  {"word": "estar", "pos": "verb", "lang": "Spanish", "senses": [{"glosses": ["to be"]}]}
  ```
- **Available dictionaries:**
  - Spanish→English: ~200k entries (~40MB compressed)
  - French→English: ~180k entries (~38MB compressed)
  - German→English: ~150k entries (~35MB compressed)
  - English→Spanish/French/German: Available via English Wiktionary

**Backup Sources:**
- **FreeDict** - TEI XML format, 140+ dictionaries
  - https://freedict.org/downloads/
- **Open Multilingual WordNet** - For additional coverage
- **Tatoeba** - Example sentences (v0.2+)

### Build Process

**Step 1: Build Lemmatization Databases (One-Time, Dev)**
```bash
# scripts/build_lemmas.py
python scripts/build_lemmas.py --language es --output langpacks/es/lemmas.db
python scripts/build_lemmas.py --language en --output langpacks/en/lemmas.db
python scripts/build_lemmas.py --language fr --output langpacks/fr/lemmas.db
python scripts/build_lemmas.py --language de --output langpacks/de/lemmas.db
```

**Step 2: Build Translation Packs (One-Time, Dev)**
```bash
# scripts/build_translations.py
python scripts/build_translations.py --pair es-en --output translations/es-en.db
python scripts/build_translations.py --pair fr-en --output translations/fr-en.db
python scripts/build_translations.py --pair de-en --output translations/de-en.db
```

**Step 3: Bundle & Host**
- Lemma databases: Bundle with Tauri app (in `tauri.conf.json` resources)
- Translation packs: Upload to GitHub Releases or CDN for download

---

## Performance Expectations

For a 500-word session:
- Tokenization: < 1ms
- Lemmatization: ~500ms (1ms × 500 database lookups)
- New word detection: ~10ms (single query)
- Stats calculation: < 10ms
- **Total processing: ~1 second**

All processing is 100% local and offline.

---

## User Flow: Download-on-Demand

### First Launch
1. **Language selection screen:**
   - "What language are you learning?" → User picks Spanish
   - "What's your native language?" → User picks English
2. **Download translation pack:**
   - App downloads `translations/es-en.db` from GitHub Releases/CDN
   - Progress indicator: "Downloading Spanish-English pack... 28.5 MB / 43.2 MB (65%)"
   - One-time download, stored in app data directory
3. **Ready to use!** User can now record Spanish sessions

### Settings: Manage Language Packs
```
Downloaded Language Packs:
✓ Spanish-English        43.2 MB  [Remove]
+ Add another language pair

Available Downloads:
○ French-English         38.1 MB  [Add]
○ German-English         35.7 MB  [Add]
```

### Tauri Commands for Download Management
```rust
#[tauri::command]
async fn download_translation_pack(lang_from: String, lang_to: String) -> Result<(), String>

#[tauri::command]
async fn get_installed_packs() -> Result<Vec<String>, String>

#[tauri::command]
async fn remove_translation_pack(pack_name: String) -> Result<(), String>
```

---

## Open Questions

1. ✅ **Translations:** Solved - Use Kaikki.org JSONL data
2. **Multiple native languages:** Support trilingual users? (v0.2+)
3. **Missing translations:** How to handle words without translations in database?
   - Display "(no translation)" or lemma itself as fallback
4. **Example sentences:** Add to vocab table later? (mentioned in PRD - v0.2+)
5. **Hosting:** GitHub Releases (free) vs Cloudflare R2 (cheap) for translation packs?

---

## Decisions Made

✅ **Path for audio files** (not BLOBs in database)
✅ **Example sentences** - Add in v0.2
✅ **Analytics** - Calculate on-demand (no pre-aggregation for MVP)
✅ **Forms spoken** - Track as JSON array in vocab table
✅ **Junction table** - Use session_words for many-to-many relationship
✅ **Translation architecture** - Download-on-demand, separate from lemmatization
✅ **Lemmatization bundled** - Small (~12MB total for 4 languages) with app
✅ **Translations downloaded** - User only gets what they need (~40MB per pair)
✅ **Bidirectional packs** - es-en.db serves both Spanish→English and English→Spanish
✅ **Data source** - Kaikki.org JSONL for translations, SpaCy for lemmatization

---

## MVP Language Support

### Bundled Lemmatization (All Languages):
- ✅ English (en)
- ✅ Spanish (es)
- ✅ French (fr)
- ✅ German (de)

### Available Translation Packs (MVP):
- ✅ Spanish↔English (es-en.db)
- ✅ French↔English (fr-en.db)
- ✅ German↔English (de-en.db)

### Post-MVP (v0.2+):
- Spanish↔French (es-fr.db)
- Spanish↔German (es-de.db)
- French↔German (fr-de.db)
- English↔Portuguese, Italian, etc.

---

**Status:** Schema finalized, ready to build language packs
**Next Steps:** Create build scripts to generate databases from Kaikki/SpaCy data
