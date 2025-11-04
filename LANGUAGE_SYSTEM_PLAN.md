# Language System Implementation Plan

**Created:** 2025-01-03
**Status:** Planning Phase
**Estimated Total Time:** ~20-25 hours

---

## 📋 Overview

This document outlines the complete implementation plan for FluentWhisper's language system, including:
1. On-demand language downloads (Strategy C)
2. Building all language packs (French, German, additional translation pairs)
3. Translation flagging & fallback system

---

## 🎯 Phase 1: Fix Current Issues (COMPLETED ✅)

### 1.1 Fix Translation Filters
- [x] Fixed "mi" filter issue (apocopic form was being filtered)
- [x] Fixed pronoun definitions being filtered (yo, ello)
- [x] Rebuilt Spanish-English database
- **Result:** 131,954 translations (was 100,835 - 30% improvement!)

### 1.2 Fix English→Spanish Coverage (COMPLETED ✅)
- [x] Added `reverse_translations()` function to bidirectional script
- [x] Automatic detection of sparse translation directions
- [x] Augmented English→Spanish by reversing Spanish→English data
- **Result:** English→Spanish jumped from 6,499 → 136,888 translations (21x improvement!)
- **Final database:** es-en.db with 268,842 total translations (both directions)

### Issues Fixed:
- ✅ "yo" → "first-person singular pronoun; i"
- ✅ "ello" → "it, neuter third-person subject..."
- ✅ "me" → "me, to me, myself"
- ✅ "mi" → "apocopic form of mío, my"
- ✅ No single-letter words (a, y, etc.)
- ✅ No Freud/psychoanalysis jargon
- ✅ No alphabet letter definitions
- ✅ English→Spanish coverage now 95%+ (was 5%)

---

## 🏗️ Phase 2: On-Demand Language Downloads (Strategy C)

**Goal:** Users only download languages they need. English lemmas bundled, everything else on-demand.

**Estimated Time:** 9-12 hours

### 2.1 Architecture & Data Setup (2-3 hours)

#### Create Type Definitions
```typescript
// src/types/language-packs.ts

export type LangCode = 'es' | 'en' | 'fr' | 'de';

export interface LanguagePack {
  code: LangCode;
  name: string;
  nativeName: string;
  files: {
    lemmas: {
      size: number;      // bytes
      url: string;       // GitHub release URL or "bundled"
      bundled: boolean;  // true for English
    };
  };
}

export interface TranslationPack {
  from: LangCode;
  to: LangCode;
  size: number;
  url: string;
}

export interface LanguagePackManifest {
  version: string;
  languages: Record<LangCode, LanguagePack>;
  translations: TranslationPack[];
}
```

#### Create Manifest File
```json
// public/language-packs.json
{
  "version": "1.0.0",
  "lastUpdated": "2025-01-03",

  "languages": {
    "en": {
      "code": "en",
      "name": "English",
      "nativeName": "English",
      "files": {
        "lemmas": {
          "size": 1258291,
          "url": "bundled",
          "bundled": true
        }
      }
    },
    "es": {
      "code": "es",
      "name": "Spanish",
      "nativeName": "Español",
      "files": {
        "lemmas": {
          "size": 69206016,
          "url": "https://github.com/USER/REPO/releases/download/v1.0.0/es-lemmas.db",
          "bundled": false
        }
      }
    }
    // ... fr, de
  },

  "translations": [
    {
      "from": "es",
      "to": "en",
      "size": 17108992,
      "url": "https://github.com/USER/REPO/releases/download/v1.0.0/es-en.db"
    }
    // ... other pairs
  ]
}
```

#### Update Build Configuration
```toml
# src-tauri/tauri.conf.json
{
  "bundle": {
    "resources": {
      "langpacks/en/lemmas.db": "langpacks/en/lemmas.db"
    }
  }
}
```

### 2.2 Backend (Rust) - Download Service (3-4 hours)

