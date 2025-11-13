#!/bin/bash

# Create database directory
mkdir -p ~/Library/Application\ Support/com.fluentdiary.desktop

# Create database with schema and seed data
sqlite3 ~/Library/Application\ Support/com.fluentdiary.desktop/user.db <<'EOF'
-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    language TEXT NOT NULL,
    primary_language TEXT DEFAULT 'en',
    started_at INTEGER NOT NULL,
    ended_at INTEGER,
    duration INTEGER,
    audio_path TEXT,
    transcript TEXT,
    word_count INTEGER,
    unique_word_count INTEGER,
    wpm REAL,
    new_word_count INTEGER,
    session_type TEXT DEFAULT 'free_speak',
    text_library_id TEXT,
    source_text TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    segments TEXT
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sessions_language ON sessions(language);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_type ON sessions(session_type);

-- Create vocab table
CREATE TABLE IF NOT EXISTS vocab (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    language TEXT NOT NULL,
    lemma TEXT NOT NULL,
    forms_spoken TEXT,
    first_seen_at INTEGER NOT NULL,
    last_seen_at INTEGER NOT NULL,
    usage_count INTEGER DEFAULT 1,
    mastered BOOLEAN DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE(language, lemma)
);

-- Create vocab indexes
CREATE INDEX IF NOT EXISTS idx_vocab_language ON vocab(language);
CREATE INDEX IF NOT EXISTS idx_vocab_first_seen ON vocab(first_seen_at);
CREATE INDEX IF NOT EXISTS idx_vocab_usage_count ON vocab(usage_count DESC);

-- Create text_library table
CREATE TABLE IF NOT EXISTS text_library (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    source_type TEXT NOT NULL,
    source_url TEXT,
    content TEXT NOT NULL,
    language TEXT NOT NULL,
    word_count INTEGER,
    estimated_duration INTEGER,
    difficulty_level TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    tags TEXT
);

-- Create text_library indexes
CREATE INDEX IF NOT EXISTS idx_text_library_language ON text_library(language);
CREATE INDEX IF NOT EXISTS idx_text_library_created_at ON text_library(created_at DESC);

-- Create session_words table
CREATE TABLE IF NOT EXISTS session_words (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    lemma TEXT NOT NULL,
    count INTEGER DEFAULT 1,
    is_new BOOLEAN DEFAULT 0,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

-- Create session_words indexes
CREATE INDEX IF NOT EXISTS idx_session_words_session ON session_words(session_id);
CREATE INDEX IF NOT EXISTS idx_session_words_new ON session_words(is_new);

-- Create custom_translations table
CREATE TABLE IF NOT EXISTS custom_translations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lemma TEXT NOT NULL,
    lang_from TEXT NOT NULL,
    lang_to TEXT NOT NULL,
    custom_translation TEXT NOT NULL,
    notes TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE(lemma, lang_from, lang_to)
);

-- Create custom_translations index
CREATE INDEX IF NOT EXISTS idx_custom_translations_lookup ON custom_translations(lemma, lang_from, lang_to);

-- Create dictionaries table
CREATE TABLE IF NOT EXISTS dictionaries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    language TEXT NOT NULL,
    name TEXT NOT NULL,
    url_template TEXT NOT NULL,
    dict_type TEXT NOT NULL CHECK(dict_type IN ('embedded', 'popup')),
    is_active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL,
    is_default INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL
);

-- Create dictionaries index
CREATE INDEX IF NOT EXISTS idx_dictionaries_lang ON dictionaries(language, is_active, sort_order);

EOF

# Now load the seed data
cat /Users/quinortiz/Documents/fluentwhisper/seed_data.sql | sqlite3 ~/Library/Application\ Support/com.fluentdiary.desktop/user.db

# Verify
echo "=== Database created and seeded ==="
echo ""
sqlite3 ~/Library/Application\ Support/com.fluentdiary.desktop/user.db <<'EOF'
SELECT 'Sessions count: ' || COUNT(*) FROM sessions;
SELECT 'Vocab count: ' || COUNT(*) FROM vocab;
SELECT 'WPM range: ' || MIN(wpm) || ' to ' || MAX(wpm) FROM sessions;
EOF

echo ""
echo "✅ Done! Database ready at:"
echo "~/Library/Application Support/com.fluentdiary.desktop/user.db"
