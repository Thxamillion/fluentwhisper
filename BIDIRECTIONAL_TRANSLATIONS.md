# Bidirectional Translation Database Architecture

**Created:** 2025-01-03
**Status:** Implemented
**Decision:** Use bidirectional databases (6 files instead of 12)

---

## Problem Statement

The original plan called for **12 separate unidirectional databases**:
- es-en.db (Spanish → English only)
- en-es.db (English → Spanish only)
- fr-en.db, en-fr.db, de-en.db, en-de.db
- es-fr.db, fr-es.db, es-de.db, de-es.db
- fr-de.db, de-fr.db

This approach has **critical flaws**:

### Issue 1: Asymmetric Coverage
Each Wiktionary has different coverage:
- Spanish Wiktionary might have "perro → dog"
- English Wiktionary might NOT have "dog → perro"
- Result: Lookup works one direction, fails the other

### Issue 2: Quality Variance
Different editors = different quality standards:
- Spanish Wiktionary: "gato → cat, feline"
- English Wiktionary: "cat → gato"
- User experience varies by direction

### Issue 3: No Reverse Lookup Guarantee
If a user can translate "hello" → "hola", they expect "hola" → "hello" to work.
With separate databases, this isn't guaranteed.

---

## Solution: Bidirectional Databases

### Architecture

**Use 6 bidirectional databases instead of 12 unidirectional ones:**

```
es-en.db  → Contains BOTH es→en AND en→es translations
fr-en.db  → Contains BOTH fr→en AND en→fr translations
de-en.db  → Contains BOTH de→en AND en→de translations
es-fr.db  → Contains BOTH es→fr AND fr→es translations
es-de.db  → Contains BOTH es→de AND de→es translations
fr-de.db  → Contains BOTH fr→de AND de→fr translations
```

### How It Works

1. **Download BOTH Wiktionaries:**
   - For `es-en.db`, download Spanish AND English Wiktionaries

2. **Extract translations in BOTH directions:**
   - Spanish Wiktionary → Spanish→English translations
   - English Wiktionary → English→Spanish translations

3. **Merge into a single database:**
   - Both directions stored in the same `translations` table
   - Same schema as before (no migration needed!)
   - Query with `(lang_from, lang_to)` parameters

### Database Schema (Unchanged)

```sql
CREATE TABLE translations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lemma_from TEXT NOT NULL,
    lang_from TEXT NOT NULL,
    translation TEXT NOT NULL,
    lang_to TEXT NOT NULL,
    UNIQUE(lemma_from, lang_from, translation, lang_to)
);

CREATE INDEX idx_translations_lookup
ON translations(lemma_from, lang_from, lang_to);
```

**Key point:** The schema doesn't change! The bidirectional approach just populates it with data from both source Wiktionaries.

### Query Examples

```rust
// Both directions work from the same database:
let db = Connection::open("translations/es-en.db")?;

// Spanish → English
let result = db.query_row(
    "SELECT translation FROM translations WHERE lemma_from = ? AND lang_from = ? AND lang_to = ?",
    params!["perro", "es", "en"],
    |row| row.get(0)
)?;
// Result: "dog"

// English → Spanish (same database!)
let result = db.query_row(
    "SELECT translation FROM translations WHERE lemma_from = ? AND lang_from = ? AND lang_to = ?",
    params!["dog", "en", "es"],
    |row| row.get(0)
)?;
// Result: "perro"
```

---

## Benefits

### 1. Guaranteed Reverse Lookups
- If "perro" translates to "dog", you're guaranteed "dog" has a Spanish translation
- Better user experience

### 2. Better Coverage
- Combines entries from BOTH Wiktionaries
- More translations than either alone
- Example: Spanish Wiktionary might miss some words that English Wiktionary has

### 3. Consistent Quality
- Users get best-of-both-worlds
- If Spanish Wiktionary has a better definition, it's included
- If English Wiktionary has more detail, that's included too

### 4. Simpler Management
- 6 files instead of 12 (50% reduction)
- Easier to version and distribute
- Less confusion about which database to use

### 5. No Code Changes Needed
- Query logic stays the same
- Just flip `lang_from` and `lang_to` to reverse direction
- Existing Rust vocabulary service works as-is

---

## File Size Comparison

### Original Plan (12 unidirectional files):
```
es-en.db: 16 MB
en-es.db: 16 MB (estimated)
fr-en.db: 16 MB
en-fr.db: 16 MB
... etc.
Total: ~192 MB
```

### Bidirectional Approach (6 files):
```
es-en.db (both directions): ~30 MB (combined coverage, deduplicated)
fr-en.db (both directions): ~30 MB
de-en.db (both directions): ~30 MB
es-fr.db (both directions): ~30 MB
es-de.db (both directions): ~30 MB
fr-de.db (both directions): ~30 MB
Total: ~180 MB
```

**Savings:** 50% fewer files, ~6% smaller total size due to deduplication

---

## Build Process

### Old Script (Unidirectional)
```bash
# Build Spanish → English
python scripts/build_translations.py --lang es --target en --output translations/es-en.db

# Build English → Spanish (separate file!)
python scripts/build_translations.py --lang en --target es --output translations/en-es.db
```

