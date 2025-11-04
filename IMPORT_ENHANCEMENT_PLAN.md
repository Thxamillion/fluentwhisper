# Text Library Import Enhancement Plan

## Overview
Enhance FluentWhisper's text library with multi-format import, audio association, text chunking, and vocabulary extraction.

## Features

### 1. Multi-Format Text Import
Support importing from multiple sources beyond manual entry and .txt files.

#### New Formats
- **PDF** (.pdf) - Extract text from PDF documents
- **EPUB** (.epub) - E-books for language learners
- **Subtitles** (.srt, .vtt) - Practice from video transcripts
- **Web URLs** - Import articles and blog posts

#### Implementation

##### Rust Dependencies (Cargo.toml)
```toml
[dependencies]
# PDF parsing
pdf-extract = "0.7"  # Simple text extraction from PDFs

# EPUB parsing
epub = "2.0"  # Read EPUB files

# Web scraping
reqwest = { version = "0.11", features = ["blocking"] }
scraper = "0.17"  # HTML parsing

# Subtitle parsing - manual implementation
```

##### Backend Service Structure
```
src-tauri/src/services/text_import/
├── mod.rs                    # Module exports
├── pdf_parser.rs             # PDF text extraction
├── epub_parser.rs            # EPUB text extraction
├── subtitle_parser.rs        # SRT/VTT parsing
├── web_scraper.rs            # URL content extraction
└── file_handler.rs           # Common file utilities
```

##### Updated SourceType
```rust
// Current: 'manual' | 'text_file'
// New:
pub enum SourceType {
    Manual,
    TextFile,
    Pdf,
    Epub,
    Subtitle,
    WebUrl,
}
```

---

### 2. Audio File Association
Link audio files to text library items for shadowing practice.

#### Schema Changes

##### Database Migration
```sql
-- Add new columns to text_library table
ALTER TABLE text_library ADD COLUMN audio_path TEXT;
ALTER TABLE text_library ADD COLUMN audio_duration INTEGER; -- in seconds
```

##### Updated TextLibraryItem
```rust
pub struct TextLibraryItem {
    // ... existing fields ...
    pub audio_path: Option<String>,      // Path to audio file in app data
    pub audio_duration: Option<i64>,     // Duration in seconds
}
```

#### Audio File Handling

##### Storage Location
```
~/Library/Application Support/com.fluentwhisper.app/
└── text_library_audio/
    ├── {text_id}_original.{ext}  # Original uploaded file
    └── {text_id}.mp3             # Normalized format (future)
```

##### Supported Formats
- .mp3, .m4a, .wav, .ogg, .opus, .aac, .flac, .webm

##### Commands
```rust
// Upload and associate audio with text
upload_text_audio(text_id: String, file_path: String) -> Result<AudioInfo>

// Remove audio from text
remove_text_audio(text_id: String) -> Result<()>

// Get audio info
get_text_audio_info(text_id: String) -> Result<Option<AudioInfo>>
```

---

### 3. Text Chunking/Segmentation
Break long texts into manageable practice segments.

#### Chunking Strategies

1. **Paragraph-based** - Natural breaks at paragraph boundaries
2. **Time-based** - Chunks targeting specific practice duration (e.g., 2 min @ 150 WPM = ~300 words)
3. **Custom** - User-defined chunk sizes

#### Schema

##### TextChunk Type
```rust
pub struct TextChunk {
    pub id: String,              // UUID
    pub text_library_id: String, // Parent text
    pub chunk_index: i32,        // Order (0-based)
    pub content: String,         // Chunk text
    pub start_offset: i32,       // Character offset in original
    pub end_offset: i32,         // Character offset in original
    pub word_count: i32,         // Words in chunk
    pub estimated_duration: i32, // Seconds @ 150 WPM
}
```

##### Database Table
```sql
CREATE TABLE text_chunks (
    id TEXT PRIMARY KEY,
    text_library_id TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    start_offset INTEGER NOT NULL,
    end_offset INTEGER NOT NULL,
    word_count INTEGER NOT NULL,
    estimated_duration INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (text_library_id) REFERENCES text_library(id) ON DELETE CASCADE
);

CREATE INDEX idx_text_chunks_library_id ON text_chunks(text_library_id);
CREATE INDEX idx_text_chunks_index ON text_chunks(chunk_index);
```

#### Commands
```rust
// Generate chunks for a text
chunk_text(text_id: String, strategy: ChunkStrategy) -> Result<Vec<TextChunk>>

// Get chunks for a text
get_text_chunks(text_id: String) -> Result<Vec<TextChunk>>

// Delete chunks
delete_text_chunks(text_id: String) -> Result<()>
```

#### UI Flow
1. User imports long text (e.g., article, book chapter)
2. Option to "Prepare for Practice" → chunks text automatically
3. Practice mode: Navigate chunk-by-chunk
4. Track progress per chunk (WPM, fluency)

---

### 4. Vocabulary Extraction
Identify new/difficult words before practicing.

#### Pre-Practice Vocab Analysis

##### Service Function
```rust
/// Extract and analyze vocabulary from text
pub async fn analyze_text_vocabulary(
    pool: &SqlitePool,
    text_content: &str,
    language: &str,
) -> Result<VocabularyAnalysis> {
    // 1. Tokenize text (split into words)
    // 2. Lemmatize each word (get base form)
    // 3. Query vocab table to check which are NEW
    // 4. Return analysis
}

pub struct VocabularyAnalysis {
    pub total_unique_words: i32,
    pub new_words: Vec<String>,           // Words NOT in user's vocab
    pub known_words: Vec<String>,         // Words already in vocab
    pub difficulty_estimate: String,      // beginner/intermediate/advanced
}
```