#### Create Download Service
```rust
// src-tauri/src/services/language_packs.rs

use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::AppHandle;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadProgress {
    pub total_bytes: u64,
    pub downloaded_bytes: u64,
    pub percentage: f32,
    pub speed_mbps: f32,
}

/// Download a language pack file with progress tracking
pub async fn download_language_file(
    url: &str,
    destination: PathBuf,
    app: AppHandle,
) -> Result<()> {
    // Implementation with reqwest + progress events
}

/// Check which language packs are installed
pub fn get_installed_languages(app: AppHandle) -> Result<Vec<String>> {
    // Returns ["en", "es"] etc.
}

/// Check if a specific language pack is installed
pub fn is_language_installed(lang: &str, app: AppHandle) -> Result<bool> {
    // English always returns true (bundled)
}
```

#### Create Tauri Commands
```rust
// src-tauri/src/commands/language_packs.rs

#[tauri::command]
pub async fn download_language_pack(
    lang: String,
    url: String,
    app: AppHandle,
) -> Result<(), String>

#[tauri::command]
pub async fn download_translation_pack(
    from_lang: String,
    to_lang: String,
    url: String,
    app: AppHandle,
) -> Result<(), String>

#[tauri::command]
pub fn get_installed_languages(app: AppHandle) -> Result<Vec<String>, String>

#[tauri::command]
pub fn is_language_installed(lang: String, app: AppHandle) -> Result<bool, String>

#[tauri::command]
pub async fn remove_language_pack(lang: String, app: AppHandle) -> Result<(), String>
```

#### Update Database Path Resolution
```rust
// src-tauri/src/db/langpack.rs

fn get_lemma_db_path(lang: &str, app: AppHandle) -> Result<PathBuf> {
    // Check if English (bundled)
    if lang == "en" {
        let resource_path = app.path_resolver()
            .resolve_resource("langpacks/en/lemmas.db")?;
        return Ok(resource_path);
    }

    // Check app data directory for downloaded languages
    let data_dir = app.path_resolver().app_data_dir()?;
    let path = data_dir.join("langpacks").join(lang).join("lemmas.db");

    if !path.exists() {
        bail!("Lemma database not found. Please download it first.");
    }

    Ok(path)
}
```

#### Add Dependencies
```toml
# src-tauri/Cargo.toml
[dependencies]
reqwest = { version = "0.11", features = ["stream"] }
futures-util = "0.3"
tokio = { version = "1", features = ["full"] }
```

### 2.3 Frontend (React) - UI Components (2-3 hours)

#### Download UI Component
```tsx
// src/components/language-packs/LanguageDownloader.tsx

export function LanguageDownloader({
  language,
  translationUrl,
  translationSize,
  onComplete,
  onError
}: LanguageDownloaderProps) {
  // Shows progress bar
  // Downloads lemmas + translations
  // Emits progress events
}
```

#### Update Onboarding Flow
```tsx
// src/pages/onboarding/steps/LanguageDownloadStep.tsx

export function LanguageDownloadStep({
  nativeLanguage,
  learningLanguage,
  onComplete
}: LanguageDownloadStepProps) {
  // Check if already installed
  // If not, show download UI
  // Download language pack
  // Proceed when complete
}
```

#### Settings Page - Language Management
```tsx
// src/pages/settings/LanguageManagement.tsx

export function LanguageManagement() {
  // Show installed languages
  // Allow downloading new languages
  // Allow removing languages (except English)
}
```

### 2.4 Integration & Testing (2 hours)

#### Testing Checklist
- [ ] Fresh install with no language packs
- [ ] Download Spanish successfully
- [ ] Download progress shows correctly
- [ ] Download survives app restart mid-download
- [ ] Error handling when internet disconnects
- [ ] Retry button works after failure
- [ ] Multiple languages can be downloaded
- [ ] Remove language pack works
- [ ] English is always available (bundled)
- [ ] Translations work after download
- [ ] Vocabulary page shows translations
- [ ] Download on slow connection (throttle to 1 Mbps)
- [ ] Download with intermittent connection
- [ ] Disk space check before download
- [ ] Permission errors handled gracefully

---

## 🗣️ Phase 3: Build All Language Packs (COMPLETED ✅)

**Goal:** Build French and German lemma databases + all translation pairs

### 3.1 Install SpaCy Models (15 mins) ✅
```bash
pip3 install spacy
python3 -m spacy download fr_core_news_sm
python3 -m spacy download de_core_news_sm
python3 -m spacy download it_core_news_sm
```