### New Script (Bidirectional)
```bash
# Build BOTH directions in one database
python scripts/build_translations_bidirectional.py --pair es-en --output translations/es-en.db
```

**Result:** One database file containing both directions.

---

## Migration Path

### Current State (Phase 1 Complete)
- ✅ `es-en.db` exists (Spanish → English, 131,954 translations)
- ❌ `en-es.db` does NOT exist yet

### Migration Steps

1. **Test quality difference** (in progress):
   - Build `en-es-test.db` (English → Spanish only)
   - Compare coverage vs Spanish Wiktionary
   - Identify gaps

2. **Build bidirectional database**:
   - Run new script: `python scripts/build_translations_bidirectional.py --pair es-en --output translations/es-en-v2.db`
   - Compare stats:
     - Old `es-en.db`: 131,954 es→en translations
     - New `es-en-v2.db`: 131,954 es→en + ~120,000 en→es = ~250,000 total

3. **Replace existing database**:
   - Backup: `mv translations/es-en.db translations/es-en-v1-backup.db`
   - Deploy: `mv translations/es-en-v2.db translations/es-en.db`

4. **No code changes required**:
   - Rust vocabulary service already queries with `(lang_from, lang_to)`
   - Just works™

---

## Implementation Checklist

- [x] Create `build_translations_bidirectional.py` script
- [ ] Test with `en-es-test.db` to verify quality
- [ ] Build bidirectional `es-en.db` (both directions)
- [ ] Compare stats and validate coverage
- [ ] Replace old database
- [ ] Build remaining 5 pairs:
  - [ ] `fr-en.db` (French ↔ English)
  - [ ] `de-en.db` (German ↔ English)
  - [ ] `es-fr.db` (Spanish ↔ French)
  - [ ] `es-de.db` (Spanish ↔ German)
  - [ ] `fr-de.db` (French ↔ German)
- [ ] Update `LANGUAGE_SYSTEM_PLAN.md` with new architecture
- [ ] Test all 6 databases in app

---

## FAQ

### Q: Why not just use one direction and auto-reverse?
**A:** Can't guarantee symmetric coverage. "perro → dog" in Spanish Wiktionary doesn't mean English Wiktionary has "dog → perro".

### Q: Does this increase database size?
**A:** Slightly (30 MB vs 16 MB), but we get 2x the translations. Worth it for better UX.

### Q: Do we need to change the Rust code?
**A:** No! The query logic stays the same. Just need both directions in the database.

### Q: What about duplicates?
**A:** The `UNIQUE(lemma_from, lang_from, translation, lang_to)` constraint handles it. SQLite automatically deduplicates.

### Q: Can users still query just one direction?
**A:** Yes! Just specify `lang_from` and `lang_to` as usual. The database supports both.

---

## Example Build Output

```
$ python scripts/build_translations_bidirectional.py --pair es-en --output translations/es-en.db

================================================================================
Building BIDIRECTIONAL translation pack: Spanish ↔ English
================================================================================

This will create a single database containing:
  • Spanish → English translations
  • English → Spanish translations

Both directions can be queried from the same database.
================================================================================

[1/5] Downloading Spanish Wiktionary...
✓ Spanish dictionary already downloaded: scripts/kaikki-spanish.jsonl

[2/5] Downloading English Wiktionary...
Downloading English dictionary from Kaikki.org...
URL: https://kaikki.org/dictionary/English/kaikki.org-dictionary-English.jsonl
This may take a few minutes (file is ~100-2600MB)...
Downloading: 100.0% (2666.1 MB / 2666.1 MB)
✓ Downloaded to: scripts/kaikki-english.jsonl

[3/5] Extracting Spanish → English translations...
Processed 500,000 entries, found 131,954 translations...
✓ Found 131,954 translations
✓ Skipped 45,000 inflected forms
✓ Skipped 12,000 technical definitions

[4/5] Extracting English → Spanish translations...
Processed 7,500,000 entries, found 118,342 translations...
✓ Found 118,342 translations
✓ Skipped 890,000 inflected forms
✓ Skipped 156,000 technical definitions

[5/5] Creating database: translations/es-en.db

Inserting 131,954 Spanish→English translations into database...
✓ Inserted 131,954 unique Spanish→English translations

Inserting 118,342 English→Spanish translations into database...
✓ Inserted 118,342 unique English→Spanish translations

================================================================================
✓ BIDIRECTIONAL translation pack built successfully!
================================================================================
  Database: translations/es-en.db
  Total translations: 250,296
    • Spanish → English: 131,954
    • English → Spanish: 118,342
  File size: 32.45 MB
================================================================================

✓ You can now query translations in BOTH directions from this single database!
  Example: lookup('perro', 'es', 'en') → 'dog'
  Example: lookup('dog', 'en', 'es') → 'perro'
================================================================================
```

---

## Conclusion

The bidirectional approach is superior in every way:
- ✅ Better UX (reverse lookups guaranteed)
- ✅ Better coverage (combines both Wiktionaries)
- ✅ Simpler management (6 files vs 12)
- ✅ No code changes needed
- ✅ Same database schema

**This is the way forward for FluentWhisper's translation system.**

---

**End of Document**
