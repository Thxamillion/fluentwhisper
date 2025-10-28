# FluentWhisper Development Roadmap

## Current Status

✅ **Completed:**
- Spanish→English translation database (100k entries, 10 MB)
- Spanish lemmatization database (677k forms, 66 MB)
- English lemmatization database (15k forms, 1.2 MB)
- Rust backend services (lemmatization, translation)
- Tauri commands exposed to frontend
- All tests passing (9/9)

---

## Phase 1: Frontend Integration (Days 1-2)

### 1. TypeScript Service Layer ⭐ IN PROGRESS
**Goal:** Type-safe wrappers around Tauri commands

**Files to create:**
```
src/services/
├── langpack/
│   ├── lemmatization.ts    # getLemma, lemmatizeBatch
│   ├── translation.ts      # getTranslation, translateBatch
│   └── types.ts            # WordResult, LangCode types
```

**Functions:**
```typescript
export async function getLemma(word: string, lang: string): Promise<string | null>
export async function lemmatizeBatch(words: string[], lang: string): Promise<Array<[string, string]>>
export async function getTranslation(lemma: string, fromLang: string, toLang: string): Promise<string | null>
export async function processWords(words: string[], lang: string, targetLang: string): Promise<WordResult[]>
```

**Why first?** Following three-layer architecture - service layer before hooks/UI

---

### 2. React Query Hooks
**Goal:** Reactive data layer with caching

**Files to create:**
```
src/hooks/
├── useLemmatization.ts
├── useTranslation.ts
└── useProcessWords.ts
```

**Example:**
```typescript
export function useProcessWords(words: string[], lang: string, targetLang: string) {
  return useQuery({
    queryKey: ['processWords', words, lang, targetLang],
    queryFn: () => processWords(words, lang, targetLang),
  })
}
```

**Why?** Wraps services with caching/reactivity per architecture

---

### 3. Simple Test UI
**Goal:** Validate full stack works end-to-end

**Component:**
```tsx
// src/pages/TestLangpack.tsx
Input: "estoy corriendo"
Button: "Process Words"
Output:
  - estoy → estar → "to be"
  - corriendo → correr → "to run"
```

**Why?** Validate before building complex features

---

## Phase 2: Text Processing (Day 3)

### 4. Tokenization Service
**Goal:** Convert transcript to word array

```typescript
// src/services/text/tokenization.ts
export function tokenize(text: string): string[]
// "Estoy corriendo rápido" → ["estoy", "corriendo", "rápido"]
```

**Features:**
- Remove punctuation
- Handle contractions
- Lowercase normalization
- Language-specific rules

**Why?** Bridge between transcription and lemmatization

---

### 5. Vocabulary Display Component
**Goal:** Core UI for discovered words

```tsx
// src/components/VocabularyCard.tsx
<VocabularyCard
  word="estoy"
  lemma="estar"
  translation="to be"
  usageCount={5}
  firstSeen={timestamp}
/>
```

**Features:**
- Show word, lemma, translation
- Display usage statistics
- Click to see example sentences (future)

**Why?** Core UI pattern for vocabulary tracking

---

## Phase 3: Persistence (Day 4)

### 6. User Database Schema
**Goal:** Local SQLite database for user progress

**Implementation:**
```rust
// src-tauri/src/db/user.rs
- Create vocab table
- Create sessions table
- Create session_words table
```

**Schema:** Per `database-schema.md`

**Why?** Store vocabulary progress locally

---

### 7. Rust Vocabulary Service
**Goal:** Persist discovered words

```rust
// src-tauri/src/services/vocabulary.rs
pub async fn record_word(lemma, language, form_spoken, session_id) -> Result<()>
pub async fn get_user_vocab(language) -> Result<Vec<VocabEntry>>
pub async fn update_word_usage(lemma, language) -> Result<()>
```

**Tauri Commands:**
```rust
#[tauri::command]
async fn record_vocabulary(...)
#[tauri::command]
async fn get_vocabulary(lang: String)
```

**Why?** Persist discovered words to user.db

---

## Phase 4: Audio + Whisper (Days 5-7)

### 8. Whisper Integration
**Research:**
- whisper.cpp (C++ bindings, fast)
- faster-whisper (Python bindings, accurate)
- whisper-rs (Pure Rust, newest)

**Implementation:**
```rust
// src-tauri/src/services/transcription.rs
pub async fn transcribe_audio(audio_path: &str, lang: &str) -> Result<String>
```

**Tauri Command:**
```rust
#[tauri::command]
async fn transcribe(audio_path: String, language: String) -> Result<String, String>
```

**Why?** Core transcription capability

---

### 9. Complete Pipeline
**Goal:** End-to-end user flow

**Pipeline:**
```
1. User clicks Record
   ↓
2. Capture Audio → save WAV
   ↓
3. Whisper → Transcript
   ↓
4. Tokenize → Words array
   ↓
5. Lemmatize → Base forms
   ↓
6. Translate → Meanings
   ↓
7. Store Vocab → user.db
   ↓
8. Display session stats + new words
```

**Why?** Full MVP user experience

---

## Code Quality Standards

Following `CLAUDE.md`:

- ✅ **Three-layer architecture:** Service → Query → UI
- ✅ **Error handling:** Try/catch at boundaries only (Tauri, DB, Whisper)
- ✅ **Pure functions:** Service layer has no UI dependencies
- ✅ **TypeScript strict:** No `any` types
- ✅ **Documentation:** JSDoc for complex functions
- ✅ **Testing:** Unit tests for services, integration tests for commands

---

## Future Enhancements (v0.3+)

- **Analytics Dashboard:** WPM trends, vocab growth charts
- **Vocabulary Review:** Flashcards, spaced repetition
- **Multi-language Support:** French, German language packs
- **Import Features:** YouTube videos, articles for reading practice
- **Speech Shadowing:** Listen + repeat mode

---

## Success Metrics (MVP)

- ✅ Record 1-minute Spanish session
- ✅ Get accurate transcription
- ✅ Discover 10-20 new words
- ✅ See translations for all words
- ✅ Track vocabulary growth over time
- ✅ All data stored locally (100% offline)

---

**Status:** Phase 1, Step 1 - TypeScript Service Layer (IN PROGRESS)
