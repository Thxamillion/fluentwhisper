# Contributing to FluentDiary

Thank you for your interest in contributing! FluentDiary is a privacy-first language learning app, and we welcome contributions that align with this mission.

## Getting Started

### Prerequisites
- **Node.js** 18+
- **Rust** 1.70+
- **Git**

### Development Setup

1. **Fork and clone** the repository
   ```bash
   git clone https://github.com/Thxamillion/fluentdiary-desktop.git
   cd fluentdiary-desktop
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run in development mode**
   ```bash
   npm run tauri dev
   ```

4. **Build for production**
   ```bash
   npm run tauri build
   ```

## Code Standards

### Architecture
FluentWhisper follows a **three-layer architecture**:

- **Service Layer** - Pure functions with explicit parameters, no UI dependencies
- **Query Layer** - React Query hooks that wrap services for reactivity and caching
- **UI Layer** - React components with minimal logic

### File Organization
Organize by **feature**, not by type:

```
✅ GOOD:
src/
├── services/
│   ├── transcription/
│   ├── stats/
│   └── sessions/
├── hooks/
└── components/

❌ BAD:
src/
├── types/
├── utils/
└── components/
```

### Naming Conventions

```typescript
// Constants: UPPER_SNAKE_CASE
const DEFAULT_TARGET_WPM = 150;

// Variables/Functions: camelCase
let sessionActive = false;
function startSession() { }

// Types/Interfaces: PascalCase
type SessionStats = { };

// React Components: PascalCase
SessionViewer.tsx
RecordButton.tsx

// Custom hooks: useCamelCase
function useSessionStats() { }
```

### TypeScript
- Use **strict mode** (`strict: true`)
- **No `any` types** - use proper typing or `unknown`
- Use **Zod schemas** for settings and runtime validation

### Error Handling
Use try/catch **only at boundaries** where external systems can fail:
- Tauri commands (Rust backend)
- Whisper transcription
- File system operations
- IndexedDB operations
- Audio recording

Keep try blocks **small** - wrap only the specific operation that can fail.

```typescript
// ✅ GOOD - Focused error handling
async function transcribeAudio(blob: Blob) {
  try {
    const text = await invoke('whisper_transcribe', { audio: blob });
    return { success: true, data: text };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ❌ BAD - Wrapping everything
async function processSession() {
  try {
    const stats = calculateStats();  // Pure function, won't throw
    const wpm = computeWPM(stats);   // Pure function, won't throw
    const text = await transcribe(); // Only this can fail
  } catch (error) {
    // Which part failed? Unclear!
  }
}
```

## Making Changes

### Workflow

1. **Create a branch** from `master`
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following the code standards above

3. **Test your changes**
   ```bash
   npm run tauri dev  # Test in development
   npx tsc --noEmit   # Type check
   npm run lint       # Lint check
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "Add feature: your feature description"
   ```

5. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Open a Pull Request** on GitHub

### Pull Request Guidelines

- **Describe your changes** - What does this PR do? Why is it needed?
- **Reference issues** - Link to any related issues
- **Keep it focused** - One feature or fix per PR
- **Test thoroughly** - Make sure it works on your platform
- **Update documentation** - If you change functionality, update README or docs

## What to Contribute

### Good First Issues
Look for issues labeled [`good first issue`](https://github.com/Thxamillion/fluentdiary-desktop/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) - these are beginner-friendly tasks.

### Feature Requests
Check the [Upcoming Features](README.md#-upcoming-features) section in the README or browse open issues.

### Bug Reports
Found a bug? [Open an issue](https://github.com/Thxamillion/fluentdiary-desktop/issues/new) with:
- Steps to reproduce
- Expected behavior
- Actual behavior
- Your platform (OS, version)

## Questions?

- **General questions:** Open a [GitHub Discussion](https://github.com/Thxamillion/fluentdiary-desktop/discussions)
- **Bug reports:** [Create an issue](https://github.com/Thxamillion/fluentdiary-desktop/issues/new)
- **Feature ideas:** [Create an issue](https://github.com/Thxamillion/fluentdiary-desktop/issues/new) with the "enhancement" label

---

**Thank you for contributing to FluentDiary!** 🎉
