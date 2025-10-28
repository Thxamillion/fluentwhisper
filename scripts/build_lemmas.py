#!/usr/bin/env python3
"""
Build lemmatization databases from SpaCy language models.

Usage:
    python scripts/build_lemmas.py --language es --output langpacks/es/lemmas.db
    python scripts/build_lemmas.py --language en --output langpacks/en/lemmas.db

This script:
1. Uses SpaCy to generate lemmatization mappings
2. Extracts word forms and their base forms
3. Creates SQLite database with lemmas table
"""

import argparse
import sqlite3
import sys
from pathlib import Path

# SpaCy model names
SPACY_MODELS = {
    "es": "es_core_news_sm",  # Spanish
    "en": "en_core_web_sm",   # English
    "fr": "fr_core_news_sm",  # French
    "de": "de_core_news_sm",  # German
}


def check_spacy_installed():
    """Check if spacy is installed."""
    try:
        import spacy
        return True
    except ImportError:
        return False


def check_model_installed(model_name: str):
    """Check if a SpaCy model is installed."""
    try:
        import spacy
        spacy.load(model_name)
        return True
    except OSError:
        return False


def install_instructions(lang: str):
    """Print installation instructions."""
    model = SPACY_MODELS[lang]
    print("\n" + "=" * 60)
    print("SpaCy not installed or model missing!")
    print("=" * 60)
    print("\nTo install SpaCy and the language model, run:\n")
    print(f"  pip3 install spacy")
    print(f"  python3 -m spacy download {model}")
    print("\nOr install all models at once:")
    print(f"  pip3 install spacy")
    for lang_code, model_name in SPACY_MODELS.items():
        print(f"  python3 -m spacy download {model_name}")
    print("=" * 60 + "\n")