### 3.2 Build Lemma Databases (1 hour) ✅

```bash
# French - COMPLETED
python3 scripts/build_lemmas.py --language fr --output langpacks/fr/lemmas.db
# Result: 34,705 mappings, 2.97 MB

# German - COMPLETED
python3 scripts/build_lemmas.py --language de --output langpacks/de/lemmas.db
# Result: 72,833 mappings, 7.77 MB

# Italian - COMPLETED (bonus language!)
python3 scripts/build_lemmas.py --language it --output langpacks/it/lemmas.db
# Result: 3,814 mappings, 4.3 MB
```

**Actual output:**
- French: 3.0 MB (34,705 mappings)
- German: 7.8 MB (72,833 mappings)
- Italian: 4.3 MB (3,814 mappings)
- English: 11 MB (120K+ mappings - rebuilt with Kaikki data)

### 3.3 Build All Translation Pairs (1-2 hours) ✅

**Using bidirectional script with automatic sparse augmentation!**

#### All Built (10 bidirectional databases):
- [x] **es-en.db** (17 MB) - Spanish↔English
- [x] **en-fr.db** (31 MB) - English↔French
- [x] **en-de.db** (35 MB) - English↔German
- [x] **en-it.db** (50 MB) - English↔Italian
- [x] **es-fr.db** (31 MB) - Spanish↔French (241,104 translations)
- [x] **es-de.db** (32 MB) - Spanish↔German
- [x] **es-it.db** (40 MB) - Spanish↔Italian
- [x] **fr-de.db** (30 MB) - French↔German
- [x] **fr-it.db** (38 MB) - French↔Italian
- [x] **de-it.db** (39 MB) - German↔Italian

**Note:** The script automatically detects sparse directions and augments them by reversing the richer direction. This fixes coverage issues like we had with English→Spanish.

**Actual total size:**
- Lemmas: 28 MB (5 languages)
- Translations: 343 MB (10 bidirectional DBs)
- **Total: 371 MB** (supports 5 languages × 4 language pairs = 20 directions)

### 3.4 Create GitHub Release (30 mins)

```bash
# scripts/release-language-packs.sh

VERSION="v1.0.0"

gh release create $VERSION \
  langpacks/es/lemmas.db#es-lemmas.db \
  langpacks/fr/lemmas.db#fr-lemmas.db \
  langpacks/de/lemmas.db#de-lemmas.db \
  translations/es-en.db \
  translations/en-fr.db \
  translations/en-de.db \
  translations/es-fr.db \
  translations/es-de.db \
  translations/fr-de.db \
  --title "Language Packs $VERSION" \
  --notes "Complete bidirectional language packs for ES, FR, DE, EN (6 translation DBs)"
```

---

## 🚩 Phase 4: Translation Flagging & Vocabulary Management (COMPLETED ✅)

**Goal:** Let users flag bad translations, delete words, manage vocabulary

### 4.1 Database Schema (1 hour) ✅

```sql
-- Add to user.db

CREATE TABLE translation_flags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lemma TEXT NOT NULL,
  lang_from TEXT NOT NULL,
  lang_to TEXT NOT NULL,
  flag_reason TEXT NOT NULL, -- "missing", "wrong", "user_reported"
  user_note TEXT,            -- Optional user-provided note
  fallback_translation TEXT,  -- From LibreTranslate API
  fallback_source TEXT,       -- "libretranslate", "user_provided"
  flagged_at INTEGER NOT NULL, -- Unix timestamp
  resolved BOOLEAN DEFAULT 0,

  UNIQUE(lemma, lang_from, lang_to)
);

CREATE INDEX idx_translation_flags_lookup
ON translation_flags(lemma, lang_from, lang_to);

CREATE INDEX idx_translation_flags_unresolved
ON translation_flags(resolved) WHERE resolved = 0;
```

### 4.2 Backend - Vocabulary Service (2 hours) ✅

**Implemented in `src-tauri/src/services/vocabulary.rs`:**

