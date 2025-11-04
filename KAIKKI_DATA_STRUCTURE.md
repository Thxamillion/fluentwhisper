# Kaikki.org Wiktionary Data Structure

**Created:** 2025-01-03
**Purpose:** Document how to extract translations from Kaikki JSONL files

---

## Key Insight

**Different Wiktionaries store translation data DIFFERENTLY:**

### Spanish Wiktionary → English Translations
- **Field to use:** `senses[].glosses[]` (English glosses)
- **No `translations` field** (or very rare)

### English Wiktionary → Spanish Translations
- **Field to use:** `translations[]` (with `code: "es"`)
- **Do NOT use `senses[].glosses[]`** (those are English definitions)

This asymmetry is why we need **language-specific extraction logic**.

---

## Data Structure Examples

### Spanish Wiktionary Entry (Spanish → English)

```json
{
  "word": "gato",
  "lang": "Spanish",
  "lang_code": "es",
  "pos": "noun",
  "senses": [
    {
      "glosses": [
        "cat (unspecified gender)"
      ]
    }
  ]
}
```

**Extraction:**
- `lemma_from`: "gato"
- `lang_from`: "es"
- `translation`: "cat (unspecified gender)" → clean to "cat"
- `lang_to`: "en"

### English Wiktionary Entry (English → Spanish)

```json
{
  "word": "cat",
  "lang": "English",
  "lang_code": "en",
  "pos": "noun",
  "senses": [
    {
      "glosses": [
        "A domestic species (Felis catus) of feline animal..."
      ]
    }
  ],
  "translations": [
    {
      "lang": "Spanish",
      "code": "es",
      "lang_code": "es",
      "sense": "domestic species",
      "tags": ["masculine"],
      "word": "gato"
    },
    {
      "lang": "Spanish",
      "code": "es",
      "lang_code": "es",
      "sense": "domestic species",
      "tags": ["feminine"],
      "word": "gata"
    }
  ]
}
```

**Extraction:**
- `lemma_from`: "cat"
- `lang_from`: "en"
- `translation`: "gato" (from `translations[].word` where `code == "es"`)
- `lang_to`: "es"

---

## Extraction Logic

### For Spanish Wiktionary (Spanish → English)
```python
def extract_spanish_to_english(entry):
    word = entry.get('word', '').strip().lower()
    senses = entry.get('senses', [])

    for sense in senses:
        glosses = sense.get('glosses', [])
        for gloss in glosses:
            # Gloss is the English translation
            translation = clean_gloss(gloss)
            yield (word, 'es', translation, 'en')
```

### For English Wiktionary (English → Spanish)
```python
def extract_english_to_spanish(entry):
    word = entry.get('word', '').strip().lower()
    translations = entry.get('translations', [])

    for trans in translations:
        if trans.get('code') == 'es':
            translation = trans.get('word', '').strip().lower()
            yield (word, 'en', translation, 'es')
```

---

## The Bug We Had

### Original (Broken) Code
```python
def extract_translations(jsonl_file, lang_from, lang_to):
    # This worked for Spanish → English
    # But broke for English → Spanish
    senses = entry.get('senses', [])
    for sense in senses:
        glosses = sense.get('glosses', [])
        for gloss in glosses:
            # ❌ For English Wiktionary, glosses are English definitions,
            #    NOT Spanish translations!
            translations.append((word, lang_from, gloss, lang_to))
```

### Result
- **Spanish → English**: ✓ Worked (131,954 translations)
  - `gato` → `cat` (correct)

- **English → Spanish**: ✗ Broken (421,921 "translations")
  - `hello` → `"hello!" or an equivalent greeting.` (English definition, not Spanish!)
  - Should be: `hello` → `hola`

---

## Fixed Extraction Function

```python
def extract_translations(jsonl_file: Path, lang_from: str, lang_to: str) -> list:
    """
    Extract translations from Kaikki JSONL file.

    Handles two cases:
    1. Non-English Wiktionaries: Extract from glosses (English translations)
    2. English Wiktionary: Extract from translations[] array
    """
    translations = []

    # Determine if we're extracting FROM English or TO English
    extracting_from_english = (lang_from == 'en')

    with open(jsonl_file, 'r', encoding='utf-8') as f:
        for line in f:
            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                continue

            word = entry.get('word', '').strip().lower()
            if not word or len(word) == 1:
                continue

            if extracting_from_english:
                # Extract from translations[] array
                trans_list = entry.get('translations', [])
                for trans in trans_list:
                    if trans.get('code') == lang_to:
                        translation = trans.get('word', '').strip().lower()
                        if translation and translation != word:
                            translations.append((word, lang_from, translation, lang_to))
            else:
                # Extract from glosses (English translations)
                senses = entry.get('senses', [])
                for sense in senses:
                    if is_inflected_form_definition(sense):
                        continue

                    glosses = sense.get('glosses', [])
                    for gloss in glosses:
                        if not gloss or is_technical_definition(gloss):
                            continue

                        translation = gloss.strip().lower()
                        if translation and translation != word:
                            translations.append((word, lang_from, translation, lang_to))

    return translations
```

---

## Language-Specific Behavior

### All Non-English Wiktionaries (es, fr, de)
- Use `glosses` for English translations
- Spanish Wiktionary: Spanish → English glosses
- French Wiktionary: French → English glosses
- German Wiktionary: German → English glosses

### English Wiktionary Only
- Use `translations[]` array for foreign language translations
- Filter by `code` field to get target language
- English → Spanish: `translations[].code == "es"`
- English → French: `translations[].code == "fr"`
- English → German: `translations[].code == "de"`

---

## Bidirectional Database Implications

When building bidirectional databases (e.g., `es-en.db`):

1. **Spanish → English** (from Spanish Wiktionary)
   - Extract from `glosses`
   - ~131,954 translations

2. **English → Spanish** (from English Wiktionary)
   - Extract from `translations[]` array where `code == "es"`
   - ~118,342 translations (estimated based on 'cat' having 788 translations total)

3. **Total**: ~250,000 bidirectional translations in one database

---

## Testing the Fix

After fixing the extraction function, verify with SQL queries:

```sql
-- Spanish → English (should work - uses glosses)
SELECT lemma_from, translation
FROM translations
WHERE lemma_from = 'gato' AND lang_from = 'es' AND lang_to = 'en';
-- Expected: gato → cat

-- English → Spanish (should NOW work - uses translations array)
SELECT lemma_from, translation
FROM translations
WHERE lemma_from = 'cat' AND lang_from = 'en' AND lang_to = 'es';
-- Expected: cat → gato, gata, mish, etc.

-- Verify no English definitions snuck in
SELECT * FROM translations
WHERE lang_from = 'en' AND lang_to = 'es' AND translation LIKE '% of %'
LIMIT 10;
-- Expected: No results (no "domestic species of", "a greeting", etc.)
```

---

## Summary

| Wiktionary | Source Language | Target Language | Field to Extract |
|------------|----------------|-----------------|------------------|
| Spanish    | Spanish        | English         | `senses[].glosses[]` |
| English    | English        | Spanish         | `translations[]` where `code == "es"` |
| French     | French         | English         | `senses[].glosses[]` |
| English    | English        | French          | `translations[]` where `code == "fr"` |
| German     | German         | English         | `senses[].glosses[]` |
| English    | English        | German          | `translations[]` where `code == "de"` |

**Key Rule:**
- Extracting **TO English** → use `glosses`
- Extracting **FROM English** → use `translations[]` array

---

**End of Document**