def create_lemma_db(db_path: Path):
    """Create empty lemmatization database with schema."""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS lemmas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            word TEXT NOT NULL UNIQUE,
            lemma TEXT NOT NULL,
            pos TEXT
        )
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_lemmas_word ON lemmas(word)
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_lemmas_lemma ON lemmas(lemma)
    """)

    conn.commit()
    return conn


def generate_lemmas_from_spacy(lang: str, model_name: str) -> list:
    """
    Generate lemmatization mappings using SpaCy.

    Returns list of tuples: (word, lemma, pos)
    """
    import spacy

    print(f"\nLoading SpaCy model: {model_name}...")
    nlp = spacy.load(model_name)

    print(f"Extracting lemmatization rules from {model_name}...")

    lemma_mappings = []

    # Get lemmatizer from the model
    if not nlp.has_pipe("lemmatizer"):
        print("Warning: Model doesn't have a lemmatizer component!")
        return []

    # Extract vocabulary and lemmatization rules
    vocab = nlp.vocab

    print("Generating lemma mappings from vocabulary...")

    # Process common word forms to build lemmatization table
    # We'll use the model's existing lemmatization rules
    for word in vocab.strings:
        if not word or len(word) < 2:
            continue

        # Process the word through SpaCy to get its lemma
        doc = nlp(word)
        if len(doc) == 1:  # Single token
            token = doc[0]
            lemma = token.lemma_.lower()
            pos = token.pos_

            # Only add if lemma is different from word
            if lemma != word.lower():
                lemma_mappings.append((word.lower(), lemma, pos))

    print(f"✓ Generated {len(lemma_mappings):,} lemmatization rules")
    return lemma_mappings


def enhance_with_kaikki_lemmas(lang: str, lemma_mappings: list) -> list:
    """
    Enhance lemmatization using our existing Kaikki data.

    The Kaikki JSONL files have better coverage than SpaCy for verb conjugations.
    """
    scripts_dir = Path(__file__).parent
    jsonl_file = scripts_dir / f"kaikki-{lang.lower()}.jsonl"

    if not jsonl_file.exists():
        print(f"Note: {jsonl_file.name} not found, skipping Kaikki enhancement")
        return lemma_mappings

    print(f"\nEnhancing with lemmatization data from {jsonl_file.name}...")

    import json

    kaikki_lemmas = []

    with open(jsonl_file, 'r', encoding='utf-8') as f:
        for line_num, line in enumerate(f, 1):
            if line_num % 50000 == 0:
                print(f"\rProcessed {line_num:,} entries, found {len(kaikki_lemmas):,} lemma mappings...", end="")

            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                continue

            word = entry.get('word', '').strip().lower()
            if not word:
                continue

            # Check if this is a word form (has form_of)
            senses = entry.get('senses', [])
            for sense in senses:
                form_of = sense.get('form_of', [])
                if form_of and len(form_of) > 0:
                    lemma = form_of[0].get('word', '').strip().lower()
                    pos = entry.get('pos', '')

                    if lemma and lemma != word:
                        kaikki_lemmas.append((word, lemma, pos.upper()))

    print(f"\n✓ Found {len(kaikki_lemmas):,} additional lemmas from Kaikki")

    # Combine SpaCy and Kaikki lemmas (Kaikki takes precedence for duplicates)
    combined = {}

    # Add SpaCy lemmas first
    for word, lemma, pos in lemma_mappings:
        combined[word] = (lemma, pos)

    # Add Kaikki lemmas (overwrites SpaCy if duplicate)
    for word, lemma, pos in kaikki_lemmas:
        combined[word] = (lemma, pos)

    # Convert back to list
    result = [(word, lemma, pos) for word, (lemma, pos) in combined.items()]

    print(f"✓ Total unique lemma mappings: {len(result):,}")
    return result


def insert_lemmas(conn: sqlite3.Connection, lemmas: list):
    """Insert lemmatization mappings into database."""
    cursor = conn.cursor()

    print(f"\nInserting {len(lemmas):,} lemma mappings into database...")

    cursor.executemany(
        "INSERT OR REPLACE INTO lemmas (word, lemma, pos) VALUES (?, ?, ?)",
        lemmas
    )

    conn.commit()
    inserted = cursor.rowcount
    print(f"✓ Inserted {inserted:,} lemma mappings")


def main():
    parser = argparse.ArgumentParser(description="Build lemmatization database from SpaCy")
    parser.add_argument("--language", required=True, choices=["es", "en", "fr", "de"],
                        help="Language code (es, en, fr, de)")
    parser.add_argument("--output", required=True, type=Path,
                        help="Output database path (e.g., langpacks/es/lemmas.db)")

    args = parser.parse_args()

    # Check dependencies
    if not check_spacy_installed():
        install_instructions(args.language)
        sys.exit(1)

    model_name = SPACY_MODELS[args.language]

    if not check_model_installed(model_name):
        install_instructions(args.language)
        sys.exit(1)

    print(f"Building {args.language.upper()} lemmatization database")
    print("=" * 60)

    # Create output directory
    args.output.parent.mkdir(parents=True, exist_ok=True)

    # Generate lemmas from SpaCy
    lemmas = generate_lemmas_from_spacy(args.language, model_name)

    if not lemmas:
        print("✗ No lemmas generated from SpaCy!")
        print("Trying to use Kaikki data only...")
        lemmas = []

    # Enhance with Kaikki data
    lang_full = {
        "es": "spanish",
        "en": "english",
        "fr": "french",
        "de": "german"
    }[args.language]

    lemmas = enhance_with_kaikki_lemmas(lang_full, lemmas)

    if not lemmas:
        print("✗ No lemmas found!")
        sys.exit(1)

    # Create database and insert
    print(f"\nCreating database: {args.output}")
    conn = create_lemma_db(args.output)
    insert_lemmas(conn, lemmas)

    # Print stats
    cursor = conn.cursor()
    count = cursor.execute("SELECT COUNT(*) FROM lemmas").fetchone()[0]
    db_size = args.output.stat().st_size / (1024 * 1024)  # MB

    print("\n" + "=" * 60)
    print("✓ Lemmatization database built successfully!")
    print(f"  Database: {args.output}")
    print(f"  Lemma mappings: {count:,}")
    print(f"  File size: {db_size:.2f} MB")
    print("=" * 60)

    conn.close()


if __name__ == "__main__":
    main()
