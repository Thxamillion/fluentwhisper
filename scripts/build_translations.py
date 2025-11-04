#!/usr/bin/env python3
"""
Build translation pack databases from Kaikki.org Wiktionary data.

Usage:
    python scripts/build_translations.py --lang es --target en --output translations/es-en.db

This script:
1. Downloads Spanish Wiktionary JSONL from Kaikki.org
2. Extracts Spanish→English translations
3. Creates SQLite database with translations table
"""

import argparse
import json
import re
import sqlite3
import sys
from pathlib import Path
from urllib.request import urlretrieve
import gzip
import shutil

# Kaikki.org download URLs
KAIKKI_BASE_URL = "https://kaikki.org/dictionary"
KAIKKI_URLS = {
    "Spanish": f"{KAIKKI_BASE_URL}/Spanish/kaikki.org-dictionary-Spanish.jsonl",
    "English": f"{KAIKKI_BASE_URL}/English/kaikki.org-dictionary-English.jsonl",
    "French": f"{KAIKKI_BASE_URL}/French/kaikki.org-dictionary-French.jsonl",
    "German": f"{KAIKKI_BASE_URL}/German/kaikki.org-dictionary-German.jsonl",
}

LANG_CODES = {
    "Spanish": "es",
    "English": "en",
    "French": "fr",
    "German": "de",
}


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
    print(f"This may take a few minutes (file is ~100-200MB)...")

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
        # 'form of',  # Too broad - catches "apocopic form of"
        'plural of',
        'singular of',
        'masculine of',
        'feminine of',
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
    # These patterns should match verb conjugation references, not pronoun definitions
    inflection_patterns = [
        r'\b\w+-person .+? (singular|plural) .+? of \w+$',  # "third-person plural present of hacer"
        r'\b\w+-person .+? of \w+$',  # "third-person of hacer" at end of gloss
        'subjunctive of',
        'indicative of',
        'conditional of',
        'preterite of',
        'imperfect of',
        r'future .+? of \w+',  # "future indicative of hacer"
    ]

    gloss_lower = gloss.lower()

    # Check keyword matches
    if any(keyword in gloss_lower for keyword in inflection_keywords):
        return True

    # Check specific form patterns (catches "form of" in right contexts)
    for pattern in specific_form_patterns:
        if re.search(pattern, gloss_lower):
            return True

    # Check inflection patterns (more specific, using regex)
    for pattern in inflection_patterns:
        if re.search(pattern, gloss_lower):
            return True

    return False


def is_technical_definition(gloss: str, category_names: list = None) -> bool:
    """
    Check if gloss is a technical definition, letter name, or other non-translation.

    Examples to filter out:
    - "The name of the Latin-script letter D/d." (letter definitions)
    - "Freud's concept of the ego" (technical jargon)
    - "a city in Lombardy" (geographic entries)
    - "initialism of América Latina" (abbreviations)

    Args:
        gloss: The gloss text to check
        category_names: List of category name strings (e.g., ["es:Psychoanalysis", "Spanish nouns"])
    """
    # Check category tags first (most reliable)
    if category_names:
        bad_categories = [
            'letter names',  # catches "Latin letter names", "Greek letter names"
            'psychoanalysis',
            'cities',
            'provinces',
            'countries',
            'place names',
            'toponyms',  # place names in some languages
        ]
        for cat_name in category_names:
            if not isinstance(cat_name, str):
                continue
            cat_lower = cat_name.lower()
            if any(bad_cat in cat_lower for bad_cat in bad_categories):
                return True

    # Check gloss text patterns
    technical_patterns = [
        # Letter/alphabet definitions
        'letter of the',
        'name of the letter',  # catches "Name of the letter A."
        'the name of the',
        'called ye',
        'called i griega',
        'called ef',  # Spanish letter names
        'alphabet',
        'written in the latin script',
        'written in the',

        # Technical jargon
        'freud',
        'jung',
        'psychoanalysis',
        'concept of the',

        # Greek/Latin letters
        'greek letter',
        'latin letter',
        'latin-script letter',

        # Linguistic meta-definitions
        'initialism',
        'abbreviation',
        'misspelling',
        'diminutive of',
        'augmentative of',

        # Geographic entries
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
        'county,',  # "como (a town in hertford county,"
        'a country',
        'a region',
    ]

    gloss_lower = gloss.lower()
    return any(pattern in gloss_lower for pattern in technical_patterns)


