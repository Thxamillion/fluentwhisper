# Language Pack Build Scripts

Scripts to generate translation databases from Kaikki.org Wiktionary data.

## build_translations.py

Builds bidirectional translation packs from Kaikki.org JSONL data.

### Usage

```bash
# Spanish→English
python scripts/build_translations.py --lang es --target en --output translations/es-en.db

# French→English
python scripts/build_translations.py --lang fr --target en --output translations/fr-en.db

# German→English
python scripts/build_translations.py --lang de --target en --output translations/de-en.db
```

### What it does

1. Downloads Wiktionary data from Kaikki.org (~860MB for Spanish)
2. Extracts word→translation pairs from JSONL
3. Creates SQLite database with `translations` table
4. Indexes for fast lookups

### Output

- **File:** `translations/{lang}-{target}.db`
- **Size:** ~90-100MB per language pair
- **Translations:** 700k-800k entries per language

### Requirements

- Python 3.7+
- Standard library only (no pip dependencies)

### Example Results

**Spanish→English (`translations/es-en.db`)**
- 752,871 translations
- 93 MB file size
- Includes: estar→"to be", correr→"to run", casa→"house"

### Data Source

- **Kaikki.org** - Free Wiktionary extracts
- **License:** Creative Commons (Wiktionary data)
- **URL:** https://kaikki.org/dictionary/rawdata.html

### Notes

- Downloaded JSONL files are cached in `scripts/` directory
- Re-running the script will skip download if file exists
- Large files are git-ignored (see `.gitignore`)
