# Kaikki Translation Extraction Bug Fix

**Created:** 2025-01-03
**Status:** Fixed
**Files Modified:** `scripts/build_translations_bidirectional.py`

---

## Problem Summary

The bidirectional translation script was extracting **English definitions instead of Spanish translations** when processing English Wiktionary data.

### Example of Bug

**Before Fix:**
```sql
SELECT lemma_from, translation
FROM translations
WHERE lemma_from = 'hello' AND lang_from = 'en' AND lang_to = 'es';

Result: hello → "hello!" or an equivalent greeting.
```
❌ This is an **English definition**, not a Spanish translation!

**Expected:**
```sql
Result: hello → hola
```

---

## Root Cause

The script was using **the same extraction logic for all Wiktionaries**, but different Wiktionaries store data differently:

### Spanish Wiktionary (es→en)
- English translations stored in: `senses[].glosses[]`
- Example: `gato` → glosses: `["cat (unspecified gender)"]` ✓ Correct

### English Wiktionary (en→es)
- Spanish translations stored in: `translations[]` array with `code: "es"`
- Example: `cat` → translations: `[{word: "gato", code: "es"}, ...]` ✓ Correct
- Glosses contain: English definitions (NOT translations)

**The bug:** Script was extracting from `glosses` for both directions, which only works for non-English Wiktionaries.

---

## Investigation Process

1. **Built bidirectional database** (`es-en-bidir.db`)
   - 131,954 Spanish→English (correct)
   - 421,921 English→Spanish (incorrect)

2. **Verified with SQL queries**
   - `perro` → `dog` ✓ Works
   - `dog` → No results ❌ Broken
   - `hello` → English definition ❌ Broken

3. **Examined Kaikki data structure**
   - Searched for `cat` in English Wiktionary
   - Found `translations[]` array with proper Spanish words
   - Compared to Spanish Wiktionary structure (uses `glosses`)

4. **Documented findings** in `KAIKKI_DATA_STRUCTURE.md`

---

## The Fix

### Modified `extract_translations()` function

**Key change:** Different extraction strategies based on source language:

```python
def extract_translations(jsonl_file: Path, lang_from: str, lang_to: str) -> list:
    # Determine extraction strategy
    extracting_from_english = (lang_from == 'en')

    if extracting_from_english:
        # Extract FROM English → Use translations[] array
        trans_list = entry.get('translations', [])
        for trans in trans_list:
            if trans.get('code') == lang_to:  # Filter by target language
                translation_word = trans.get('word')
                translations.append((word, lang_from, translation_word, lang_to))

    else:
        # Extract TO English → Use glosses[]
        senses = entry.get('senses', [])
        for sense in senses:
            glosses = sense.get('glosses', [])
            for gloss in glosses:
                translations.append((word, lang_from, gloss, lang_to))
```

---

## Verification

After rebuilding with the fix, verify:

```sql
-- Test 1: Spanish → English (should still work)
SELECT lemma_from, translation
FROM translations
WHERE lemma_from = 'gato' AND lang_from = 'es' AND lang_to = 'en';
-- Expected: gato → cat

-- Test 2: English → Spanish (should NOW work)
SELECT lemma_from, translation
FROM translations
WHERE lemma_from = 'cat' AND lang_from = 'en' AND lang_to = 'es';
-- Expected: cat → gato, gata, mish, etc.

-- Test 3: No English definitions (should be empty)
SELECT * FROM translations
WHERE lang_from = 'en' AND lang_to = 'es'
  AND translation LIKE '% of %'
LIMIT 10;
-- Expected: No results
```

---

## Impact on Other Language Pairs

This fix applies to **all language pairs involving English**:

### Pairs using `glosses` (TO English)
- Spanish → English (`es→en`)
- French → English (`fr→en`)
- German → English (`de→en`)

### Pairs using `translations[]` (FROM English)
- English → Spanish (`en→es`) ← Fixed
- English → French (`en→fr`) ← Will work correctly now
- English → German (`en→de`) ← Will work correctly now

### Pairs NOT involving English (future)
- Spanish ↔ French (`es↔fr`)
- Spanish ↔ German (`es↔de`)
- French ↔ German (`fr↔de`)

**Note:** For non-English pairs, we'll need to extract from `translations[]` in BOTH directions, since neither uses English as an intermediary.

---

## Files Created/Modified

### Created
1. **KAIKKI_DATA_STRUCTURE.md** - Comprehensive documentation of Kaikki data format
2. **KAIKKI_BUG_FIX.md** - This file (bug fix summary)

### Modified
1. **scripts/build_translations_bidirectional.py**
   - `extract_translations()` function rewritten with dual extraction strategies
   - Added debug output showing which strategy is used
   - Line 246-351

---

## Next Steps

1. ✅ Fix extraction bug (DONE)
2. ⏳ Delete old broken database (`translations/es-en-bidir.db`)
3. ⏳ Rebuild `es-en.db` with correct extraction
4. ⏳ Verify with SQL queries
5. ⏳ Replace old `es-en.db` with new bidirectional version
6. ⏳ Build remaining pairs (fr-en, de-en, es-fr, es-de, fr-de)

---

## Lessons Learned

1. **Always examine source data structure first** before writing extraction logic
2. **Different Wiktionaries have different formats** - can't assume uniformity
3. **Test both directions** when building bidirectional databases
4. **Verify with real queries** - don't trust row counts alone

---

**End of Document**
