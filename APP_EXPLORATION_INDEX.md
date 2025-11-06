# FluentWhisper - App Exploration Index

Complete documentation of FluentWhisper's current features, architecture, and structure for informed decision-making on diary-themed enhancements.

---

## Overview Documents Created

### 1. APP_FEATURES_OVERVIEW.md
**What to read this for:** Complete feature inventory and what data is being tracked

**Key sections:**
- What is FluentWhisper? (elevator pitch)
- Main Features (11 categories implemented)
- Data Being Tracked (sessions, words, statistics)
- UI/UX Approach (architecture pattern, layout structure, visual patterns)
- Navigation Structure
- Technology Stack
- Key Hooks & Services
- Future Enhancements
- Current State & Polish

**Best for:** Understanding what the app does and how users interact with it

---

### 2. APP_ARCHITECTURE_SUMMARY.md
**What to read this for:** Technical structure, code organization, and design patterns

**Key sections:**
- Quick Feature Summary
- Data Flow Diagram (ASCII diagram of recording → transcription → analysis → storage → UI)
- Component Tree (visual hierarchy)
- File Structure (detailed directory layout with annotations)
- Database Schema (simplified SQL)
- State Management (Zustand, React Query, Context)
- Key Data Types (TypeScript interfaces)
- Key Patterns (three-layer architecture, error handling, caching, confirmations)
- Navigation & Routing
- Conclusion

**Best for:** Understanding how the code is organized and where to add diary features

---

### 3. COMPREHENSIVE_APP_OVERVIEW.md
**What to read this for:** Deep dive into features with diary enhancement insights

**Key sections:**
- Executive Summary
- Core Features Implemented (10 major features)
- Data Model (SessionData, VocabWord, Statistics types)
- Technical Architecture (three-layer pattern, state management, database)
- User Interface Patterns
- Complete Data Tracking List
- Current State & Polish
- Why "Fluent Diary" Makes Sense (excellent rationale)
- File Organization
- Integration Points for Diary Feature (ready-to-implement)
- Key Insights for Enhancement
- Summary for Developers
- Quick Reference: File Paths

**Best for:** Comprehensive understanding + immediate action items for diary feature

---

## Quick Navigation by Question

### "What does FluentWhisper do?"
→ **APP_FEATURES_OVERVIEW.md** - "Main Features" section

### "How is the code organized?"
→ **APP_ARCHITECTURE_SUMMARY.md** - "File Structure" section

### "What data is stored per session?"
→ **COMPREHENSIVE_APP_OVERVIEW.md** - "Data Model" section

### "Where would diary entries be stored?"
→ **COMPREHENSIVE_APP_OVERVIEW.md** - "Integration Points for Diary Feature"

### "How does the UI work?"
→ **APP_FEATURES_OVERVIEW.md** - "UI/UX Approach" section

### "What libraries are being used?"
→ **APP_ARCHITECTURE_SUMMARY.md** - "Database Schema" and "Technology Stack"

### "How are hooks organized?"
→ **APP_ARCHITECTURE_SUMMARY.md** - "Key Data Types" and "State Management"

### "What would a diary feature require?"
→ **COMPREHENSIVE_APP_OVERVIEW.md** - "Integration Points for Diary Feature"

### "How do services work?"
→ **APP_ARCHITECTURE_SUMMARY.md** - "Key Patterns" section

### "Where are the pages?"
→ **APP_ARCHITECTURE_SUMMARY.md** - "File Structure" → pages directory

---

## Feature Summary at a Glance

| Feature | Status | Key File | Tracks |
|---------|--------|----------|--------|
| Recording | ✅ Implemented | `services/recording/` | Audio path, duration |
| Transcription | ✅ Implemented | `services/transcription/` | Full transcript text |
| Session Analysis | ✅ Implemented | `services/stats/` | WPM, word counts, new words |
| Vocabulary Tracking | ✅ Implemented | `services/vocabulary/` | Lemma, forms, frequency |
| Dashboard | ✅ Implemented | `pages/dashboard/` | Streaks, goals, recent sessions |
| Analytics | ✅ Implemented | `pages/progress/` | Trends, charts, growth |
| History | ✅ Implemented | `pages/history/` | Searchable session list |
| Text Library | ✅ Implemented | `pages/library/` | Texts for reading practice |
| Vocabulary List | ✅ Implemented | `pages/vocabulary/` | Word management, search |
| Settings | ✅ Implemented | `pages/settings/` | Model, language, audio quality |
| Authentication | ✅ Implemented | `services/auth/` | User credentials, cloud sync |
| Language Packs | ✅ Implemented | `services/langpack/` | Lemmatization, translation |

---

## Database Tables

**user.db:**
- `sessions` - Recording metadata and transcript
- `vocab` - Vocabulary entries (lemmatized)
- `session_words` - Many-to-many link

**ling.db (per language):**
- `lemmas` - Word form to base form mapping

**Optional additions for diary:**
- `diary_entries` - Session reflections, mood, difficulty
- `entry_tags` - Categories for entries

---

## State Management at a Glance

| Type | Tool | Purpose | Files |
|------|------|---------|-------|
| Persistent Settings | Zustand | User preferences, model choice | `settingsStore.ts` |
| Download Progress | Zustand | Model/langpack download state | `downloadStore.ts` |
| Cached Server State | React Query | Sessions, vocab, analytics | `hooks/*/` |
| UI State | React Context | Sidebar collapsed state | `SidebarContext.tsx` |

---

