# FluentWhisper - Next Release Roadmap

**Target:** Version 1.x (Next Release)
**Status:** Planning Phase

---

## Important: Review Before Implementing

**Before starting each feature:**
1. Read the entire implementation plan
2. Review relevant existing code in the codebase
3. Verify assumptions (e.g., check if columns/fields already exist)
4. Update the plan if needed based on findings
5. Ask questions if anything is unclear

This helps avoid duplicate work and ensures implementations align with existing architecture.

---

## High Priority Features

### 1. Word Tagging ("Needs Practice")

**Goal:** Allow users to tag vocabulary words as "needs practice" and track them separately.

#### Implementation Plan

**Database Layer** (`src-tauri/src/db/vocab.rs`):
- Add `tags` column to vocabulary table (comma-separated string or JSON array)
- Add migration for existing vocab entries (default: empty tags)
- New query: `get_vocab_by_tag(tag: &str, lang: &str)` → filter words

**Service Layer** (`src/services/vocabulary/vocabulary.ts`):
```typescript
// New functions:
addWordTag(lemma: string, language: LangCode, tag: string): Promise<ServiceResult<boolean>>
removeWordTag(lemma: string, language: LangCode, tag: string): Promise<ServiceResult<boolean>>
getWordsByTag(tag: string, language: LangCode): Promise<ServiceResult<VocabWord[]>>
```

**UI Changes**:
1. **Read Aloud Mode** (`src/pages/read-aloud/ReadAloud.tsx`):
   - Click word → context menu appears
   - Options: "Mark as Needs Practice" / "Remove from Needs Practice"
   - Visual indicator for tagged words (different color/badge)

2. **Vocabulary Page** (`src/pages/vocabulary/Vocabulary.tsx`):
   - Add filter dropdown: "All Words" | "Needs Practice" | "Mastered"
   - Show tag badges on word cards
   - Click badge to remove tag

**Types** (`src/services/vocabulary/types.ts`):
```typescript
export interface VocabWord {
  // ... existing fields
  tags: string[];  // Add tags array
}

export const VOCAB_TAGS = {
  NEEDS_PRACTICE: 'needs-practice',
  MASTERED: 'mastered',  // Future use
} as const;
```

**Files to Modify:**
- `src-tauri/src/db/vocab.rs` (add tags column, queries)
- `src-tauri/src/commands/vocab.rs` (expose tag commands)
- `src/services/vocabulary/vocabulary.ts` (tag functions)
- `src/services/vocabulary/types.ts` (add tags to VocabWord)
- `src/pages/read-aloud/ReadAloud.tsx` (word click handler)
- `src/pages/vocabulary/Vocabulary.tsx` (filter UI)

---

### 2. Session Types (Tutor/Conversation Modes)

**Goal:** Add different recording modes that don't count toward WPM stats.

#### Session Types
- **Free Speak** (existing) - Solo practice, counts toward WPM
- **Read Aloud** (existing) - Reading text aloud, counts toward WPM
- **Tutor** (NEW) - Recording session with a tutor, no WPM tracking
- **Conversation** (NEW) - Conversation with AI (ChatGPT voice, etc.) or other scenarios, no WPM tracking

#### Implementation Plan

**Database Layer** (`src-tauri/src/db/sessions.rs`):
- The `session_type` column already exists in the sessions table
- Add new enum values: 'tutor', 'conversation' (existing: 'free_speak', 'read_aloud')
- No migration needed - existing sessions already have session_type set

**Transcription Layer** (`src-tauri/src/services/transcription/whisper.rs`):
- For `tutor` and `conversation` session types: pass `language: None` to Whisper
- This enables auto-language detection for mixed-language conversations
- For `free_speak` and `read_aloud`: continue using user's target language

**Service Layer** (`src/services/sessions/sessions.ts`):
```typescript
export type SessionType = 'free_speak' | 'read_aloud' | 'tutor' | 'conversation';

export interface Session {
  // ... existing fields
  session_type: SessionType;
}

// Updated function signature:
createSession(language: string, sessionType: SessionType): Promise<ServiceResult<Session>>
```

