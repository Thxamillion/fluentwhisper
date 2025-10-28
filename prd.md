# Fluency — Product Specification

## Overview
**Goal:**  
Fluency helps users improve speaking fluency in their target language through daily speech sessions.  
Users record themselves speaking, get transcriptions via local Whisper, and track vocabulary, word usage, and speaking metrics over time.

**Target Users:**  
Language learners who want structured speaking practice and progress tracking.

**Platform:**  
Desktop app (macOS and Windows) built with **Tauri (Rust + React)**, fully offline-capable.

**Initial Languages:**  
English, Spanish, French, German, Mandarin

---

## Core Features

### 1. Recording Sessions
- Record speech sessions via microphone.  
- **Modes:**
  - **Free Form:** speak freely on any topic.  
  - **(Future)** Guided mode for reading imported text or prompts.
- User start a session and hit record
- Stats and new words are saved
- Save session metadata: language, date, duration, audio path.

### 2. Transcription
- On-device transcription using **Whisper.cpp** or **faster-whisper**.  
- Detect spoken language automatically or let users choose manually.  
- Post-process transcripts for:
  - Word segmentation
  - Lemmatization (base forms)
  - Language-specific tokenization

### 3. Session Analysis
Each session computes:
- Word count  
- Unique word count  
- Words per minute (WPM)  
- Duration  
- New words introduced (compared to user vocab)  
- Filler word frequency 

Store transcripts and metrics locally with timestamps and chosen language.

### 4. Session Detail View
- Display the transcript with highlightable words.  
- Show session summary:  
  - WPM, total words, unique words  
  - New words spoken  
- Mini timeline visualization of speaking pace (future enhancement).

### 5. Vocabulary Tracking
Centralized vocab tracking for all sessions.  
Each entry stores:
- Word  
- Translation (from language pack)  
- First seen / last seen  
- Usage frequency  
- Example sentences  


Filtering:
- By date added, usage frequency, or language.

### 6. History
- Chronological list of all sessions.  
- Quick-view stats (date, language, duration, word count).  
- Click to open detailed session view.

### 7. Analytics Dashboard
Visual progress charts:
- Total words spoken per week/month  
- Unique vocabulary growth  
- Average WPM trend  
- Time spent speaking  
- New vs. repeated words ratio  

### 8. Multi-Language Support
- User can select or switch target languages.  
- Each language uses a separate **language pack** containing:
  - Dictionary and translation data (`ling.db`)
  - Lemmatization tables
  - Frequency lists
okay le

### 9. Future / Stretch Features
- Import YouTube videos for transcription and reading practice.  
- Import articles or text passages for read-aloud sessions.  
- Speech shadowing mode (listen + repeat).  
- Flashcards / spaced repetition based on discovered vocabulary.

---

## Data & Storage

### Local Databases
1. **user.db** – sessions, vocab usage, analytics  
2. **langpacks/<code>/ling.db** – language-specific dictionary data  
3. **config.db** – user settings and preferences  

**Example Schema (Simplified)**

**sessions**
| id | lang | started_at | duration | words | unique_words | wpm | transcript |

**vocab**
| id | lang | lemma | freq | first_seen | last_seen | mastered |

---

## Architecture

**Frontend (React + TypeScript)**
- Recording UI, dashboards, and session management.  
- Communicates with backend through Tauri commands.

**Backend (Rust / Tauri)**
- Audio capture (`cpal` / `rodio`)  
- Whisper bindings  
- NLP utilities (tokenization, lemmatization)  
- SQLite data persistence (`sqlx`)  
- Language pack loader and validator  

**Offline-First Design:**  
All core functionality runs locally; cloud sync and translation APIs are optional add-ons.

---

## User Flow

1. **Setup:** choose target language → download language pack → test mic.  
2. **Record:** press record → speak → stop → automatic transcription.  
3. **Review:** view session summary and transcript → highlight new words → add to vocab.  
4. **Track:** open analytics to see progress trends.  
5. **Switch Language:** change target language anytime and install new packs as needed.

---

## Non-Functional Requirements
- **Privacy:** all user data stored locally; no external requests without consent.  
- **Performance:** transcription latency under 400 ms per chunk.  
- **Portability:** runs on macOS and Windows.  
- **Extensibility:** modular language packs and model swapping.  
- **Maintainability:** clean domain boundaries (audio, transcription, NLP, storage).

---

## Roadmap

| Phase | Milestone | Description |
|-------|------------|-------------|
| **MVP** | Recording → Whisper transcription → Session stats | Foundational feature set |
| **v0.2** | Vocabulary + history | Persistent vocab and session tracking |
| **v0.3** | Analytics dashboard | Visual progress metrics |
| **v0.4** | Multi-language packs | English, Spanish, French, German, Mandarin |
| **v0.5** | Public OSS release | Docs, tests, CI/CD |
| **Future** | YouTube/article imports, flashcards | Advanced learning tools |

---

## License & Open-Source Principles
- License: MIT or Apache-2.0 (TBD).  
- Contributions welcomed via GitHub PRs.  
- Code style: Prettier (JS/TS), Rustfmt + Clippy.  
- Transparent roadmap and community discussions via GitHub Issues.

---

*Draft — subject to iteration as development progresses.*