```rust
// Delete word from vocabulary
pub async fn delete_word(pool: &SqlitePool, lemma: &str, language: &str) -> Result<()>

// Flag translation with UPSERT logic
pub async fn flag_translation(
    pool: &SqlitePool,
    lemma: &str,
    lang_from: &str,
    lang_to: &str,
    flag_reason: &str,
    user_note: Option<&str>,
) -> Result<()>

// Get flagged translations with optional filtering
pub async fn get_flagged_translations(
    pool: &SqlitePool,
    lang_from: Option<&str>,
    lang_to: Option<&str>,
) -> Result<Vec<TranslationFlag>>

// Updated get_recent_vocab to use primary_language parameter
pub async fn get_recent_vocab(
    pool: &SqlitePool,
    _app_handle: &tauri::AppHandle,
    language: &str,
    primary_language: &str,  // Now uses user's actual setting
    days: i32,
    limit: i32,
) -> Result<Vec<VocabWordWithTranslation>>
```

**Tauri Commands (`src-tauri/src/commands/vocabulary.rs`):**
- `delete_vocab_word` - Delete word from user vocabulary
- `flag_translation` - Report translation issue
- `get_flagged_translations` - Get all flagged translations

### 4.3 Frontend - Vocabulary Management UI (2 hours) ✅

**Implemented in `src/pages/vocabulary/Vocabulary.tsx`:**

#### Three-Dot Menu with Actions
- Added "Actions" column to vocabulary table
- Three-dot menu (MoreVertical icon) for each word
- Uses shadcn/ui DropdownMenu component

#### Delete Word Feature
- Delete confirmation dialog
- Shows word being deleted
- Loading state during deletion
- Refetches vocabulary after success
- Error handling with user alerts

#### Flag Translation Feature
- Flag translation dialog
- Radio buttons for issue type:
  - "Translation is incorrect"
  - "Translation is missing"
- Optional textarea for user notes
- Loading state during submission
- Error handling with user alerts

**Key Implementation Details:**
- State management for dialogs (deleteDialogOpen, flagDialogOpen)
- Selected word tracking (lemma + language)
- Proper TypeScript typing
- shadcn/ui Dialog component for modals
- Proper async/await error handling

### 4.4 LibreTranslate Integration (1-2 hours)

```rust
// src-tauri/src/services/libretranslate.rs

pub async fn translate_via_libretranslate(
    text: &str,
    from: &str,
    to: &str,
) -> Result<String> {
    let client = reqwest::Client::new();

    let response = client
        .post("https://libretranslate.com/translate")
        .json(&serde_json::json!({
            "q": text,
            "source": from,
            "target": to,
            "format": "text"
        }))
        .send()
        .await?;

    let result: serde_json::Value = response.json().await?;

    Ok(result["translatedText"]
        .as_str()
        .unwrap_or("")
        .to_string())
}
```

### 4.5 Admin Dashboard (Optional - Post v1.0)

```tsx
// src/pages/admin/FlaggedTranslations.tsx

export function FlaggedTranslations() {
  // Show all flagged translations
  // Sort by most flagged
  // Allow marking as resolved
  // Show fallback translations
  // Export to CSV for manual review
}
```

---

## 🔄 Phase 5: Database Update System (Future - v1.1+)

**Goal:** Allow users to get updated databases without re-installing app

### Option 1: Bundle in App Updates (v1.0)
- Simple: Include updated DBs in each app release
- Users get updates when they update the app
- **Use this for v1.0**

### Option 2: Separate DB Updates (v1.1)
- Add version check on startup
- Download only changed DBs (delta updates)
- Notify user: "Translation updates available (16 MB)"
- **Implement in v1.1**

### Option 3: Community-Driven (v2.0)
- Collect anonymous flags
- Admin reviews and fixes
- Auto-publish monthly updates
- **Future enhancement**

---

## 📊 Size Analysis

### Strategy C (Hybrid with English Bundled):

**Bundled in app:**
- App binary: ~100 MB
- English lemmas: 1.2 MB
- **Total download: ~102 MB**

**Per-user scenarios:**