##### Integration Points

**At Import Time:**
- Automatically analyze vocabulary
- Set difficulty_level based on % new words
  - <20% new → beginner
  - 20-50% new → intermediate
  - >50% new → advanced

**Pre-Practice:**
- Show vocabulary preview modal
- List new words user will encounter
- Option to study/review before reading aloud

##### UI Components
```typescript
// Show before starting practice session
<VocabPreviewModal
  textId={textId}
  newWords={["hablar", "pronunciación", "fluidez"]}
  onStartPractice={() => navigate(`/read-aloud/${textId}`)}
/>
```

---

## Implementation Phases

### Phase 1: Multi-Format Import (Core)
**Priority:** HIGH
**Duration:** ~3-4 days

**Tasks:**
1. Add Rust dependencies (pdf-extract, epub, reqwest, scraper)
2. Implement parsers:
   - PDF parser
   - EPUB parser
   - Subtitle parser (.srt/.vtt)
   - Web scraper
3. Update SourceType enum
4. Add Tauri commands for each import type
5. Update Import UI with format picker
6. Add file validation and error handling

**Success Criteria:**
- Can import .txt, .pdf, .epub, .srt, .vtt files
- Can import from web URLs
- Errors handled gracefully with user feedback

---

### Phase 2: Audio Association
**Priority:** HIGH
**Duration:** ~2-3 days

**Tasks:**
1. Database migration (add audio_path, audio_duration columns)
2. Implement audio file storage service
3. Add audio upload/remove commands
4. Update Import UI for audio upload
5. Add audio player to Library cards
6. Add audio sync to read-aloud practice

**Success Criteria:**
- Can upload audio files with text
- Audio persists in app data directory
- Can play audio from Library page
- Audio syncs with text during practice (future enhancement)

---

### Phase 3: Text Chunking
**Priority:** MEDIUM
**Duration:** ~2 days

**Tasks:**
1. Create text_chunks table
2. Implement chunking algorithms:
   - Paragraph-based
   - Time-based (target duration)
3. Add chunk management commands
4. Add "Prepare for Practice" UI
5. Update practice flow to navigate chunks

**Success Criteria:**
- Long texts can be chunked automatically
- Can practice chunk-by-chunk
- Progress tracked per chunk

---

### Phase 4: Vocabulary Extraction
**Priority:** MEDIUM
**Duration:** ~2 days

**Tasks:**
1. Implement text tokenization/lemmatization
2. Build vocabulary analysis service
3. Auto-set difficulty at import time
4. Add pre-practice vocab preview modal
5. Show new word count in Library cards

**Success Criteria:**
- Difficulty level set automatically
- Can preview new words before practice
- Vocabulary analysis accurate

---

## Technical Considerations

### Error Handling
- PDF parsing failures → fallback to empty content + user notification
- EPUB parsing failures → same fallback
- Web scraping failures → network errors, timeouts, robots.txt respect
- Audio upload failures → size limits, format validation

### Performance
- Large PDF files → stream processing
- Web scraping → timeout limits (10s max)
- Audio files → size limit (50MB max?)
- Chunking → background task for large texts

### Dependencies
- Minimize binary size increase
- Use lightweight parsers where possible
- Consider optional features in Cargo.toml

### Testing
- Unit tests for each parser
- Integration tests for import flow
- Manual testing with real-world files (PDFs, EPUBs, web pages)

---

## File Structure After Implementation

```
src-tauri/src/
├── services/
│   ├── text_import/            # NEW
│   │   ├── mod.rs
│   │   ├── pdf_parser.rs
│   │   ├── epub_parser.rs
│   │   ├── subtitle_parser.rs
│   │   ├── web_scraper.rs
│   │   └── file_handler.rs
│   ├── text_chunking/          # NEW
│   │   ├── mod.rs
│   │   └── chunker.rs
│   ├── vocab_analysis/         # NEW
│   │   ├── mod.rs
│   │   └── analyzer.rs
│   └── audio_storage/          # NEW
│       ├── mod.rs
│       └── storage.rs
├── commands/
│   ├── text_import.rs          # NEW
│   ├── text_chunks.rs          # NEW
│   └── vocab_analysis.rs       # NEW
└── db/
    └── migrations/             # NEW
        ├── 001_add_audio_fields.sql
        └── 002_create_text_chunks.sql

src/
├── services/
│   ├── text-import/            # NEW
│   │   ├── types.ts
│   │   └── text-import.ts
│   └── text-chunks/            # NEW
│       ├── types.ts
│       └── text-chunks.ts
├── hooks/
│   ├── text-import/            # NEW
│   │   └── useTextImport.ts
│   └── text-chunks/            # NEW
│       └── useTextChunks.ts
└── components/
    ├── text-import/            # NEW
    │   ├── FormatPicker.tsx
    │   ├── AudioUploader.tsx
    │   └── ImportProgress.tsx
    ├── text-chunks/            # NEW
    │   ├── ChunkNavigator.tsx
    │   └── ChunkProgress.tsx
    └── vocabulary/
        └── VocabPreviewModal.tsx # NEW
```

---

## Next Steps

1. Review this plan with user
2. Confirm priorities and phasing
3. Start with Phase 1 (Multi-Format Import)
4. Iterate based on feedback