**Stats Calculation** (`src/services/stats/stats.ts`):
```typescript
// Modify WPM calculation to filter by session type
getWPMStats(language: LangCode): Promise<ServiceResult<WPMStats>> {
  // Only include sessions where session_type is 'free_speak' or 'read_aloud'
  const wpmSessions = sessions.filter(s =>
    s.session_type === 'free_speak' || s.session_type === 'read_aloud'
  );
  // Calculate WPM from free_speak and read_aloud sessions only
}
```

**UI Changes**:
1. **Record Page** (`src/pages/record/Record.tsx`):
   - Add mode selector dropdown above record button
   - Options: "Free Speak" (default) | "Tutor Session" | "Conversation"
   - Show description: "Tutor and Conversation modes don't count toward WPM stats"
   - Note: Read Aloud is NOT in this dropdown - it's initiated from Library page

2. **Session History** (`src/pages/sessions/SessionHistory.tsx`):
   - Show session type badge on each session card
   - Filter: "All Sessions" | "WPM Sessions" | "Tutor" | "Conversation"

3. **Stats Page** (`src/pages/stats/Stats.tsx`):
   - Add note: "WPM calculated from Free Speak and Read Aloud sessions only"
   - Show breakdown: "X free speak sessions, Y read aloud sessions, Z tutor sessions, W conversation sessions"

**Files to Modify:**
- `src-tauri/src/db/sessions.rs` (add 'tutor', 'conversation' enum values)
- `src-tauri/src/services/transcription/whisper.rs` (auto-language detection logic)
- `src-tauri/src/commands/recording.rs` (pass session_type to transcription)
- `src/services/sessions/types.ts` (update SessionType union)
- `src/services/sessions/sessions.ts` (update createSession)
- `src/services/recording/recording.ts` (pass session_type to transcribe)
- `src/utils/sessionStats.ts` (filter WPM by session type)
- `src/pages/record/Record.tsx` (mode selector UI)
- `src/pages/sessions/SessionHistory.tsx` (show type badges, filter)
- `src/pages/stats/Stats.tsx` (stats breakdown)

**Future Enhancement (Later Release):**
- Speaker detection/diarization for Tutor/Conversation modes
- Separate speaker turns in transcript view
- Auto-language detection for mixed-language conversations

---

### 3. Hallucination Filters

**Goal:** Remove common Whisper hallucinations from transcripts.

#### Common Whisper Hallucinations
- Repeated phrases: "Thank you for watching", "Please subscribe"
- Markers: `[MUSIC]`, `[APPLAUSE]`, `[BLANK_AUDIO]`
- Timestamps or music lyrics
- Repetitive loops (same sentence 3+ times)

#### Implementation Plan

**Service Layer** (`src/services/transcription/filters.ts` - NEW FILE):
```typescript
export interface HallucinationPattern {
  pattern: RegExp;
  description: string;
}

export const HALLUCINATION_PATTERNS: HallucinationPattern[] = [
  { pattern: /thank you for watching/gi, description: 'YouTube outro' },
  { pattern: /please subscribe/gi, description: 'YouTube CTA' },
  { pattern: /\[music\]/gi, description: 'Music marker' },
  { pattern: /\[applause\]/gi, description: 'Applause marker' },
  { pattern: /\[blank_audio\]/gi, description: 'Blank audio marker' },
  // Add more patterns as discovered
];

export function removeHallucinations(text: string): string {
  let cleaned = text;

  // Apply all regex patterns
  for (const { pattern } of HALLUCINATION_PATTERNS) {
    cleaned = cleaned.replace(pattern, '');
  }

  // Remove excessive whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // Detect repetitive loops (same sentence 3+ times in a row)
  cleaned = removeRepetitiveLoops(cleaned);

  return cleaned;
}

function removeRepetitiveLoops(text: string): string {
  // Split into sentences, detect 3+ consecutive duplicates
  // Keep only one instance
  // Implementation: sliding window detection
}
```

