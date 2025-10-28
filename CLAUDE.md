# FluentWhisper - Code Standards

## Project Overview
Language learning desktop app using local Whisper for speech-to-text. Track speaking sessions, vocab, WPM, and progress over time.

**Tech:** TypeScript, React, Tauri, React Query (TanStack Query), Bun, Vite

---

## Core Principles

### 1. Three-Layer Architecture
- **Service Layer** - Pure functions, explicit params, no UI deps
- **Query Layer** - Wraps services with React Query for reactivity/caching
- **UI Layer** - React components, minimal logic

### 2. Error Handling
Use try/catch at boundaries where external systems can fail:
- Tauri commands (Rust backend calls)
- Whisper transcription (local AI model)
- File system operations
- Database operations (IndexedDB)
- Audio recording (microphone access)

Keep try blocks small - only wrap the specific operation that can fail.

```typescript
// ✅ GOOD - Small, focused try/catch
async function transcribeAudio(blob: Blob) {
  try {
    const text = await invoke('whisper_transcribe', { audio: blob });
    return { success: true, data: text };
  } catch (error) {
    console.error('Transcription failed:', error);
    return { success: false, error: error.message };
  }
}

// ❌ BAD - Wrapping everything
async function processSession() {
  try {
    const stats = calculateStats();  // Pure function, won't throw
    const wpm = computeWPM(stats);   // Pure function, won't throw
    const text = await transcribe(); // This can fail
  } catch (error) {
    // Which part failed? Unclear!
  }
}
```

### 3. Documentation
- `ARCHITECTURE.md` - Explain design decisions
- Module READMEs for major directories
- JSDoc for complex functions
- Inline comments for edge cases - explain WHY not WHAT

### 4. Type Safety
- `strict: true` TypeScript
- No `any` types
- Zod schemas for settings and runtime validation

### 5. Migration-Free Settings
- Every setting has a default
- Unknown keys silently ignored
- No migration scripts needed

```typescript
export const settingsSchema = z.object({
  'recording.language': z.string().default('en'),
  'stats.targetWPM': z.number().default(150),
  // All settings have defaults
});
```

---

## File Organization

Organize by feature, not by type:

```
✅ GOOD:
src/
├── services/
│   ├── transcription/
│   ├── stats/
│   └── sessions/
├── hooks/         (React Query hooks)
└── components/

❌ BAD:
src/
├── types/
├── utils/
└── components/
```

---

## Code Style

```typescript
// Constants: UPPER_SNAKE_CASE
const DEFAULT_TARGET_WPM = 150;

// Variables/Functions: camelCase
let sessionActive = false;
function startSession() { }

// Types: PascalCase
type SessionStats = { };

// Components: PascalCase
SessionViewer.tsx
RecordButton.tsx

// Custom hooks: useCamelCase
function useSessionStats() { }
function useTranscription() { }

// Live service instances: PascalCaseLive
export const TranscriptionServiceLive = createTranscriptionService();
```

---

## Tooling

- **ESLint + Prettier** - Auto-format on save
- **TypeScript** - `bun run type-check` or `tsc --noEmit`
- **React DevTools** - Browser extension for debugging

---

## Development Workflow

**When writing code:**
1. Service layer first (pure functions)
2. Query layer if needed (reactivity)
3. UI components last
4. Document as you go
5. Use try/catch at boundaries, return success/error objects

**Before committing:**
1. `bun run type-check` (TypeScript checking)
2. `bun run lint`
3. Add JSDoc for complex functions
4. Add comments for tricky logic

---

## References
Inspired by [Epicenter Whispering](https://github.com/epicenter-md/epicenter/tree/main/apps/whispering)