def extract_translations(jsonl_file: Path, lang_from: str, lang_to: str) -> list:
    """
    Extract translations from Kaikki JSONL file.

    Filters out inflected forms, technical definitions, and letter names.
    Takes up to 3 valid glosses per sense for better coverage.

    Returns list of tuples: (lemma, lang_from, translation, lang_to)
    """
    translations = []
    skipped_inflections = 0
    skipped_technical = 0

    print(f"\nExtracting {lang_from}→{lang_to} translations from {jsonl_file.name}...")

    with open(jsonl_file, 'r', encoding='utf-8') as f:
        for line_num, line in enumerate(f, 1):
            if line_num % 10000 == 0:
                print(f"\rProcessed {line_num:,} entries, found {len(translations):,} translations (skipped {skipped_inflections:,} inflections, {skipped_technical:,} technical)...", end="")

            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                continue

            # Get the word (lemma form)
            word = entry.get('word', '').strip().lower()
            if not word:
                continue

            # Skip single-letter words (likely alphabet entries)
            if len(word) == 1:
                skipped_technical += 1
                continue

            # Extract translations from senses
            senses = entry.get('senses', [])
            for sense in senses:
                glosses = sense.get('glosses', [])

                # Get category information for this sense
                categories = sense.get('categories', [])
                category_names = [cat.get('orig', '') for cat in categories if isinstance(cat, dict)]

                # Check if ANY gloss in this sense is an inflected form reference
                # If so, skip the ENTIRE sense
                if any(is_inflected_form_definition(g) for g in glosses if isinstance(g, str)):
                    skipped_inflections += 1
                    continue

                # Take up to 3 valid glosses per sense
                glosses_added = 0
                for gloss in glosses:
                    if not gloss or not isinstance(gloss, str):
                        continue

                    # Skip technical definitions (letter names, jargon, etc.)
                    if is_technical_definition(gloss, category_names):
                        skipped_technical += 1
                        continue

                    translation = gloss.strip().lower()
                    if translation and translation != word:
                        translations.append((word, lang_from, translation, lang_to))
                        glosses_added += 1

                        # Take up to 3 glosses per sense for better coverage
                        if glosses_added >= 3:
                            break

    print(f"\n✓ Found {len(translations):,} translations")
    print(f"✓ Skipped {skipped_inflections:,} inflected forms")
    print(f"✓ Skipped {skipped_technical:,} technical definitions")
    return translations


def insert_translations(conn: sqlite3.Connection, translations: list):
    """Insert translations into database."""
    cursor = conn.cursor()

    print(f"\nInserting {len(translations):,} translations into database...")

    # Use INSERT OR IGNORE to skip duplicates
    cursor.executemany(
        "INSERT OR IGNORE INTO translations (lemma_from, lang_from, translation, lang_to) VALUES (?, ?, ?, ?)",
        translations
    )

    conn.commit()
    inserted = cursor.rowcount
    print(f"✓ Inserted {inserted:,} unique translations")


def main():
    parser = argparse.ArgumentParser(description="Build translation pack from Kaikki.org data")
    parser.add_argument("--lang", required=True, choices=["es", "en", "fr", "de"],
                        help="Source language code (es, en, fr, de)")
    parser.add_argument("--target", required=True, choices=["es", "en", "fr", "de"],
                        help="Target language code (es, en, fr, de)")
    parser.add_argument("--output", required=True, type=Path,
                        help="Output database path (e.g., translations/es-en.db)")

    args = parser.parse_args()

    # Convert language codes to full names
    code_to_name = {v: k for k, v in LANG_CODES.items()}
    lang_name = code_to_name[args.lang]
    target_name = code_to_name[args.target]

    print(f"Building {lang_name}→{target_name} translation pack")
    print("=" * 60)

    # Create directories
    scripts_dir = Path(__file__).parent
    args.output.parent.mkdir(parents=True, exist_ok=True)

    # Download Kaikki data
    jsonl_file = download_kaikki_data(lang_name, scripts_dir)

    # Extract translations
    translations = extract_translations(jsonl_file, args.lang, args.target)

    if not translations:
        print("✗ No translations found!")
        sys.exit(1)

    # Create database and insert
    print(f"\nCreating database: {args.output}")
    conn = create_translation_db(args.output)
    insert_translations(conn, translations)

    # Print stats
    cursor = conn.cursor()
    count = cursor.execute("SELECT COUNT(*) FROM translations").fetchone()[0]
    db_size = args.output.stat().st_size / (1024 * 1024)  # MB

    print("\n" + "=" * 60)
    print("✓ Translation pack built successfully!")
    print(f"  Database: {args.output}")
    print(f"  Translations: {count:,}")
    print(f"  File size: {db_size:.2f} MB")
    print("=" * 60)

    conn.close()


if __name__ == "__main__":
    main()