**Integration Point** (`src/services/recording/recording.ts`):
```typescript
// After transcription, before saving to DB
const transcribedText = await invoke('whisper_transcribe', { ... });
const cleanedText = removeHallucinations(transcribedText);
// Save cleanedText to session
```

**Settings** (`src/stores/settingsStore.ts`):
```typescript
interface AppSettings {
  // ... existing
  'transcription.filterHallucinations': boolean; // default: true
  'transcription.customFilters': string[];       // User-defined regex patterns
}
```

**UI** (`src/components/settings/TranscriptionSettings.tsx` - NEW):
- Toggle: "Filter common hallucinations"
- Advanced: Custom filter patterns (for power users)
- List of active patterns with descriptions

**Files to Create:**
- `src/services/transcription/filters.ts` (hallucination detection)

**Files to Modify:**
- `src/services/recording/recording.ts` (apply filters after transcription)
- `src/stores/settingsStore.ts` (add filter settings)
- `src/components/settings/` (add TranscriptionSettings section)

**Testing Strategy:**
- Collect real hallucination examples from Whisper
- Test filter effectiveness
- Ensure legitimate phrases aren't removed
- Add user feedback mechanism: "Report false positive"

---

### 4. Add New Languages (Portuguese, Dutch, Russian)

**Goal:** Expand language support from 5 to 8 languages.

#### New Languages
1. **Portuguese (pt)** - Already in type definition
2. **Dutch (nl)** - Need to add to type definition
3. **Russian (ru)** - Already in type definition

All are LTR (left-to-right) languages.

#### Implementation Plan

**Step 1: Update Type Definitions**

`src/types/language-packs.ts`:
```typescript
// Add 'nl' to existing type
export type LangCode = 'es' | 'en' | 'fr' | 'de' | 'it' | 'pt' | 'nl' | 'ru' | 'zh' | 'ja' | 'ko' | 'ar';
```

`src/services/text/types.ts`:
```typescript
// Same - add 'nl' to LangCode type
```

**Step 2: Create/Source Lemma Databases**

For each language, create SQLite database:
- Table: `lemmas` with columns: `word TEXT`, `lemma TEXT`
- Lowercase all entries
- Source options:
  - **Portuguese:** Wiktionary dumps, spaCy data
  - **Dutch:** Open Dutch WordNet, Wiktionary
  - **Russian:** OpenCorpora, Wiktionary

**Step 3: Update Language Packs Manifest**

`public/language-packs.json`:
```json
{
  "languages": {
    // ... existing 5 languages
    "pt": {
      "lemmas_url": "https://github.com/yourusername/fluentwhisper-lemmas/releases/download/v1.0/pt-lemmas.db",
      "bundled": false
    },
    "nl": {
      "lemmas_url": "https://github.com/yourusername/fluentwhisper-lemmas/releases/download/v1.0/nl-lemmas.db",
      "bundled": false
    },
    "ru": {
      "lemmas_url": "https://github.com/yourusername/fluentwhisper-lemmas/releases/download/v1.0/ru-lemmas.db",
      "bundled": false
    }
  }
}
```

**Step 4: Update Language Selection UI**

`src/pages/onboarding/LanguageSelectionStep.tsx`:
```typescript
const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },    // NEW
  { code: 'nl', name: 'Dutch', flag: '🇳🇱' },         // NEW
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },       // NEW
];
```

Same update for `src/components/settings/LanguageSettingsSection.tsx`.

**Step 5: Language-Specific Preprocessing (Optional)**

`src/services/text/tokenization.ts`:
```typescript
// Add preprocessing if needed
function preprocessPortuguese(text: string): string {
  // Similar to Spanish: expand contractions if needed
  // Examples: "do" → "de o", "da" → "de a", "ao" → "a o"
  return text;
}

function preprocessDutch(text: string): string {
  // Research common contractions
  return text;
}

function preprocessRussian(text: string): string {
  // Cyrillic text - may need special handling
  return text;
}

// Update tokenize() to handle new languages
export function tokenize(text: string, lang: LangCode, options?: TokenizationOptions): string[] {
  let processed = text;

  if (lang === 'es') processed = preprocessSpanish(processed);
  if (lang === 'pt') processed = preprocessPortuguese(processed);
  if (lang === 'nl') processed = preprocessDutch(processed);
  if (lang === 'ru') processed = preprocessRussian(processed);

  // ... rest of tokenization
}
```

