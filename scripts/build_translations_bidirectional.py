#!/usr/bin/env python3
"""
Build BIDIRECTIONAL translation pack databases from Kaikki.org Wiktionary data.

This script creates a single database containing translations in BOTH directions,
ensuring consistent coverage and avoiding asymmetric translation quality.

Usage:
    python scripts/build_translations_bidirectional.py --pair es-en --output translations/es-en.db

This script:
1. Downloads BOTH language Wiktionaries from Kaikki.org
2. Extracts translations in BOTH directions (es→en AND en→es)
3. Creates a single SQLite database with all translations
4. Ensures reverse lookups always work

Example:
    # Build es-en.db with BOTH Spanish→English AND English→Spanish
    python scripts/build_translations_bidirectional.py --pair es-en --output translations/es-en.db

    # The database will contain:
    # - Spanish→English translations from Spanish Wiktionary
    # - English→Spanish translations from English Wiktionary
    # - Both stored in the same table, queryable either direction
"""

import argparse
import json
import re
import sqlite3
import sys
from pathlib import Path
from urllib.request import urlretrieve

# Kaikki.org download URLs
KAIKKI_BASE_URL = "https://kaikki.org/dictionary"
KAIKKI_URLS = {
    "Spanish": f"{KAIKKI_BASE_URL}/Spanish/kaikki.org-dictionary-Spanish.jsonl",
    "English": f"{KAIKKI_BASE_URL}/English/kaikki.org-dictionary-English.jsonl",
    "French": f"{KAIKKI_BASE_URL}/French/kaikki.org-dictionary-French.jsonl",
    "German": f"{KAIKKI_BASE_URL}/German/kaikki.org-dictionary-German.jsonl",
    "Italian": f"{KAIKKI_BASE_URL}/Italian/kaikki.org-dictionary-Italian.jsonl",
}

LANG_CODES = {
    "Spanish": "es",
    "English": "en",
    "French": "fr",
    "German": "de",
    "Italian": "it",
}

LANG_NAMES = {v: k for k, v in LANG_CODES.items()}


def download_kaikki_data(language: str, output_dir: Path) -> Path:
    """Download Kaikki dictionary data for a language."""
    if language not in KAIKKI_URLS:
        raise ValueError(f"Unsupported language: {language}. Choose from {list(KAIKKI_URLS.keys())}")

    url = KAIKKI_URLS[language]
    output_file = output_dir / f"kaikki-{language.lower()}.jsonl"

    if output_file.exists():
        print(f"✓ {language} dictionary already downloaded: {output_file}")
        return output_file

    print(f"Downloading {language} dictionary from Kaikki.org...")
    print(f"URL: {url}")
    print(f"This may take a few minutes (file is ~100-2600MB)...")

    try:
        urlretrieve(url, output_file, reporthook=download_progress)
        print(f"\n✓ Downloaded to: {output_file}")
        return output_file
    except Exception as e:
        print(f"\n✗ Download failed: {e}")
        sys.exit(1)


def download_progress(block_num, block_size, total_size):
    """Display download progress."""
    downloaded = block_num * block_size
    if total_size > 0:
        percent = min(downloaded * 100 / total_size, 100)
        mb_downloaded = downloaded / (1024 * 1024)
        mb_total = total_size / (1024 * 1024)
        print(f"\rDownloading: {percent:.1f}% ({mb_downloaded:.1f} MB / {mb_total:.1f} MB)", end="")