## Component Architecture

```
Three Layers:
┌─────────────────────────────────────────┐
│         UI Components (React)            │  components/, pages/
│    Display, user interaction only        │
├─────────────────────────────────────────┤
│    React Query Hooks (Data binding)      │  hooks/
│    Caching, refetching, invalidation     │
├─────────────────────────────────────────┤
│      Services (Pure functions)           │  services/
│   No UI dependencies, testable           │
└─────────────────────────────────────────┘
```

---

## Current Routes (Navigation)

```
/                    → Dashboard (stats home)
/record              → Audio recording
/library             → Text storage
/read-aloud/:id      → Read + record
/history             → Session list
/session/:id         → Session detail + transcript
/vocabulary          → Word management
/progress            → Analytics + charts
/settings            → Configuration
/import              → Data import
/onboarding          → First-run setup
/login               → Authentication
```

---

## Key Strengths for Diary Enhancement

1. **Clean Architecture**: Clear service → hook → component separation makes additions straightforward

2. **Type Safety**: Strict TypeScript enables confident changes

3. **Existing Patterns**: 
   - Modal dialogs (see `DailyGoalModal`)
   - Calendar visualization (see `PracticeCalendar`)
   - Post-action prompts (see daily goal modal trigger)

4. **Database Ready**: Schema flexible enough for diary tables without migration

5. **State Management**: Zustand for persistent diary preferences, React Query for entries

6. **UI Components**: Shadcn/ui + Tailwind provides building blocks for new UI

---

## Diary Enhancement Checklist

Based on comprehensive overview:

- [ ] Add `diary_entries` table to schema
- [ ] Create `DiaryEntry` type in `services/diary/types.ts`
- [ ] Implement service: `saveDiaryEntry()`, `getDiaryEntries()`, etc.
- [ ] Create hook: `useDiaryEntry()` with React Query
- [ ] Build components:
  - [ ] `DiaryEditor` (textarea + mood/difficulty selector)
  - [ ] `DiaryEntry` (display with badges)
  - [ ] `DiaryCalendar` (heatmap with moods)
  - [ ] `MoodSelector` (UI component)
- [ ] Add route: `/diary` page
- [ ] Integrate:
  - [ ] Post-session modal prompting for reflection
  - [ ] Link in session detail view
  - [ ] Dashboard mood/engagement indicator
- [ ] Test offline-first behavior

---

## Related Existing Code to Reference

When implementing diary features, look at these for patterns:

| Feature | File | Pattern |
|---------|------|---------|
| Calendar heatmap | `components/dashboard/PracticeCalendar.tsx` | Color-coded grid visualization |
| Stat cards | `components/dashboard/StatCard.tsx` | Icon + value + subtitle |
| Modal dialog | `components/DailyGoalModal.tsx` | Post-action interaction |
| Confirmation | `pages/history/History.tsx` | Delete with dialog |
| Mood/Status indicator | `components/dashboard/StatCard.tsx` | Status badges |
| React Query hook | `hooks/sessions/useSessions.ts` | Service integration pattern |
| Service CRUD | `services/vocabulary/vocabulary.ts` | Database interaction |

---

## Files Created for This Exploration

All files are in the project root:

```
/Users/quinortiz/Documents/fluentwhisper/
├── APP_FEATURES_OVERVIEW.md          (14 KB - feature inventory)
├── APP_ARCHITECTURE_SUMMARY.md        (19 KB - technical structure)
├── COMPREHENSIVE_APP_OVERVIEW.md      (14 KB - detailed guide for enhancement)
└── APP_EXPLORATION_INDEX.md           (this file - navigation guide)
```

---

## How to Use These Docs

**Quick Understanding (5 min):**
1. Read this index (you're here)
2. Skim "Executive Summary" in COMPREHENSIVE_APP_OVERVIEW.md

**Feature Deep Dive (15 min):**
1. Read APP_FEATURES_OVERVIEW.md top to bottom
2. Check specific feature in Feature Summary table above

**For Development (30 min):**
1. Read COMPREHENSIVE_APP_OVERVIEW.md "Integration Points for Diary Feature"
2. Reference APP_ARCHITECTURE_SUMMARY.md for code organization
3. Use "Related Existing Code" table above for patterns

**Reference During Development:**
- Quick Reference file paths table in COMPREHENSIVE_APP_OVERVIEW.md
- Database schemas in APP_ARCHITECTURE_SUMMARY.md
- File structure in APP_ARCHITECTURE_SUMMARY.md

---

## Key Takeaways

1. **FluentWhisper is metrics-driven**: Sessions → transcription → analysis → vocabulary tracking → dashboards

2. **Diary enhancement is complementary**: Adds personal narrative alongside metrics

3. **Architecture is ready**: Three-layer pattern, database flexible, UI components available

4. **Integration is straightforward**: New diary entry type → new service → new hook → new components

5. **User experience**: Post-session reflection optional (non-intrusive), syncs with existing workflow

---

## Next Steps

For diary enhancement implementation:

1. **Plan**: Use "Integration Points" section of COMPREHENSIVE_APP_OVERVIEW.md
2. **Design**: Reference existing components (calendar, modals, stat cards)
3. **Implement**: Follow three-layer pattern shown in APP_ARCHITECTURE_SUMMARY.md
4. **Test**: Use offline-first approach like existing features
5. **Iterate**: Gather user feedback on reflection prompts, mood options, etc.

---

*All documents created: November 5, 2025*
*FluentWhisper version: approaching v1.0*