**Files to Modify:**
- `src/types/language-packs.ts` (add 'nl' to LangCode)
- `src/services/text/types.ts` (add 'nl' to LangCode)
- `public/language-packs.json` (add pt, nl, ru entries)
- `src/pages/onboarding/LanguageSelectionStep.tsx` (add to UI list)
- `src/components/settings/LanguageSettingsSection.tsx` (add to UI list)
- `src/services/text/tokenization.ts` (add preprocessing functions)

**Files to Create:**
- Lemma databases: `pt-lemmas.db`, `nl-lemmas.db`, `ru-lemmas.db`

**Testing Checklist:**
- [ ] Download works for each new language
- [ ] Lemmatization works correctly (spot check common verbs)
- [ ] Tokenization handles special characters (Cyrillic for Russian)
- [ ] Language selection UI shows all 8 languages
- [ ] Settings persist correctly

---

## Medium Priority Features

### 5. Read Aloud Accuracy Percentage

**Goal:** Calculate and display pronunciation accuracy for Read Aloud sessions by comparing expected text vs. transcribed speech.

#### Implementation Plan

**Database Layer** (`src-tauri/src/db/sessions.rs`):
- Add `accuracy_percentage` column to sessions table (REAL/FLOAT, nullable)
- Use existing `sourceText` column as the expected text (already stores the text user was reading)
- Only populated for Read Aloud sessions

**Note:** The `sourceText` column already exists and is populated during Read Aloud sessions with the text being read (see `src/services/recording/recording.ts:38`). No need for additional `original_text` column.

**Service Layer** (`src/services/accuracy/accuracy.ts` - NEW FILE):
```typescript
export interface AccuracyResult {
  percentage: number;           // 0-100
  totalWords: number;
  correctWords: number;
  differences: TextDifference[];
}

export interface TextDifference {
  type: 'correct' | 'incorrect' | 'missing' | 'extra';
  expected?: string;            // Word from original text
  actual?: string;              // Word from transcription
  position: number;             // Word index
}

// Calculate accuracy by comparing expected vs actual text
export async function calculateAccuracy(
  expectedText: string,
  actualText: string,
  language: LangCode
): Promise<ServiceResult<AccuracyResult>> {
  // 1. Tokenize both texts
  const expectedTokens = tokenize(expectedText, language);
  const actualTokens = tokenize(actualText, language);

  // 2. Lemmatize both (compare base forms, not inflections)
  const expectedLemmas = await lemmatizeBatch(expectedTokens, language);
  const actualLemmas = await lemmatizeBatch(actualTokens, language);

  // 3. Calculate word-level accuracy using simple matching
  //    (or Levenshtein distance for more advanced comparison)
  const differences = compareWords(expectedLemmas, actualLemmas);

  // 4. Calculate percentage
  const correctWords = differences.filter(d => d.type === 'correct').length;
  const totalWords = expectedLemmas.length;
  const percentage = totalWords > 0 ? (correctWords / totalWords) * 100 : 0;

  return {
    success: true,
    data: {
      percentage: Math.round(percentage * 10) / 10,  // Round to 1 decimal
      totalWords,
      correctWords,
      differences,
    },
  };
}

// Simple word-by-word comparison (position-based)
function compareWords(expected: string[], actual: string[]): TextDifference[] {
  const differences: TextDifference[] = [];
  const maxLength = Math.max(expected.length, actual.length);

  for (let i = 0; i < maxLength; i++) {
    const expectedWord = expected[i];
    const actualWord = actual[i];

    if (expectedWord && actualWord) {
      if (expectedWord === actualWord) {
        differences.push({ type: 'correct', expected: expectedWord, actual: actualWord, position: i });
      } else {
        differences.push({ type: 'incorrect', expected: expectedWord, actual: actualWord, position: i });
      }
    } else if (expectedWord && !actualWord) {
      differences.push({ type: 'missing', expected: expectedWord, position: i });
    } else if (!expectedWord && actualWord) {
      differences.push({ type: 'extra', actual: actualWord, position: i });
    }
  }

  return differences;
}

// Alternative: Use Levenshtein distance for fuzzy matching
// Handles insertions/deletions better than position-based
export function calculateLevenshteinAccuracy(expected: string[], actual: string[]): number {
  // Implementation using dynamic programming
  // Returns similarity percentage (0-100)
}
```