def create_translation_db(db_path: Path):
    """Create empty translation database with schema."""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Same schema as before - no changes needed!
    # The bidirectional approach just populates it with data from both directions
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS translations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            lemma_from TEXT NOT NULL,
            lang_from TEXT NOT NULL,
            translation TEXT NOT NULL,
            lang_to TEXT NOT NULL,
            UNIQUE(lemma_from, lang_from, translation, lang_to)
        )
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_translations_lookup
        ON translations(lemma_from, lang_from, lang_to)
    """)

    conn.commit()
    return conn


def is_inflected_form_definition(gloss: str) -> bool:
    """
    Check if gloss is just an inflected form reference (not a real translation).

    Examples to filter out:
    - "inflection of correr:"
    - "third-person plural future indicative of muñir"
    - "gerund of acoderar combined with las"
    - "masculine plural of limeño"

    Examples to KEEP:
    - "first-person singular pronoun; I" (this is a translation, not an inflection)
    - "to be" (this is a translation)
    """
    inflection_keywords = [
        'inflection of',
        'plural of',
        'singular of',
        'masculine of',
        'feminine of',
        'neuter of',
        'genitive of',
        'dative of',
        'nominative of',
        'accusative of',
        'past participle of',
        'gerund of',
        'present participle of',
        'imperative of',
        'combined with',
        'alternative spelling of',
        'alternative form of',
        'obsolete spelling of',
        'archaic form of',
        'female equivalent',
        'male equivalent',
        'voseo',
    ]

    # More specific patterns for "form of" that ARE inflections
    specific_form_patterns = [
        r'\b(superlative|comparative|diminutive|augmentative) form of\b',
        r'\b(short|long|contracted|elided) form of\b',
    ]

    # Special patterns that indicate inflections (more specific than keywords)
    inflection_patterns = [
        r'\b\w+-person .+? (singular|plural) .+? of \w+$',
        r'\b\w+-person .+? of \w+$',
        'subjunctive of',
        'indicative of',
        'conditional of',
        'preterite of',
        'imperfect of',
        r'future .+? of \w+',
    ]

    # German-style grammatical form descriptions (without "X of Y" pattern)
    # These describe the inflection directly without mentioning the base form
    german_inflection_patterns = [
        # Case/number/gender patterns
        r'^(weak|strong|mixed)(/\w+)* (nominative|genitive|dative|accusative)',
        r'^(nominative|genitive|dative|accusative) (singular|plural)',
        r'\b(singular|plural) (nominative|genitive|dative|accusative)\b',

        # Multi-case patterns (nominative/accusative/genitive)
        r'(nominative|genitive|dative|accusative)/(nominative|genitive|dative|accusative)',

        # Degree patterns
        r'^(comparative|superlative) degree',
        r'\b(comparative|superlative) degree of\b',

        # Person/number/tense patterns (without "of")
        r'^(first|second|third)-person (singular|plural)',
        r'\b(first|second|third)-person .+? (present|past|future|subjunctive|imperative|preterite)$',

        # Multi-person patterns (first/third-person)
        r'(first|second|third)/(first|second|third)-person',

        # All-case patterns
        r'\ball-case (singular|plural)\b',
        r'\ball-gender (singular|plural)\b',

        # Imperative forms
        r'^(singular|plural) imperative$',

        # Combined case descriptions
        r'^(weak|strong|mixed) .+? (singular|plural) (comparative|superlative)',

        # Patterns with "degree of" at the end
        r'\b(comparative|superlative|positive) degree of \w+$',

        # Dependent forms
        r'\bdependent (subjunctive|preterite|imperative)\b',
    ]

    gloss_lower = gloss.lower()

    if any(keyword in gloss_lower for keyword in inflection_keywords):
        return True

    for pattern in specific_form_patterns:
        if re.search(pattern, gloss_lower):
            return True

    for pattern in inflection_patterns:
        if re.search(pattern, gloss_lower):
            return True

    for pattern in german_inflection_patterns:
        if re.search(pattern, gloss_lower):
            return True

    return False


def is_technical_definition(gloss: str, category_names: list = None) -> bool:
    """
    Check if gloss is a technical definition, letter name, or other non-translation.
    """
    if category_names:
        bad_categories = [
            'letter names',
            'psychoanalysis',
            'cities',
            'provinces',
            'countries',
            'place names',
            'toponyms',
        ]
        for cat_name in category_names:
            if not isinstance(cat_name, str):
                continue
            cat_lower = cat_name.lower()
            if any(bad_cat in cat_lower for bad_cat in bad_categories):
                return True

    technical_patterns = [
        'letter of the',
        'name of the letter',
        'the name of the',
        'called ye',
        'called i griega',
        'called ef',
        'alphabet',
        'written in the latin script',
        'written in the',
        'freud',
        'jung',
        'psychoanalysis',
        'concept of the',
        'greek letter',
        'latin letter',
        'latin-script letter',
        'initialism',
        'abbreviation',
        'misspelling',
        'diminutive of',
        'augmentative of',
        'a city',
        'a suburb',
        'a town',
        'a village',
        'a census-designated place',
        'a comune',
        'a province',
        'capital of',
        'a state of',
        'a number of places',
        'county,',
        'a country',
        'a region',
    ]

    gloss_lower = gloss.lower()
    return any(pattern in gloss_lower for pattern in technical_patterns)


def extract_translations(jsonl_file: Path, lang_from: str, lang_to: str) -> list:
    """
    Extract translations from Kaikki JSONL file.

    Handles two cases:
    1. Extracting FROM English: Use translations[] array (e.g., en→es, en→fr)
    2. Extracting TO English: Use glosses[] (e.g., es→en, fr→en)

    Filters out inflected forms, technical definitions, and letter names.
    Takes up to 3 valid translations per sense for better coverage.

    Returns list of tuples: (lemma, lang_from, translation, lang_to)
    """
    translations = []
    skipped_inflections = 0
    skipped_technical = 0

    # Determine extraction strategy
    extracting_from_english = (lang_from == 'en')

    print(f"\nExtracting {lang_from}→{lang_to} translations from {jsonl_file.name}...")
    if extracting_from_english:
        print(f"Strategy: Using 'translations' array (filtering by code='{lang_to}')")
    else:
        print(f"Strategy: Using 'glosses' (English definitions)")

    with open(jsonl_file, 'r', encoding='utf-8') as f:
        for line_num, line in enumerate(f, 1):
            if line_num % 10000 == 0:
                print(f"\rProcessed {line_num:,} entries, found {len(translations):,} translations (skipped {skipped_inflections:,} inflections, {skipped_technical:,} technical)...", end="")

            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                continue

            word = entry.get('word', '').strip().lower()
            if not word:
                continue

            # Skip single-letter words (likely alphabet entries)
            if len(word) == 1:
                skipped_technical += 1
                continue

            if extracting_from_english:
                # Extract from translations[] array (English → Foreign Language)
                trans_list = entry.get('translations', [])

                # Take up to 3 translations per entry
                translations_added = 0
                for trans in trans_list:
                    if trans.get('code') != lang_to:
                        continue

                    translation_word = trans.get('word', '').strip().lower()
                    if not translation_word or translation_word == word:
                        continue

                    # Skip if single-letter (alphabet entries)
                    if len(translation_word) == 1:
                        skipped_technical += 1
                        continue

                    translations.append((word, lang_from, translation_word, lang_to))
                    translations_added += 1

                    if translations_added >= 3:
                        break

            else:
                # Extract from glosses[] (Foreign Language → English)
                senses = entry.get('senses', [])
                for sense in senses:
                    glosses = sense.get('glosses', [])

                    categories = sense.get('categories', [])
                    category_names = [cat.get('orig', '') for cat in categories if isinstance(cat, dict)]

                    # Take up to 3 valid glosses per sense
                    # Changed: Skip individual inflection glosses, not the whole sense
                    glosses_added = 0
                    for gloss in glosses:
                        if not gloss or not isinstance(gloss, str):
                            continue

                        # Skip individual inflection definitions
                        if is_inflected_form_definition(gloss):
                            skipped_inflections += 1
                            continue

                        if is_technical_definition(gloss, category_names):
                            skipped_technical += 1
                            continue

                        translation = gloss.strip().lower()
                        if translation and translation != word:
                            translations.append((word, lang_from, translation, lang_to))
                            glosses_added += 1

                            if glosses_added >= 3:
                                break

    print(f"\n✓ Found {len(translations):,} translations")
    print(f"✓ Skipped {skipped_inflections:,} inflected forms")
    print(f"✓ Skipped {skipped_technical:,} technical definitions")
    return translations


def reverse_translations(translations: list) -> list:
    """
    Reverse translation tuples to create opposite direction translations.

    Example: ('perro', 'es', 'dog', 'en') → ('dog', 'en', 'perro', 'es')

    This allows augmenting sparse translation directions by reversing
    the richer direction. Handles many-to-one mappings gracefully.

    Args:
        translations: List of (lemma_from, lang_from, translation, lang_to) tuples

    Returns:
        List of reversed tuples: (translation, lang_to, lemma_from, lang_from)
    """
    reversed_trans = []
    for lemma_from, lang_from, translation, lang_to in translations:
        # Swap: translation becomes the source lemma, original lemma becomes translation
        reversed_trans.append((translation, lang_to, lemma_from, lang_from))
    return reversed_trans


def insert_translations(conn: sqlite3.Connection, translations: list, direction: str):
    """Insert translations into database."""
    cursor = conn.cursor()

    print(f"\nInserting {len(translations):,} {direction} translations into database...")

    # Use INSERT OR IGNORE to skip duplicates
    cursor.executemany(
        "INSERT OR IGNORE INTO translations (lemma_from, lang_from, translation, lang_to) VALUES (?, ?, ?, ?)",
        translations
    )

    conn.commit()
    inserted = cursor.rowcount
    print(f"✓ Inserted {inserted:,} unique {direction} translations")


def main():
    parser = argparse.ArgumentParser(
        description="Build BIDIRECTIONAL translation pack from Kaikki.org data",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Build Spanish-English (both directions)
  python scripts/build_translations_bidirectional.py --pair es-en --output translations/es-en.db

  # Build French-German (both directions)
  python scripts/build_translations_bidirectional.py --pair fr-de --output translations/fr-de.db

Note: The pair order doesn't matter (es-en is the same as en-es).
      Both directions will be included in the database.
        """
    )
    parser.add_argument(
        "--pair",
        required=True,
        help="Language pair (e.g., 'es-en', 'fr-de', 'de-en')"
    )
    parser.add_argument(
        "--output",
        required=True,
        type=Path,
        help="Output database path (e.g., translations/es-en.db)"
    )

    args = parser.parse_args()

    # Parse language pair
    parts = args.pair.lower().split('-')
    if len(parts) != 2:
        print(f"✗ Invalid language pair: {args.pair}")
        print("  Expected format: 'es-en' or 'fr-de'")
        sys.exit(1)

    lang1, lang2 = parts
    if lang1 not in LANG_NAMES or lang2 not in LANG_NAMES:
        print(f"✗ Invalid language codes: {lang1}, {lang2}")
        print(f"  Supported codes: {list(LANG_NAMES.keys())}")
        sys.exit(1)

    lang1_name = LANG_NAMES[lang1]
    lang2_name = LANG_NAMES[lang2]

    print("=" * 80)
    print(f"Building BIDIRECTIONAL translation pack: {lang1_name} ↔ {lang2_name}")
    print("=" * 80)
    print(f"\nThis will create a single database containing:")
    print(f"  • {lang1_name} → {lang2_name} translations")
    print(f"  • {lang2_name} → {lang1_name} translations")
    print(f"\nBoth directions can be queried from the same database.")
    print("=" * 80)

    # Create directories
    scripts_dir = Path(__file__).parent
    args.output.parent.mkdir(parents=True, exist_ok=True)

    # Download both Wiktionaries
    print(f"\n[1/5] Downloading {lang1_name} Wiktionary...")
    jsonl_file1 = download_kaikki_data(lang1_name, scripts_dir)

    print(f"\n[2/5] Downloading {lang2_name} Wiktionary...")
    jsonl_file2 = download_kaikki_data(lang2_name, scripts_dir)

    # Extract translations in both directions
    print(f"\n[3/5] Extracting {lang1_name} → {lang2_name} translations...")
    translations1 = extract_translations(jsonl_file1, lang1, lang2)

    print(f"\n[4/5] Extracting {lang2_name} → {lang1_name} translations...")
    translations2 = extract_translations(jsonl_file2, lang2, lang1)

    if not translations1 and not translations2:
        print("✗ No translations found in either direction!")
        sys.exit(1)

    # Augment sparse directions by reversing the richer direction
    print(f"\n[4.5/5] Checking for sparse translations to augment...")
    SPARSE_THRESHOLD = 10000  # Consider <10k translations as "sparse"
    RICH_THRESHOLD = 100000   # Consider >100k translations as "rich"

    original_count1 = len(translations1)
    original_count2 = len(translations2)

    if original_count1 < SPARSE_THRESHOLD and original_count2 > RICH_THRESHOLD:
        print(f"  ⚠️  {lang1}→{lang2} has only {original_count1:,} translations (sparse)")
        print(f"  ✓ {lang2}→{lang1} has {original_count2:,} translations (rich)")
        print(f"  → Augmenting {lang1}→{lang2} by reversing {lang2}→{lang1}...")
        reversed = reverse_translations(translations2)
        translations1.extend(reversed)
        print(f"  ✓ Augmented {lang1}→{lang2}: {original_count1:,} → {len(translations1):,} translations (+{len(reversed):,})")

    elif original_count2 < SPARSE_THRESHOLD and original_count1 > RICH_THRESHOLD:
        print(f"  ⚠️  {lang2}→{lang1} has only {original_count2:,} translations (sparse)")
        print(f"  ✓ {lang1}→{lang2} has {original_count1:,} translations (rich)")
        print(f"  → Augmenting {lang2}→{lang1} by reversing {lang1}→{lang2}...")
        reversed = reverse_translations(translations1)
        translations2.extend(reversed)
        print(f"  ✓ Augmented {lang2}→{lang1}: {original_count2:,} → {len(translations2):,} translations (+{len(reversed):,})")

    else:
        print(f"  ✓ Both directions have reasonable coverage:")
        print(f"    • {lang1}→{lang2}: {original_count1:,}")
        print(f"    • {lang2}→{lang1}: {original_count2:,}")
        print(f"  → No augmentation needed")

    # Create database and insert both directions
    print(f"\n[5/5] Creating database: {args.output}")
    conn = create_translation_db(args.output)

    insert_translations(conn, translations1, f"{lang1_name}→{lang2_name}")
    insert_translations(conn, translations2, f"{lang2_name}→{lang1_name}")

    # Print stats
    cursor = conn.cursor()
    total_count = cursor.execute("SELECT COUNT(*) FROM translations").fetchone()[0]
    count_dir1 = cursor.execute(
        "SELECT COUNT(*) FROM translations WHERE lang_from = ? AND lang_to = ?",
        (lang1, lang2)
    ).fetchone()[0]
    count_dir2 = cursor.execute(
        "SELECT COUNT(*) FROM translations WHERE lang_from = ? AND lang_to = ?",
        (lang2, lang1)
    ).fetchone()[0]
    db_size = args.output.stat().st_size / (1024 * 1024)  # MB

    print("\n" + "=" * 80)
    print("✓ BIDIRECTIONAL translation pack built successfully!")
    print("=" * 80)
    print(f"  Database: {args.output}")
    print(f"  Total translations: {total_count:,}")
    print(f"    • {lang1_name} → {lang2_name}: {count_dir1:,}")
    print(f"    • {lang2_name} → {lang1_name}: {count_dir2:,}")
    print(f"  File size: {db_size:.2f} MB")
    print("=" * 80)
    print(f"\n✓ You can now query translations in BOTH directions from this single database!")
    print(f"  Example: lookup('perro', 'es', 'en') → 'dog'")
    print(f"  Example: lookup('dog', 'en', 'es') → 'perro'")
    print("=" * 80)

    conn.close()


if __name__ == "__main__":
    main()
