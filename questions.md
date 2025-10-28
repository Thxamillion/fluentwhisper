  1. Database Schema (You mentioned - CRITICAL)

  - user.db structure (sessions, vocab, analytics)
  - langpacks/<code>/ling.db structure (dictionary, lemmatization, frequency)
  - config.db structure (settings)
  - Migrations strategy (or migration-free like we discussed)


  None of the db stuff is set, We'll discuss it on its own.

  2. Whisper Integration (CRITICAL for MVP)

  - Which library: whisper.cpp or faster-whisper?
  DECISION: whisper.cpp via Rust bindings

  - How to call it from Rust backend
  DECISION: Use `whisper-rs` or `transcribe-rs` crate (like Whispering does)

  Tauri command pattern:
  ```rust
  #[tauri::command]
  async fn transcribe_audio(audio_path: String) -> Result<String, String> {
      let transcript = whisper::transcribe(&audio_path)?;
      Ok(transcript)
  }
  ```

  - Audio format conversion (raw recording → format Whisper needs)
  DECISION:
  1. Record at 44.1kHz, 16-bit, mono WAV (using cpal + hound)
  2. Downsample to 16kHz for Whisper (using rubato crate)
  3. Whisper expects: 16kHz, 16-bit, mono WAV

  All handled in Rust backend before calling Whisper.

  - Streaming vs batch transcription
  DECISION: Batch for MVP
  - User records full session → hit stop → transcribe entire audio
  - Simpler to implement, more accurate (full context)
  - Streaming = v0.3+ (requires VAD, chunking, complex state management)

  3. Language Packs (Multi-language support)

  - Where do they come from? (Pre-built? User downloads?)
  Pre-built, bundled with app installation

  - How to structure ling.db (dictionary schema)
  DECISION:
  CREATE TABLE lemmas (
    word TEXT,        -- The inflected/conjugated form
    lemma TEXT,       -- Base form (infinitive for verbs, singular for nouns)
    pos TEXT          -- Part of speech (verb, noun, adj, etc.)
  );

  Examples:
  - 'estás' → lemma: 'estar'
  - 'corriendo' → lemma: 'correr'
  - 'mis' → lemma: 'mi' (possessive stays separate from pronoun)

  - Lemmatization tables format
  Source from: SpaCy, Universal Dependencies, or FreeLing (Spanish)
  Store in SQLite for fast local lookup

  - Frequency lists source (Wikipedia? OpenSubtitles?)
  DECISION: Skip for MVP. Add in v0.2 for "advanced word" detection.

  4. NLP Pipeline (For session analysis)

  DECISIONS FOR MVP:

  ✅ Tokenization (split text into words)
    - Use unicode-segmentation crate (Rust)
    - Simple space-based splitting for English/Spanish/French/German
    - For Mandarin: use jieba-rs (add in v0.2)
    - Performance: Instant (<1ms for 500 words)

  ✅ Lemmatization (get base forms) - CRITICAL FOR MVP
    - Required for proper vocab tracking (estar → estás, están)
    - Use lemmatization table in ling.db (see schema above)
    - Simple database lookup: ~1ms per word
    - Performance: ~500ms for 500-word session

  ✅ New word detection
    1. Get transcript words
    2. Lemmatize each word
    3. Query user vocab DB for each lemma
    4. If NOT found → new word!
    - Performance: ~10ms database query

  ❌ Filler word detection (um, uh, like, etc.)
    - Skip for MVP, add in v0.2
    - Easy to add: just predefined list per language

  ❌ Part-of-speech tagging
    - Skip for MVP, not needed

  ALL PROCESSING IS 100% LOCAL AND FAST:
  Total processing time for 500-word session: ~1 second

  5. Audio Recording (Desktop-specific)

  - Which Rust crate: cpal or rodio?
  DECISION: cpal (like Whispering)
  - cpal = cross-platform audio I/O (recording + playback)
  - rodio = playback only (can't record)

  - Audio format (WAV, MP3, FLAC?)
  DECISION: WAV (uncompressed)
  - Simple, Whisper-friendly
  - Use `hound` crate for writing WAV files
  - User can delete old sessions to save space

  - Sample rate / bit depth
  DECISION: 44.1kHz, 16-bit, mono
  - Standard audio quality
  - Downsample to 16kHz before sending to Whisper

  - Where to store audio files (keep forever? delete after transcription?)
  DECISION:
  - Save by default to Tauri's app_data_dir() + /audio/
  - Example path: ~/Library/Application Support/Fluency/audio/session_123.wav
  - User can delete through app UI (session management)
  - Settings option: "Auto-delete audio after transcription" (off by default)

  6. Folder Structure (Follows CLAUDE.md standards)

  - Based on three-layer architecture
  - By feature (recording, sessions, vocabulary, analytics)
 
PLATFORM-SPECIFIC DECISIONS:

  1. Do we support Linux in MVP, or just Mac + Windows?
  DECISION: Mac + Windows only for MVP
  - Linux support is free with Tauri/Rust, but testing takes time
  - Can add Linux in v0.2

  2. Do we optimize Whisper for each platform, or keep it simple?
  DECISION: Keep it simple for MVP
  - CPU-only Whisper (works on all platforms consistently)
  - No Metal (Mac) or CUDA (Windows) acceleration yet
  - Platform optimizations = v0.3+

  3. Where do we store app data?
  DECISION: Use Tauri's app_data_dir()
  - Mac: ~/Library/Application Support/Fluency/
  - Windows: C:\Users\<name>\AppData\Roaming\Fluency\
  - Automatically handles platform differences

  4. Do we keep platform-specific code in separate files?
  DECISION: Use Rust cfg attributes (like Whispering)
  - Single file with conditional compilation:
    ```rust
    #[cfg(target_os = "windows")]
    fn windows_specific() { }

    #[cfg(target_os = "macos")]
    fn macos_specific() { }
    ```
  - Platform-specific dependencies in Cargo.toml:
    ```toml
    [target.'cfg(windows)'.dependencies]
    windows-sys = "0.59"
    ```