**Integration Points**:

1. **Read Aloud Page** (`src/pages/read-aloud/ReadAloud.tsx`):
```typescript
// When user finishes reading (after transcription completes)
const handleTranscribeAndCompare = async () => {
  if (!recordingResult) return;

  // Transcribe the audio
  const transcriptResult = await transcribe(recordingResult.audioPath, textItem.language);

  // Create session (sourceText is already saved via createSession)
  const newSessionId = await createSession();

  // Calculate accuracy using sourceText (already stored)
  const session = await getSession(newSessionId);
  const accuracyResult = await calculateAccuracy(
    session.sourceText!,  // Expected text (already saved)
    transcriptResult.text, // Actual transcribed text
    settings.targetLanguage
  );

  // Update session with accuracy
  await updateSession(newSessionId, {
    accuracy_percentage: accuracyResult.data.percentage,
  });

  // Complete session and navigate
  await completeSession(newSessionId, ...);
  navigate(`/session/${newSessionId}`);
};
```

2. **Session Service** (`src/services/sessions/sessions.ts`):
```typescript
export interface SessionData {
  // ... existing fields
  sourceText: string | null;         // Already exists! For Read Aloud sessions
  accuracy_percentage: number | null; // NEW - 0-100, for Read Aloud only
}

export async function updateSession(
  sessionId: number,
  updates: Partial<SessionData>
): Promise<ServiceResult<boolean>> {
  // Update session with accuracy data
}
```

**UI Components**:

1. **Accuracy Display** (`src/components/sessions/AccuracyDisplay.tsx` - NEW):
```typescript
interface AccuracyDisplayProps {
  accuracy: number;           // 0-100
  totalWords: number;
  correctWords: number;
  size?: 'small' | 'large';
}

export function AccuracyDisplay({ accuracy, totalWords, correctWords, size = 'small' }: AccuracyDisplayProps) {
  // Circular progress indicator
  // Color-coded: Green (90+), Yellow (70-89), Red (<70)
  return (
    <div className="accuracy-display">
      <CircularProgress value={accuracy} color={getColor(accuracy)} />
      <div className="accuracy-stats">
        <span className="percentage">{accuracy}%</span>
        <span className="details">{correctWords}/{totalWords} words</span>
      </div>
    </div>
  );
}
```

2. **Text Comparison View** (`src/components/sessions/TextComparison.tsx` - NEW):
```typescript
interface TextComparisonProps {
  differences: TextDifference[];
  expectedText: string;
  actualText: string;
}

export function TextComparison({ differences, expectedText, actualText }: TextComparisonProps) {
  // Side-by-side or inline diff view
  // Highlight differences:
  // - Green: correct words
  // - Red: incorrect/missing words
  // - Yellow: extra words

  return (
    <div className="text-comparison">
      <div className="expected">
        <h3>Expected</h3>
        {renderHighlightedText(expectedText, differences, 'expected')}
      </div>
      <div className="actual">
        <h3>You Said</h3>
        {renderHighlightedText(actualText, differences, 'actual')}
      </div>
    </div>
  );
}
```

3. **Session Details Update** (`src/pages/sessions/SessionDetails.tsx`):
```typescript
// Show accuracy for Read Aloud sessions
{session.accuracy_percentage !== null && (
  <AccuracyDisplay
    accuracy={session.accuracy_percentage}
    totalWords={session.total_words}
    correctWords={calculateCorrectWords(session)}
    size="large"
  />
)}

// Show text comparison if available
{session.sourceText && (
  <TextComparison
    differences={session.differences}
    expectedText={session.sourceText}
    actualText={session.transcript}
  />
)}
```