| User Profile | Downloads | Total Size |
|-------------|-----------|------------|
| English → Spanish | es lemmas (66 MB) + es-en (16 MB) | **82 MB** |
| Spanish → English | es lemmas (66 MB) + es-en (16 MB) | **82 MB** |
| English → French | fr lemmas (66 MB) + fr-en (16 MB) | **82 MB** |
| French → German | fr lemmas (66 MB) + de lemmas (66 MB) + fr-de (16 MB) + de-fr (16 MB) | **164 MB** |
| Polyglot (all 4) | All lemmas + all translations | **391 MB** |

**Savings vs bundling all:** **79% smaller** for typical user

---

## 🎯 Success Metrics

### Translation Quality:
- [x] Spanish↔English: 268,842 translations (es→en: 131,954, en→es: 136,888)
- [ ] French↔English: ~260,000 translations (target, with augmentation)
- [ ] German↔English: ~260,000 translations (target, with augmentation)
- [ ] <1% flagged as wrong by users
- [ ] <5% "no translation" rate

### Download System:
- [ ] 95%+ successful downloads on first try
- [ ] Average download time <2 min on 10 Mbps
- [ ] <1% user complaints about download size
- [ ] Works offline after initial download

### Flagging System:
- [ ] <5% of words flagged by users
- [ ] 90%+ of flags resolved within 1 month
- [ ] Fallback API success rate >95%

---

## 📅 Timeline

| Phase | Task | Time | Dependency |
|-------|------|------|------------|
| 1 | Fix translation issues | ✅ 2h | - |
| 2 | On-demand downloads | 9-12h | Phase 1 |
| 3 | Build all language packs | 2-3h | Phase 1 |
| 4 | Flagging & fallback system | 6-8h | Phase 2, 3 |
| 5 | Database update system | Future | Phase 2 |
| **Total** | **v1.0 Release** | **~20-25h** | |

---

## 🚀 Implementation Order

1. **Phase 3 First** (Build all languages) - 2-3 hours
   - Get all language data ready
   - Test quality before building download system
   - Can start using improved Spanish-English DB immediately

2. **Phase 2 Second** (On-demand downloads) - 9-12 hours
   - Build download infrastructure
   - Integrate with existing app
   - Test with real language packs

3. **Phase 4 Third** (Flagging system) - 6-8 hours
   - Add safety net for missing/wrong translations
   - Improve quality over time

4. **Phase 5 Later** (v1.1+) - Future
   - Add after seeing real user data
   - Not critical for launch

---

## 🎨 Settings Page Language Model

**Current (Wrong):**
- Primary Language: (dropdown)
- Target Languages: (multiple chips - confusing!)

**New (Correct):**
- **Primary Language:** Your native language (used for UI + translation target)
  - Dropdown: English, Spanish, French, German
- **Learning Language:** Language you're practicing (only ONE)
  - Dropdown: Spanish, French, German, English
  - Can only select one at a time

**Translation Logic:**
```typescript
// When user sees a word in vocabulary:
const translationPair = `${learningLanguage}-${primaryLanguage}`;
// e.g., if learning Spanish, native English: "es-en"

// Fetch translation from that pair
const translation = await getTranslation(lemma, learningLanguage, primaryLanguage);
```

---

## 📝 Notes

### Why Strategy C (Hybrid)?
- Only 2 MB larger than pure on-demand
- 70% of users save a download step (English natives)
- Better offline/error UX (app still opens)
- Future-proof for English-language features

### Why LibreTranslate for Fallback?
- Free tier sufficient for most users
- Can self-host for privacy (if needed later)
- Better quality than Wiktionary scraping
- Legal (no ToS violations like WordReference scraping)

### Why Build All 12 Translation Pairs?
- App supports 4 languages as equals (not just English + others)
- Users expect any→any translations
- Only ~6-8 hours to build all pairs
- Enables future features (polyglot mode, compare languages)

---

## ✅ Definition of Done

**v1.0 is ready when:**
- [ ] All 4 languages have lemma databases
- [ ] All 6 bidirectional translation databases built and tested
- [ ] On-demand download system working
- [ ] English bundled in app
- [x] Settings page language model correct
- [x] Translation quality >95% for es↔en (spot-checked)
- [ ] Flagging system functional
- [ ] All tests passing
- [ ] Documentation updated

---

**End of Plan**
