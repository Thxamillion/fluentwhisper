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

## Questions?

- **Join our Discord:** [![Discord](https://img.shields.io/badge/Discord-Join%20Community-5865F2?logo=discord&logoColor=white)](https://discord.gg/ZFwngNpk3A)
- **General questions:** Open a [GitHub Discussion](https://github.com/Thxamillion/fluentdiary-desktop/discussions)
- **Bug reports:** [Create an issue](https://github.com/Thxamillion/fluentdiary-desktop/issues/new)
- **Feature ideas:** [Create an issue](https://github.com/Thxamillion/fluentdiary-desktop/issues/new) with the "enhancement" label

---

**Thank you for contributing to FluentDiary!** 🎉
