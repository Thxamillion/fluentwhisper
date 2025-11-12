#!/usr/bin/env python3
"""
Build unified concepts.db from existing pairwise translation databases.

This script:
1. Extracts all forms and lemmas from existing langpack DBs
2. Extracts translations from pairwise translation DBs
3. Creates concept clusters using English as hub
4. Generates a single concepts.db with all languages

Usage:
    python scripts/build_concepts_db.py

Output:
    concepts.db in current directory
"""

import sqlite3
import os
import sys
from pathlib import Path
from collections import defaultdict
from typing import Dict, List, Tuple, Set
import json

# Language codes we support
LANGUAGES = ['en', 'es', 'fr', 'de', 'it']

class ConceptDBBuilder:
    def __init__(self, base_dir: Path):
        self.base_dir = base_dir
        self.langpack_dir = base_dir / 'langpacks'
        self.translations_dir = base_dir / 'translations'

        # Data structures for building concepts
        self.forms: List[Tuple[str, str, str, str]] = []  # (lang, form, lemma, pos)
        self.lemmas: Dict[Tuple[str, str, str], int] = {}  # (lang, lemma, pos) -> lemma_id
        self.concepts: Dict[Tuple[str, str], int] = {}  # (english_lemma, pos) -> concept_id
        self.senses: List[Tuple[int, int, int]] = []  # (lemma_id, concept_id, rank)

        # Counters
        self.next_lemma_id = 1
        self.next_concept_id = 1

    def extract_forms_and_lemmas(self):
        """Extract all forms and lemmas from langpack databases."""
        print("\n[1/5] Extracting forms and lemmas from langpack databases...")

        for lang in LANGUAGES:
            lemma_db_path = self.langpack_dir / lang / 'lemmas.db'

            if not lemma_db_path.exists():
                print(f"  ⚠️  Skipping {lang}: {lemma_db_path} not found")
                continue

            print(f"  📖 Processing {lang}...")
            conn = sqlite3.connect(lemma_db_path)
            cursor = conn.cursor()

            # Get all forms
            cursor.execute("SELECT word, lemma, pos FROM lemmas")
            rows = cursor.fetchall()

            lemma_count = 0
            form_count = 0

            for word, lemma, pos in rows:
                pos = pos or 'UNKNOWN'  # Handle NULL POS

                # Add form
                self.forms.append((lang, word, lemma, pos))
                form_count += 1

                # Track unique lemmas
                lemma_key = (lang, lemma, pos)
                if lemma_key not in self.lemmas:
                    self.lemmas[lemma_key] = self.next_lemma_id
                    self.next_lemma_id += 1
                    lemma_count += 1

            conn.close()
            print(f"    ✓ {lang}: {form_count:,} forms, {lemma_count:,} unique lemmas")

        print(f"  ✓ Total: {len(self.forms):,} forms, {len(self.lemmas):,} unique lemmas")

    def build_concepts_from_translations(self):
        """Build concept clusters using English as hub + direct pairs."""
        print("\n[2/5] Building concept clusters...")

        # Build POS lookup cache for fast access
        print("  🔧 Building POS lookup cache...")
        pos_cache: Dict[Tuple[str, str], str] = {}
        for (lang, lemma, pos), _ in self.lemmas.items():
            # Store first POS found for each (lang, lemma) pair
            cache_key = (lang, lemma)
            if cache_key not in pos_cache:
                pos_cache[cache_key] = pos
        print(f"    ✓ Cached {len(pos_cache):,} lemma POS tags")

        # Map: (english_lemma, pos) -> {(lang, lemma, pos): lemma_length}
        # We'll use lemma length for ranking (shorter = more common)
        english_hub: Dict[Tuple[str, str], Dict[Tuple[str, str, str], int]] = defaultdict(dict)

        # Process all translation DBs
        translation_dbs = list(self.translations_dir.glob('*.db'))
        print(f"  Found {len(translation_dbs)} translation databases")

        for db_idx, db_path in enumerate(translation_dbs, 1):
            print(f"\n  [{db_idx}/{len(translation_dbs)}] Processing {db_path.name}...")

            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()

            # Check if translations table exists
            cursor.execute("""
                SELECT name FROM sqlite_master
                WHERE type='table' AND name='translations'
            """)

            if not cursor.fetchone():
                print(f"    ⚠️  Skipping: no translations table")
                conn.close()
                continue

            # Get all translations
            cursor.execute("""
                SELECT lemma_from, lang_from, translation, lang_to
                FROM translations
            """)

            rows = cursor.fetchall()
            if not rows:
                print(f"    ⚠️  Skipping: empty translations table")
                conn.close()
                continue

            print(f"    📊 Found {len(rows):,} translations")

            # Split into English-pivoted and direct pairs
            en_translations = []
            direct_translations = []

            for l_from, lang_from, trans, lang_to in rows:
                # We only want: other language → English translations
                # Skip: English → other language (those appear in the same DB)
                if lang_to == 'en' and lang_from != 'en':
                    en_translations.append((l_from, lang_from, trans))
                elif lang_to != 'en':
                    # Direct language pair (fr→de, es→it, etc.)
                    direct_translations.append((l_from, lang_from, trans, lang_to))

            print(f"    📊 {len(en_translations):,} translations to English")
            print(f"    📊 {len(direct_translations):,} direct translations (SKIPPED - unreliable)")

            # Note: Direct translations are NOT processed because they contain
            # English glosses mislabeled as other languages (e.g., es-fr.db
            # has English definitions labeled as Spanish).
            # We only trust English-pivoted data and let transitive closure
            # handle cross-language mappings via shared concepts.

            # Process English-pivoted translations
            batch_size = 10000
            for i in range(0, len(en_translations), batch_size):
                batch = en_translations[i:i+batch_size]

                for lemma_from, lang_from, translation in batch:
                    # Parse English translation to extract lemma
                    english_lemma = self._extract_english_lemma(translation)

                    # Fast POS lookup from cache
                    cache_key = (lang_from, lemma_from)
                    source_pos = pos_cache.get(cache_key, 'UNKNOWN')

                    # Group by English lemma + POS
                    hub_key = (english_lemma, source_pos)
                    source_key = (lang_from, lemma_from, source_pos)

                    # Store lemma length for ranking (shorter = better rank)
                    if source_key not in english_hub[hub_key]:
                        english_hub[hub_key][source_key] = len(lemma_from)

                if i > 0 and i % 50000 == 0:
                    print(f"      Progress: {i:,}/{len(en_translations):,} translations")

            # Direct pairs are NOT processed (see note above - they contain English glosses)

            conn.close()
            print(f"    ✓ Completed {db_path.name}")

        # Now create concepts from the English hub
        print(f"\n  📊 Creating concepts from {len(english_hub):,} English hubs...")

        for (english_lemma, pos), translations in english_hub.items():
            # Create a concept
            concept_id = self.next_concept_id
            self.next_concept_id += 1

            # Store concept (we'll use English lemma as gloss)
            gloss = english_lemma
            self.concepts[(english_lemma, pos)] = concept_id

            # Sort translations by lemma length (shorter = rank 1, longer = rank 2+)
            sorted_translations = sorted(translations.items(), key=lambda x: (x[1], x[0][1]))  # Sort by length, then lemma name

            # Limit to top 3 translations per language to reduce noise
            translations_by_lang = defaultdict(list)
            for (lang, lemma, lemma_pos), length in sorted_translations:
                translations_by_lang[lang].append((lang, lemma, lemma_pos, length))

            # Create senses with proper ranking
            for lang, lang_translations in translations_by_lang.items():
                # Take top 3 per language
                for rank_idx, (lang, lemma, lemma_pos, length) in enumerate(lang_translations[:3], 1):
                    lemma_key = (lang, lemma, lemma_pos)

                    # Add lemma if it doesn't exist (e.g., from translation tables)
                    if lemma_key not in self.lemmas:
                        self.lemmas[lemma_key] = self.next_lemma_id
                        self.next_lemma_id += 1

                    lemma_id = self.lemmas[lemma_key]
                    self.senses.append((lemma_id, concept_id, rank_idx))

            # Also add English itself as a translation of this concept
            en_key = ('en', english_lemma, pos)
            if en_key not in self.lemmas:
                self.lemmas[en_key] = self.next_lemma_id
                self.next_lemma_id += 1

            en_lemma_id = self.lemmas[en_key]
            self.senses.append((en_lemma_id, concept_id, 1))

        print(f"  ✓ Created {len(self.concepts):,} concepts from English hub")
        print(f"  ✓ Total concepts: {len(self.concepts):,}")
        print(f"  ✓ Total sense mappings: {len(self.senses):,}")

    def _extract_english_lemma(self, translation: str) -> str:
        """
        Extract the base English lemma from a translation string.

        Examples:
        "to be (copula)" -> "be"
        "run" -> "run"
        "quickly" -> "quickly"
        "hello, hi, hey" -> "hello"
        "greetings; hello (general salutation)" -> "greetings"
        "apocopic form of mío, my" -> "my" (prefer actual translation over jargon)
        """
        # Remove "to " prefix for infinitives
        if translation.startswith('to '):
            translation = translation[3:]

        # Remove parenthetical descriptions
        if '(' in translation:
            translation = translation.split('(')[0].strip()

        # Handle linguistic jargon - prefer actual translations over technical terms
        # Examples: "apocopic form of X, Y" -> prefer "Y"
        # "feminine form of X, Y" -> prefer "Y"
        jargon_patterns = [
            'apocopic form of',
            'feminine form of',
            'masculine form of',
            'plural form of',
            'diminutive of',
            'augmentative of',
            'alternative form of',
            'archaic form of'
        ]

        for pattern in jargon_patterns:
            if pattern in translation.lower():
                # If there's a comma after the jargon, take what comes after
                if ',' in translation:
                    parts = translation.split(',')
                    # Take the last part (actual translation)
                    translation = parts[-1].strip()
                    break

        # Take only first word before comma, semicolon, or slash
        # This normalizes variants like "hello, hi" -> "hello"
        separators = [',', ';', '/']
        for sep in separators:
            if sep in translation:
                translation = translation.split(sep)[0].strip()
                break

        return translation.lower().strip()


    def create_concepts_db(self, output_path: Path):
        """Create the final concepts.db file."""
        print(f"\n[3/5] Creating concepts.db at {output_path}...")

        # Remove existing DB if present
        if output_path.exists():
            output_path.unlink()
            print("  🗑️  Removed existing concepts.db")

        conn = sqlite3.connect(output_path)
        cursor = conn.cursor()

        # Create schema
        print("  📋 Creating tables...")
        cursor.executescript("""
            -- Forms: inflected word → lemma mapping
            CREATE TABLE forms (
                lang TEXT NOT NULL,
                form TEXT NOT NULL,
                lemma_id INTEGER NOT NULL,
                feats_json TEXT,
                PRIMARY KEY (lang, form, lemma_id)
            );

            -- Lemmas: base forms with POS and frequency
            CREATE TABLE lemmas (
                id INTEGER PRIMARY KEY,
                lang TEXT NOT NULL,
                lemma TEXT NOT NULL,
                pos TEXT NOT NULL,
                freq_rank INTEGER,
                UNIQUE(lang, lemma, pos)
            );

            -- Concepts: universal meanings shared across languages
            CREATE TABLE concepts (
                id INTEGER PRIMARY KEY,
                pos TEXT NOT NULL,
                gloss TEXT NOT NULL
            );

            -- Senses: maps lemmas to concepts with ranking
            CREATE TABLE senses (
                lemma_id INTEGER NOT NULL,
                concept_id INTEGER NOT NULL,
                rank INTEGER NOT NULL DEFAULT 1,
                PRIMARY KEY (lemma_id, concept_id),
                FOREIGN KEY (lemma_id) REFERENCES lemmas(id),
                FOREIGN KEY (concept_id) REFERENCES concepts(id)
            );

            -- User overrides: remember user's preferred sense
            CREATE TABLE user_overrides (
                user_id TEXT NOT NULL DEFAULT 'default',
                lang TEXT NOT NULL,
                lemma_id INTEGER NOT NULL,
                concept_id INTEGER NOT NULL,
                created_at INTEGER NOT NULL,
                PRIMARY KEY (user_id, lang, lemma_id),
                FOREIGN KEY (lemma_id) REFERENCES lemmas(id),
                FOREIGN KEY (concept_id) REFERENCES concepts(id)
            );

            -- Indexes for performance
            CREATE INDEX idx_forms_lookup ON forms(lang, form);
            CREATE INDEX idx_lemmas_lookup ON lemmas(lang, lemma);
            CREATE INDEX idx_senses_lemma ON senses(lemma_id, rank);
            CREATE INDEX idx_senses_concept ON senses(concept_id);
        """)

        print("  ✓ Tables created")

        # Insert data with optimized batching
        print("\n[4/5] Inserting data...")

        # Use WAL mode and disable synchronous writes for speed
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=OFF")

        # Start transaction
        cursor.execute("BEGIN TRANSACTION")

        # Insert lemmas in batches
        print(f"  📝 Inserting {len(self.lemmas):,} lemmas...")
        lemma_rows = [(lemma_id, lang, lemma, pos, None)
                      for (lang, lemma, pos), lemma_id in self.lemmas.items()]

        batch_size = 10000
        for i in range(0, len(lemma_rows), batch_size):
            batch = lemma_rows[i:i+batch_size]
            cursor.executemany(
                "INSERT INTO lemmas (id, lang, lemma, pos, freq_rank) VALUES (?, ?, ?, ?, ?)",
                batch
            )
            if i % 50000 == 0:
                print(f"    Progress: {i:,}/{len(lemma_rows):,}")

        # Insert forms (with lemma_id references)
        print(f"  📝 Inserting {len(self.forms):,} forms...")
        form_rows = []
        for lang, form, lemma, pos in self.forms:
            lemma_key = (lang, lemma, pos)
            if lemma_key in self.lemmas:
                lemma_id = self.lemmas[lemma_key]
                form_rows.append((lang, form, lemma_id, None))

        for i in range(0, len(form_rows), batch_size):
            batch = form_rows[i:i+batch_size]
            cursor.executemany(
                "INSERT OR IGNORE INTO forms (lang, form, lemma_id, feats_json) VALUES (?, ?, ?, ?)",
                batch
            )
            if i % 50000 == 0:
                print(f"    Progress: {i:,}/{len(form_rows):,}")

        # Insert concepts
        print(f"  📝 Inserting {len(self.concepts):,} concepts...")
        concept_rows = [(concept_id, pos, gloss)
                        for (gloss, pos), concept_id in self.concepts.items()]
        cursor.executemany(
            "INSERT INTO concepts (id, pos, gloss) VALUES (?, ?, ?)",
            concept_rows
        )

        # Insert senses
        print(f"  📝 Inserting {len(self.senses):,} senses...")
        for i in range(0, len(self.senses), batch_size):
            batch = self.senses[i:i+batch_size]
            cursor.executemany(
                "INSERT OR IGNORE INTO senses (lemma_id, concept_id, rank) VALUES (?, ?, ?)",
                batch
            )
            if i % 50000 == 0:
                print(f"    Progress: {i:,}/{len(self.senses):,}")

        # Commit transaction
        cursor.execute("COMMIT")
        print("  ✓ Transaction committed")
        print("  ✓ Data inserted")

        # Get final stats
        cursor.execute("SELECT COUNT(*) FROM forms")
        forms_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM lemmas")
        lemmas_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM concepts")
        concepts_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM senses")
        senses_count = cursor.fetchone()[0]

        conn.close()

        # Get file size
        size_mb = output_path.stat().st_size / (1024 * 1024)

        print(f"\n[5/5] ✅ concepts.db created successfully!")
        print(f"  📊 Final statistics:")
        print(f"     Forms:    {forms_count:,}")
        print(f"     Lemmas:   {lemmas_count:,}")
        print(f"     Concepts: {concepts_count:,}")
        print(f"     Senses:   {senses_count:,}")
        print(f"     Size:     {size_mb:.1f} MB")

def main():
    # Get base directory (repo root)
    script_dir = Path(__file__).parent
    base_dir = script_dir.parent

    print("=" * 60)
    print("🏗️  Building concepts.db from existing databases")
    print("=" * 60)

    # Build the database
    builder = ConceptDBBuilder(base_dir)
    builder.extract_forms_and_lemmas()
    builder.build_concepts_from_translations()

    # Create output DB
    output_path = base_dir / 'concepts.db'
    builder.create_concepts_db(output_path)

    print(f"\n✨ Done! concepts.db created at {output_path}")
    print("\nNext steps:")
    print("  1. Test the database with some sample queries")
    print("  2. Implement ConceptProvider in Rust")
    print("  3. Update the factory to use ConceptProvider")

if __name__ == '__main__':
    main()