4. **Session History** (`src/pages/sessions/SessionHistory.tsx`):
```typescript
// Show accuracy badge on Read Aloud session cards
{session.accuracy_percentage !== null && (
  <Badge color={getAccuracyColor(session.accuracy_percentage)}>
    {session.accuracy_percentage}% accuracy
  </Badge>
)}
```

**Files to Create:**
- `src/services/accuracy/accuracy.ts` (accuracy calculation)
- `src/services/accuracy/types.ts` (AccuracyResult, TextDifference types)
- `src/components/sessions/AccuracyDisplay.tsx` (circular progress)
- `src/components/sessions/TextComparison.tsx` (diff view)

**Files to Modify:**
- `src-tauri/src/db/sessions.rs` (add accuracy_percentage column only)
- `src/services/sessions/types.ts` (add accuracy_percentage to SessionData)
- `src/services/sessions/sessions.ts` (updateSession function)
- `src/pages/read-aloud/ReadAloud.tsx` (calculate accuracy on finish)
- `src/pages/sessions/SessionDetails.tsx` (display accuracy)
- `src/pages/sessions/SessionHistory.tsx` (show accuracy badge)

**Accuracy Algorithm Options:**

**Option 1: Simple Word-by-Word (Recommended for MVP)**
- Compare words at same position
- Pro: Fast, simple, easy to understand
- Con: Doesn't handle word order changes well

**Option 2: Levenshtein Distance**
- Calculate edit distance between word sequences
- Pro: Handles insertions/deletions better
- Con: More complex, slower for long texts

**Option 3: Advanced (Future)**
- Use NLP library for semantic similarity
- Account for synonyms (e.g., "big" vs "large")
- Phonetic matching (sounds similar = partial credit)

**UX Considerations:**
- Only calculate accuracy for Read Aloud mode (not Free Speak/Tutor/Conversation)
- Show accuracy immediately after session ends
- Allow user to review diff view to see specific mistakes
- Color coding helps quick understanding (green = good, red = needs work)
- Don't penalize minor differences (lemmatization helps with this)

**Settings** (`src/stores/settingsStore.ts`):
```typescript
interface AppSettings {
  // ... existing
  'readAloud.showAccuracy': boolean;        // default: true
  'readAloud.accuracyAlgorithm': 'simple' | 'levenshtein'; // default: 'simple'
  'readAloud.minAccuracyForCelebration': number; // default: 90
}
```

**Future Enhancements:**
- Pronunciation feedback: specific words that need practice
- Audio playback with highlighted words (sync original text with audio)
- Track accuracy trends over time
- Suggest practice sentences based on common mistakes

---

### 6. Practice Word Tracking (Speech Bubbles)

**Goal:** Show "needs practice" words during recording sessions to encourage usage.

#### Design Concept
- Words tagged as "needs practice" appear as floating bubbles
- Bubbles rise from bottom of screen
- Pop/disappear when word is spoken
- Can be toggled on/off

#### Implementation Plan

**Component** (`src/components/recording/PracticeWordBubbles.tsx` - NEW):
```typescript
interface PracticeWordBubblesProps {
  practiceWords: string[];      // Lemmas tagged as "needs practice"
  spokenWords: string[];        // Words spoken in current session (lemmatized)
  enabled: boolean;             // Toggle on/off
}

export function PracticeWordBubbles({ practiceWords, spokenWords, enabled }: PracticeWordBubblesProps) {
  // Filter out already-spoken words
  const remainingWords = practiceWords.filter(word => !spokenWords.includes(word));

  // Show max 5 bubbles at a time
  const visibleWords = remainingWords.slice(0, 5);

  // CSS animations:
  // - Float up from bottom over 10 seconds
  // - Pop animation when word is spoken
  // - Rotate/wobble slightly for visual interest

  return (
    <div className="practice-bubbles-container">
      {visibleWords.map(word => (
        <Bubble
          key={word}
          word={word}
          onComplete={() => {/* bubble reached top */}}
        />
      ))}
    </div>
  );
}
```

**Integration** (`src/pages/record/Record.tsx`):
```typescript
const [spokenWords, setSpokenWords] = useState<string[]>([]);

// On transcription chunk received:
const handleTranscriptionChunk = async (text: string) => {
  const tokens = tokenize(text, settings.targetLanguage);
  const lemmas = await lemmatizeBatch(tokens, settings.targetLanguage);
  setSpokenWords(prev => [...prev, ...lemmas.map(l => l[1])]);
};

// Render bubbles:
<PracticeWordBubbles
  practiceWords={vocabularyWithTag('needs-practice')}
  spokenWords={spokenWords}
  enabled={settings['recording.showPracticeWords']}
/>
```

**Settings** (`src/stores/settingsStore.ts`):
```typescript
interface AppSettings {
  // ... existing
  'recording.showPracticeWords': boolean;  // default: false
  'recording.maxPracticeBubbles': number;  // default: 5
}
```

**CSS/Animations** (`src/components/recording/PracticeWordBubbles.css` - NEW):
```css
.practice-bubbles-container {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 400px;
  pointer-events: none;
  overflow: hidden;
}

.bubble {
  position: absolute;
  bottom: -50px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 12px 20px;
  border-radius: 50px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.2);
  animation: float-up 10s linear forwards;
}

@keyframes float-up {
  0% {
    bottom: -50px;
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  90% {
    opacity: 1;
  }
  100% {
    bottom: 450px;
    opacity: 0;
  }
}

.bubble.popped {
  animation: pop 0.3s ease-out forwards;
}

@keyframes pop {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.3);
  }
  100% {
    transform: scale(0);
    opacity: 0;
  }
}
```

**Files to Create:**
- `src/components/recording/PracticeWordBubbles.tsx`
- `src/components/recording/PracticeWordBubbles.css`

**Files to Modify:**
- `src/pages/record/Record.tsx` (integrate bubbles component)
- `src/stores/settingsStore.ts` (add bubble settings)
- `src/components/settings/RecordingSettings.tsx` (toggle UI)

**UX Considerations:**
- Don't show bubbles during first 10 seconds of recording (let user settle in)
- Gentle animations - shouldn't distract from speaking
- Toggle easily accessible: "Show practice words" checkbox in recording view
- Celebrate when all practice words are used: confetti animation?

---

## Implementation Order

**AGREED ORDER** (updated based on team discussion):

1. **Session Types** - Add `tutor` and `conversation` modes
   - Keep `free_speak` and `read_aloud` counting toward WPM
   - New modes (`tutor`, `conversation`) excluded from WPM calculations
   - **Note:** Tutor/Conversation modes may use Whisper auto-language detection to handle mixed-language scenarios

2. **Hallucination Filters** - Improve transcription quality immediately

3. **Word Tagging** - "Needs practice" functionality (builds on existing vocab system)

4. **Read Aloud Accuracy** - Pronunciation accuracy percentage (builds on tokenization/lemmatization)

5. **Practice Word Bubbles** - Gamified practice during recording (depends on Word Tagging, most complex UX)

6. **New Languages** - Add Portuguese, Dutch, Russian (moved to last, can work in parallel with other features)

---

## Testing Strategy

For each feature:
- [ ] Unit tests for service layer functions
- [ ] Integration tests for database operations
- [ ] Manual UI testing
- [ ] Edge case testing (empty states, errors)
- [ ] Performance testing (large vocab lists, long sessions)

---

## Future Enhancements (Not This Release)

- Speaker diarization for Tutor/Conversation modes
- Auto-language detection for mixed-language conversations
- Advanced hallucination reporting (let users flag false positives)
- More languages (Chinese, Japanese, Korean, Arabic)
- Gamification: achievements, streaks, challenges
- Export functionality: sessions to PDF, CSV
- Dark mode (if not already implemented)
- Mobile apps (iOS/Android via Tauri mobile)

---

## Notes

- Follow CLAUDE.md standards throughout
- Document as you build (JSDoc, inline comments)
- Run `bun run type-check` before each commit
- Keep try/catch blocks small and focused
- Use three-layer architecture (Service → Query → UI)
